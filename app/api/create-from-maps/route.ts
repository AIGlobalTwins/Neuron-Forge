import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const REDESIGN_DIR = "./outputs/redesigns";
const UPLOADS_DIR = "./public/uploads";

const DESIGN_COMBOS = [
  { palette: "Midnight Professional", bg: "#0f0f0f", surface: "#1a1a1a", accent: "#E8622A", text: "#f5f5f5", muted: "#999", font: "'Inter', sans-serif", heading: "'Playfair Display', serif", layout: "centered-hero" },
  { palette: "Clean Slate", bg: "#ffffff", surface: "#f8f8f8", accent: "#2563eb", text: "#111827", muted: "#6b7280", font: "'DM Sans', sans-serif", heading: "'DM Serif Display', serif", layout: "split-hero" },
  { palette: "Forest Premium", bg: "#0d1f1a", surface: "#132b22", accent: "#22c55e", text: "#f0fdf4", muted: "#86efac", font: "'Outfit', sans-serif", heading: "'Cormorant Garamond', serif", layout: "full-width-hero" },
  { palette: "Stone & Gold", bg: "#fafaf9", surface: "#f5f5f4", accent: "#d97706", text: "#1c1917", muted: "#78716c", font: "'Lato', sans-serif", heading: "'Merriweather', serif", layout: "sidebar-nav" },
  { palette: "Electric Dark", bg: "#09090b", surface: "#18181b", accent: "#a78bfa", text: "#fafafa", muted: "#71717a", font: "'Syne', sans-serif", heading: "'Syne', sans-serif", layout: "bold-typography" },
];

const UNSPLASH_BY_CATEGORY: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
  beauty: "https://images.unsplash.com/photo-1560066984-138daaa078e3?w=1200&q=80",
  fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
  dental: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=80",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
  default: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
};

function getUnsplash(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("restaur") || cat.includes("café") || cat.includes("bar")) return UNSPLASH_BY_CATEGORY.restaurant;
  if (cat.includes("beleza") || cat.includes("salon") || cat.includes("beauty")) return UNSPLASH_BY_CATEGORY.beauty;
  if (cat.includes("fitness") || cat.includes("gym") || cat.includes("ginásio")) return UNSPLASH_BY_CATEGORY.fitness;
  if (cat.includes("dental") || cat.includes("denti") || cat.includes("health")) return UNSPLASH_BY_CATEGORY.dental;
  if (cat.includes("hotel") || cat.includes("accommodation")) return UNSPLASH_BY_CATEGORY.hotel;
  return UNSPLASH_BY_CATEGORY.default;
}

