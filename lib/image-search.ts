import { chromium, Browser } from "playwright";

/**
 * Search Unsplash for relevant images using Playwright.
 * Returns high-resolution URLs (w=1600, q=85) tailored for hero/content use.
 * Throws nothing — returns empty array on any failure so callers can fall back.
 */
export async function searchUnsplashImages(
  query: string,
  count: number = 6,
  orientation: "landscape" | "portrait" | "squarish" = "landscape",
): Promise<string[]> {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(query.trim())}?orientation=${orientation}`;

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    // Wait for the grid to render
    await page.waitForSelector('figure img[src*="images.unsplash.com/photo-"]', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const rawUrls = await page.$$eval('figure img[src*="images.unsplash.com/photo-"]', (imgs) =>
      imgs.map((img) => (img as HTMLImageElement).src || ""),
    );

    // Extract unique photo IDs and rebuild canonical URLs at our preferred size/quality
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const raw of rawUrls) {
      const m = raw.match(/photo-[a-zA-Z0-9_-]+/);
      if (!m) continue;
      const id = m[0];
      if (seen.has(id)) continue;
      seen.add(id);
      clean.push(`https://images.unsplash.com/${id}?w=1600&q=85&auto=format&fit=crop`);
      if (clean.length >= count) break;
    }
    return clean;
  } catch (err) {
    console.warn(`[image-search] Unsplash search failed for "${query}":`, (err as Error).message);
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Build a search query tailored to the business category for optimal Unsplash results.
 * Adds stylistic refinements ("modern", "elegant") so results match the premium design.
 */
export function buildImageSearchQuery(category: string): string {
  const c = category.toLowerCase();

  // Food & drink
  if (c.includes("restaur") || c.includes("tasca")) return "portuguese restaurant food elegant";
  if (c.includes("bistro") || c.includes("brasserie")) return "bistro restaurant warm lighting";
  if (c.includes("café") || c.includes("cafe") || c.includes("coffee")) return "cozy specialty coffee shop";
  if (c.includes("bar") && !c.includes("barber")) return "elegant cocktail bar interior";
  if (c.includes("pizz")) return "artisan pizza pizzeria rustic";
  if (c.includes("sushi")) return "sushi japanese restaurant minimal";
  if (c.includes("padaria") || c.includes("bakery")) return "artisan bakery bread pastry";
  if (c.includes("pastelaria") || c.includes("pastry")) return "portuguese pastry pastel de nata";

  // Beauty & wellness
  if (c.includes("barber")) return "modern barbershop interior";
  if (c.includes("salon") || c.includes("beleza") || c.includes("beauty") || c.includes("hair")) return "modern hair salon minimal";
  if (c.includes("nail")) return "modern nail salon minimal";
  if (c.includes("spa") || c.includes("wellness")) return "luxury spa wellness zen";
  if (c.includes("estét") || c.includes("estetica")) return "modern aesthetic clinic minimal";

  // Health & fitness
  if (c.includes("dental") || c.includes("denti") || c.includes("oral")) return "modern dental clinic professional";
  if (c.includes("fitness") || c.includes("gym") || c.includes("ginás") || c.includes("ginasio")) return "modern gym fitness equipment";
  if (c.includes("crossfit")) return "crossfit box training";
  if (c.includes("yoga") || c.includes("pilates")) return "yoga studio pilates minimal";
  if (c.includes("clínica") || c.includes("clinica") || c.includes("médico") || c.includes("medico") || c.includes("saúde") || c.includes("saude") || c.includes("health"))
    return "modern medical clinic professional";

  // Professional services
  if (c.includes("legal") || c.includes("law") || c.includes("advog") || c.includes("jurídic") || c.includes("juridic") || c.includes("solicit"))
    return "modern law office professional";
  if (c.includes("imobil") || c.includes("real estate") || c.includes("imóvel") || c.includes("imovel"))
    return "modern real estate architecture";
  if (c.includes("construção") || c.includes("construcao") || c.includes("arquitet") || c.includes("architect") || c.includes("obra") || c.includes("renovaç"))
    return "modern architecture construction";
  if (c.includes("contab") || c.includes("account") || c.includes("finance") || c.includes("finanç"))
    return "modern professional office business";

  // Accommodation
  if (c.includes("hotel")) return "boutique hotel luxury interior";
  if (c.includes("hostel")) return "modern hostel design";
  if (c.includes("pousada") || c.includes("alojamento") || c.includes("accommodation") || c.includes("apart"))
    return "boutique guest house portuguese";

  // Auto & retail
  if (c.includes("auto") || c.includes("oficina") || c.includes("garage") || c.includes("mechanic") || c.includes("revisão"))
    return "modern auto workshop professional";
  if (c.includes("retail") || c.includes("shop") || c.includes("loja") || c.includes("boutique"))
    return "modern retail store minimal";

  // Education
  if (c.includes("escola") || c.includes("school") || c.includes("education") || c.includes("formaç") || c.includes("academia"))
    return "modern education learning minimal";

  // Fallback
  return `modern professional ${category.toLowerCase().split(" ")[0]}`;
}
