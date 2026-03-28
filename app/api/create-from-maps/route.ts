import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getAnthropicKey } from "@/lib/settings";
import { deployToVercel } from "@/lib/vercel-deploy";

const REDESIGN_DIR = "./outputs/redesigns";
const UPLOADS_DIR = "./public/uploads";
const SKILL_SCRIPT = path.join(process.cwd(), ".claude/skills/ui-ux-pro-max/scripts/search.py");

const UNSPLASH: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
  beauty:     "https://images.unsplash.com/photo-1560066984-138daaa078e3?w=1600&q=80",
  fitness:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
  dental:     "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=80",
  hotel:      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80",
  legal:      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80",
  default:    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
};

function getHeroImage(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("restaur") || c.includes("café") || c.includes("cafe") || c.includes("bar") || c.includes("pizz")) return UNSPLASH.restaurant;
  if (c.includes("beleza") || c.includes("salon") || c.includes("beauty") || c.includes("spa") || c.includes("barbearia")) return UNSPLASH.beauty;
  if (c.includes("fitness") || c.includes("gym") || c.includes("ginásio") || c.includes("ginasio")) return UNSPLASH.fitness;
  if (c.includes("dental") || c.includes("denti") || c.includes("health") || c.includes("oral") || c.includes("clínica") || c.includes("clinica")) return UNSPLASH.dental;
  if (c.includes("hotel") || c.includes("accommodation") || c.includes("pousada")) return UNSPLASH.hotel;
  if (c.includes("legal") || c.includes("law") || c.includes("advog")) return UNSPLASH.legal;
  return UNSPLASH.default;
}

interface PhotoAnalysis {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  fontStyle: "serif" | "sans-serif";
  brandPersonality: string;
  suggestedTagline: string;
}

async function analyzePhotos(anthropic: Anthropic, imageBlocks: Anthropic.ImageBlockParam[], businessName: string, category: string): Promise<PhotoAnalysis> {
  const defaults: PhotoAnalysis = {
    primaryColor: "#1a1a2e",
    accentColor: "#e94560",
    bgColor: "#ffffff",
    fontStyle: "sans-serif",
    brandPersonality: "professional and welcoming",
    suggestedTagline: "",
  };
  if (imageBlocks.length === 0) return defaults;

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `Analyze these business photos for "${businessName}" (${category}).
Extract visual identity to inform a NEW website design. Return ONLY a JSON object:
{
  "primaryColor": "#hex — dominant brand/decor color from the photos",
  "accentColor": "#hex — complementary highlight color",
  "bgColor": "#hex — suggested clean background (usually light)",
  "fontStyle": "serif or sans-serif based on brand feel",
  "brandPersonality": "one sentence about brand tone and atmosphere",
  "suggestedTagline": "a short compelling tagline inspired by what you see"
}`,
          },
        ],
      }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return defaults;
    const p = JSON.parse(match[0]) as Partial<PhotoAnalysis>;
    return {
      primaryColor: p.primaryColor || defaults.primaryColor,
      accentColor: p.accentColor || defaults.accentColor,
      bgColor: p.bgColor || defaults.bgColor,
      fontStyle: p.fontStyle === "serif" ? "serif" : "sans-serif",
      brandPersonality: p.brandPersonality || defaults.brandPersonality,
      suggestedTagline: p.suggestedTagline || "",
    };
  } catch {
    return defaults;
  }
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

function queryUiSkill(query: string): string {
  try {
    return execSync(`python3 "${SKILL_SCRIPT}" "${query.replace(/[^a-z0-9 ]/gi, "")}"`, { timeout: 8000 }).toString().trim();
  } catch {
    return "";
  }
}

