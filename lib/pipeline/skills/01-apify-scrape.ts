import { ApifyClient } from "apify-client";
import { db, initDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const NATIONAL_CHAINS = [
  "mcdonald", "starbucks", "subway", "ikea", "continente", "pingo doce",
  "lidl", "aldi", "zara", "h&m", "decathlon", "sport zone", "vodafone",
  "nos ", "meo ", "galp", "bp ", "repsol", "millennium", "caixa geral",
  "santander", "novo banco", "bpi ", "el corte inglés", "fnac",
];

export interface ScrapedLead {
  id: string;
  runId: string;
  name: string;
  website: string;
  email: string;
  address: string;
  category: string;
  phone: string;
}

function isValidWebsite(url: string): boolean {
  if (!url || url.trim() === "") return false;
  // Filter social profiles and placeholder pages
  const bad = ["facebook.com", "instagram.com", "twitter.com", "linkedin.com", "youtube.com", "tiktok.com"];
  return !bad.some((b) => url.includes(b));
}

function isNationalChain(name: string): boolean {
  const lower = name.toLowerCase();
  return NATIONAL_CHAINS.some((chain) => lower.includes(chain));
}

export async function skill01ApifyScrape(
  runId: string,
  query: string,
  maxLeads: number = 50
): Promise<ScrapedLead[]> {
  await initDb();

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not set");

  const client = new ApifyClient({ token });

  console.log(`[Skill 01] Scraping Google Maps: "${query}" (max ${maxLeads})`);

  const run = await client.actor("compass/crawler-google-places").call({
    searchStringsArray: [query],
    maxCrawledPlacesPerSearch: Math.ceil(maxLeads * 2.5), // Over-fetch to compensate for filtering
    language: "pt",
    exportPlaceUrls: false,
    scrapeReviewsPersonalData: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log(`[Skill 01] Raw results: ${items.length}`);

  const qualified: ScrapedLead[] = [];

  for (const item of items) {
    const name = (item.title as string) ?? "";
    const website = (item.website as string) ?? "";
    const email = (item.email as string) ?? "";
    const address = (item.address as string) ?? "";
    const category = (item.categoryName as string) ?? "";
    const phone = (item.phone as string) ?? "";

    // Filters
    if (!isValidWebsite(website)) continue;
    if (!email || !email.includes("@")) continue;
    if (isNationalChain(name)) continue;

    qualified.push({
      id: randomUUID(),
      runId,
      name,
      website,
      email,
      address,
      category,
      phone,
    });

    if (qualified.length >= maxLeads) break;
  }

  console.log(`[Skill 01] Qualified leads: ${qualified.length}`);

  // Persist to SQLite
  const now = new Date().toISOString();
  for (const lead of qualified) {
    await db.insert(leads).values({
      id: lead.id,
      runId: lead.runId,
      name: lead.name,
      website: lead.website,
      email: lead.email,
      address: lead.address,
      category: lead.category,
      phone: lead.phone,
      status: "scraped",
      createdAt: now,
      updatedAt: now,
    });
  }

  return qualified;
}
