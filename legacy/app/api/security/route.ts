import { NextRequest, NextResponse } from "next/server";
import tls from "tls";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { extractJsonObject } from "@/lib/json-extract";
import { assertPublicUrl } from "@/lib/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  passedChecks: string[];
}

// Missing-header rules (only emitted when the header is absent — present & fine
// goes to passedChecks instead, so the report is about THIS site's gaps).
const HEADER_RULES: Record<string, { severity: SecurityFinding["severity"]; category: string; title: string; description: string; recommendation: string }> = {
  "content-security-policy": {
    severity: "high", category: "Headers", title: "Content-Security-Policy missing",
    description: "Without a CSP the browser has no restrictions on where scripts, styles and other resources load from, making XSS far easier to exploit.",
    recommendation: "Add a Content-Security-Policy header. Minimum: default-src 'self'; script-src 'self'.",
  },
  "strict-transport-security": {
    severity: "high", category: "TLS", title: "HSTS (Strict-Transport-Security) missing",
    description: "Without HSTS a browser can be downgraded to HTTP, exposing traffic to man-in-the-middle attacks.",
    recommendation: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains",
  },
  "x-frame-options": {
    severity: "medium", category: "Headers", title: "X-Frame-Options missing",
    description: "The site can be embedded in iframes on other domains, enabling clickjacking.",
    recommendation: "Add: X-Frame-Options: SAMEORIGIN — or CSP frame-ancestors 'self'.",
  },
  "x-content-type-options": {
    severity: "low", category: "Headers", title: "X-Content-Type-Options missing",
    description: "The browser may MIME-sniff responses, which can lead to unexpected content execution.",
    recommendation: "Add: X-Content-Type-Options: nosniff",
  },
  "referrer-policy": {
    severity: "low", category: "Privacy", title: "Referrer-Policy missing",
    description: "The full URL is sent as the Referer on external requests, potentially leaking internal paths or tokens.",
    recommendation: "Add: Referrer-Policy: strict-origin-when-cross-origin",
  },
  "permissions-policy": {
    severity: "low", category: "Privacy", title: "Permissions-Policy missing",
    description: "The site does not restrict access to sensitive browser features (camera, microphone, geolocation).",
    recommendation: "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()",
  },
};

function calculateRating(findings: SecurityFinding[]): SecurityRating {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "high")) return "vulnerable";
  if (findings.some((f) => f.severity === "medium")) return "moderate";
  return "secure";
}

// /.env and /.git/config are the dangerous ones — treat deterministically.
const EXPOSED_PATHS: Record<string, { severity: SecurityFinding["severity"]; title: string }> = {
  "/.env": { severity: "critical", title: "Environment file (.env) publicly accessible" },
  "/.git/config": { severity: "critical", title: "Git repository (.git) exposed" },
  "/phpinfo.php": { severity: "high", title: "phpinfo() page exposed" },
  "/.htaccess": { severity: "medium", title: ".htaccess accessible" },
  "/admin": { severity: "info", title: "Admin path responds (200)" },
  "/wp-login.php": { severity: "info", title: "WordPress login exposed" },
  "/server-status": { severity: "medium", title: "Apache server-status exposed" },
};

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" || h.endsWith(".local") || h === "127.0.0.1" || h === "0.0.0.0" ||
    h.startsWith("10.") || h.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.startsWith("169.254.")
  );
}

async function fetchWithTimeout(url: string, ms = 8000, redirect: RequestRedirect = "follow"): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; NeuronForge-SecurityAudit/1.0)" }, redirect });
  } finally {
    clearTimeout(id);
  }
}

