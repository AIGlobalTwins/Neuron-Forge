import Anthropic from "@anthropic-ai/sdk";
import { db, initDb } from "@/lib/db";
import { leads, redesigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { ScrapedLead } from "./01-apify-scrape";

const REDESIGN_DIR = "./outputs/redesigns";

// taste-skill: curated design system combos
const DESIGN_COMBOS = [
  {
    palette: "Midnight Professional",
    bg: "#0f0f0f", surface: "#1a1a1a", accent: "#E8622A", text: "#f5f5f5", muted: "#999",
    font: "'Inter', sans-serif", heading: "'Playfair Display', serif",
    layout: "centered-hero",
  },
  {
    palette: "Clean Slate",
    bg: "#ffffff", surface: "#f8f8f8", accent: "#2563eb", text: "#111827", muted: "#6b7280",
    font: "'DM Sans', sans-serif", heading: "'DM Serif Display', serif",
    layout: "split-hero",
  },
  {
    palette: "Forest Premium",
    bg: "#0d1f1a", surface: "#132b22", accent: "#22c55e", text: "#f0fdf4", muted: "#86efac",
    font: "'Outfit', sans-serif", heading: "'Cormorant Garamond', serif",
    layout: "full-width-hero",
  },
  {
    palette: "Stone & Gold",
    bg: "#fafaf9", surface: "#f5f5f4", accent: "#d97706", text: "#1c1917", muted: "#78716c",
    font: "'Lato', sans-serif", heading: "'Merriweather', serif",
    layout: "sidebar-nav",
  },
  {
    palette: "Electric Dark",
    bg: "#09090b", surface: "#18181b", accent: "#a78bfa", text: "#fafafa", muted: "#71717a",
    font: "'Syne', sans-serif", heading: "'Syne', sans-serif",
    layout: "bold-typography",
  },
];

const UNSPLASH_PHOTOS: Record<string, string[]> = {
  restaurant: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1560066984-138daaa078e3?w=1200&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80",
  ],
  fitness: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
  ],
  default: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80",
  ],
};

function getPhotoForCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("restaur") || cat.includes("café") || cat.includes("bar")) return UNSPLASH_PHOTOS.restaurant[0];
  if (cat.includes("beleza") || cat.includes("cabelei") || cat.includes("salon")) return UNSPLASH_PHOTOS.beauty[0];
  if (cat.includes("ginásio") || cat.includes("fitness") || cat.includes("gym")) return UNSPLASH_PHOTOS.fitness[0];
  return UNSPLASH_PHOTOS.default[Math.floor(Math.random() * UNSPLASH_PHOTOS.default.length)];
}

async function scrapeOriginalContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BWA/1.0)" },
    });
    const html = await res.text();
    // Extract text content roughly
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

export interface RedesignResult {
  leadId: string;
  htmlPath: string;
  htmlSizeBytes: number;
  tokensUsed: number;
  originalContent: string;
}

export async function skill03SiteRedesign(
  lead: ScrapedLead,
  onProgress?: (leadId: string) => void
): Promise<RedesignResult | null> {
  await initDb();

  if (!fs.existsSync(REDESIGN_DIR)) {
    fs.mkdirSync(REDESIGN_DIR, { recursive: true });
  }

  // Mark lead as redesigning
  await db.update(leads).set({
    status: "redesigning",
    updatedAt: new Date().toISOString(),
  }).where(eq(leads.id, lead.id));

  const originalContent = await scrapeOriginalContent(lead.website);
  const combo = DESIGN_COMBOS[Math.floor(Math.random() * DESIGN_COMBOS.length)];
  const heroPhoto = getPhotoForCategory(lead.category);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are an elite web designer creating a stunning single-file HTML website for a local business.

## Business Details
- Name: ${lead.name}
- Category: ${lead.category}
- Address: ${lead.address}
- Phone: ${lead.phone}
- Email: ${lead.email}
- Website: ${lead.website}

## Original Website Content (extract key info from this)
${originalContent || "No content available - invent reasonable placeholder content for this type of business"}

## Design System (taste-skill — use EXACTLY these values)
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
2. Has a stunning hero section with the provided Unsplash photo as background (use as img or background-image)
3. Includes: hero, about/services section, contact section with address + phone + email
4. Is fully responsive (mobile-first)
5. Has smooth scroll, subtle hover animations, professional micro-interactions
6. Looks like a $5,000+ professional project
7. Uses ONLY the design system colors — no other colors
8. Includes a sticky nav with the business name and smooth anchor links
9. Has a professional footer

Output ONLY the complete HTML file starting with <!DOCTYPE html>. No explanations, no markdown, no code blocks.`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    console.error(`[Skill 03] Claude API error for ${lead.name}: ${(err as Error).message}`);
    return null;
  }

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  const rawHtml = response.content[0].type === "text" ? response.content[0].text : "";

  // Validate output
  if (!rawHtml.includes("<html") || !rawHtml.includes("<body") || rawHtml.length < 5000) {
    console.warn(`[Skill 03] Invalid HTML output for ${lead.name} (${rawHtml.length} chars)`);
    return null;
  }

  // Save HTML
  const htmlPath = path.join(REDESIGN_DIR, `${lead.id}.html`);
  fs.writeFileSync(htmlPath, rawHtml, "utf-8");
  const htmlSizeBytes = fs.statSync(htmlPath).size;

  // Persist to DB
  const now = new Date().toISOString();
  await db.insert(redesigns).values({
    id: randomUUID(),
    leadId: lead.id,
    htmlPath,
    htmlSizeBytes,
    originalContent: originalContent.slice(0, 500),
    tokensUsed,
    createdAt: now,
  });

  console.log(`[Skill 03] Redesigned ${lead.name} (${Math.round(htmlSizeBytes / 1024)}KB, ${tokensUsed} tokens)`);
  onProgress?.(lead.id);

  return { leadId: lead.id, htmlPath, htmlSizeBytes, tokensUsed, originalContent };
}
