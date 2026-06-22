import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { deployToVercel } from "@/lib/vercel-deploy";
import { searchUnsplashImages, buildImageSearchQuery, validateImages } from "@/lib/image-search";
import { planWebsite, formatPlanForPrompt } from "@/lib/website-planner";
import { buildDesignBrief, formatDesignBriefForPrompt, darkThemeInstruction, heroGuidance } from "@/lib/design-engine";
import { REVEAL_CSS, MOTION_SCRIPT, MOTION_PROMPT } from "@/lib/motion";
import { balanceBlocks } from "@/lib/html-fix";
import { waLink, whatsappPromptBlock } from "@/lib/phone";
import { siteGuard } from "@/lib/site-guard";

// On the mounted disk (/app/data) so generated-site previews survive redeploys.
const REDESIGN_DIR = "./data/redesigns";
const UPLOADS_DIR = "./public/uploads";

// ── Photo catalog by category ──────────────────────────────────────────────
// hero: full-screen background (1600px wide)
// content: section images (800px wide, aspect 4:3)
const PHOTO_CATALOG: Record<string, { hero: string[]; content: string[] }> = {
  restaurant: {
    hero: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=85",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=85",
      "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=85",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=85",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=85",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=85",
    ],
  },
  beauty: {
    hero: [
      "https://images.unsplash.com/photo-1560066984-138daaa078e3?w=1600&q=85",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=85",
      "https://images.unsplash.com/photo-1560750133-1bab52e63e85?w=800&q=85",
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=85",
      "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=800&q=85",
    ],
  },
  fitness: {
    hero: [
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=85",
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=85",
      "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=85",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=85",
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=85",
    ],
  },
  dental: {
    hero: [
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=85",
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&q=85",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=85",
      "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=85",
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=85",
    ],
  },
  hotel: {
    hero: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=85",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=85",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=85",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=85",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=85",
    ],
  },
  real_estate: {
    hero: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=85",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=85",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=85",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=85",
    ],
  },
  legal: {
    hero: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=85",
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=85",
      "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=800&q=85",
      "https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=800&q=85",
    ],
  },
  default: {
    hero: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=85",
    ],
    content: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=85",
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=85",
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=85",
    ],
  },
};

function getCatalog(category: string): { hero: string[]; content: string[] } {
  const c = category.toLowerCase();
  if (c.includes("restaur")||c.includes("café")||c.includes("cafe")||c.includes("bar")||c.includes("pizz")||c.includes("sushi")||c.includes("comida")||c.includes("tasca")||c.includes("food")||c.includes("bistro")||c.includes("pastel")||c.includes("padaria")) return PHOTO_CATALOG.restaurant;
  if (c.includes("beleza")||c.includes("salon")||c.includes("beauty")||c.includes("hair")||c.includes("nail")||c.includes("spa")||c.includes("estét")||c.includes("barber")||c.includes("barbearia")) return PHOTO_CATALOG.beauty;
  if (c.includes("fitness")||c.includes("gym")||c.includes("ginás")||c.includes("ginasio")||c.includes("treino")||c.includes("crossfit")) return PHOTO_CATALOG.fitness;
  if (c.includes("dental")||c.includes("denti")||c.includes("clínica")||c.includes("clinica")||c.includes("médico")||c.includes("medico")||c.includes("saúde")||c.includes("saude")||c.includes("health")||c.includes("oral")) return PHOTO_CATALOG.dental;
  if (c.includes("hotel")||c.includes("hostel")||c.includes("pousada")||c.includes("alojamento")||c.includes("accommodation")||c.includes("apart")) return PHOTO_CATALOG.hotel;
  if (c.includes("imobil")||c.includes("real estate")||c.includes("imóvel")||c.includes("imovel")||c.includes("casa")||c.includes("propriedade")) return PHOTO_CATALOG.real_estate;
  if (c.includes("legal")||c.includes("law")||c.includes("advog")||c.includes("jurídic")||c.includes("solicit")) return PHOTO_CATALOG.legal;
  return PHOTO_CATALOG.default;
}