async function extractFromMaps(mapsUrl: string): Promise<{ name: string; address: string; phone: string; category: string }> {
  const result = { name: "", address: "", phone: "", category: "" };
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" });
    await page.goto(mapsUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(2500);

    // Business name from page title
    const title = await page.title();
    result.name = title.replace(/\s*[-–]\s*Google Maps.*$/i, "").trim();

    // Address
    try {
      result.address = await page.$eval('[data-item-id="address"] .Io6YTe', (el) => (el as HTMLElement).innerText);
    } catch {
      try {
        result.address = await page.$eval('[data-tooltip="Copy address"]', (el) => el.getAttribute("aria-label") ?? "");
      } catch {}
    }

    // Phone
    try {
      const phoneEl = await page.$('[data-item-id^="phone"]');
      if (phoneEl) {
        const text = await phoneEl.evaluate((el) => (el as HTMLElement).innerText);
        result.phone = text.trim();
      }
    } catch {}

    // Category
    try {
      result.category = await page.$eval('button.DkEaL', (el) => (el as HTMLElement).innerText);
    } catch {}

  } finally {
    await browser.close();
  }

  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { mapsUrl = "", name = "", category = "Business", address = "", phone = "", email = "", images = [] } = body;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  // ── Extract from Maps if URL provided ──────────────────────────────────────
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
      console.warn("[create-from-maps] Maps extraction failed:", (err as Error).message);
    }
  }

  if (!finalName) return NextResponse.json({ error: "Could not determine business name. Provide a name or a valid Maps URL." }, { status: 400 });

  // ── Save uploaded images to public/uploads ─────────────────────────────────
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const savedImageUrls: string[] = [];
  for (const img of (images as string[]).slice(0, 3)) {
    if (!img.startsWith("data:image/")) continue;
    const ext = img.includes("image/png") ? "png" : "jpg";
    const imgId = randomUUID();
    const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(path.join(UPLOADS_DIR, `${imgId}.${ext}`), Buffer.from(base64Data, "base64"));
    savedImageUrls.push(`/uploads/${imgId}.${ext}`);
  }

  // ── Build Claude request ───────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const combo = DESIGN_COMBOS[Math.floor(Math.random() * DESIGN_COMBOS.length)];
  const heroImage = savedImageUrls[0] ?? getUnsplash(finalCategory);

  // Include uploaded images as visual context for Claude
  const imageBlocks: Anthropic.ImageBlockParam[] = (images as string[]).slice(0, 3).map((img) => {
    const base64 = img.replace(/^data:image\/\w+;base64,/, "");
    const mediaType = img.includes("image/png") ? "image/png" : "image/jpeg";
    return { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png", data: base64 } };
  });

  const prompt = `You are an elite web designer creating a stunning single-file HTML website for a local business. ${imageBlocks.length > 0 ? "The business photos are attached — use them as visual reference to match the tone, style and feel of the website." : ""}

## Business Details
- Name: ${finalName}
- Category: ${finalCategory}
${finalAddress ? `- Address: ${finalAddress}` : ""}
${finalPhone ? `- Phone: ${finalPhone}` : ""}
${email ? `- Email: ${email}` : ""}
${mapsUrl ? `- Google Maps: ${mapsUrl}` : ""}

## Design System (use EXACTLY these values)
- Palette: ${combo.palette}
- Background: ${combo.bg}
- Surface: ${combo.surface}
- Accent: ${combo.accent}
- Text: ${combo.text}
- Muted: ${combo.muted}
- Body font: ${combo.font}
- Heading font: ${combo.heading}
- Layout: ${combo.layout}
- Hero image: ${heroImage}${savedImageUrls[1] ? `\n- Secondary image: ${savedImageUrls[1]}` : ""}${savedImageUrls[2] ? `\n- Third image: ${savedImageUrls[2]}` : ""}

## Requirements
Create a COMPLETE, production-ready single-file HTML/CSS/JS website that:
1. Uses Google Fonts CDN for the specified fonts
2. Has a stunning hero section using the hero image above as background
3. Includes: sticky nav, hero, about/services section, gallery (if photos provided), contact section with all available info
4. Is fully responsive (mobile-first)
5. Has smooth scroll, subtle hover animations, professional micro-interactions
6. Looks like a $5,000+ professional project
7. Uses ONLY the design system colors
8. Includes a professional footer with name, address and contacts
${savedImageUrls.length > 0 ? `9. References the uploaded photos at these URLs: ${savedImageUrls.join(", ")} in the gallery or about section` : ""}

Output ONLY the complete HTML file starting with <!DOCTYPE html>. No explanations, no markdown, no code blocks.`;

  let html = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [...imageBlocks, { type: "text", text: prompt }],
      }],
    });
    html = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    return NextResponse.json({ error: `Generation failed: ${(err as Error).message}` }, { status: 500 });
  }

  if (!html.includes("<html") || html.length < 3000) {
    return NextResponse.json({ error: "Generated HTML was invalid" }, { status: 500 });
  }

  // ── Save HTML ──────────────────────────────────────────────────────────────
  if (!fs.existsSync(REDESIGN_DIR)) fs.mkdirSync(REDESIGN_DIR, { recursive: true });
  const id = randomUUID();
  fs.writeFileSync(path.join(REDESIGN_DIR, `maps_${id}.html`), html, "utf-8");

  console.log(`[create-from-maps] Generated website for "${finalName}" (${Math.round(html.length / 1024)}KB)`);

  return NextResponse.json({
    id,
    name: finalName,
    category: finalCategory,
    address: finalAddress,
  });
}
