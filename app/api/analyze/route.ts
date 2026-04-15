import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { deployToVercel } from "@/lib/vercel-deploy";
import { searchUnsplashImages, buildImageSearchQuery } from "@/lib/image-search";
import { deriveDesignDirection } from "@/lib/website-planner";

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

  // Photo catalog — same as maps route for consistent quality
  const PHOTO_CATALOG: Record<string, { hero: string[]; content: string[] }> = {
    restaurant: { hero: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=85", "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=85", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=85", "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85"] },
    beauty: { hero: ["https://images.unsplash.com/photo-1560066984-138daaa078e3?w=1600&q=85", "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=85", "https://images.unsplash.com/photo-1560750133-1bab52e63e85?w=800&q=85", "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=85"] },
    fitness: { hero: ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=85", "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=85", "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=85", "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=85"] },
    dental: { hero: ["https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=85", "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&q=85", "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=85", "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=85"] },
    hotel: { hero: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=85", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=85", "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=85", "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=85"] },
    real_estate: { hero: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=85", "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=85", "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=85"] },
    legal: { hero: ["https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=85", "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=85", "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=800&q=85", "https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=800&q=85"] },
    default: { hero: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=85"], content: ["https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=85", "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=85", "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=85"] },
  };
  function getCatalogAnalyze(cat: string) {
    const c = cat.toLowerCase();
    if (c.includes("restaur")||c.includes("café")||c.includes("cafe")||c.includes("bar")||c.includes("pizz")||c.includes("sushi")||c.includes("comida")||c.includes("tasca")||c.includes("food")||c.includes("bistro")||c.includes("padaria")) return PHOTO_CATALOG.restaurant;
    if (c.includes("beleza")||c.includes("salon")||c.includes("beauty")||c.includes("hair")||c.includes("nail")||c.includes("spa")||c.includes("estét")||c.includes("barber")||c.includes("barbearia")) return PHOTO_CATALOG.beauty;
    if (c.includes("fitness")||c.includes("gym")||c.includes("ginás")||c.includes("ginasio")||c.includes("treino")||c.includes("crossfit")) return PHOTO_CATALOG.fitness;
    if (c.includes("dental")||c.includes("denti")||c.includes("clínica")||c.includes("clinica")||c.includes("médico")||c.includes("medico")||c.includes("saúde")||c.includes("saude")||c.includes("health")||c.includes("oral")) return PHOTO_CATALOG.dental;
    if (c.includes("hotel")||c.includes("hostel")||c.includes("pousada")||c.includes("alojamento")||c.includes("apart")) return PHOTO_CATALOG.hotel;
    if (c.includes("imobil")||c.includes("real estate")||c.includes("imóvel")||c.includes("imovel")||c.includes("casa")) return PHOTO_CATALOG.real_estate;
    if (c.includes("legal")||c.includes("law")||c.includes("advog")||c.includes("jurídic")||c.includes("solicit")) return PHOTO_CATALOG.legal;
    return PHOTO_CATALOG.default;
  }
  const catalog = getCatalogAnalyze(category);

  // Smart image search with Playwright (style-aware from instructions)
  const baseSearchQuery = buildImageSearchQuery(category);
  const styleMods: string[] = [];
  if (instructions) {
    const ins = instructions.toLowerCase();
    if (/\b(modern|moderno|contempor)/.test(ins)) styleMods.push("modern");
    if (/\b(rustic|rústico|rustico|tradicional|traditional)/.test(ins)) styleMods.push("rustic");
    if (/\b(minimal|minimalist|minimalista)/.test(ins)) styleMods.push("minimal");
    if (/\b(luxury|luxuos|premium|elegant|elegante)/.test(ins)) styleMods.push("elegant");
    if (/\b(cozy|aconcheg|warm)/.test(ins)) styleMods.push("warm");
    if (/\b(industrial|urban|urbano)/.test(ins)) styleMods.push("industrial");
  }
  const searchQuery = styleMods.length > 0 ? `${styleMods.join(" ")} ${baseSearchQuery}` : baseSearchQuery;
  const foundImages = await searchUnsplashImages(searchQuery, 6, "landscape");
  console.log(`[analyze] unsplash "${searchQuery}" → ${foundImages.length} images`);

  const heroImage = foundImages[0] ?? catalog.hero[0];
  const remainingUnsplash = foundImages.slice(1);
  const contentPhotos = remainingUnsplash.length >= 3
    ? remainingUnsplash
    : [...remainingUnsplash, ...catalog.content];

  const fonts = analysis.fontStyle === "serif"
    ? { heading: "Playfair Display", body: "Lora", import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" }
    : { heading: "Poppins", body: "Inter", import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500&display=swap" };

  const showTeam = ["dental", "denti", "clínica", "clinica", "legal", "law", "advog", "fitness", "gym", "ginás", "salon", "beauty", "barber", "médico", "medico"].some(k => category.toLowerCase().includes(k));

  const sectionsSpec = pageSections.map(s => `
### SECTION id="${s.id}" — ${s.label}
Content from original page:
${s.content || "(generate relevant content based on business type)"}
`).join("\n");

  const isFood = ["restaur","café","cafe","bar","pizz","sushi","comida","tasca","food","pastel","padaria","bakery","bistro"].some(k => category.toLowerCase().includes(k));
  const heroOverline = category.toUpperCase();
  const allNavIds = ["home", ...pageSections.map(p => p.id), "why", ...(showTeam ? ["team"] : []), "contact"];

  const foodAboutSection = isFood
    ? `ABOUT (id="services") — <section id="services" class="py-28 px-6 bg-stone-50">:
- <div class="max-w-4xl mx-auto text-center">
- <p class="tracking-[0.3em] text-xs uppercase mb-5" style="color:${analysis.accentColor}">A NOSSA HISTÓRIA</p>
- H2 class="font-heading text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-8": write a 2-line evocative phrase — line1 in plain text, line2 wrapped in <span class="italic" style="color:${analysis.accentColor}">
- <p class="text-slate-500 text-lg leading-relaxed mb-20 max-w-3xl mx-auto"> — 2-3 sentences capturing the atmosphere: ${analysis.brandPersonality}
- Stats: <div class="grid grid-cols-3 gap-8 border-t border-slate-200 pt-12"> — 3 relevant stats (e.g. anos abertos, avaliação, pratos), each: <div><p class="font-heading text-5xl font-bold mb-2" style="color:${analysis.accentColor}">VALUE</p><p class="text-xs tracking-[0.2em] uppercase text-slate-400">LABEL</p></div>`
    : `SERVICES SHOWCASE (id="services") — <section id="services" class="py-24 px-6 bg-slate-50">:
- <div class="max-w-6xl mx-auto">
- <div class="text-center mb-16">
  * <p class="tracking-[0.25em] text-xs uppercase mb-3" style="color:${analysis.accentColor}">O QUE FAZEMOS</p>
  * H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg max-w-2xl mx-auto
- 2 alternating showcase rows:
  Row 1: <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
    Left: <img src="${contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover shadow-sm">
    Right: h3 font-heading text-2xl font-bold text-slate-900 mb-3 [main service] + p text-slate-500 leading-relaxed mb-8 + 3 key points each: <div class="flex items-start gap-3 mb-3"><div class="w-5 h-5 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">✓ SVG</div><span class="text-slate-600 text-sm">[point from: ${analysis.services.slice(0,3).join(", ")}]</span></div>
  Row 2: <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"> — content FIRST then image: [second service, same structure with points from: ${analysis.services.slice(3).join(", ") || analysis.services.slice(0,3).join(", ")}] then <img src="${contentPhotos[1] || contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover shadow-sm">`;

  const foodMenuSection = isFood
    ? `MENU SHOWCASE (id="menu") — <section id="menu" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- Header: <div class="text-center mb-16"> — <p class="tracking-[0.3em] text-xs uppercase mb-4" style="color:${analysis.accentColor}">O NOSSO MENU</p> + H2 font-heading text-4xl font-bold text-slate-900
- 2 alternating showcase rows:
  Row 1: <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
    Left: <img src="${contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover">
    Right: h3 font-heading text-3xl font-bold text-slate-900 mb-2 [food category] + p text-slate-500 mb-8 + 3-4 items: <div class="py-3 border-b border-slate-100"><p class="font-semibold text-slate-900">[item]</p><p class="text-slate-400 text-sm">[description]</p></div>
  Row 2: content FIRST then <img src="${contentPhotos[1] || contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover">`
    : "";

  const footerLinks = isFood
    ? `Início, Sobre, Menu, Porquê Nós${showTeam ? ", Equipa" : ""}, Contacto`
    : `Início, Serviços, Porquê Nós${showTeam ? ", Equipa" : ""}, Contacto`;

  const direction = deriveDesignDirection(instructions);
  const spacingClass = direction.spacingScale === "compact" ? "py-16 px-6" : direction.spacingScale === "generous" ? "py-32 px-6" : "py-24 px-6";
  const radiusDefault = direction.cornerRadius === "sharp" ? "rounded-md" : direction.cornerRadius === "pill" ? "rounded-3xl" : "rounded-2xl";
  const btnRadius = direction.cornerRadius === "sharp" ? "rounded-md" : "rounded-full";

  const prompt = `You are a world-class web designer creating a premium redesign of a real business site. Produce the highest quality HTML possible — Lovable-level design with flawless typography, generous spacing, and polished visual hierarchy. Wow the viewer on first impression. This is a SINGLE-PAGE website where every nav link scrolls to a section.
${instructions ? `\n🎯 USER REQUIREMENTS — these override everything, implement them exactly:\n${instructions}\n` : ""}
═══ DESIGN DIRECTION (apply to every section) ═══
Tone: ${direction.tone}
Visual style: ${direction.visualStyle}
Default section padding: ${spacingClass}
Default card/image radius: ${radiusDefault}
Default button radius: ${btnRadius}
═════════════════════════════════════════════════

## UI/UX SKILL GUIDANCE
${skillRec || "Apply Soft UI Evolution + Minimalism, generous whitespace, strong visual hierarchy."}

## CRITICAL LAYOUT RULES
- NEVER add vertical text, writing-mode, rotated text, or decorative side text
- NEVER add position:fixed elements except the navbar
- NEVER add position:absolute elements except overlays inside the hero section
- NEVER add custom <style> blocks beyond the reset specified below
- ALL text must flow horizontally, left-to-right
- Follow the exact grid column counts specified in this prompt
- NEVER generate a testimonials section

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

## ORIGINAL SITE PAGES (each becomes a section)
${sectionsSpec}

## HTML STRUCTURE

HEAD:
- <link href="${fonts.import}" rel="stylesheet">
- <script src="https://cdn.tailwindcss.com"></script>
- <script>tailwind.config={theme:{extend:{colors:{primary:"${analysis.primaryColor}",accent:"${analysis.accentColor}"},fontFamily:{heading:["${fonts.heading}"],body:["${fonts.body}"]}}}}</script>
- <style>*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{overflow-x:hidden}img{max-width:100%;height:auto}p,h1,h2,h3,h4,li,span{overflow-wrap:break-word;word-break:break-word}</style>
- <body class="font-body bg-white antialiased">

NAV (id="navbar") — <nav id="navbar" class="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">:
- Inner: <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
- Left: logo circle w-10 h-10 rounded-full bg-primary + business name font-heading font-bold text-xl
- Right desktop: nav links text-sm text-slate-600 hover:text-primary + <a href="#contact" class="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-full">${navCta}</a>
- Nav links: ${allNavIds.map(id => `<a href="#${id}">...</a>`).join(" ")}
- Mobile hamburger id="hamburger" class="md:hidden p-2" + hidden menu id="mobile-menu"
- JS: <script>document.getElementById('hamburger').addEventListener('click',()=>{document.getElementById('mobile-menu').classList.toggle('hidden')})</script>
- NEVER use href="#" alone

HERO (id="home") — <section id="home" class="relative min-h-screen flex items-center justify-center" style="background-image:url('${heroImage}');background-size:cover;background-position:center">:
- Overlay: <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
- Content: <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
  * <p class="tracking-[0.3em] text-xs uppercase text-white/50 mb-6">${heroOverline}</p>
  * <h1 class="font-heading text-5xl md:text-8xl font-bold text-white leading-none mb-6"> — put business name on 2 lines: line1 first word(s) in plain white, line2 remaining in <span class="italic" style="color:${analysis.accentColor}">. If 1 word, use tagline/category as line2.
  * <p class="text-white/75 text-xl mb-10 max-w-2xl mx-auto leading-relaxed"> — 1-sentence value prop
  * <div class="flex flex-col sm:flex-row gap-4 justify-center">
    - <button onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})" class="px-8 py-4 bg-primary hover:opacity-90 text-white font-semibold text-lg rounded-full transition shadow-lg">${ctaPrimary}</button>
    - <button onclick="document.getElementById('services').scrollIntoView({behavior:'smooth'})" class="px-8 py-4 border-2 border-white/70 hover:border-white text-white font-semibold text-lg rounded-full transition backdrop-blur-sm">${ctaSecondary}</button>

${foodAboutSection}

${foodMenuSection}

ORIGINAL SECTIONS (one per crawled page, use real content from the original site):
${sectionsSpec}

WHY US (id="why") — <section id="why" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- Text center: <p class="tracking-[0.25em] text-xs uppercase mb-3" style="color:${analysis.accentColor}">PORQUÊ NÓS</p> + H2 font-heading text-4xl font-bold text-slate-900 mb-4 "Porquê escolher a ${analysis.businessName}?" + p text-slate-500 text-lg max-w-2xl mx-auto mb-16
- <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"> — 4 cards each:
  <div class="flex items-start gap-5 p-7 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/30 transition">
  * <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary"> + SVG icon
  * <div> — <h3 class="font-heading font-semibold text-lg text-slate-900 mb-2"> + <p class="text-slate-500 text-sm leading-relaxed">
  * Reasons specific to ${category}: ${analysis.keyMessages.join(" | ")}
- Stats bar: <div class="bg-slate-900 rounded-2xl p-10 grid grid-cols-3 gap-8 text-center"> each: font-heading text-4xl font-bold text-white + text-slate-400 text-sm label

${showTeam ? `TEAM (id="team") — <section id="team" class="py-24 px-6 bg-slate-50">:
- <div class="max-w-6xl mx-auto">
- Text center header: H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg mb-16
- <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
- 3 team cards for ${category}, each: <div class="text-center p-8 bg-white rounded-2xl border border-slate-100">
  * Avatar: <div class="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center font-heading text-2xl font-bold text-primary mb-4">initials</div>
  * <h3 class="font-heading font-semibold text-lg text-slate-900"> + <p class="text-slate-500 text-sm mt-1"> role + <p class="text-slate-400 text-xs mt-2"> 1-line bio` : ""}

CONTACT (id="contact") — <section id="contact" class="py-24 px-6 ${showTeam ? "bg-slate-50" : "bg-white"}">:
- <div class="max-w-6xl mx-auto">
- <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
- Left: H2 font-heading text-4xl font-bold text-slate-900 mb-4 "${meta.contactTitle}" + p text-slate-500 mb-8
  ${analysis.address ? `* Map pin SVG + <span>${analysis.address}</span>` : ""}
  ${analysis.phone ? `* Phone SVG + <a href="tel:${analysis.phone}" class="text-primary hover:underline">${analysis.phone}</a>` : ""}
  ${analysis.email ? `* Mail SVG + <a href="mailto:${analysis.email}" class="text-primary hover:underline">${analysis.email}</a>` : ""}
- Right: <form class="space-y-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
  * name input, email input, textarea rows="4", <button type="submit" class="w-full bg-primary hover:opacity-90 text-white font-semibold py-4 rounded-xl transition">${contactBtn}</button>

FOOTER — <footer class="bg-slate-900 text-white py-16 px-6">:
- <div class="max-w-6xl mx-auto">
- <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
- Col 1: business name font-heading font-bold text-xl + brand tagline text-slate-400 text-sm
- Col 2: Links Rápidos + <ul class="space-y-2"> ${footerLinks} each <a href="#section-id" class="text-slate-400 hover:text-white text-sm transition">
- Col 3: Contacto + address/phone/email each <p class="text-slate-400 text-sm mb-2">
- <div class="border-t border-slate-800 mt-10 pt-8 text-center text-slate-500 text-sm">© ${new Date().getFullYear()} ${analysis.businessName}. Todos os direitos reservados.</div>

STRICT RULES:
1. Every <a> → real href: #section-id, tel:..., mailto:...
2. Every <button> → type="submit" in form OR onclick scroll
3. No Lorem Ipsum — use real content from original site or generate authentic content
4. Mobile responsive: sm: md: lg: prefixes
5. Inline SVG icons only
6. NO testimonials section

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