interface CategoryMeta {
  ctaPrimary: string;   // hero primary button
  ctaSecondary: string; // hero secondary button
  navCta: string;       // nav bar CTA button
  contactTitle: string; // contact section heading
  contactBtn: string;   // form submit button
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

/** Extract business name from Google Maps URL — e.g. /place/O+Barril/@... → "O Barril" */
function nameFromMapsUrl(mapsUrl: string): string {
  try {
    const m = mapsUrl.match(/\/place\/([^/@?]+)/);
    if (!m) return "";
    return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
  } catch {
    return "";
  }
}

async function extractFromMaps(mapsUrl: string): Promise<{ name: string; address: string; phone: string; category: string }> {
  // Instant fallback: parse name from URL before launching browser
  const result = { name: nameFromMapsUrl(mapsUrl), address: "", phone: "", category: "" };

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-PT",
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    await page.goto(mapsUrl, { waitUntil: "domcontentloaded", timeout: 35_000 });
    await page.waitForTimeout(3000);

    // Title is the most reliable source for the name
    const title = await page.title();
    const titleName = title.replace(/\s*[-–]\s*Google Maps.*$/i, "").trim();
    if (titleName) result.name = titleName;

    try { result.address = await page.$eval('[data-item-id="address"] .Io6YTe', (el) => (el as HTMLElement).innerText); } catch {}
    try {
      const phoneEl = await page.$('[data-item-id^="phone"]');
      if (phoneEl) result.phone = (await phoneEl.evaluate((el) => (el as HTMLElement).innerText)).trim();
    } catch {}
    try { result.category = await page.$eval('button.DkEaL', (el) => (el as HTMLElement).innerText); } catch {}
  } finally {
    await browser.close();
  }
  return result;
}

