import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const REDESIGN_DIR = "./outputs/redesigns";

// ── Step 1: Screenshot ────────────────────────────────────────────────────
async function takeScreenshot(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
    await page.waitForTimeout(1000);
    const buf = await page.screenshot({ fullPage: false });
    return buf.toString("base64");
  } finally {
    await browser.close();
  }
}

// ── Step 2: Extract nav links + crawl sub-pages ───────────────────────────
interface PageData {
  label: string;
  url: string;
  slug: string; // e.g. "servicos", "sobre", "contacto"
  content: string;
}

async function crawlSite(baseUrl: string): Promise<{ home: string; pages: PageData[]; phone: string; email: string; address: string }> {
  const browser = await chromium.launch({ headless: true });
  const origin = new URL(baseUrl).origin;

  const extractText = async (page: import("playwright").Page): Promise<string> => {
    return page.evaluate(() => {
      const skip = ["script", "style", "noscript", "header", "footer", "nav", "form", "button", "svg", "img"];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts: string[] = [];
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent) continue;
        if (skip.includes(parent.tagName.toLowerCase())) continue;
        const t = node.textContent?.trim() ?? "";
        if (t.length > 20) texts.push(t);
      }
      return texts.slice(0, 60).join("\n");
    });
  };

  try {
    const homePage = await browser.newPage();
    await homePage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await homePage.waitForTimeout(1000);

    // Extract nav links (internal only)
    const navLinks: { label: string; href: string }[] = await homePage.evaluate((origin) => {
      const seen = new Set<string>();
      const results: { label: string; href: string }[] = [];
      document.querySelectorAll("nav a, header a, [role='navigation'] a").forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        const label = (el as HTMLElement).innerText.trim();
        if (!href || !label || label.length < 2) return;
        try {
          const u = new URL(href);
          if (u.origin !== origin) return;
          if (u.pathname === "/" && seen.has("/")) return;
          const key = u.pathname;
          if (seen.has(key)) return;
          seen.add(key);
          results.push({ label, href: u.href });
        } catch {}
      });
      return results.slice(0, 7);
    }, origin);

    // Contact info from homepage
    const homeContact = await homePage.evaluate(() => {
      const get = (sel: string) => (document.querySelector(sel) as HTMLElement)?.innerText?.trim() ?? "";
      const phone = get("[href^='tel:']") ||
        (Array.from(document.querySelectorAll("*")).find(el => /\+?[0-9][0-9 \-().]{7,}/.test((el as HTMLElement).innerText ?? ""))?.textContent?.trim() ?? "");
      const email = get("[href^='mailto:']");
      const address = get("address") || get("[itemprop='address']");
      return { phone, email, address };
    });

    const homeContent = await extractText(homePage);
    await homePage.close();

    // Crawl up to 5 nav pages
    const pages: PageData[] = [];
    const toVisit = navLinks.filter(l => new URL(l.href).pathname !== "/").slice(0, 5);

    for (const link of toVisit) {
      try {
        const p = await browser.newPage();
        await p.goto(link.href, { waitUntil: "domcontentloaded", timeout: 12_000 });
        await p.waitForTimeout(500);
        const content = await extractText(p);
        await p.close();

        const pathname = new URL(link.href).pathname;
        const slug = pathname.replace(/\//g, "-").replace(/^-|-$/g, "").toLowerCase() || "page";

        pages.push({ label: link.label, url: link.href, slug, content: content.slice(0, 1500) });
      } catch {
        pages.push({ label: link.label, url: link.href, slug: link.label.toLowerCase().replace(/\s+/g, "-"), content: "" });
      }
    }

    return {
      home: homeContent.slice(0, 1500),
      pages,
      phone: homeContact.phone,
      email: homeContact.email,
      address: homeContact.address,
    };
  } finally {
    await browser.close();
  }
}