// Live TLS handshake — real certificate + protocol, varies per site.
function checkTls(hostname: string): Promise<{ ok: boolean; protocol: string | null; daysToExpiry: number | null; issuer: string | null }> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { ok: boolean; protocol: string | null; daysToExpiry: number | null; issuer: string | null }) => { if (!done) { done = true; resolve(v); } };
    try {
      const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 8000 }, () => {
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol();
        let daysToExpiry: number | null = null;
        if (cert?.valid_to) {
          const exp = Date.parse(cert.valid_to);
          if (!Number.isNaN(exp)) daysToExpiry = Math.floor((exp - Date.now()) / 86_400_000);
        }
        const issuer = (cert?.issuer?.O as string) || (cert?.issuer?.CN as string) || null;
        socket.end();
        finish({ ok: true, protocol, daysToExpiry, issuer });
      });
      socket.on("error", () => finish({ ok: false, protocol: null, daysToExpiry: null, issuer: null }));
      socket.on("timeout", () => { socket.destroy(); finish({ ok: false, protocol: null, daysToExpiry: null, issuer: null }); });
    } catch {
      finish({ ok: false, protocol: null, daysToExpiry: null, issuer: null });
    }
  });
}

function safe(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n\t]/g, " ").replace(/`/g, "'").slice(0, 400);
}
function extractInlineScripts(html: string): string[] {
  const out: string[] = []; const re = /<script(?![^>]*\ssrc)[^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html)) !== null) { const c = m[1].trim(); if (c.length > 10) out.push(safe(c.slice(0, 500))); }
  return out.slice(0, 4);
}
function extractForms(html: string): string[] {
  const out: string[] = []; const re = /<form[\s\S]*?<\/form>/gi; let m;
  while ((m = re.exec(html)) !== null) out.push(safe(m[0].slice(0, 600)));
  return out.slice(0, 4);
}
function extractComments(html: string): string[] {
  const out: string[] = []; const re = /<!--([\s\S]*?)-->/g; let m;
  while ((m = re.exec(html)) !== null) { const c = m[1].trim(); if (c.length > 5 && !c.startsWith("[if ")) out.push(safe(c.slice(0, 200))); }
  return out.slice(0, 8);
}
function extractLibraries(html: string): string[] {
  const out: string[] = []; const re = /src=["']([^"']*(?:jquery|bootstrap|react|vue|angular|lodash|axios|moment)[^"']*)["']/gi; let m;
  while ((m = re.exec(html)) !== null) out.push(m[1].slice(0, 200));
  return [...new Set(out)].slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured." }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const url = String(body.url ?? "").trim();
    if (!url) return NextResponse.json({ error: "URL is required." }, { status: 400 });

    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (isPrivateHost(parsedUrl.hostname)) throw new Error("private");
      await assertPublicUrl(targetUrl);
    } catch {
      return NextResponse.json({ error: "That doesn't look like a valid public URL." }, { status: 400 });
    }

    const findings: SecurityFinding[] = [];
    const passedChecks: string[] = [];

    // 1) Fetch the main page (real headers, html, cookies, final URL after redirects)
    let html = "";
    const headers: Record<string, string> = {};
    let setCookies: string[] = [];
    let finalUrl = targetUrl;
    try {
      const res = await fetchWithTimeout(targetUrl);
      html = await res.text();
      finalUrl = res.url || targetUrl;
      res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
      setCookies = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    } catch {
      return NextResponse.json({ error: "Could not reach the website. Check the URL and try again." }, { status: 400 });
    }
    const finalParsed = new URL(finalUrl);
    const isHttps = finalParsed.protocol === "https:";
    const origin = finalParsed.origin;

    // 2) Security headers — missing => finding; present & fine => passedChecks
    for (const [h, rule] of Object.entries(HEADER_RULES)) {
      if (headers[h]) passedChecks.push(`${h} set`);
      else findings.push({ ...rule, evidence: "header absent" });
    }
    // CSP quality (only if present)
    const csp = headers["content-security-policy"];
    if (csp) {
      const weak: string[] = [];
      if (/unsafe-inline/i.test(csp)) weak.push("'unsafe-inline'");
      if (/unsafe-eval/i.test(csp)) weak.push("'unsafe-eval'");
      if (/(?:script-src|default-src)[^;]*\*/i.test(csp)) weak.push("wildcard * source");
      if (weak.length) {
        findings.push({ severity: "medium", category: "Headers", title: "Weak Content-Security-Policy", description: `The CSP allows ${weak.join(", ")}, which largely defeats its XSS protection.`, recommendation: "Remove unsafe-inline/unsafe-eval and wildcard sources; use nonces or hashes for inline scripts.", evidence: csp.slice(0, 120) });
      } else passedChecks.push("CSP has no unsafe-inline/eval/wildcard");
    }
    // Tech disclosure
    if (headers["x-powered-by"]) findings.push({ severity: "low", category: "Information Disclosure", title: "X-Powered-By exposes the stack", description: "The X-Powered-By header reveals the framework/platform, helping attackers target known CVEs.", recommendation: "Remove it (e.g. Express: app.disable('x-powered-by')).", evidence: `x-powered-by: ${headers["x-powered-by"]}` });
    else passedChecks.push("X-Powered-By not exposed");
    if (headers["server"] && /\d/.test(headers["server"])) findings.push({ severity: "info", category: "Information Disclosure", title: "Server header reveals software version", description: "The Server header includes a version, aiding version-specific attacks.", recommendation: "Generalise or hide it (nginx: server_tokens off).", evidence: `server: ${headers["server"]}` });

    // 3) HTTPS / redirect
    if (!isHttps) {
      findings.push({ severity: "high", category: "TLS", title: "Site served over HTTP (no HTTPS)", description: "Traffic is unencrypted and can be read or modified in transit.", recommendation: "Enable TLS and serve everything over HTTPS.", evidence: finalUrl });
    } else {
      passedChecks.push("Served over HTTPS");
      // Does http:// redirect to https://?
      try {
        const httpRes = await fetchWithTimeout(`http://${finalParsed.host}`, 6000, "manual");
        const loc = httpRes.headers.get("location") || "";
        if (httpRes.status >= 300 && httpRes.status < 400 && /^https:/i.test(loc)) passedChecks.push("HTTP redirects to HTTPS");
        else if (httpRes.status < 400) findings.push({ severity: "medium", category: "TLS", title: "HTTP is not redirected to HTTPS", description: "The plain-HTTP version loads without forcing HTTPS, allowing downgrade/MITM.", recommendation: "301-redirect all HTTP traffic to HTTPS and add HSTS.", evidence: `http:// returned ${httpRes.status}` });
      } catch { /* http not reachable — fine */ }
    }

    // 4) TLS certificate / protocol (live handshake)
    if (isHttps) {
      const t = await checkTls(finalParsed.hostname);
      if (!t.ok) {
        findings.push({ severity: "high", category: "TLS", title: "TLS handshake failed", description: "Could not establish a valid TLS connection — possible invalid, self-signed or misconfigured certificate.", recommendation: "Fix the certificate chain and TLS configuration.", evidence: finalParsed.hostname });
      } else {
        if (t.protocol && /TLSv1(\.1)?$/.test(t.protocol)) findings.push({ severity: "medium", category: "TLS", title: `Outdated TLS protocol (${t.protocol})`, description: "TLS 1.0/1.1 are deprecated and vulnerable.", recommendation: "Disable TLS 1.0/1.1; require TLS 1.2+.", evidence: t.protocol });
        if (t.daysToExpiry !== null && t.daysToExpiry < 0) findings.push({ severity: "high", category: "TLS", title: "TLS certificate expired", description: "The certificate has expired; browsers will warn or block visitors.", recommendation: "Renew the certificate (enable auto-renew, e.g. Let's Encrypt).", evidence: `expired ${Math.abs(t.daysToExpiry)}d ago` });
        else if (t.daysToExpiry !== null && t.daysToExpiry < 14) findings.push({ severity: "medium", category: "TLS", title: "TLS certificate expiring soon", description: `The certificate expires in ${t.daysToExpiry} days.`, recommendation: "Renew now / enable auto-renew.", evidence: `${t.daysToExpiry}d left` });
        else if (t.daysToExpiry !== null) passedChecks.push(`Valid certificate (${t.protocol}, ${t.daysToExpiry}d left${t.issuer ? `, ${t.issuer}` : ""})`);
      }
    }

    // 5) Cookie flags
    if (setCookies.length) {
      const insecure = setCookies.filter((c) => isHttps && !/;\s*secure/i.test(c));
      const noHttpOnly = setCookies.filter((c) => !/;\s*httponly/i.test(c));
      const noSameSite = setCookies.filter((c) => !/;\s*samesite/i.test(c));
      const nameOf = (c: string) => c.split("=")[0];
      if (insecure.length) findings.push({ severity: "medium", category: "Cookies", title: "Cookies without Secure flag", description: "Cookies can be sent over plain HTTP and intercepted.", recommendation: "Set the Secure attribute on all cookies.", evidence: insecure.map(nameOf).slice(0, 4).join(", ") });
      if (noHttpOnly.length) findings.push({ severity: "low", category: "Cookies", title: "Cookies without HttpOnly flag", description: "Cookies are readable by JavaScript, exposing them to theft via XSS.", recommendation: "Set HttpOnly on session/auth cookies.", evidence: noHttpOnly.map(nameOf).slice(0, 4).join(", ") });
      if (noSameSite.length) findings.push({ severity: "low", category: "Cookies", title: "Cookies without SameSite", description: "Cookies are sent on cross-site requests, enabling CSRF.", recommendation: "Set SameSite=Lax or Strict.", evidence: noSameSite.map(nameOf).slice(0, 4).join(", ") });
      if (!insecure.length && !noHttpOnly.length && !noSameSite.length) passedChecks.push("Cookies use Secure/HttpOnly/SameSite");
    }

    // 6) Mixed content (http:// resources on an https page)
    if (isHttps) {
      const mixed = [...html.matchAll(/(?:src|href)=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]).filter((u) => !u.startsWith("http://www.w3.org"));
      if (mixed.length) findings.push({ severity: "medium", category: "Mixed Content", title: "Insecure (HTTP) resources on an HTTPS page", description: "Loading HTTP resources over HTTPS breaks the security guarantee and triggers browser warnings.", recommendation: "Load every resource over HTTPS.", evidence: [...new Set(mixed)].slice(0, 3).join(", ").slice(0, 120) });
      else passedChecks.push("No mixed (HTTP) content");
    }

    // 7) Subresource Integrity on external scripts
    const extScripts = [...html.matchAll(/<script[^>]*\ssrc=["']https?:\/\/[^"']+["'][^>]*>/gi)].map((m) => m[0]);
    const noSri = extScripts.filter((s) => !/integrity=/i.test(s) && !/(?:src=["']https?:\/\/[^"']*(?:googletagmanager|google-analytics|gstatic|googleapis))/i.test(s));
    if (extScripts.length && noSri.length) findings.push({ severity: "low", category: "Supply Chain", title: "External scripts without Subresource Integrity", description: `${noSri.length} third-party script(s) load without an integrity hash; a compromised CDN could inject malicious code.`, recommendation: "Add integrity + crossorigin attributes to third-party <script> tags.", evidence: `${noSri.length}/${extScripts.length} external scripts` });
    else if (extScripts.length) passedChecks.push("External scripts use SRI");

    // 8) Exposed sensitive paths (deterministic, real status codes)
    await Promise.allSettled(
      Object.entries(EXPOSED_PATHS).map(async ([p, rule]) => {
        try {
          const r = await fetchWithTimeout(origin + p, 4000, "manual");
          if (r.status === 200) {
            // .env/.git only count if the body looks like the real thing, not an SPA fallback
            if (p === "/.env" || p === "/.git/config") {
              const sample = (await r.text()).slice(0, 300);
              if (!/[A-Z0-9_]+\s*=|\[core\]|repositoryformatversion/i.test(sample)) return;
            }
            findings.push({ severity: rule.severity, category: "Exposed Files", title: rule.title, description: "A sensitive path is publicly reachable and returns 200.", recommendation: "Block or remove this path from public access.", evidence: `${p} → 200` });
          }
        } catch { /* ignore */ }
      }),
    );

    // 9) Content-level analysis (grounded) — inline JS secrets, forms, comments, libs
    const inlineScripts = extractInlineScripts(html);
    const forms = extractForms(html);
    const comments = extractComments(html);
    const libraries = extractLibraries(html);
    const htmlStripped = html.replace(/<script[\s\S]*?<\/script>/gi, "<script>[js]</script>").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/\s+/g, " ").slice(0, 1500);
    const jsThin = inlineScripts.length === 0 && forms.length === 0 && html.length < 1500;

    const prompt = `You are a web security auditor. HTTP headers, TLS, cookies, redirects and exposed paths have ALREADY been analysed separately — do NOT report on those. Analyse ONLY the page content below for: hardcoded secrets/API keys, dangerous inline JS (eval with input, document.write of input), insecure forms (passwords over HTTP, missing CSRF token), sensitive data in HTML comments, and outdated JS libraries with known CVEs.

<url>${finalUrl}</url>
<inline_scripts>${inlineScripts.map((s, i) => `[${i + 1}] ${s}`).join(" | ") || "none"}</inline_scripts>
<forms>${forms.map((f, i) => `[${i + 1}] ${f}`).join(" | ") || "none"}</forms>
<html_comments>${comments.join(" | ") || "none"}</html_comments>
<libraries>${libraries.join(", ") || "none"}</libraries>
<html_snippet>${htmlStripped}</html_snippet>

SEVERITY: critical = hardcoded secret/API key/password visible; high = password form over HTTP, eval() with user input; medium = outdated lib with known CVE, internal path/email in comment; low = dev comment (TODO/FIXME/debug), library version exposed.

Respond with ONLY a JSON object (no markdown):
{"findings":[{"severity":"critical|high|medium|low","category":"Secrets|JS Code|Forms|Libraries|Information Disclosure","title":"...","description":"why it matters (<=180 chars)","recommendation":"specific fix (<=180 chars)","evidence":"exact snippet/value (<=120 chars)"}],"techDetected":["real tech/CMS/framework names only, with version if visible"]}
Rules: ONLY report findings with concrete evidence in the data above. Never invent. If nothing found, return "findings":[].`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const res = await anthropic.messages.create({ model: claudeModel, max_tokens: 3000, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    const parsed = extractJsonObject<{ findings: SecurityFinding[]; techDetected: string[] }>(raw) || { findings: [], techDetected: [] };

    const VALID_SEV = ["critical", "high", "medium", "low", "info"];
    const contentFindings: SecurityFinding[] = (parsed.findings || []).filter(
      (f) => f?.severity && f?.title && f?.description && VALID_SEV.includes(f.severity),
    );
    findings.push(...contentFindings);

    // Order by severity for display
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    const counts = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {} as Record<string, number>);
    const issueCount = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0);
    const parts = (["critical", "high", "medium", "low"] as const).filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`);
    const summary = jsThin
      ? `This page is JavaScript-rendered, so content-level checks are limited; the audit covers headers, TLS, cookies, redirects and exposed paths. Found ${issueCount} issue(s)${parts.length ? ` (${parts.join(", ")})` : ""} across ${passedChecks.length} passing checks.`
      : `Audited HTTP headers, TLS certificate, cookies, redirects, mixed content, exposed paths and page content. Found ${issueCount} issue(s)${parts.length ? ` (${parts.join(", ")})` : ""}; ${passedChecks.length} checks passed.`;

    const result: SecurityResult = {
      url: finalUrl,
      findings,
      rating: calculateRating(findings),
      summary,
      headersChecked: [...Object.keys(HEADER_RULES), "TLS certificate", "HTTP→HTTPS redirect", "Cookie flags", "Mixed content", "SRI", "Exposed paths"],
      techDetected: Array.from(new Set((parsed.techDetected || []).map((t) => String(t).trim()).filter(Boolean))).slice(0, 12),
      passedChecks,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[security] error:", err);
    return NextResponse.json({ error: (err as Error).message || "Unexpected error." }, { status: 500 });
  }
}
