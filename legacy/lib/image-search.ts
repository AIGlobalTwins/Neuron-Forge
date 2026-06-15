import { chromium, Browser } from "playwright";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Image sourcing for generated websites.
 *
 * Priority (first that yields results wins):
 *   1. Unsplash API   (UNSPLASH_ACCESS_KEY)  — relevance-sorted, high quality
 *   2. Pexels API     (PEXELS_API_KEY)       — modern, high quality
 *   3. Unsplash scrape (no key, fallback)    — fragile, launches a browser
 *
 * All paths return high-resolution, hotlinkable CDN URLs (images.unsplash.com /
 * images.pexels.com) so they load on both the platform preview and the deployed
 * site. Returns [] on failure so callers fall back to the curated catalog.
 */

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || "";
const PEXELS_KEY = process.env.PEXELS_API_KEY || "";
const UNSPLASH_PARAMS = "w=1600&q=80&auto=format&fit=crop";

type Orientation = "landscape" | "portrait" | "squarish";

async function fetchJson(url: string, headers: Record<string, string>, ms = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

// ── Unsplash API ────────────────────────────────────────────────────────────
async function unsplashApi(query: string, count: number, orientation: Orientation): Promise<string[]> {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(count + 4, 30)}&orientation=${orientation}&content_filter=high&order_by=relevant`;
  const data = (await fetchJson(url, { Authorization: `Client-ID ${UNSPLASH_KEY}` })) as {
    results?: { urls?: { raw?: string } }[];
  };
  return (data.results || [])
    .map((r) => (r.urls?.raw ? `${r.urls.raw}&${UNSPLASH_PARAMS}` : ""))
    .filter(Boolean)
    .slice(0, count);
}

// ── Pexels API ──────────────────────────────────────────────────────────────
async function pexelsApi(query: string, count: number, orientation: Orientation): Promise<string[]> {
  const o = orientation === "portrait" ? "portrait" : orientation === "squarish" ? "square" : "landscape";
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(count + 4, 30)}&orientation=${o}`;
  const data = (await fetchJson(url, { Authorization: PEXELS_KEY })) as {
    photos?: { src?: { large2x?: string; large?: string } }[];
  };
  return (data.photos || [])
    .map((p) => p.src?.large2x || p.src?.large || "")
    .filter(Boolean)
    .slice(0, count);
}

// ── Unsplash scrape (keyless fallback) ──────────────────────────────────────
async function unsplashScrape(query: string, count: number, orientation: Orientation): Promise<string[]> {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(query.trim())}?orientation=${orientation}`;
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForSelector('figure img[src*="images.unsplash.com/photo-"]', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const rawUrls = await page.$$eval('figure img[src*="images.unsplash.com/photo-"]', (imgs) =>
      imgs.map((img) => (img as HTMLImageElement).src || ""),
    );
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const raw of rawUrls) {
      const m = raw.match(/photo-[a-zA-Z0-9_-]+/);
      if (!m || seen.has(m[0])) continue;
      seen.add(m[0]);
      clean.push(`https://images.unsplash.com/${m[0]}?${UNSPLASH_PARAMS}`);
      if (clean.length >= count) break;
    }
    return clean;
  } catch (err) {
    console.warn(`[image-search] scrape failed for "${query}":`, (err as Error).message);
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Fetch modern, relevant, high-resolution images for the given query.
 * Tries API providers first (fast + reliable), then the browser scrape.
 */
export async function searchImages(query: string, count = 6, orientation: Orientation = "landscape"): Promise<string[]> {
  const q = modernizeQuery(query);
  if (UNSPLASH_KEY) {
    const r = await unsplashApi(q, count, orientation).catch(() => [] as string[]);
    if (r.length) return r;
  }
  if (PEXELS_KEY) {
    const r = await pexelsApi(q, count, orientation).catch(() => [] as string[]);
    if (r.length) return r;
  }
  return unsplashScrape(q, count, orientation);
}

// Back-compat alias (callers still import searchUnsplashImages).
export const searchUnsplashImages = searchImages;

/**
 * Validate a candidate image pool against the actual business with a cheap vision
 * pass (Haiku) and return the best-fitting URLs, best first. Low-res thumbnails are
 * sent to keep cost/latency tiny. Falls back to the first `need` candidates on any
 * error so generation never breaks. Use this BEFORE placing images on a site.
 */
export async function validateImages(
  anthropic: Anthropic,
  opts: { businessName: string; category: string; candidates: string[]; need: number },
): Promise<string[]> {
  const { businessName, category, candidates, need } = opts;
  const pool = candidates.filter(Boolean);
  if (pool.length <= need) return pool;

  // Shrink to thumbnails (Unsplash/Pexels honor width params) then fetch bytes →
  // base64. We send bytes (not URLs) so it works regardless of SDK image-source type.
  const thumb = (u: string) => u.replace(/([?&])w=\d+/, "$1w=400").replace(/([?&])q=\d+/, "$1q=60");

  const fetched = await Promise.all(pool.map((u) => fetchAsBase64(thumb(u))));
  const usable = pool.map((u, i) => ({ i, img: fetched[i] })).filter((x) => x.img);
  if (usable.length <= need) return usable.length ? usable.map((x) => pool[x.i]) : pool.slice(0, need);

  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `Business: "${businessName}" — category: "${category}".\nYou are choosing stock photos for THIS business's website. Below are candidate images, each labelled "Index N". Pick the ${need} BEST that genuinely fit this specific business: correct industry/subject, professional, modern, no embedded text/watermarks/logos, no wrong context. Reject anything off-topic. Reply with ONLY a JSON array of the chosen indices, best first, e.g. [4,1,7].`,
    },
  ];
  for (const { i, img } of usable) {
    content.push({ type: "text", text: `Index ${i}:` });
    content.push({ type: "image", source: { type: "base64", media_type: img!.media_type, data: img!.data } });
  }

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [{ role: "user", content }],
    });
    const txt = res.content[0]?.type === "text" ? res.content[0].text : "";
    const match = txt.match(/\[[\d,\s]*\]/);
    const idx = match ? (JSON.parse(match[0]) as number[]) : [];
    const picked = idx.filter((i) => Number.isInteger(i) && i >= 0 && i < pool.length).map((i) => pool[i]);
    const unique = Array.from(new Set(picked));
    console.log(`[image-search] validated ${pool.length}→${unique.length} for "${businessName}"`);
    return unique.length >= Math.min(need, 2) ? unique : pool.slice(0, need);
  } catch (err) {
    console.warn("[image-search] validate failed:", (err as Error).message);
    return pool.slice(0, need);
  }
}

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Fetch an image and return base64 + media_type, or null on failure. */
async function fetchAsBase64(url: string): Promise<{ media_type: MediaType; data: string } | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const media_type: MediaType = ct.includes("png")
      ? "image/png"
      : ct.includes("webp")
        ? "image/webp"
        : ct.includes("gif")
          ? "image/gif"
          : "image/jpeg";
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { media_type, data };
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

