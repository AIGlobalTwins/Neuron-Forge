import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const REDESIGN_DIR = "./outputs/redesigns";

const DESIGN_COMBOS = [
  { palette: "Midnight Professional", bg: "#0f0f0f", surface: "#1a1a1a", accent: "#E8622A", text: "#f5f5f5", muted: "#999", font: "'Inter', sans-serif", heading: "'Playfair Display', serif", layout: "centered-hero" },
  { palette: "Clean Slate", bg: "#ffffff", surface: "#f8f8f8", accent: "#2563eb", text: "#111827", muted: "#6b7280", font: "'DM Sans', sans-serif", heading: "'DM Serif Display', serif", layout: "split-hero" },
  { palette: "Forest Premium", bg: "#0d1f1a", surface: "#132b22", accent: "#22c55e", text: "#f0fdf4", muted: "#86efac", font: "'Outfit', sans-serif", heading: "'Cormorant Garamond', serif", layout: "full-width-hero" },
  { palette: "Stone & Gold", bg: "#fafaf9", surface: "#f5f5f4", accent: "#d97706", text: "#1c1917", muted: "#78716c", font: "'Lato', sans-serif", heading: "'Merriweather', serif", layout: "sidebar-nav" },
  { palette: "Electric Dark", bg: "#09090b", surface: "#18181b", accent: "#a78bfa", text: "#fafafa", muted: "#71717a", font: "'Syne', sans-serif", heading: "'Syne', sans-serif", layout: "bold-typography" },
];

const UNSPLASH_PHOTOS: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
  beauty: "https://images.unsplash.com/photo-1560066984-138daaa078e3?w=1200&q=80",
  fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
  default: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
};

function getPhoto(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("restaur") || cat.includes("café") || cat.includes("bar")) return UNSPLASH_PHOTOS.restaurant;
  if (cat.includes("beleza") || cat.includes("cabelei") || cat.includes("salon") || cat.includes("beauty")) return UNSPLASH_PHOTOS.beauty;
  if (cat.includes("ginásio") || cat.includes("fitness") || cat.includes("gym")) return UNSPLASH_PHOTOS.fitness;
  return UNSPLASH_PHOTOS.default;
}

async function fetchContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NWA/1.0)" },
    });
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, name = "Business", category = "Business", address = "", phone = "", email = "" } = body;

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  // ── Step 1: Screenshot ───────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: true });
  let screenshotBase64: string | null = null;

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    const buf = await page.screenshot({ fullPage: false });
    screenshotBase64 = buf.toString("base64");
    await page.close();
  } catch (err) {
    await browser.close();
    return NextResponse.json({ error: `Could not load website: ${(err as Error).message}` }, { status: 400 });
  }

  await browser.close();

  // ── Step 2: Assess with Claude Vision ────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  let score = 5;
  let reasoning = "";

  try {
    const qualifyRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: screenshotBase64 },
          },
          {
            type: "text",
            text: `You are a professional web designer evaluating a local business website.

Website: ${url}

Score this website from 1 to 10 where:
1-3 = Extremely outdated, terrible design, urgent redesign needed
4-5 = Clearly amateur, weak visuals, good redesign opportunity
6-7 = Mediocre but functional, could be improved
8-10 = Modern and professional, already solid

Evaluate based on: layout quality, typography, visual hierarchy, color scheme, overall professionalism.

Respond with ONLY valid JSON:
{"score": <1-10>, "reasoning": "<2 sentences explaining the score>"}`,
          },
        ],
      }],
    });

    const text = qualifyRes.content[0].type === "text" ? qualifyRes.content[0].text : "{}";
    const parsed = JSON.parse(text.trim());
    score = Math.max(1, Math.min(10, parseInt(parsed.score)));
    reasoning = parsed.reasoning ?? "";
  } catch {
    reasoning = "Could not assess website design.";
  }

  // ── Step 3: Generate redesign ─────────────────────────────────────────────
  const originalContent = await fetchContent(url);
  const combo = DESIGN_COMBOS[Math.floor(Math.random() * DESIGN_COMBOS.length)];
  const heroPhoto = getPhoto(category);

  const prompt = `You are an elite web designer creating a stunning single-file HTML website for a local business.

## Business Details
- Name: ${name}
- Category: ${category}
- Website: ${url}
${address ? `- Address: ${address}` : ""}
${phone ? `- Phone: ${phone}` : ""}
${email ? `- Email: ${email}` : ""}

## Original Website Content (extract key info from this)
${originalContent || "No content available — invent reasonable placeholder content for this type of business"}

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
- Hero photo: ${heroPhoto}

## Requirements
Create a COMPLETE, production-ready single-file HTML/CSS/JS website that:
1. Uses Google Fonts CDN for the specified fonts
2. Has a stunning hero section with the provided Unsplash photo as background
3. Includes: hero, about/services section, contact section with address + phone + email
4. Is fully responsive (mobile-first)
5. Has smooth scroll, subtle hover animations, professional micro-interactions
6. Looks like a $5,000+ professional project
7. Uses ONLY the design system colors — no other colors
8. Includes a sticky nav with the business name and smooth anchor links
9. Has a professional footer

Output ONLY the complete HTML file starting with <!DOCTYPE html>. No explanations, no markdown, no code blocks.`;

  let html = "";
  try {
    const redesignRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    html = redesignRes.content[0].type === "text" ? redesignRes.content[0].text : "";
  } catch (err) {
    return NextResponse.json({ error: `Redesign failed: ${(err as Error).message}` }, { status: 500 });
  }

  if (!html.includes("<html") || html.length < 3000) {
    return NextResponse.json({ error: "Generated HTML was invalid or too short" }, { status: 500 });
  }

  // Save HTML to disk
  if (!fs.existsSync(REDESIGN_DIR)) fs.mkdirSync(REDESIGN_DIR, { recursive: true });
  const id = randomUUID();
  const htmlPath = path.join(REDESIGN_DIR, `analyze_${id}.html`);
  fs.writeFileSync(htmlPath, html, "utf-8");

  return NextResponse.json({
    id,
    score,
    reasoning,
    screenshotBase64,
    palette: combo.palette,
    htmlSize: html.length,
  });
}