function stripMarkdown(s: string): string {
  return s.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

/** Remove any HTML boilerplate from Part 2 so it can be safely spliced in */
function cleanPart2(raw: string): string {
  let s = stripMarkdown(raw);
  // Drop everything up to and including <body...> if present
  const bodyMatch = s.match(/<body[^>]*>/i);
  if (bodyMatch && bodyMatch.index !== undefined) s = s.slice(bodyMatch.index + bodyMatch[0].length);
  // Drop </body> and </html> if present
  s = s.replace(/<\/body\s*>/gi, "").replace(/<\/html\s*>/gi, "");
  // Drop any stray <!DOCTYPE / <html / <head>…</head> blocks
  s = s.replace(/<!DOCTYPE[^>]*>/gi, "");
  s = s.replace(/<html[^>]*>/gi, "");
  s = s.replace(/<head[\s\S]*?<\/head>/gi, "");
  return s.trim();
}

function fixHtml(part1: string, part2: string, tailScript = ""): string {
  let p1 = stripMarkdown(part1);
  const docStart = p1.indexOf("<!DOCTYPE");
  if (docStart > 0) p1 = p1.slice(docStart);
  // Remove premature </body></html> from Part 1 if Claude added them
  p1 = p1.replace(/<\/body\s*>\s*<\/html\s*>/gi, "").replace(/<\/body\s*>/gi, "").replace(/<\/html\s*>/gi, "");

  const p2 = cleanPart2(part2);

  let html = p1 + "\n" + p2;

  // Repair malformed structure (unclosed divs / missing </section>) so later
  // sections can't get nested into an earlier positioned container.
  html = balanceBlocks(html);

  // Close any unclosed <style> block
  const lastStyleOpen = html.lastIndexOf("<style");
  const lastStyleClose = html.lastIndexOf("</style>");
  if (lastStyleOpen > -1 && lastStyleClose < lastStyleOpen) html += "\n}</style>";

  // Inject the deterministic motion layer before closing the body.
  html += "\n" + MOTION_SCRIPT;
  if (tailScript) html += "\n" + tailScript;

  if (!html.includes("</body>")) html += "\n</body>";
  if (!html.includes("</html>")) html += "\n</html>";

  return html;
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => ({}));
  const { mapsUrl = "", name = "", category = "Business", address = "", phone = "", email = "", images = [], instructions = "", designType = "auto", clientId = null } = body;

  let userId: string | null = null;
  try { userId = await (await import("@/lib/supabase/server")).getSupabaseUserId(); } catch {}
  const anthropicKey = getAnthropicKey(userId);
  const claudeModel = getClaudeModel(userId);
  if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });

  // ── Extract from Maps ──────────────────────────────────────────────────
  let finalName = name;
  let finalCategory = category;
  let finalAddress = address;
  let finalPhone = phone;

  if (mapsUrl) {
    try {
      const extracted = await extractFromMaps(mapsUrl);
      if (!finalName && extracted.name) finalName = extracted.name;
      if (!finalAddress && extracted.address) finalAddress = extracted.address;
      if (!finalPhone && extracted.phone) finalPhone = extracted.phone;
      if (finalCategory === "Business" && extracted.category) finalCategory = extracted.category;
    } catch (err) {
      console.warn("[maps] extraction failed:", (err as Error).message);
    }
  }

  if (!finalName) return NextResponse.json({ error: "Provide a business name or valid Maps URL." }, { status: 400 });

  // ── Save uploaded photos ───────────────────────────────────────────────
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const savedImageUrls: string[] = [];
  for (const img of (images as string[]).slice(0, 3)) {
    if (!img.startsWith("data:image/")) continue;
    const ext = img.includes("image/png") ? "png" : "jpg";
    const imgId = randomUUID();
    fs.writeFileSync(
      path.join(UPLOADS_DIR, `${imgId}.${ext}`),
      Buffer.from(img.replace(/^data:image\/\w+;base64,/, ""), "base64"),
    );
    savedImageUrls.push(`/uploads/${imgId}.${ext}`);
  }

  const catalog = getCatalog(finalCategory);

  // ── Design brief (routes ui-ux-pro-max + taste skills by chosen type) ────
  const brief = buildDesignBrief(designType, finalCategory, instructions);
  console.log(`[maps] design type="${designType}" → style="${brief.styleName}" theme=${brief.theme}`);


  // ── Category-aware CTAs ────────────────────────────────────────────────
  const meta = getCategoryMeta(finalCategory);

  // ── Build image context blocks for Claude (skip images > 4.5 MB) ─────────
  const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB safe margin below Claude's 5 MB limit
  const imageBlocks: Anthropic.ImageBlockParam[] = (images as string[])
    .slice(0, 3)
    .filter((img) => {
      const base64 = img.replace(/^data:image\/\w+;base64,/, "");
      const byteSize = (base64.length * 3) / 4;
      if (byteSize > MAX_IMAGE_BYTES) {
        console.warn(`[maps] skipping oversized image: ${Math.round(byteSize / 1024 / 1024 * 10) / 10} MB`);
        return false;
      }
      return true;
    })
    .map((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: (img.includes("image/png") ? "image/png" : "image/jpeg") as "image/jpeg" | "image/png",
        data: img.replace(/^data:image\/\w+;base64,/, ""),
      },
    }));

  // ── Anthropic client ────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  // ── Determine business type (needed for planning) ──────────────────────
  const isFood = ["restaur","café","cafe","bar","pizz","sushi","comida","tasca","food","pastel","padaria","bakery","bistro"].some(k => finalCategory.toLowerCase().includes(k));
  const showTeam = ["dental", "denti", "clínica", "clinica", "legal", "law", "advog", "fitness", "gym", "ginás", "salon", "beauty", "barber", "médico", "medico"].some(k => finalCategory.toLowerCase().includes(k));

  // ── Plan website first (produces business-specific image queries) ──────
  const plan = await planWebsite({ anthropic, imageBlocks, businessName: finalName, category: finalCategory, instructions, isFood, showTeam, model: claudeModel, designBrief: brief });
  console.log(`[maps] plan: ${plan.tone} | hero="${plan.heroImageQuery}" content="${plan.contentImageQuery}"`);

  // Alias for existing code that still references photoAnalysis fields
  const photoAnalysis = plan;

  // ── Search Unsplash with plan's business-specific queries (parallel) ───
  // Bias the search toward the chosen design vibe (e.g. "minimal bright airy").
  const fallbackQuery = buildImageSearchQuery(finalCategory);
  const vibe = brief.isCustom ? brief.vibeKeywords : "";
  const heroQ = [vibe, plan.heroImageQuery || fallbackQuery].filter(Boolean).join(" ").trim();
  const contentQ = [vibe, plan.contentImageQuery || fallbackQuery].filter(Boolean).join(" ").trim();
  const [heroPoolRaw, contentPoolRaw] = await Promise.all([
    searchUnsplashImages(heroQ, 8, "landscape"),
    searchUnsplashImages(contentQ, 12, "landscape"),
  ]);
  // Validate relevance against the actual business before placing (Haiku vision).
  const [heroPool, contentPool] = await Promise.all([
    validateImages(anthropic, { businessName: finalName, category: finalCategory, candidates: heroPoolRaw, need: 2 }),
    validateImages(anthropic, { businessName: finalName, category: finalCategory, candidates: contentPoolRaw, need: 6 }),
  ]);
  console.log(`[maps] unsplash hero ${heroPoolRaw.length}→${heroPool.length} content ${contentPoolRaw.length}→${contentPool.length}`);

  // ── Resolve final image set (uploaded > unsplash-plan > catalog) ───────
  const heroImage = savedImageUrls[0] ?? heroPool[0] ?? catalog.hero[0];
  const contentPhotos = contentPool.length >= 3
    ? contentPool
    : [...contentPool, ...catalog.content];
  const isSerif = plan.fontStyle === "serif";
  // Chosen design type dictates the font pairing; "auto" keeps the serif/sans default.
  const fonts = brief.isCustom
    ? brief.fonts
    : isSerif
      ? { heading: "Playfair Display", body: "Lora",   import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" }
      : { heading: "Poppins",          body: "Inter",  import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500&display=swap" };

  const heroCity = finalAddress ? (finalAddress.split(",").slice(-1)[0]?.trim() ?? "") : "";
  const heroOverline = [finalCategory, heroCity].filter(Boolean).join(" · ").toUpperCase();

  const planBlock = formatPlanForPrompt(plan);

  const designBlock = formatDesignBriefForPrompt(brief);

  const waUrl = waLink(finalPhone, `Olá! Vim pelo site de ${finalName} e queria mais informações.`);
  const whatsappBlock = whatsappPromptBlock(waUrl);

  const sharedContext = `
${instructions ? `🔴 USER INSTRUCTIONS — MANDATORY, override every default below. Implement ALL of them exactly and visibly: ${instructions}\n\n` : ""}${designBlock}

${MOTION_PROMPT}

${planBlock}

BUSINESS: ${finalName} | ${finalCategory}
Address: ${finalAddress || "—"} | Phone: ${finalPhone || "—"} | Email: ${email || "—"}
${mapsUrl ? `Maps: ${mapsUrl}` : ""}
Brand colors: primary=${plan.primaryColor} accent=${plan.accentColor} bg=${plan.bgColor}
Brand personality: ${plan.brandPersonality}
Hero image: ${heroImage}
Fonts: heading="${fonts.heading}" body="${fonts.body}"
${whatsappBlock ? `\n${whatsappBlock}` : ""}
`.trim();

  const darkBlock = darkThemeInstruction(brief);

  // ── Precomputed section variants ────────────────────────────────────────
  const foodAboutSection = isFood
    ? `ABOUT (id="services") — <section id="services" class="py-24 px-6 bg-stone-50">:
- <div class="max-w-6xl mx-auto">
- <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
  Left <div>:
  * <p class="tracking-[0.3em] text-xs uppercase mb-5" style="color:${photoAnalysis.accentColor}">SOBRE NÓS</p>
  * <h2 class="font-heading text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">: 2-line phrase — line1 plain text, line2 in <span class="italic" style="color:${photoAnalysis.accentColor}">
  * <p class="text-slate-500 text-lg leading-relaxed mb-4"> — 2 sentences about atmosphere: ${photoAnalysis.brandPersonality}
  * <p class="text-slate-500 leading-relaxed mb-10"> — 1 sentence about quality/tradition
  * <div class="grid grid-cols-3 gap-6 border-t border-slate-200 pt-8"> — 3 stats (e.g. "4.1" Google / "€5-10" Por pessoa / "175+" Avaliações), each: <div><p class="font-heading text-4xl font-bold mb-1" style="color:${photoAnalysis.accentColor}">VALUE</p><p class="text-xs tracking-[0.2em] uppercase text-slate-400">LABEL</p></div>
  Right <div>:
  * <img src="${contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover shadow-md">`
    : `SERVICES SHOWCASE (id="services") — <section id="services" class="py-24 px-6 bg-slate-50">:
- <div class="max-w-6xl mx-auto">
- <div class="text-center mb-16">
  * <p class="tracking-[0.25em] text-xs uppercase mb-3" style="color:${photoAnalysis.accentColor}">O QUE FAZEMOS</p>
  * H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg max-w-2xl mx-auto
- 2 alternating showcase rows:
  Row 1: <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
    Left: <img src="${contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover shadow-sm">
    Right: <div> — h3 font-heading text-2xl font-bold text-slate-900 mb-3 [main service name for ${finalCategory}] + p text-slate-500 leading-relaxed mb-8 + 3 key points each: <div class="flex items-start gap-3 mb-3"><div class="w-5 h-5 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg></div><span class="text-slate-600 text-sm">[point]</span></div>
  Row 2: <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"> — content div FIRST then image: <div>[second service, same structure with 3 points]</div> <img src="${contentPhotos[1] || contentPhotos[0]}" class="rounded-2xl w-full aspect-[4/3] object-cover shadow-sm">`;

  const foodMenuSection = isFood
    ? `MENU (id="menu") — <section id="menu" class="py-24 px-6 bg-white">:
- <div class="max-w-5xl mx-auto">
- <div class="text-center mb-16">
  * <p class="tracking-[0.3em] text-xs uppercase mb-4" style="color:${photoAnalysis.accentColor}">A NOSSA EMENTA</p>
  * <h2 class="font-heading text-4xl md:text-5xl font-bold text-slate-900 mb-4">evocative menu title for ${finalName}</h2>
  * <p class="text-slate-500 max-w-xl mx-auto">short subtitle about freshness and daily preparation</p>
- <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
  4 food categories appropriate for ${finalCategory}, each <div>:
  * <h3 class="font-heading text-xl font-bold text-slate-900 mb-4 pb-4 border-b border-slate-200">CATEGORY NAME</h3>
  * 4 items each: <div class="flex items-start justify-between py-3 border-b border-slate-100 last:border-0"><div><p class="font-medium text-slate-800">ITEM NAME</p><p class="text-slate-400 text-sm mt-0.5">short description</p></div><span class="font-semibold text-slate-900 ml-6 shrink-0">€X</span></div>

HORÁRIO (id="horario") — <section id="horario" class="py-24 px-6 bg-stone-50">:
- <div class="max-w-2xl mx-auto">
- <div class="text-center mb-12">
  * <p class="tracking-[0.3em] text-xs uppercase mb-3" style="color:${photoAnalysis.accentColor}">HORÁRIO</p>
  * <h2 class="font-heading text-4xl font-bold text-slate-900">Quando nos visitar</h2>
- <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
  7 rows Monday–Sunday (pt-PT: Segunda-feira … Domingo), each: <div class="flex items-center justify-between px-8 py-4 border-b border-slate-100 last:border-0">
  * Open: <span class="font-medium text-slate-700">DIA</span> — <span class="text-slate-500">HH:MM – HH:MM</span>
  * Closed: <span class="font-medium text-slate-700">DIA</span> — <span class="font-medium" style="color:${photoAnalysis.accentColor}">Encerrado</span>
  Realistic hours for ${finalCategory}, 1 day closed (typically Monday or Wednesday)`
    : "";

  const footerLinks = isFood
    ? `Início(#home), Sobre(#services), Ementa(#menu), Horário(#horario), Contacto(#contact)`
    : `Início(#home), Serviços(#services), Porquê Nós(#why)${showTeam ? ", Equipa(#team)" : ""}, Contacto(#contact)`;

  const navLinkLabels = isFood
    ? `Início(href="#home"), Sobre(href="#services"), Ementa(href="#menu"), Horário(href="#horario"), Contacto(href="#contact")`
    : `Início(href="#home"), Serviços(href="#services"), Porquê Nós(href="#why")${showTeam ? ', Equipa(href="#team")' : ""}, Contacto(href="#contact")`;

  const mapsEmbedLine = mapsUrl || finalAddress
    ? `* <div class="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style="height:380px"><iframe src="https://www.google.com/maps?q=${encodeURIComponent(finalAddress || finalName)}&output=embed" class="w-full h-full border-0" loading="lazy"></iframe></div>`
    : `* <div class="rounded-2xl bg-slate-100 flex items-center justify-center" style="height:380px"><p class="text-slate-400 text-sm">Mapa não disponível</p></div>`;

  const foodContactSection = `CONTACT (id="contact") — <section id="contact" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- <div class="text-center mb-16">
  * <p class="tracking-[0.3em] text-xs uppercase mb-3" style="color:${photoAnalysis.accentColor}">CONTACTO</p>
  * <h2 class="font-heading text-4xl font-bold text-slate-900">Onde nos encontrar</h2>
- <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
- Left <div class="space-y-6">:
  * <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg></div><div><p class="font-semibold text-slate-900 mb-1">Morada</p><p class="text-slate-500">${finalAddress || "Endereço disponível em breve"}</p></div></div>
  * <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.18 2.88 2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.57a16 16 0 006.54 6.54l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div><div><p class="font-semibold text-slate-900 mb-1">Telefone</p><a href="tel:${finalPhone || ""}" class="text-primary hover:underline">${finalPhone || "—"}</a></div></div>
  * <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><p class="font-semibold text-slate-900 mb-1">Horário</p><p class="text-slate-500 text-sm">Ver secção de horário acima</p></div></div>
  * Features: <div class="flex flex-wrap gap-2 mt-2"> — 5 realistic features for ${finalCategory} (e.g. Esplanada, Takeaway, Reservas, WiFi, Acessível), each: <span class="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-full">TAG</span>
- Right <div>:
  ${mapsEmbedLine}`;

  // ── Part 1: HEAD + NAV + HERO + SERVICES + WHY US ───────────────────────
  const prompt1 = `You are a world-class web designer building Part 1 of a premium website. Produce the highest quality HTML possible — Lovable-level design with flawless typography, generous spacing, and polished visual hierarchy.
${imageBlocks.length > 0 ? "Business photos were analyzed — use the extracted brand colors and personality from sharedContext. Do NOT embed any uploaded photos in the HTML." : ""}
${instructions ? `\n🔴🔴 USER INSTRUCTIONS — MANDATORY, HIGHEST PRIORITY. Direct orders; OVERRIDE every default below. Implement ALL exactly and visibly; the USER WINS any conflict:\n"""\n${instructions}\n"""\n` : ""}
CRITICAL LAYOUT RULES:
- NEVER add vertical text, writing-mode, rotated text, or decorative side text
- NEVER add position:fixed elements except the navbar
- NEVER add position:absolute elements except overlays inside the hero section
- NEVER add custom <style> blocks or inline styles beyond what is specified below
- NEVER change the grid column counts specified below (grid-cols-3 means 3, grid-cols-2 means 2)
- ALL text must flow horizontally, left-to-right
- Use ONLY Tailwind utility classes — no custom CSS
${darkBlock}

${sharedContext}

Output Part 1: <!DOCTYPE html> through </section> of ${isFood ? "ABOUT" : "WHY US"}. Include:

HEAD (MUST include everything below, in this order):
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Write an SEO-optimized <title> tag (max 60 chars) combining "${finalName}" + category keywords + city</title>
<meta name="description" content="Write a compelling meta description (140-160 chars) with keywords, benefits, and a call to action">
<meta property="og:title" content="same as title">
<meta property="og:description" content="same as meta description">
<meta property="og:type" content="website">
${heroImage.startsWith("http") ? `<meta property="og:image" content="${heroImage}">` : ""}
<meta name="theme-color" content="${plan.primaryColor}">
<link href="${fonts.import}" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{primary:"${plan.primaryColor}",accent:"${plan.accentColor}"},fontFamily:{heading:["${fonts.heading}"],body:["${fonts.body}"]}}}}</script>
<style>*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{overflow-x:hidden}img{max-width:100%;height:auto}p,li,span{overflow-wrap:break-word}a,.truncate-email{overflow-wrap:anywhere}h1,h2,h3,h4{overflow-wrap:normal;word-break:normal;hyphens:none}${REVEAL_CSS}</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${isFood ? "Restaurant" : showTeam ? "LocalBusiness" : "ProfessionalService"}",
  "name": "${finalName}",
  "description": "(fill with a 1-2 sentence description of the business)",
  ${finalAddress ? `"address": { "@type": "PostalAddress", "streetAddress": "${finalAddress.replace(/"/g, '\\"')}" },` : ""}
  ${finalPhone ? `"telephone": "${finalPhone}",` : ""}
  ${email ? `"email": "${email}",` : ""}
  "url": "",
  "image": "${heroImage.startsWith("http") ? heroImage : ""}"
}
</script>
<body class="font-body bg-white antialiased">

