import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { extractJsonObject } from "@/lib/json-extract";

async function getUserId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

export interface SecurityFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
}

export type SecurityRating = "critical" | "vulnerable" | "moderate" | "secure";

export interface SecurityResult {
  url: string;
  findings: SecurityFinding[];
  rating: SecurityRating;
  summary: string;
  headersChecked: string[];
  techDetected: string[];
}

// Deterministic header rules — severity never changes between runs
const HEADER_RULES: Record<string, { severity: SecurityFinding["severity"]; category: string; title: string; description: string; recommendation: string; presentIsBad?: boolean }> = {
  "content-security-policy": {
    severity: "high",
    category: "Headers",
    title: "Content-Security-Policy missing",
    description: "Without CSP, the browser has no restrictions on where it can load scripts, styles and other resources. This makes XSS attacks easier.",
    recommendation: "Add the Content-Security-Policy header. Recommended minimum: default-src 'self'; script-src 'self'.",
  },
  "strict-transport-security": {
    severity: "high",
    category: "SSL/TLS",
    title: "HSTS (HTTP Strict Transport Security) missing",
    description: "Without HSTS, the browser can be forced to use HTTP instead of HTTPS, exposing traffic to man-in-the-middle attacks.",
    recommendation: "Adiciona: Strict-Transport-Security: max-age=31536000; includeSubDomains",
  },
  "x-frame-options": {
    severity: "medium",
    category: "Headers",
    title: "X-Frame-Options missing",
    description: "The website can be embedded in iframes on other domains, allowing clickjacking attacks.",
    recommendation: "Add: X-Frame-Options: SAMEORIGIN — or use Content-Security-Policy: frame-ancestors 'self'",
  },
  "x-content-type-options": {
    severity: "low",
    category: "Headers",
    title: "X-Content-Type-Options missing",
    description: "The browser may try to guess the MIME type of resources, which can lead to unexpected content execution.",
    recommendation: "Add: X-Content-Type-Options: nosniff",
  },
  "referrer-policy": {
    severity: "low",
    category: "Privacy",
    title: "Referrer-Policy missing",
    description: "The browser sends the full URL as the Referer on external requests, potentially exposing internal paths or tokens in URLs.",
    recommendation: "Add: Referrer-Policy: strict-origin-when-cross-origin",
  },
  "permissions-policy": {
    severity: "low",
    category: "Privacy",
    title: "Permissions-Policy missing",
    description: "Without this header, the website does not restrict access to sensitive browser features (camera, microphone, geolocation).",
    recommendation: "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()",
  },
  "x-powered-by": {
    severity: "low",
    category: "Information Disclosure",
    title: "X-Powered-By exposes server technology",
    description: "The X-Powered-By header reveals the framework/platform in use, making it easier to target vulnerable versions.",
    recommendation: "Remove the X-Powered-By header in the server configuration (e.g. Express: app.disable('x-powered-by'))",
    presentIsBad: true,
  },
  "server": {
    severity: "info",
    category: "Information Disclosure",
    title: "Server header exposes server software",
    description: "The Server header reveals the software and possibly the version of the web server, which can help attackers.",
    recommendation: "Configure the server to omit or generalize the Server header (e.g. nginx: server_tokens off)",
    presentIsBad: true,
  },
};

const SECURITY_HEADERS = Object.keys(HEADER_RULES);

function calculateRating(findings: SecurityFinding[]): SecurityRating {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "high")) return "vulnerable";
  if (findings.some((f) => f.severity === "medium")) return "moderate";
  return "secure";
}