// ── Step 3: Deep vision analysis ──────────────────────────────────────────
interface SiteAnalysis {
  businessName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  fontStyle: string;
  services: string[];
  navPages: { label: string; slug: string }[];
  phone: string;
  email: string;
  address: string;
  brandPersonality: string;
  keyMessages: string[];
  score: number;
  scoreReasoning: string;
}

async function analyzeWithVision(
  anthropic: Anthropic,
  screenshotBase64: string,
  homeContent: string,
  url: string,
  name: string,
  category: string,
  crawledPages: PageData[],
): Promise<SiteAnalysis> {
  const pagesSnapshot = crawledPages.map(p => `[${p.label}]: ${p.content.slice(0, 300)}`).join("\n\n");

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: screenshotBase64 } },
        {
          type: "text",
          text: `Analyze this business website screenshot and content. Return ONLY a JSON object (no markdown):

URL: ${url}
Business: ${name || "unknown"}
Category: ${category}

Homepage content:
${homeContent}

Sub-pages found:
${pagesSnapshot || "none"}

JSON:
{
  "businessName": "exact name from site",
  "tagline": "main tagline/headline",
  "primaryColor": "#hex — main brand color from screenshot",
  "accentColor": "#hex — CTA/button color from screenshot",
  "bgColor": "#hex — main background",
  "textColor": "#hex — body text",
  "fontStyle": "serif or sans-serif",
  "services": ["up to 6 real services/treatments from the content"],
  "navPages": [{"label": "nav label", "slug": "url-slug"}, ...],
  "phone": "phone number",
  "email": "email address",
  "address": "physical address",
  "brandPersonality": "one sentence about brand tone",
  "keyMessages": ["message 1", "message 2", "message 3"],
  "score": 6,
  "scoreReasoning": "2 sentences on current design quality"
}`,
        },
      ],
    }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Vision returned invalid JSON");
  const p = JSON.parse(match[0]) as Partial<SiteAnalysis>;

  return {
    businessName: p.businessName || name || "Business",
    tagline: p.tagline || "",
    primaryColor: p.primaryColor || "#0ea5e9",
    accentColor: p.accentColor || "#0284c7",
    bgColor: p.bgColor || "#ffffff",
    textColor: p.textColor || "#1a1a1a",
    fontStyle: p.fontStyle || "sans-serif",
    services: Array.isArray(p.services) ? p.services.slice(0, 6) : [],
    navPages: Array.isArray(p.navPages) ? p.navPages : [],
    phone: p.phone || "",
    email: p.email || "",
    address: p.address || "",
    brandPersonality: p.brandPersonality || "professional",
    keyMessages: Array.isArray(p.keyMessages) ? p.keyMessages : [],
    score: Math.max(1, Math.min(10, Number(p.score) || 5)),
    scoreReasoning: p.scoreReasoning || "",
  };
}

// ── UI/UX Skill ───────────────────────────────────────────────────────────
const SKILL_SCRIPT = path.join(process.cwd(), ".claude/skills/ui-ux-pro-max/scripts/search.py");

function queryUiSkill(query: string): string {
  try {
    return execSync(`python3 "${SKILL_SCRIPT}" "${query}"`, { timeout: 8000 }).toString().trim();
  } catch {
    return "";
  }
}