NAV (id="navbar") — <nav id="navbar" class="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">:
- Inner: <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
- Left: <a href="#home" class="flex items-center gap-3"> — logo circle w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-heading font-bold + span font-heading font-bold text-xl text-slate-900
- Right desktop: <div class="hidden md:flex items-center gap-8"> — links: ${navLinkLabels} — each: <a href="HREF" class="text-slate-600 hover:text-primary text-sm font-medium transition">LABEL</a> + <a href="#contact" class="px-5 py-2.5 bg-primary hover:opacity-90 text-white text-sm font-semibold rounded-full transition">${meta.navCta}</a>
- Right mobile: hamburger button id="hamburger" class="md:hidden p-2" (3 lines SVG 24x24)
- Mobile menu: <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 px-6 py-4 space-y-3"> — same links + CTA button w-full
- JS: <script>document.getElementById('hamburger').addEventListener('click',()=>{document.getElementById('mobile-menu').classList.toggle('hidden')})</script>

${heroGuidance({ name: finalName, overline: heroOverline, image: heroImage, accent: photoAnalysis.accentColor, primary: plan.primaryColor, ctaPrimary: meta.ctaPrimary, ctaSecondary: meta.ctaSecondary, contactId: "contact", servicesId: "services" })}

${foodAboutSection}