const EXPOSED_PATHS = ["/.env", "/robots.txt", "/.git/config", "/sitemap.xml", "/admin", "/phpinfo.php", "/wp-login.php"];

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SecurityAudit/1.0)" },
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Sanitize text so it's safe to embed inside a JSON string via prompt
function safe(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/`/g, "'")
    .slice(0, 400);
}

function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const regex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content.length > 10) scripts.push(safe(content.slice(0, 500)));
  }
  return scripts.slice(0, 4);
}

function extractForms(html: string): string[] {
  const forms: string[] = [];
  const regex = /<form[\s\S]*?<\/form>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    forms.push(safe(match[0].slice(0, 600)));
  }
  return forms.slice(0, 4);
}

function extractComments(html: string): string[] {
  const comments: string[] = [];
  const regex = /<!--([\s\S]*?)-->/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const c = match[1].trim();
    if (c.length > 5 && !c.startsWith("[if ")) comments.push(safe(c.slice(0, 200)));
  }
  return comments.slice(0, 8);
}

function extractLibraries(html: string): string[] {
  const libs: string[] = [];
  const regex = /src=["']([^"']*(?:jquery|bootstrap|react|vue|angular|lodash|axios|moment)[^"']*)[^"']*["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    libs.push(match[1].slice(0, 200));
  }
  return [...new Set(libs)].slice(0, 8);
}

function extractMetaInfo(html: string): string {
  const metas: string[] = [];
  const regex = /<meta[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    metas.push(safe(match[0]));
  }
  return metas.slice(0, 15).join(" | ");
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key not configured." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url?.trim()) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    // 1. Fetch main page
    let html = "";
    const responseHeaders: Record<string, string> = {};
    let finalUrl = targetUrl;

    try {
      const res = await fetchWithTimeout(targetUrl);
      html = await res.text();
      finalUrl = res.url;
      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
    } catch {
      return NextResponse.json({ error: "Could not access the website. Check the URL and try again." }, { status: 400 });
    }

    // 2. Generate deterministic header findings server-side
    const presentHeaders: string[] = [];
    const headerFindings: SecurityFinding[] = [];

    SECURITY_HEADERS.forEach((h) => {
      const rule = HEADER_RULES[h];
      const value = responseHeaders[h];
      if (rule.presentIsBad) {
        if (value) {
          presentHeaders.push(`${h}: ${value}`);
          headerFindings.push({ ...rule, evidence: `${h}: ${value}` });
        } else {
          // good — not present
          headerFindings.push({
            severity: "info",
            category: rule.category,
            title: `${h} não exposto`,
            description: `O header ${h} não está presente, o que é correto do ponto de vista de segurança.`,
            recommendation: "Manter configuração atual.",
            evidence: "(ausente — correto)",
          });
        }
      } else {
        if (value) {
          presentHeaders.push(`${h}: ${value}`);
          headerFindings.push({
            severity: "info",
            category: rule.category,
            title: rule.title.replace(" ausente", " configurado"),
            description: `O header ${h} está presente e configurado.`,
            recommendation: "Manter configuração atual.",
            evidence: `${h}: ${value.slice(0, 80)}`,
          });
        } else {
          headerFindings.push({ ...rule, evidence: "(header ausente)" });
        }
      }
    });

    // 3. Check exposed paths (passively, only status codes)
    const exposedPaths: string[] = [];
    const baseUrl = new URL(finalUrl).origin;
    await Promise.allSettled(
      EXPOSED_PATHS.map(async (p) => {
        try {
          const r = await fetchWithTimeout(baseUrl + p, 4000);
          if (r.status === 200 && p !== "/robots.txt" && p !== "/sitemap.xml") {
            exposedPaths.push(p);
          }
        } catch { /* ignore */ }
      })
    );

    // 4. Extract code artifacts
    const inlineScripts = extractInlineScripts(html);
    const forms = extractForms(html);
    const comments = extractComments(html);
    const libraries = extractLibraries(html);
    const metaInfo = extractMetaInfo(html);
    // Sanitize html snippet — strip script/style blocks to reduce noise, keep structure
    const htmlStripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "<script>[removed]</script>")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\s+/g, " ")
      .slice(0, 1500);

    // 5. Build Claude prompt — only for content that requires intelligent analysis
    const prompt = `You are a web security expert. The HTTP headers have already been analysed. Your job is to analyse ONLY the website content below for security issues in: inline JavaScript, HTML forms, HTML comments, outdated libraries, and exposed sensitive paths.

<url>${finalUrl}</url>

<exposed_paths_returning_200>
${exposedPaths.length ? exposedPaths.join(", ") : "none"}
</exposed_paths_returning_200>

<inline_scripts>
${inlineScripts.map((s, i) => `[Script ${i + 1}]: ${s}`).join(" | ") || "none"}
</inline_scripts>

<forms>
${forms.map((f, i) => `[Form ${i + 1}]: ${f}`).join(" | ") || "none"}
</forms>

<html_comments>
${comments.join(" | ") || "none"}
</html_comments>

<libraries_detected>
${libraries.join(", ") || "none"}
</libraries_detected>

<meta_tags>
${metaInfo || "none"}
</meta_tags>

<html_snippet>
${htmlStripped}
</html_snippet>

SEVERITY CRITERIA — follow these strictly, do not deviate:
- critical: hardcoded API key, password, or secret token visible in JS or HTML
- high: exposed /.env or /.git/config returning 200; form submitting passwords over HTTP; eval() with user input
- medium: outdated library with known CVE; form missing autocomplete=off on password field; internal paths/emails in comments
- low: library version exposed in URL; development comments (TODO, FIXME, debug); verbose error messages
- info: no issues found in a specific area

IMPORTANT: Your entire response must be a valid JSON object — no markdown, no code fences, nothing else.
{"findings":[{"severity":"critical|high|medium|low|info","category":"XSS|Exposed Files|Forms|JS Code|Libraries|Information Disclosure","title":"concise title","description":"what the problem is and why it matters (max 180 chars)","recommendation":"specific actionable fix (max 180 chars)","evidence":"exact snippet, path or value that triggered this — required for critical/high/medium, max 120 chars"}],"summary":"2-3 sentence summary of content-level security posture (do not mention headers — those are analysed separately)","techDetected":["detected tech/CMS/framework names only"]}

Rules:
- ONLY report findings with concrete evidence visible in the data above
- Do NOT speculate or invent findings not supported by the data
- Do NOT report on HTTP headers — those are handled separately
- If nothing suspicious found in an area, do not include an info finding for it
- techDetected: only real technology names you can identify (WordPress, jQuery 3.2.1, nginx, PHP, etc.)`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";

    let parsed = extractJsonObject<{ findings: SecurityFinding[]; summary: string; techDetected: string[] }>(raw);
    if (!parsed || !Array.isArray(parsed.findings)) {
      const findingsMatch = raw.match(/"findings"\s*:\s*(\[[\s\S]*?\])/);
      const summaryMatch = raw.match(/"summary"\s*:\s*"([^"]*)"/);
      const techMatch = raw.match(/"techDetected"\s*:\s*(\[[^\]]*\])/);
      if (!findingsMatch) throw new Error("Não foi possível processar a resposta. Tenta novamente.");
      parsed = {
        findings: JSON.parse(findingsMatch[1]),
        summary: summaryMatch?.[1] || "",
        techDetected: techMatch ? JSON.parse(techMatch[1]) : [],
      };
    }

    // Combine server-side header findings + Claude content findings.
    // Validate severity/category enums so a hallucinated value can't slip through.
    const VALID_SEV = ["critical", "high", "medium", "low", "info"];
    const contentFindings: SecurityFinding[] = (parsed.findings || []).filter(
      (f: SecurityFinding) => f.severity && f.title && f.description && VALID_SEV.includes(f.severity)
    );
    const allFindings = [...headerFindings, ...contentFindings];

    const result: SecurityResult = {
      url: finalUrl,
      findings: allFindings,
      rating: calculateRating(allFindings),
      summary: parsed.summary || "",
      headersChecked: SECURITY_HEADERS,
      techDetected: Array.from(new Set((parsed.techDetected || []).map((t) => String(t).trim()).filter(Boolean))).slice(0, 12),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[security] error:", err);
    return NextResponse.json({ error: (err as Error).message || "Erro inesperado." }, { status: 500 });
  }
}
