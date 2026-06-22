import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { extractJsonObject } from "@/lib/json-extract";
import { buildBusinessContext, type BusinessProfile } from "@/lib/business-context";

export const runtime = "nodejs";
export const maxDuration = 90;

async function getUserId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

export interface AnalyzerPost {
  caption: string;
  likes: number;
  comments: number;
}

export interface SocialAnalysis {
  handle: string;
  displayName: string;
  followers: number | null;
  following: number | null;
  posts: number | null;
  verified: boolean;
  dataSource: "apify" | "screenshot" | "meta" | "limited";
  score: number; // 0-100
  rating: "weak" | "average" | "good" | "strong";
  engagementRate: string;
  postingCadence: string;
  contentPillars: string[];
  hashtagStrategy: string;
  bioAssessment: string;
  topPosts: AnalyzerPost[];
  strengths: string[];
  issues: { title: string; detail: string }[];
  recommendations: { title: string; detail: string }[];
  contentPlan: { day: string; idea: string; format: string }[];
  summary: string;
}

function normalizeHandle(input: string): string {
  let h = input.trim();
  const m = h.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) h = m[1];
  return h.replace(/^@/, "").replace(/\/$/, "").trim();
}

// Apify Instagram Profile Scraper — real profile + recent posts. Only when a
// platform-level APIFY_TOKEN is configured.
async function fetchApify(handle: string): Promise<{ profile: Record<string, unknown>; posts: AnalyzerPost[] } | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [handle] }),
        signal: AbortSignal.timeout(75_000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>[];
    const p = data?.[0];
    if (!p) return null;
    const latest = (p.latestPosts as Record<string, unknown>[] | undefined) ?? [];
    const posts: AnalyzerPost[] = latest.slice(0, 12).map((x) => ({
      caption: String(x.caption ?? "").slice(0, 300),
      likes: Number(x.likesCount ?? 0),
      comments: Number(x.commentsCount ?? 0),
    }));
    return { profile: p, posts };
  } catch {
    return null;
  }
}