/** Nudge any query toward a modern, editorial, high-end aesthetic. */
export function modernizeQuery(query: string): string {
  const q = query.trim();
  if (/\b(modern|editorial|minimal|premium|contemporary|sleek|aesthetic)\b/i.test(q)) return q;
  return `${q} modern`;
}

/**
 * Build a search query tailored to the business category for optimal results.
 * Always leans modern / editorial so images match a premium, current design.
 */
export function buildImageSearchQuery(category: string): string {
  const c = category.toLowerCase();

  // Food & drink
  if (c.includes("restaur") || c.includes("tasca")) return "modern restaurant plated food editorial";
  if (c.includes("bistro") || c.includes("brasserie")) return "modern bistro interior warm light";
  if (c.includes("café") || c.includes("cafe") || c.includes("coffee")) return "modern specialty coffee shop";
  if (c.includes("bar") && !c.includes("barber")) return "modern cocktail bar interior moody";
  if (c.includes("pizz")) return "artisan pizza modern pizzeria";
  if (c.includes("sushi")) return "modern sushi restaurant minimal";
  if (c.includes("padaria") || c.includes("bakery")) return "modern artisan bakery bread";
  if (c.includes("pastelaria") || c.includes("pastry")) return "modern pastry shop minimal";

  // Beauty & wellness
  if (c.includes("barber")) return "modern barbershop interior editorial";
  if (c.includes("salon") || c.includes("beleza") || c.includes("beauty") || c.includes("hair")) return "modern hair salon minimal interior";
  if (c.includes("nail")) return "modern nail salon minimal";
  if (c.includes("spa") || c.includes("wellness")) return "modern luxury spa wellness";
  if (c.includes("estét") || c.includes("estetica")) return "modern aesthetic clinic minimal";

  // Health & fitness
  if (c.includes("dental") || c.includes("denti") || c.includes("oral")) return "modern dental clinic bright minimal";
  if (c.includes("fitness") || c.includes("gym") || c.includes("ginás") || c.includes("ginasio")) return "modern gym fitness studio";
  if (c.includes("crossfit")) return "modern crossfit box training";
  if (c.includes("yoga") || c.includes("pilates")) return "modern yoga studio minimal bright";
  if (c.includes("clínica") || c.includes("clinica") || c.includes("médico") || c.includes("medico") || c.includes("saúde") || c.includes("saude") || c.includes("health"))
    return "modern medical clinic bright professional";

  // Professional services
  if (c.includes("legal") || c.includes("law") || c.includes("advog") || c.includes("jurídic") || c.includes("juridic") || c.includes("solicit"))
    return "modern law office architecture";
  if (c.includes("imobil") || c.includes("real estate") || c.includes("imóvel") || c.includes("imovel"))
    return "modern architecture luxury interior";
  if (c.includes("construção") || c.includes("construcao") || c.includes("arquitet") || c.includes("architect") || c.includes("obra") || c.includes("renovaç"))
    return "modern architecture construction minimal";
  if (c.includes("contab") || c.includes("account") || c.includes("finance") || c.includes("finanç"))
    return "modern office workspace minimal";

  // Accommodation
  if (c.includes("hotel")) return "modern boutique hotel interior";
  if (c.includes("hostel")) return "modern hostel design interior";
  if (c.includes("pousada") || c.includes("alojamento") || c.includes("accommodation") || c.includes("apart"))
    return "modern boutique guest house";

  // Auto & retail
  if (c.includes("auto") || c.includes("oficina") || c.includes("garage") || c.includes("mechanic") || c.includes("revisão"))
    return "modern auto workshop detailing";
  if (c.includes("retail") || c.includes("shop") || c.includes("loja") || c.includes("boutique"))
    return "modern retail store interior minimal";

  // Education
  if (c.includes("escola") || c.includes("school") || c.includes("education") || c.includes("formaç") || c.includes("academia"))
    return "modern learning space minimal bright";

  // Fallback
  return `modern ${category.toLowerCase().split(" ")[0]} editorial`;
}
