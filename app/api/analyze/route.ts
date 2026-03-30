import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { deployToVercel } from "@/lib/vercel-deploy";

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

interface SourceSnapshot {
  metaDescription: string;
  cssVars: string;      // :root custom properties
  styleTags: string;    // inline <style> contents
  headFonts: string;    // Google Fonts / font-face hints
  bodyStructure: string; // first 2000 chars of body HTML
}

async function crawlSite(baseUrl: string): Promise<{ home: string; pages: PageData[]; phone: string; email: string; address: string; source: SourceSnapshot }> {
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

    // Extract HTML/CSS source snapshot for richer analysis
    const source: SourceSnapshot = await homePage.evaluate(() => {
      const metaDescription = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content ?? "";

      // Font hints from <link> tags (Google Fonts, etc.)
      const headFonts = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(l => (l as HTMLLinkElement).href)
        .filter(h => h.includes("font") || h.includes("googleapis"))
        .join(", ");

      // CSS custom properties from :root
      let cssVars = "";
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules ?? [])) {
              if ((rule as CSSStyleRule).selectorText === ":root") {
                cssVars = (rule as CSSStyleRule).cssText.slice(0, 600);
                break;
              }
            }
          } catch { /* cross-origin sheet */ }
          if (cssVars) break;
        }
      } catch { /* ignore */ }

      // Inline <style> contents
      const styleTags = Array.from(document.querySelectorAll("style"))
        .map(s => s.textContent ?? "")
        .join("\n")
        .slice(0, 1200);

      // Body HTML structure (first 2000 chars)
      const bodyStructure = document.body.innerHTML.slice(0, 2000);

      return { metaDescription, headFonts, cssVars, styleTags, bodyStructure };
    });

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
      source,
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
  primaryCta: string;
  secondaryCta: string;
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
  source: SourceSnapshot,
  model: string,
): Promise<SiteAnalysis> {
  const pagesSnapshot = crawledPages.map(p => `[${p.label}]: ${p.content.slice(0, 300)}`).join("\n\n");

  const sourceSection = [
    source.metaDescription ? `Meta description: ${source.metaDescription}` : "",
    source.headFonts ? `Fonts loaded: ${source.headFonts}` : "",
    source.cssVars ? `CSS variables (:root):\n${source.cssVars}` : "",
    source.styleTags ? `Inline CSS (truncated):\n${source.styleTags}` : "",
    source.bodyStructure ? `Body HTML (truncated):\n${source.bodyStructure}` : "",
  ].filter(Boolean).join("\n\n");

  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: screenshotBase64 } },
        {
          type: "text",
          text: `Analyze this business website screenshot, content, and source code. Return ONLY a JSON object (no markdown):

URL: ${url}
Business: ${name || "unknown"}
Category: ${category}

Homepage content:
${homeContent}

Sub-pages found:
${pagesSnapshot || "none"}

Source code (HTML/CSS):
${sourceSection || "none"}

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
  "primaryCta": "exact text of the main CTA button from the site (e.g. Book Now, Reservar, Marcar)",
  "secondaryCta": "exact text of the secondary CTA button if present",
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
    primaryCta: p.primaryCta || "",
    secondaryCta: p.secondaryCta || "",
    score: Math.max(1, Math.min(10, Number(p.score) || 5)),
    scoreReasoning: p.scoreReasoning || "",
  };
}

// ── Category-aware CTAs ───────────────────────────────────────────────────
interface CategoryMeta {
  ctaPrimary: string;
  ctaSecondary: string;
  navCta: string;
  contactTitle: string;
  contactBtn: string;
}

function getCategoryMeta(category: string): CategoryMeta {
  const c = category.toLowerCase();
  if (c.includes("restaur") || c.includes("café") || c.includes("cafe") || c.includes("bar") || c.includes("pizz") || c.includes("sushi") || c.includes("comida") || c.includes("tasca") || c.includes("food"))
    return { ctaPrimary: "Reservar Mesa", ctaSecondary: "Ver Menu", navCta: "Reservar", contactTitle: "Fazer uma Reserva", contactBtn: "Enviar Reserva" };
  if (c.includes("beleza") || c.includes("salon") || c.includes("beauty") || c.includes("hair") || c.includes("nail") || c.includes("spa") || c.includes("estét") || c.includes("estetica") || c.includes("barbearia") || c.includes("barber"))
    return { ctaPrimary: "Marcar Serviço", ctaSecondary: "Ver Serviços", navCta: "Marcar", contactTitle: "Marcar Serviço", contactBtn: "Confirmar Marcação" };
  if (c.includes("fitness") || c.includes("gym") || c.includes("ginásio") || c.includes("ginasio") || c.includes("treino") || c.includes("crossfit"))
    return { ctaPrimary: "Experimentar Grátis", ctaSecondary: "Ver Planos", navCta: "Inscrever", contactTitle: "Começa Hoje", contactBtn: "Pedir Informações" };
  if (c.includes("dental") || c.includes("denti") || c.includes("clínica") || c.includes("clinica") || c.includes("health") || c.includes("oral") || c.includes("médico") || c.includes("medico") || c.includes("saúde") || c.includes("saude"))
    return { ctaPrimary: "Marcar Consulta", ctaSecondary: "Ver Tratamentos", navCta: "Marcar", contactTitle: "Marcar Consulta", contactBtn: "Confirmar Consulta" };
  if (c.includes("hotel") || c.includes("hostel") || c.includes("alojamento") || c.includes("accommodation") || c.includes("pousada") || c.includes("apart"))
    return { ctaPrimary: "Reservar Quarto", ctaSecondary: "Ver Quartos", navCta: "Reservar", contactTitle: "Fazer Reserva", contactBtn: "Enviar Pedido" };
  if (c.includes("legal") || c.includes("law") || c.includes("advog") || c.includes("jurídic") || c.includes("juridic") || c.includes("solicit"))
    return { ctaPrimary: "Consulta Gratuita", ctaSecondary: "Ver Áreas", navCta: "Contactar", contactTitle: "Fale Connosco", contactBtn: "Enviar Mensagem" };
  if (c.includes("imobil") || c.includes("real estate") || c.includes("imóvel") || c.includes("imovel") || c.includes("casa"))
    return { ctaPrimary: "Ver Imóveis", ctaSecondary: "Contactar Agente", navCta: "Contactar", contactTitle: "Fale com um Agente", contactBtn: "Enviar Mensagem" };
  if (c.includes("construção") || c.includes("construcao") || c.includes("arquitetur") || c.includes("architect") || c.includes("obra") || c.includes("renovaç"))
    return { ctaPrimary: "Pedir Orçamento", ctaSecondary: "Ver Projetos", navCta: "Orçamento", contactTitle: "Pedir Orçamento", contactBtn: "Enviar Pedido" };
  if (c.includes("auto") || c.includes("oficina") || c.includes("garage") || c.includes("mechanic") || c.includes("revisão"))
    return { ctaPrimary: "Marcar Revisão", ctaSecondary: "Ver Serviços", navCta: "Marcar", contactTitle: "Marcar Serviço", contactBtn: "Confirmar Marcação" };
  return { ctaPrimary: "Contactar-nos", ctaSecondary: "Ver Serviços", navCta: "Contactar", contactTitle: "Fale Connosco", contactBtn: "Enviar Mensagem" };
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
  instructions: string = "",
  model: string = "claude-sonnet-4-6",
): Promise<string> {
  const skillRec = queryUiSkill(category.toLowerCase().replace(/[^a-z0-9 ]/g, ""));

  // CTAs: prefer what was detected on the original site, fall back to category defaults
  const meta = getCategoryMeta(category);
  const ctaPrimary = analysis.primaryCta || meta.ctaPrimary;
  const ctaSecondary = analysis.secondaryCta || meta.ctaSecondary;
  const navCta = meta.navCta;
  const contactBtn = meta.contactBtn;

  // Map crawled pages to sections
  const pageSections = crawledPages.map(p => ({
    label: p.label,
    id: p.slug,
    content: p.content.slice(0, 800),
  }));

  const isHealthcare = category.toLowerCase().includes("dental") || category.toLowerCase().includes("health");
  const heroImage = isHealthcare
    ? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=80"
    : "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80";

  const fonts = analysis.fontStyle === "serif"
    ? { heading: "Playfair Display", body: "Lora", import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" }
    : { heading: "Poppins", body: "Inter", import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500&display=swap" };

  const showTeam = ["dental", "denti", "clínica", "clinica", "legal", "law", "advog", "fitness", "gym", "ginás", "salon", "beauty", "barber", "médico", "medico"].some(k => category.toLowerCase().includes(k));

  const sectionsSpec = pageSections.map(s => `
### SECTION id="${s.id}" — ${s.label}
Content from original page:
${s.content || "(generate relevant content based on business type)"}
`).join("\n");

  const allNavIds = ["home", ...pageSections.map(p => p.id), "why", "testimonials", ...(showTeam ? ["team"] : []), "contact"];

  const prompt = `You are an expert web designer creating a modern redesign of a real business site. This is a SINGLE-PAGE website where every nav link scrolls to a section.

## UI/UX SKILL GUIDANCE
${skillRec || "Apply Soft UI Evolution + Minimalism, generous whitespace, strong visual hierarchy."}

## CRITICAL LAYOUT RULES
- NEVER add vertical text, writing-mode, rotated text, or decorative side text
- NEVER add position:fixed elements except the navbar
- NEVER add position:absolute elements except overlays inside the hero section
- NEVER add custom <style> blocks — use ONLY Tailwind utility classes
- ALL text must flow horizontally, left-to-right
- Follow the exact grid column counts specified in this prompt

${instructions ? `## USER INSTRUCTIONS (highest priority — follow these above all else)\n${instructions}\n` : ""}## BRAND
- Name: ${analysis.businessName}
- Tagline: "${analysis.tagline}"
- Category: ${category}
- Personality: ${analysis.brandPersonality}
- Key messages: ${analysis.keyMessages.join(" | ")}
- Colors → primary: ${analysis.primaryColor} | accent: ${analysis.accentColor} | bg: ${analysis.bgColor} | text: ${analysis.textColor}
- Font style: ${analysis.fontStyle}
- Phone: ${analysis.phone || "—"} | Email: ${analysis.email || "—"} | Address: ${analysis.address || "—"}
- Services: ${analysis.services.join(", ")}

## ORIGINAL SITE PAGES (each becomes a section)
${sectionsSpec}

## HTML STRUCTURE

HEAD:
- <link rel="stylesheet" href="${fonts.import}">
- <script src="https://cdn.tailwindcss.com"></script>
- <script>tailwind.config={theme:{extend:{colors:{primary:"${analysis.primaryColor}",accent:"${analysis.accentColor}"},fontFamily:{heading:["${fonts.heading}"],body:["${fonts.body}"]}}}}</script>

NAV (fixed top, bg-white/90 backdrop-blur shadow-sm):
- Logo + business name LEFT
- Links: ${allNavIds.map(id => `<a href="#${id}">...</a>`).join(" ")} + <a href="#contact" class="bg-accent text-white px-5 py-2 rounded-full">${navCta}</a> RIGHT
- Mobile hamburger (vanilla JS toggle)
- NEVER use href="#" alone

HERO (id="home", min-h-screen, background-image: url("${heroImage}") center/cover):
- Dark overlay + centered text: H1 + tagline + 2 buttons:
  * "${ctaPrimary}" → href="#contact"
  * "${ctaSecondary}" → href="#${pageSections[0]?.id || "why"}"

ORIGINAL SECTIONS (one per crawled page, use real content):
${sectionsSpec}

WHY US (id="why", py-24 bg-white):
- H2 "Porquê escolher a ${analysis.businessName}?" centered + subheading
- 4-card grid (2×2): each card flex items-start gap-4 p-6 bg-slate-50 rounded-2xl
  * Icon div (w-12 h-12 bg-primary/10 rounded-xl) + inline SVG + h3 + p description
  * Reasons must be specific to ${category} and reflect: ${analysis.brandPersonality}
  * Use key messages: ${analysis.keyMessages.join(" | ")}
- Below grid: dark stat bar (bg-slate-900 rounded-2xl p-8) with 3 numbers + labels

TESTIMONIALS (id="testimonials", py-24 bg-slate-50):
- H2 + subheading centered, mb-16
- 3-col grid of cards (bg-white rounded-2xl p-8 shadow-sm):
  * 5 star SVGs (text-yellow-400)
  * Italic review paragraph (2-3 sentences, authentic, relates to ${category})
  * Reviewer: initials avatar (w-10 h-10 rounded-full bg-slate-200) + name + "Cliente verificado"
  * Names and content in Portuguese, realistic for this business type

${showTeam ? `TEAM (id="team", py-24 bg-white):
- H2 + subheading centered, mb-16
- 3-col grid: each card text-center
  * Avatar circle (w-24 h-24 rounded-full bg-slate-100 mx-auto, show initials)
  * Name h3 font-heading font-semibold mt-4 + role text-primary text-sm + bio text-gray-400 text-xs mt-2
  * Realistic names and roles for ${category}` : ""}

CONTACT (id="contact", py-24 ${showTeam ? "bg-slate-50" : "bg-white"}):
- 2-col: left = H2 + p + address/phone/email with SVG icons (real hrefs: tel:, mailto:)
  ${analysis.address ? `* Address: ${analysis.address}` : ""}
  ${analysis.phone ? `* <a href="tel:${analysis.phone}">` : ""}
  ${analysis.email ? `* <a href="mailto:${analysis.email}">` : ""}
- right = form (action="#" method="POST"): name, email, textarea, submit button label="${contactBtn}"

FOOTER (bg-gray-900 text-white py-12):
- 3 cols: brand+tagline | quick links (href="#section-id") | contact info
- Copyright © ${new Date().getFullYear()} ${analysis.businessName}. Todos os direitos reservados.

STRICT RULES:
1. Every <a> → real href: #section-id, tel:..., mailto:...
2. Every <button> → type="submit" in form OR onclick scroll
3. No Lorem Ipsum — use real content from original site or generate authentic content
4. Mobile responsive: sm: md: lg: prefixes
5. Inline SVG icons only

OUTPUT: ONLY the complete HTML starting with <!DOCTYPE html>. No markdown fences. No explanations.`;

  const res = await anthropic.messages.create({
    model,
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
  try {
  const body = await req.json().catch(() => ({}));
  const { url, name = "", category = "Business", address = "", phone = "", email = "", instructions = "" } = body;

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  let userId: string | null = null;
  try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
  const anthropicKey = getAnthropicKey(userId);
  const claudeModel = getClaudeModel(userId);
  if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });

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
    crawlResult = { home: "", pages: [], phone: "", email: "", address: "", source: { metaDescription: "", headFonts: "", cssVars: "", styleTags: "", bodyStructure: "" } };
  }

  // 3. Vision analysis
  let analysis: SiteAnalysis;
  try {
    analysis = await analyzeWithVision(anthropic, screenshotBase64, crawlResult.home, url, name, category, crawlResult.pages, crawlResult.source, claudeModel);
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
    html = await generateRedesign(anthropic, analysis, crawlResult.pages, url, category, instructions, claudeModel);
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

  // 6. Deploy to Vercel (if token configured)
  const deployed = await deployToVercel(html, analysis.businessName);

  console.log(`[analyze] ${analysis.businessName} | score=${analysis.score} | pages=${crawlResult.pages.length} | ${Math.round(html.length / 1024)}KB${deployed ? ` | deployed: ${deployed.url}` : ""}`);

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
    deployUrl: deployed?.url ?? null,
  });
  } catch (err) {
    console.error("[analyze] unhandled error:", err);
    return NextResponse.json({ error: (err as Error).message || "Erro inesperado — tenta novamente" }, { status: 500 });
  }
}