// Best-effort public meta tags (followers/bio) — no key, often partially blocked.
async function fetchMeta(handle: string): Promise<string> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NeuronForge/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    const html = await res.text();
    const desc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
    const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
    return [title && `og:title: ${title}`, desc && `og:description: ${desc}`].filter(Boolean).join("\n");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured." }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const rawHandle = String(body.handle ?? "").trim();
    const screenshot = typeof body.screenshot === "string" ? body.screenshot.replace(/^data:image\/\w+;base64,/, "") : "";
    const clientProfile = body.clientProfile as BusinessProfile | null | undefined;
    if (!rawHandle && !screenshot) return NextResponse.json({ error: "Enter an Instagram handle or drop a screenshot." }, { status: 400 });

    const handle = normalizeHandle(rawHandle);

    // Gather whatever real data we can.
    const apify = await fetchApify(handle);
    const meta = apify ? "" : await fetchMeta(handle);
    const dataSource: SocialAnalysis["dataSource"] = apify ? "apify" : screenshot ? "screenshot" : meta ? "meta" : "limited";

    const businessContext = buildBusinessContext(clientProfile);

    let dataBlock = "";
    if (apify) {
      const p = apify.profile;
      dataBlock = `SOURCE: Apify (real profile data)
username: ${p.username ?? handle}
fullName: ${p.fullName ?? ""}
followers: ${p.followersCount ?? "?"}
following: ${p.followsCount ?? "?"}
postsCount: ${p.postsCount ?? "?"}
verified: ${p.verified ?? false}
biography: ${String(p.biography ?? "").slice(0, 400)}
RECENT POSTS (caption | likes | comments):
${apify.posts.map((x, i) => `[${i + 1}] ${x.caption.replace(/\n/g, " ").slice(0, 160)} | ${x.likes} likes | ${x.comments} comments`).join("\n") || "none"}`;
    } else if (meta) {
      dataBlock = `SOURCE: Public meta tags (limited — followers/bio only, no per-post data)\n${meta}`;
    } else {
      dataBlock = `SOURCE: ${screenshot ? "Screenshot only (analyse the visible profile/grid in the image)" : "No data could be fetched"}\nHandle: @${handle}`;
    }

    const prompt = `You are an elite Instagram strategist auditing the profile @${handle} for a consultant who will pitch this business. Analyse the data ${screenshot ? "AND the attached profile screenshot " : ""}and produce a concrete, specific audit — no generic filler. Ground every claim in the data; if a number is unknown, set it to null and say so.

${dataBlock}
${businessContext}

Return ONLY a JSON object (no markdown) with EXACTLY:
{
  "displayName": string,
  "followers": number|null,
  "following": number|null,
  "posts": number|null,
  "verified": boolean,
  "score": number,                  // 0-100 overall profile health
  "rating": "weak"|"average"|"good"|"strong",
  "engagementRate": string,         // e.g. "2.4%" computed from likes+comments/followers if data allows, else "n/a"
  "postingCadence": string,         // e.g. "~3 posts/week" or "unknown"
  "contentPillars": string[],       // 3-5 recurring themes you actually observe
  "hashtagStrategy": string,        // assessment of their hashtag use
  "bioAssessment": string,          // is the bio clear? CTA? link?
  "topPosts": [{"caption": string, "likes": number, "comments": number}],  // best 2-3 if known, else []
  "strengths": string[],            // 2-4
  "issues": [{"title": string, "detail": string}],          // 3-6 concrete problems
  "recommendations": [{"title": string, "detail": string}], // 4-7 specific, actionable
  "contentPlan": [{"day": string, "idea": string, "format": string}],  // a 7-day plan (Mon..Sun)
  "summary": string                 // 2-3 sentence verdict
}
Rules: be specific to THIS profile (mention real observations). Never invent follower counts or post metrics not in the data. If data is limited, lower the score confidence and focus recommendations on what's visible.`;

    const content: Anthropic.MessageParam["content"] = screenshot
      ? [
          { type: "image", source: { type: "base64", media_type: "image/png", data: screenshot } },
          { type: "text", text: prompt },
        ]
      : prompt;

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 3500,
      messages: [{ role: "user", content }],
    });
    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    const parsed = extractJsonObject<Partial<SocialAnalysis>>(raw);
    if (!parsed) return NextResponse.json({ error: "Could not analyse this profile. Try again or add a screenshot." }, { status: 502 });

    const num = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);
    const result: SocialAnalysis = {
      handle,
      displayName: String(parsed.displayName ?? handle),
      followers: num(parsed.followers ?? (apify?.profile.followersCount as number)),
      following: num(parsed.following ?? (apify?.profile.followsCount as number)),
      posts: num(parsed.posts ?? (apify?.profile.postsCount as number)),
      verified: Boolean(parsed.verified ?? apify?.profile.verified ?? false),
      dataSource,
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      rating: (["weak", "average", "good", "strong"].includes(String(parsed.rating)) ? parsed.rating : "average") as SocialAnalysis["rating"],
      engagementRate: String(parsed.engagementRate ?? "n/a"),
      postingCadence: String(parsed.postingCadence ?? "unknown"),
      contentPillars: Array.isArray(parsed.contentPillars) ? parsed.contentPillars.map(String).slice(0, 6) : [],
      hashtagStrategy: String(parsed.hashtagStrategy ?? ""),
      bioAssessment: String(parsed.bioAssessment ?? ""),
      topPosts: Array.isArray(parsed.topPosts) ? parsed.topPosts.slice(0, 3).map((p) => ({ caption: String(p.caption ?? "").slice(0, 200), likes: Number(p.likes ?? 0), comments: Number(p.comments ?? 0) })) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 4) : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 6).map((i) => ({ title: String(i.title ?? ""), detail: String(i.detail ?? "") })) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 7).map((r) => ({ title: String(r.title ?? ""), detail: String(r.detail ?? "") })) : [],
      contentPlan: Array.isArray(parsed.contentPlan) ? parsed.contentPlan.slice(0, 7).map((d) => ({ day: String(d.day ?? ""), idea: String(d.idea ?? ""), format: String(d.format ?? "") })) : [],
      summary: String(parsed.summary ?? ""),
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[social-analyzer] error:", err);
    return NextResponse.json({ error: (err as Error).message || "Unexpected error." }, { status: 500 });
  }
}