${!isFood ? `WHY US (id="why") — <section id="why" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- <div class="text-center mb-16">
  * <p class="tracking-[0.25em] text-xs uppercase mb-3" style="color:${photoAnalysis.accentColor}">PORQUÊ NÓS</p>
  * <h2 class="font-heading text-4xl font-bold text-slate-900 mb-4">Porquê escolher a ${finalName}?</h2>
  * <p class="text-slate-500 text-lg max-w-2xl mx-auto">short intro sentence</p>
  </div>
- <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 items-stretch"> — 4 cards, each:
  <div data-reveal class="flex items-start gap-5 p-7 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/30 transition duration-300 hover:-translate-y-1 hover:shadow-xl h-full">
  * <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary"> + SVG icon
  * <div class="min-w-0 flex-1"> — <h3 class="font-heading font-semibold text-lg text-slate-900 mb-2">[2-4 word title]</h3> + <p class="text-slate-500 text-sm leading-relaxed">[1-2 sentences max, 140 chars max]</p>
  * Reasons specific to ${finalCategory} and personality: ${photoAnalysis.brandPersonality}
  * CRITICAL: keep each card's description to 1-2 short sentences — never let a card get much taller than the others.
- Stats bar: <div class="bg-slate-900 rounded-2xl p-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
  Each: <div> — <div class="font-heading text-4xl font-bold text-white mb-1"> + <div class="text-slate-400 text-sm">` : ""}