// ── Step 4: Generate redesign ─────────────────────────────────────────────
async function generateRedesign(
  anthropic: Anthropic,
  analysis: SiteAnalysis,
  crawledPages: PageData[],
  _url: string,
  category: string,
): Promise<string> {
  const skillRec = queryUiSkill(category.toLowerCase().replace(/[^a-z0-9 ]/g, ""));

  // Map crawled pages to sections
  const pageSections = crawledPages.map(p => ({
    label: p.label,
    id: p.slug,
    content: p.content.slice(0, 800),
  }));

  // Define nav anchor mapping (every nav item maps to a real section id)
  const sectionIds = [
    "home",
    ...pageSections.map(p => p.id),
    "contact",
  ];

  const isHealthcare = category.toLowerCase().includes("dental") || category.toLowerCase().includes("health");
  const heroImage = isHealthcare
    ? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=80"
    : "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80";

  const fonts = analysis.fontStyle === "serif"
    ? { heading: "Playfair Display", body: "Lora", import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" }
    : { heading: "Poppins", body: "Inter", import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500&display=swap" };

  const sectionsSpec = pageSections.map(s => `
### SECTION id="${s.id}" — ${s.label}
Content from original page:
${s.content || "(generate relevant content based on business type)"}
`).join("\n");

  const prompt = `You are an expert web designer creating a modern redesign of a real business site. This is a SINGLE-PAGE website where every nav link scrolls to a section.

## UI/UX SKILL GUIDANCE
${skillRec || "Apply Soft UI Evolution + Minimalism, generous whitespace, strong visual hierarchy."}

## BRAND
- Name: ${analysis.businessName}
- Tagline: "${analysis.tagline}"
- Category: ${category}
- Personality: ${analysis.brandPersonality}
- Key messages: ${analysis.keyMessages.join(" | ")}
- Colors → primary: ${analysis.primaryColor} | accent: ${analysis.accentColor} | bg: ${analysis.bgColor} | text: ${analysis.textColor}
- Font style: ${analysis.fontStyle}
- Phone: ${analysis.phone || "—"} | Email: ${analysis.email || "—"} | Address: ${analysis.address || "—"}
- Services: ${analysis.services.join(", ")}

## SECTIONS TO GENERATE
These are all the pages from the original site. Each becomes a section with id="${sectionIds.join('", "')}":
${sectionsSpec}

## HTML REQUIREMENTS

HEAD:
- <link rel="stylesheet" href="${fonts.import}">
- <script src="https://cdn.tailwindcss.com"></script>
- <script>tailwind.config={theme:{extend:{colors:{primary:"${analysis.primaryColor}",accent:"${analysis.accentColor}"},fontFamily:{heading:["${fonts.heading}"],body:["${fonts.body}"]}}}}</script>

NAV (fixed, id="home"):
- bg-white/90 backdrop-blur-md shadow-sm, sticky top
- Logo + business name (font-heading font-bold) LEFT
- Nav links: ${sectionIds.map(id => `<a href="#${id}" class="...">Label</a>`).join(" ")} + CTA button RIGHT
- Mobile hamburger menu toggle (vanilla JS, no libraries)
- ALL links are href="#section-id" — NEVER href="#" alone

HERO SECTION (id="home" or first section):
- min-h-screen, background-image: url("${heroImage}") center/cover
- Dark overlay div absolute inset-0 bg-black/50
- Centered content: H1 headline | tagline | 2 buttons:
  * Primary: "Marcar Consulta" → href="#contact"
  * Secondary: "Ver Serviços" → href="#${pageSections[0]?.id || "services"}"

FOR EVERY OTHER SECTION (one per crawled page):
- section id="{slug}" py-24
- H2 section title, content matching the original page content above
- Relevant layout (grid, cards, list) based on content type
- Services/treatments: card grid with inline SVG icon + name + description
- Clinics/locations: address cards with map pin icon
- About/team: text + stats counters
- No dead buttons — if a button exists, it must link to #contact, tel:${analysis.phone || ""}, mailto:${analysis.email || ""}, or another section

CONTACT SECTION (id="contact", always last before footer):
- 2-col: left = address + phone (href="tel:${analysis.phone || ""}") + email (href="mailto:${analysis.email || ""}") with SVG icons
- right = form: name input, email input, textarea, submit button (type="submit", styled with accent color)
- Form action="#" method="POST" (no JS needed)

FOOTER:
- bg-gray-900 text-white py-12
- 3 cols: brand | nav links (href="#section-id") | contacts
- Bottom: copyright © ${new Date().getFullYear()} ${analysis.businessName}

STRICT RULES:
1. Every <a> must have a real href: #section-id, tel:..., mailto:..., or the original site URL
2. Every <button> must be type="submit" inside a form, or have onclick="document.getElementById('contact').scrollIntoView()"
3. No placeholder text, no Lorem Ipsum — use real content from above
4. Mobile responsive: use Tailwind responsive prefixes (sm:, md:, lg:)
5. Inline SVG icons only (no icon libraries)

OUTPUT: ONLY the complete HTML starting with <!DOCTYPE html>. No markdown fences. No explanations.`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  let html = res.content[0].type === "text" ? res.content[0].text.trim() : "";
  html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const docStart = html.indexOf("<!DOCTYPE");
  if (docStart > 0) html = html.slice(docStart);
  // Close truncated style if needed
  const lastStyleOpen = html.lastIndexOf("<style");
  const lastStyleClose = html.lastIndexOf("</style>");
  if (lastStyleOpen > -1 && lastStyleClose < lastStyleOpen) html += "\n}</style>";
  if (!html.includes("</body>")) html += "\n</body>";
  if (!html.includes("</html>")) html += "\n</html>";

  return html;
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, name = "", category = "Business", address = "", phone = "", email = "" } = body;

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  // 1. Screenshot
  let screenshotBase64 = "";
  try {
    screenshotBase64 = await takeScreenshot(url);
  } catch (err) {
    return NextResponse.json({ error: `Could not screenshot: ${(err as Error).message}` }, { status: 400 });
  }

  // 2. Crawl site (homepage + sub-pages)
  let crawlResult: Awaited<ReturnType<typeof crawlSite>>;
  try {
    crawlResult = await crawlSite(url);
  } catch {
    crawlResult = { home: "", pages: [], phone: "", email: "", address: "" };
  }

  // 3. Vision analysis
  let analysis: SiteAnalysis;
  try {
    analysis = await analyzeWithVision(anthropic, screenshotBase64, crawlResult.home, url, name, category, crawlResult.pages);
  } catch (err) {
    return NextResponse.json({ error: `Analysis failed: ${(err as Error).message}` }, { status: 500 });
  }

  // Merge provided overrides + crawl data
  if (address) analysis.address = address;
  else if (crawlResult.address) analysis.address = crawlResult.address;
  if (phone) analysis.phone = phone;
  else if (crawlResult.phone) analysis.phone = crawlResult.phone;
  if (email) analysis.email = email;
  else if (crawlResult.email) analysis.email = crawlResult.email;

  // 4. Generate redesign
  let html = "";
  try {
    html = await generateRedesign(anthropic, analysis, crawlResult.pages, url, category);
  } catch (err) {
    return NextResponse.json({ error: `Redesign failed: ${(err as Error).message}` }, { status: 500 });
  }

  if (html.length < 3000) {
    return NextResponse.json({ error: "Generated HTML too short — try again" }, { status: 500 });
  }

  // 5. Save
  if (!fs.existsSync(REDESIGN_DIR)) fs.mkdirSync(REDESIGN_DIR, { recursive: true });
  const id = randomUUID();
  fs.writeFileSync(path.join(REDESIGN_DIR, `analyze_${id}.html`), html, "utf-8");

  console.log(`[analyze] ${analysis.businessName} | score=${analysis.score} | pages=${crawlResult.pages.length} | ${Math.round(html.length / 1024)}KB`);

  return NextResponse.json({
    id,
    score: analysis.score,
    reasoning: analysis.scoreReasoning,
    screenshotBase64,
    palette: `${analysis.primaryColor} / ${analysis.accentColor}`,
    analysis: {
      businessName: analysis.businessName,
      tagline: analysis.tagline,
      services: analysis.services,
      pagesFound: crawlResult.pages.map(p => p.label),
      colors: { primary: analysis.primaryColor, accent: analysis.accentColor },
    },
    htmlSize: html.length,
  });
}
