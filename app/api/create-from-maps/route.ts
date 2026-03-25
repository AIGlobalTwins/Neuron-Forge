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

function fixHtml(html: string): string {
  html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = html.indexOf("<!DOCTYPE");
  if (start > 0) html = html.slice(start);
  const lastStyleOpen = html.lastIndexOf("<style");
  const lastStyleClose = html.lastIndexOf("</style>");
  if (lastStyleOpen > -1 && lastStyleClose < lastStyleOpen) html += "\n}</style>";
  if (!html.includes("</body>")) html += "\n</body>";
  if (!html.includes("</html>")) html += "\n</html>";
  return html;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { mapsUrl = "", name = "", category = "Business", address = "", phone = "", email = "", images = [], instructions = "" } = body;

  const anthropicKey = getAnthropicKey();
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

  // ── Build image context blocks for Claude ──────────────────────────────
  const imageBlocks: Anthropic.ImageBlockParam[] = (images as string[]).slice(0, 3).map((img) => ({
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
<body class="font-body">

NAV (id="navbar") — fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur shadow-sm:
- Left: logo div + business name font-heading font-bold
- Right: <a href="#services">Serviços</a> <a href="#why">Porquê Nós</a> <a href="#testimonials">Testemunhos</a> <a href="#contact">Contacto</a> + <a href="#contact" class="bg-blue-600 text-white px-5 py-2 rounded-full">${meta.navCta}</a>
- Hamburger button (id="hamburger") + hidden mobile menu (id="mobile-menu") with same links
- JS: document.getElementById('hamburger').onclick=()=>document.getElementById('mobile-menu').classList.toggle('hidden')

HERO (id="home") — relative min-h-screen flex items-center justify-center, style="background-image:url('${heroImage}');background-size:cover;background-position:center":
- Overlay: div absolute inset-0 bg-black/50
- Content: relative z-10 text-center — H1 font-heading text-5xl md:text-7xl font-bold text-white + tagline p text-white/80 text-xl mt-4 + 2 buttons mt-8:
  * <button onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})" class="bg-blue-600 px-8 py-4 rounded-full text-white font-semibold text-lg">${meta.ctaPrimary}</button>
  * <button onclick="document.getElementById('services').scrollIntoView({behavior:'smooth'})" class="ml-4 border-2 border-white px-8 py-4 rounded-full text-white font-semibold text-lg">${meta.ctaSecondary}</button>

SERVICES (id="services") — py-24 px-6 bg-slate-50:
- H2 font-heading text-4xl font-bold text-center mb-4 + p text-gray-500 text-center mb-12
- grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto
- Exactly 3 real service cards for a ${finalCategory} business, each: bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition
  * Inline SVG icon (stroke), h3 font-heading font-bold text-xl mt-4, p text-gray-500 mt-2

WHY US (id="why") — py-24 px-6 bg-white:
- max-w-6xl mx-auto
- Top: H2 font-heading text-4xl font-bold text-center mb-4 "Porquê escolher a ${finalName}?" + p text-gray-500 text-center mb-16 (compelling 1-sentence reason)
- grid grid-cols-1 md:grid-cols-2 gap-8 mb-16:
  * 4 reason cards, each: flex items-start gap-4 p-6 bg-slate-50 rounded-2xl
    - div w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center + inline SVG icon
    - div: h3 font-heading font-semibold text-lg mb-2 + p text-gray-500 text-sm leading-relaxed
    - Reasons must be real/specific for ${finalCategory} business with personality: ${photoAnalysis.brandPersonality}
- Bottom stat bar: bg-slate-900 rounded-2xl p-8 grid grid-cols-3 gap-8 text-center — each: big number text-4xl font-heading font-bold text-white, label text-gray-400 text-sm mt-1

Stop here. Output ONLY valid HTML, no markdown, no explanations.`;

  const res1 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt1 }] }],
  });
  let part1 = res1.content[0].type === "text" ? res1.content[0].text.trim() : "";
  part1 = part1.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // ── Part 2: TESTIMONIALS + TEAM? + CONTACT + FOOTER ─────────────────────
  const prompt2 = `You are building Part 2 of a website. Output ONLY the remaining sections — no <html>, no <head>, no nav, no hero, no services, no why-us.

${sharedContext}

Output ONLY these sections (raw HTML, no wrapper, no markdown):

TESTIMONIALS (id="testimonials") — py-24 px-6 bg-slate-50:
- max-w-6xl mx-auto
- H2 font-heading text-4xl font-bold text-center mb-4 + p text-gray-500 text-center mb-16
- grid grid-cols-1 md:grid-cols-3 gap-8
- 3 realistic testimonial cards, each: bg-white rounded-2xl p-8 shadow-sm
  * 5 filled star SVGs (text-yellow-400) in a flex row
  * p text-gray-600 leading-relaxed mt-4 italic (realistic 2-3 sentence review about ${finalCategory} experience)
  * div flex items-center gap-3 mt-6: w-10 h-10 rounded-full bg-slate-200 (initials as text) + div (name font-semibold text-sm + "Cliente verificado" text-xs text-gray-400)
  * Names and reviews must feel authentic for ${finalCategory} in Portuguese

${showTeam ? `TEAM (id="team") — py-24 px-6 bg-white:
- max-w-6xl mx-auto
- H2 font-heading text-4xl font-bold text-center mb-4 + p text-gray-500 text-center mb-16
- grid grid-cols-1 md:grid-cols-3 gap-8
- 3 team member cards (realistic names/roles for ${finalCategory}), each: text-center
  * div w-24 h-24 rounded-full bg-slate-200 mx-auto flex items-center justify-center (initials text-2xl font-heading text-slate-500)
  * h3 font-heading font-semibold text-lg mt-4 + p text-gray-500 text-sm (role) + p text-gray-400 text-xs mt-2 (1-line bio)` : ""}

CONTACT (id="contact") — py-24 px-6 ${showTeam ? "bg-slate-50" : "bg-white"}:
- max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16
- Left: H2 font-heading text-4xl font-bold mb-4 + p text-gray-500 mb-8 + contact items (each: flex items-center gap-3 mb-4):
  * SVG map-pin + <span>${finalAddress || "Endereço disponível em breve"}</span>
  * SVG phone + <a href="tel:${finalPhone || ""}" class="text-blue-600 hover:underline">${finalPhone || "—"}</a>
  * SVG mail + <a href="mailto:${email || ""}" class="text-blue-600 hover:underline">${email || "—"}</a>
  ${mapsUrl ? `* <iframe src="https://www.google.com/maps?q=${encodeURIComponent(finalAddress || finalName)}&output=embed" class="w-full h-56 rounded-2xl border-0 mt-6"></iframe>` : ""}
- Right: <form action="#" method="POST" class="space-y-4 bg-white rounded-2xl p-8 shadow-md border border-slate-100">
  * inputs: name, email (class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500")
  * textarea message rows=4 same class
  * <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition">${meta.contactBtn}</button>

FOOTER — bg-gray-900 text-white py-12 px-6:
- max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8
- Col 1: business name font-heading font-bold text-xl + tagline text-gray-400 mt-2 text-sm
- Col 2: "Links Rápidos" h4 font-semibold mb-4 + ul space-y-2: Início, Serviços, Porquê Nós, Testemunhos${showTeam ? ", Equipa" : ""}, Contacto (each as href="#section-id" text-gray-400 hover:text-white text-sm)
- Col 3: "Contacto" h4 font-semibold mb-4 + address/phone/email text-gray-400 text-sm
- Bottom: border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm — © ${new Date().getFullYear()} ${finalName}. Todos os direitos reservados.

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
  let html = fixHtml(part1 + "\n" + part2);

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
}