Stop after the ${isFood ? "ABOUT" : "WHY US"} closing </section>. Do NOT add </body> or </html>. Output ONLY valid HTML, no markdown, no explanations.`;

  const res1 = await anthropic.messages.create({
    model: claudeModel,
    max_tokens: 8000,
    messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt1 }] }],
  });
  let part1 = res1.content[0].type === "text" ? res1.content[0].text.trim() : "";
  part1 = part1.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // ── Part 2: MENU SHOWCASE? + TEAM? + CONTACT + FOOTER ───────────────────
  const prompt2 = `You are a world-class web designer building Part 2 of a premium website. Same quality standard as Part 1 — Lovable-level design, polished typography, generous spacing.
CRITICAL: Do NOT output <!DOCTYPE>, <html>, <head>, <body>, </body>, </html>, or any wrapper tags — only the sections themselves.
${instructions ? `\n🔴🔴 USER INSTRUCTIONS — MANDATORY, HIGHEST PRIORITY. Direct orders; OVERRIDE every default below. Implement ALL exactly and visibly; the USER WINS any conflict:\n"""\n${instructions}\n"""\n` : ""}
CRITICAL LAYOUT RULES:
- NEVER add vertical text, writing-mode, rotated text, or decorative side text
- NEVER add position:fixed or position:absolute elements
- NEVER add custom <style> blocks or inline styles
- NEVER change the grid column counts specified below
- ALL text must flow horizontally, left-to-right
- Use ONLY Tailwind utility classes — no custom CSS
${darkBlock}