async function extractFromMaps(mapsUrl: string): Promise<{ name: string; address: string; phone: string; category: string }> {
  const result = { name: "", address: "", phone: "", category: "" };
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" });
    await page.goto(mapsUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(2500);
    const title = await page.title();
    result.name = title.replace(/\s*[-–]\s*Google Maps.*$/i, "").trim();
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

function fixHtml(part1: string, part2: string): string {
  let p1 = stripMarkdown(part1);
  const docStart = p1.indexOf("<!DOCTYPE");
  if (docStart > 0) p1 = p1.slice(docStart);
  // Remove premature </body></html> from Part 1 if Claude added them
  p1 = p1.replace(/<\/body\s*>\s*<\/html\s*>/gi, "").replace(/<\/body\s*>/gi, "").replace(/<\/html\s*>/gi, "");

  const p2 = cleanPart2(part2);

  let html = p1 + "\n" + p2;

  // Close any unclosed <style> block
  const lastStyleOpen = html.lastIndexOf("<style");
  const lastStyleClose = html.lastIndexOf("</style>");
  if (lastStyleOpen > -1 && lastStyleClose < lastStyleOpen) html += "\n}</style>";

  if (!html.includes("</body>")) html += "\n</body>";
  if (!html.includes("</html>")) html += "\n</html>";
  return html;
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => ({}));
  const { mapsUrl = "", name = "", category = "Business", address = "", phone = "", email = "", images = [], instructions = "" } = body;

  let userId: string | null = null;
  try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
  const anthropicKey = getAnthropicKey(userId);
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

  const heroImage = getHeroImage(finalCategory);

  // ── UI/UX Skill ────────────────────────────────────────────────────────
  const skillRec = queryUiSkill(finalCategory);

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

  // ── Analyze photos → extract colors, tone, tagline ─────────────────────
  const photoAnalysis = await analyzePhotos(anthropic, imageBlocks, finalName, finalCategory);
  const isSerif = photoAnalysis.fontStyle === "serif";
  const fonts = isSerif
    ? { heading: "Playfair Display", body: "Lora",   import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" }
    : { heading: "Poppins",          body: "Inter",  import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500&display=swap" };

  const sharedContext = `
${instructions ? `USER INSTRUCTIONS (highest priority — follow these above all else): ${instructions}\n` : ""}BUSINESS: ${finalName} | ${finalCategory}
Address: ${finalAddress || "—"} | Phone: ${finalPhone || "—"} | Email: ${email || "—"}
${mapsUrl ? `Maps: ${mapsUrl}` : ""}
Brand colors (extracted from business photos): primary=${photoAnalysis.primaryColor} accent=${photoAnalysis.accentColor} bg=${photoAnalysis.bgColor}
Brand personality: ${photoAnalysis.brandPersonality}
${photoAnalysis.suggestedTagline ? `Suggested tagline: "${photoAnalysis.suggestedTagline}"` : ""}
Hero image: ${heroImage}
Fonts: heading="${fonts.heading}" body="${fonts.body}"
UI/UX: ${skillRec.slice(0, 300) || "Soft UI Evolution + Minimalism"}
`.trim();

  // ── Team section applicability ─────────────────────────────────────────
  const showTeam = ["dental", "denti", "clínica", "clinica", "legal", "law", "advog", "fitness", "gym", "ginás", "salon", "beauty", "barber", "médico", "medico"].some(k => finalCategory.toLowerCase().includes(k));

  // ── Part 1: HEAD + NAV + HERO + SERVICES + WHY US ───────────────────────
  const prompt1 = `You are building Part 1 of a website. Output ONLY what is listed — stop after the "why" section closing tag.
${imageBlocks.length > 0 ? "Business photos were analyzed — use the extracted brand colors and personality from sharedContext. Do NOT embed any uploaded photos in the HTML." : ""}

${sharedContext}

Output Part 1: <!DOCTYPE html> through </section> of WHY US. Include:

HEAD:
<link href="${fonts.import}" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{primary:"${photoAnalysis.primaryColor}",accent:"${photoAnalysis.accentColor}"},fontFamily:{heading:["${fonts.heading}"],body:["${fonts.body}"]}}}}</script>
<style>*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{overflow-x:hidden}img{max-width:100%;height:auto}p,h1,h2,h3,h4,li,span{overflow-wrap:break-word;word-break:break-word}</style>
<body class="font-body bg-white antialiased">

NAV (id="navbar") — <nav id="navbar" class="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">:
- Inner: <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
- Left: <a href="#home" class="flex items-center gap-3"> — logo circle w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-heading font-bold + span font-heading font-bold text-xl text-slate-900
- Right desktop: <div class="hidden md:flex items-center gap-8"> — nav links text-slate-600 hover:text-primary text-sm font-medium transition + <a href="#contact" class="px-5 py-2.5 bg-primary hover:opacity-90 text-white text-sm font-semibold rounded-full transition">${meta.navCta}</a>
- Right mobile: hamburger button id="hamburger" class="md:hidden p-2" (3 lines SVG 24x24)
- Mobile menu: <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 px-6 py-4 space-y-3"> — same links + CTA button w-full
- JS: <script>document.getElementById('hamburger').addEventListener('click',()=>{document.getElementById('mobile-menu').classList.toggle('hidden')})</script>

HERO (id="home") — <section id="home" class="relative min-h-screen flex items-center justify-center" style="background-image:url('${heroImage}');background-size:cover;background-position:center">:
- Overlay: <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
- Content: <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
  * <h1 class="font-heading text-5xl md:text-7xl font-bold text-white leading-tight mb-6"> — compelling headline using business name + tagline
  * <p class="text-white/80 text-xl mb-10 max-w-2xl mx-auto leading-relaxed"> — 1-sentence value prop
  * <div class="flex flex-col sm:flex-row gap-4 justify-center">
    - <button onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})" class="px-8 py-4 bg-primary hover:opacity-90 text-white font-semibold text-lg rounded-full transition shadow-lg">${meta.ctaPrimary}</button>
    - <button onclick="document.getElementById('services').scrollIntoView({behavior:'smooth'})" class="px-8 py-4 border-2 border-white/70 hover:border-white text-white font-semibold text-lg rounded-full transition backdrop-blur-sm">${meta.ctaSecondary}</button>

SERVICES (id="services") — <section id="services" class="py-24 px-6 bg-slate-50">:
- <div class="max-w-6xl mx-auto">
- <div class="text-center mb-16"> — H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg max-w-2xl mx-auto
- <div class="grid grid-cols-1 md:grid-cols-3 gap-8"> — 3 service cards for ${finalCategory}:
  Each card: <div class="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-slate-100 transition-all duration-300 flex flex-col">
  * Icon container: <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary"> + inline SVG w-7 h-7 stroke currentColor
  * <h3 class="font-heading font-bold text-xl text-slate-900 mb-3">
  * <p class="text-slate-500 leading-relaxed flex-1">

WHY US (id="why") — <section id="why" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- Text center header: H2 font-heading text-4xl font-bold text-slate-900 mb-4 "Porquê escolher a ${finalName}?" + p text-slate-500 text-lg max-w-2xl mx-auto mb-16
- <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"> — 4 cards, each:
  <div class="flex items-start gap-5 p-7 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/30 transition">
  * <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary"> + SVG icon
  * <div> — <h3 class="font-heading font-semibold text-lg text-slate-900 mb-2"> + <p class="text-slate-500 text-sm leading-relaxed">
  * Reasons specific to ${finalCategory} and personality: ${photoAnalysis.brandPersonality}
- Stats bar: <div class="bg-slate-900 rounded-2xl p-10 grid grid-cols-3 gap-8 text-center">
  Each: <div> — <div class="font-heading text-4xl font-bold text-white mb-1"> + <div class="text-slate-400 text-sm">

Stop after the WHY US closing </section>. Do NOT add </body> or </html>. Output ONLY valid HTML, no markdown, no explanations.`;

  const res1 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt1 }] }],
  });
  let part1 = res1.content[0].type === "text" ? res1.content[0].text.trim() : "";
  part1 = part1.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // ── Part 2: TESTIMONIALS + TEAM? + CONTACT + FOOTER ─────────────────────
  const prompt2 = `You are building Part 2 of a website. Output ONLY raw <section> HTML blocks listed below.
CRITICAL: Do NOT output <!DOCTYPE>, <html>, <head>, <body>, </body>, </html>, or any wrapper tags — only the sections themselves.

${sharedContext}

Output ONLY these sections (raw HTML, no wrapper, no markdown):

TESTIMONIALS (id="testimonials") — <section id="testimonials" class="py-24 px-6 bg-slate-50">:
- <div class="max-w-6xl mx-auto">
- <div class="text-center mb-16"> — H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg max-w-2xl mx-auto
- <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full"> — 3 cards, EACH card MUST use this exact structure:
  <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col h-full">
    <div class="flex gap-1 mb-4"><!-- 5 star SVGs: <svg class="w-5 h-5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><path d="M10 1l2.4 7.4H20l-6.2 4.5 2.4 7.4L10 16l-6.2 4.3 2.4-7.4L0 8.4h7.6z"/></svg> --></div>
    <p class="text-slate-600 leading-relaxed flex-1 mb-6">"2-3 sentence authentic review in Portuguese"</p>
    <div class="flex items-center gap-3 pt-4 border-t border-slate-100">
      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-sm flex-shrink-0">XX</div>
      <div><p class="font-semibold text-sm text-slate-900">Nome Apelido</p><p class="text-xs text-slate-400">Cliente verificado</p></div>
    </div>
  </div>
  Names and reviews MUST feel authentic for ${finalCategory} in Portuguese. No italic text.

${showTeam ? `TEAM (id="team") — <section id="team" class="py-24 px-6 bg-white">:
- <div class="max-w-6xl mx-auto">
- Text center header: H2 font-heading text-4xl font-bold text-slate-900 mb-4 + p text-slate-500 text-lg mb-16
- <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
- 3 team cards for ${finalCategory}, each: <div class="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
  * Avatar: <div class="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center font-heading text-2xl font-bold text-primary mb-4">initials</div>
  * <h3 class="font-heading font-semibold text-lg text-slate-900"> + <p class="text-slate-500 text-sm mt-1"> role + <p class="text-slate-400 text-xs mt-2"> 1-line bio` : ""}

CONTACT (id="contact") — <section id="contact" class="py-24 px-6 ${showTeam ? "bg-slate-50" : "bg-white"}">:
- <div class="max-w-6xl mx-auto">
- <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
- Left <div>: <h2 class="font-heading text-4xl font-bold text-slate-900 mb-4"> + <p class="text-slate-500 mb-8">
  Contact items each: <div class="flex items-center gap-3 mb-4 text-slate-600">
  * Map pin SVG w-5 h-5 + <span>${finalAddress || "Endereço disponível em breve"}</span>
  * Phone SVG w-5 h-5 + <a href="tel:${finalPhone || ""}" class="text-primary hover:underline">${finalPhone || "—"}</a>
  * Mail SVG w-5 h-5 + <a href="mailto:${email || ""}" class="text-primary hover:underline">${email || "—"}</a>
  ${mapsUrl ? `* <iframe src="https://www.google.com/maps?q=${encodeURIComponent(finalAddress || finalName)}&output=embed" class="w-full h-56 rounded-2xl border-0 mt-6 block"></iframe>` : ""}
- Right <div>: <form class="space-y-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
  * <input type="text" placeholder="O seu nome" class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition">
  * <input type="email" placeholder="O seu email" same class>
  * <textarea placeholder="A sua mensagem" rows="4" same class></textarea>
  * <button type="submit" class="w-full bg-primary hover:opacity-90 text-white font-semibold py-4 rounded-xl transition">${meta.contactBtn}</button>

FOOTER — <footer class="bg-slate-900 text-white py-16 px-6">:
- <div class="max-w-6xl mx-auto">
- <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
- Col 1: <h3 class="font-heading font-bold text-xl mb-3">${finalName}</h3> + <p class="text-slate-400 text-sm leading-relaxed"> brand tagline
- Col 2: <h4 class="font-semibold mb-4">Links Rápidos</h4> + <ul class="space-y-2"> — li: <a href="#section-id" class="text-slate-400 hover:text-white text-sm transition"> Início, Serviços, Porquê Nós, Testemunhos${showTeam ? ", Equipa" : ""}, Contacto
- Col 3: <h4 class="font-semibold mb-4">Contacto</h4> + address/phone/email each on own <p class="text-slate-400 text-sm mb-2">
- Bottom divider + copyright: <div class="border-t border-slate-800 mt-10 pt-8 text-center text-slate-500 text-sm">© ${new Date().getFullYear()} ${finalName}. Todos os direitos reservados.</div>

End with </body></html>

Output ONLY raw HTML. No markdown. No explanations.`;

  const res2 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt2 }],
  });
  let part2 = res2.content[0].type === "text" ? res2.content[0].text.trim() : "";
  part2 = part2.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // ── Combine parts ──────────────────────────────────────────────────────
  let html = fixHtml(part1, part2);

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

  return NextResponse.json({ id, name: finalName, category: finalCategory, address: finalAddress, deployUrl: deployed?.url ?? null });
  } catch (err) {
    console.error("[maps] unhandled error:", err);
    const raw = (err as Error).message || "";
    let friendly = "Erro inesperado — tenta novamente.";
    if (raw.includes("image exceeds")) friendly = "Uma das imagens é demasiado grande. Remove-a e tenta novamente.";
    else if (raw.includes("Could not connect") || raw.includes("ECONNREFUSED")) friendly = "Não foi possível ligar ao serviço. Verifica a tua ligação.";
    else if (raw.includes("API Key") || raw.includes("authentication")) friendly = "API Key inválida. Verifica as configurações.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
