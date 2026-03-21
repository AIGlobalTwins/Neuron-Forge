import { chromium, Browser } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { db, initDb } from "@/lib/db";
import { leads, qualifyResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { ScrapedLead } from "./01-apify-scrape";

const SCREENSHOT_DIR = "./outputs/screenshots";
const QUALIFY_THRESHOLD = parseInt(process.env.QUALIFY_SCORE_THRESHOLD ?? "5");

export interface QualifyResult {
  leadId: string;
  score: number;
  decision: "pass" | "fail";
  reasoning: string;
  tokensUsed: number;
  screenshotPath: string | null;
}

async function screenshotSite(browser: Browser, url: string, leadId: string): Promise<string | null> {
  const page = await browser.newPage();
  const screenshotPath = path.join(SCREENSHOT_DIR, `${leadId}.png`);

  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return screenshotPath;
  } catch (err) {
    console.warn(`[Skill 02] Screenshot failed for ${url}: ${(err as Error).message}`);
    return null;
  } finally {
    await page.close();
  }
}

async function assessScreenshot(
  client: Anthropic,
  screenshotPath: string,
  websiteUrl: string
): Promise<{ score: number; reasoning: string; tokensUsed: number }> {
  const imageBuffer = fs.readFileSync(screenshotPath);
  const base64 = imageBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: base64 },
          },
          {
            type: "text",
            text: `You are a professional web designer evaluating if a local business website needs a redesign.

Website: ${websiteUrl}

Score this website from 1 to 10 where:
1-3 = Extremely outdated, terrible design, great redesign opportunity
4-5 = Clearly amateur, weak visuals, good redesign opportunity
6-7 = Mediocre but functional, moderate opportunity
8-10 = Modern and professional, no redesign needed

Evaluate based on: layout quality, typography, visual hierarchy, color scheme, professionalism, mobile responsiveness indicators.

Respond with ONLY valid JSON:
{"score": <1-10>, "reasoning": "<2 sentences explaining the score>"}`,
          },
        ],
      },
    ],
  });

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  const text = response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const parsed = JSON.parse(text.trim());
    return {
      score: Math.max(1, Math.min(10, parseInt(parsed.score))),
      reasoning: parsed.reasoning ?? "No reasoning provided",
      tokensUsed,
    };
  } catch {
    return { score: 5, reasoning: "Could not parse assessment", tokensUsed };
  }
}

export async function skill02SiteQualify(
  leadsToQualify: ScrapedLead[],
  onProgress?: (leadId: string, result: QualifyResult) => void
): Promise<QualifyResult[]> {
  await initDb();

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: QualifyResult[] = [];

  // Single browser for entire batch
  const browser = await chromium.launch({ headless: true });

  try {
    for (const lead of leadsToQualify) {
      // Mark as qualifying
      await db.update(leads).set({
        status: "qualifying",
        updatedAt: new Date().toISOString(),
      }).where(eq(leads.id, lead.id));

      const screenshotPath = await screenshotSite(browser, lead.website, lead.id);

      let result: QualifyResult;

      if (!screenshotPath) {
        result = {
          leadId: lead.id,
          score: 0,
          decision: "fail",
          reasoning: "Could not load website",
          tokensUsed: 0,
          screenshotPath: null,
        };
      } else {
        const assessment = await assessScreenshot(anthropic, screenshotPath, lead.website);
        result = {
          leadId: lead.id,
          score: assessment.score,
          decision: assessment.score <= QUALIFY_THRESHOLD ? "pass" : "fail",
          reasoning: assessment.reasoning,
          tokensUsed: assessment.tokensUsed,
          screenshotPath,
        };
      }

      // Persist qualify result
      const now = new Date().toISOString();
      await db.insert(qualifyResults).values({
        id: randomUUID(),
        leadId: lead.id,
        screenshotPath: result.screenshotPath,
        score: result.score,
        decision: result.decision,
        reasoning: result.reasoning,
        tokensUsed: result.tokensUsed,
        createdAt: now,
      });

      // Update lead status
      await db.update(leads).set({
        status: result.decision === "pass" ? "redesigning" : "disqualified",
        updatedAt: now,
      }).where(eq(leads.id, lead.id));

      results.push(result);
      onProgress?.(lead.id, result);

      console.log(`[Skill 02] ${lead.name}: score=${result.score} → ${result.decision}`);
    }
  } finally {
    // Always close browser
    await browser.close();
  }

  const passed = results.filter((r) => r.decision === "pass").length;
  console.log(`[Skill 02] Qualified: ${passed}/${results.length}`);

  return results;
}