${sharedContext}

Output ONLY these sections (raw HTML, no wrapper, no markdown):

${foodMenuSection}

${showTeam ? `TEAM (id="team") — <section id="team" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- Text center header: H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg mb-16
- <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
- 3 team cards for ${finalCategory}, each: <div class="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 h-full">
  * Avatar: <div class="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center font-heading text-2xl font-bold text-primary mb-4">initials</div>
  * <h3 class="font-heading font-semibold text-lg text-slate-900"> + <p class="text-slate-500 text-sm mt-1"> role + <p class="text-slate-400 text-xs mt-2"> 1-line bio` : ""}

${isFood ? foodContactSection : `CONTACT (id="contact") — <section id="contact" class="py-24 px-6 ${showTeam ? "bg-slate-50" : "bg-white"}">:
- <div class="max-w-6xl mx-auto">
- Centered header FIRST (full width, not inside the grid):
  <div class="text-center mb-16">
    * <p class="tracking-[0.3em] text-xs uppercase mb-3" style="color:${photoAnalysis.accentColor}">CONTACTO</p>
    * <h2 class="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4 whitespace-normal">short centered heading (max 4 words, e.g. "Fale Connosco" or "Entre em Contacto")</h2>
    * <p class="text-slate-500 max-w-xl mx-auto">1 short sentence inviting contact</p>
  </div>
- Then grid below: <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
- Left <div class="space-y-5">:
  * <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg></div><div class="min-w-0 flex-1"><p class="font-semibold text-slate-900 mb-1">Morada</p><p class="text-slate-500 text-sm">${finalAddress || "Endereço disponível em breve"}</p></div></div>
  * <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.18 2.88 2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.57a16 16 0 006.54 6.54l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div><div class="min-w-0 flex-1"><p class="font-semibold text-slate-900 mb-1">Telefone</p><a href="tel:${finalPhone || ""}" class="text-primary hover:underline text-sm">${finalPhone || "—"}</a></div></div>
  * <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 2,6 12,13 22,6"/></svg></div><div class="min-w-0 flex-1"><p class="font-semibold text-slate-900 mb-1">Email</p><a href="mailto:${email || ""}" class="text-primary hover:underline text-sm break-all">${email || "—"}</a></div></div>
- Right <div>: <form class="space-y-4 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
  * <input type="text" placeholder="O seu nome" class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition">
  * <input type="email" placeholder="O seu email" same class>
  * <textarea placeholder="A sua mensagem" rows="4" same class></textarea>
  * <button type="submit" class="w-full bg-primary hover:opacity-90 text-white font-semibold py-3 rounded-xl transition">${meta.contactBtn}</button>`}

FOOTER — <footer class="bg-slate-900 text-white py-16 px-6">:
- <div class="max-w-6xl mx-auto">
- <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
- Col 1: <h3 class="font-heading font-bold text-xl mb-3">${finalName}</h3> + <p class="text-slate-400 text-sm leading-relaxed"> brand tagline
- Col 2: <h4 class="font-semibold mb-4">Links Rápidos</h4> + <ul class="space-y-2"> — li for each: <a href="HREF" class="text-slate-400 hover:text-white text-sm transition">LABEL</a> — links: ${footerLinks}
- Col 3: <h4 class="font-semibold mb-4">Contacto</h4> + address/phone/email each on own <p class="text-slate-400 text-sm mb-2">
- Bottom divider + copyright: <div class="border-t border-slate-800 mt-10 pt-8 text-center text-slate-500 text-sm">© ${new Date().getFullYear()} ${finalName}. Todos os direitos reservados.</div>

End with </body></html>

CRITICAL: You MUST output ALL sections listed above completely — do not skip any. The output is invalid if any section header is generated without its full content, or if you stop before the footer and closing tags. Keep each section concise to stay within the token budget, but ALL sections must be fully present.

Output ONLY raw HTML. No markdown. No explanations.`;

  const res2 = await anthropic.messages.create({
    model: claudeModel,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt2 }],
  });
  let part2 = res2.content[0].type === "text" ? res2.content[0].text.trim() : "";
  part2 = part2.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // ── Combine parts ──────────────────────────────────────────────────────
  const html = fixHtml(part1, part2, siteGuard({ waUrl, contactHref: "#contact" }));

  if (html.length < 3000) {
    return NextResponse.json({ error: "Generated HTML too short — try again" }, { status: 500 });
  }

  // ── Save ───────────────────────────────────────────────────────────────
  if (!fs.existsSync(REDESIGN_DIR)) fs.mkdirSync(REDESIGN_DIR, { recursive: true });
  const id = randomUUID();
  fs.writeFileSync(path.join(REDESIGN_DIR, `maps_${id}.html`), html, "utf-8");

  // ── Deploy to Vercel (if token configured) ─────────────────────────────
  const deployed = await deployToVercel(html, finalName);

  console.log(`[maps] "${finalName}" | ${finalCategory} | ${Math.round(html.length / 1024)}KB | photos=${savedImageUrls.length}${deployed ? ` | deployed: ${deployed.url}` : ""}`);

  // Persist to history server-side — the client navigates to the site before its save lands.
  await (await import("@/lib/supabase/server")).saveGenerationServer(userId, "maps", finalName, { category: finalCategory, websiteId: id }, clientId);

  return NextResponse.json({ id, name: finalName, category: finalCategory, address: finalAddress, deployUrl: deployed?.url ?? null });
  } catch (err) {
    console.error("[maps] unhandled error:", err);
    const raw = (err as Error).message || "";
    let friendly = "Unexpected error — please try again.";
    if (raw.includes("image exceeds")) friendly = "One of the images is too large. Remove it and try again.";
    else if (raw.includes("ENOTFOUND") || raw.includes("Connection error") || raw.includes("ECONNREFUSED") || raw.includes("Could not connect")) friendly = "Could not connect to the Anthropic API. Check your internet connection.";
    else if (raw.includes("API Key") || raw.includes("authentication") || raw.includes("401")) friendly = "Invalid API Key. Check your settings.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
