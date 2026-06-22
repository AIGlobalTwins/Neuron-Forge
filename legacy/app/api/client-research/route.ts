import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey } from "@/lib/settings";
import { extractJsonObject } from "@/lib/json-extract";

export const runtime = "nodejs";
export const maxDuration = 60;

// Auto-fill a client profile from the business's own website. Grounded extraction
// (Haiku): only uses facts present on the page; the user always reviews before save.

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.startsWith("169.254.")
  );
}

async function fetchSiteText(rawUrl: string): Promise<string> {
  let u = rawUrl.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
  if (isPrivateHost(parsed.hostname)) throw new Error("blocked host");

  const res = await fetch(parsed.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NeuronForge/1.0; +https://neuron-forge.onrender.com)" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();

  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
  const metaDesc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "").trim();
  const ogDesc = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "").trim();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const head = [title && `TITLE: ${title}`, metaDesc && `META: ${metaDesc}`, ogDesc && `OG: ${ogDesc}`].filter(Boolean).join("\n");
  return `${head}\n\n${text}`.slice(0, 12000);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = String(body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let userId: string | null = null;
  try { userId = await (await import("@/lib/supabase/server")).getSupabaseUserId(); } catch {}
  const anthropicKey = getAnthropicKey(userId);
  if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });

  let siteText = "";
  try {
    siteText = await fetchSiteText(url);
  } catch {
    return NextResponse.json({ error: "Could not open that website. Check the URL." }, { status: 422 });
  }
  if (siteText.replace(/\s/g, "").length < 40) {
    return NextResponse.json({ error: "That page had no readable content to use." }, { status: 422 });
  }

  const prompt = `Extract a business profile from this website content. Return ONLY a JSON object (no markdown, no prose) with EXACTLY these keys:
{
  "name": string,           // the business name
  "category": string,       // short industry/category, e.g. "Restaurant / Food", "Dental / Clinic"
  "description": string,    // 1-2 sentences: what they do and who they serve
  "website": string,        // canonical website URL
  "phone": string,          // phone or WhatsApp number, "" if not on the page
  "hours": string,          // opening hours as one short line, "" if not on the page
  "services": string[],     // up to 8 concrete services/products they offer
  "faqs": [{"question": string, "answer": string}]  // up to 4 FAQs grounded in the content, [] if none
}
RULES: Use ONLY facts present in the content. Never invent a phone, hours, services or FAQs that are not there — leave them "" or []. Match the language of the site. Use this website URL: ${url}

WEBSITE CONTENT:
${siteText}`;

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = msg.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const profile = extractJsonObject<Record<string, unknown>>(textBlock?.text ?? "");
    if (!profile) return NextResponse.json({ error: "Could not read a profile from that page." }, { status: 502 });

    const services = Array.isArray(profile.services)
      ? (profile.services as unknown[]).map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
      : [];
    const faqs = Array.isArray(profile.faqs)
      ? (profile.faqs as { question?: unknown; answer?: unknown }[])
          .filter((f) => f?.question && f?.answer)
          .map((f) => ({ question: String(f.question).trim(), answer: String(f.answer).trim() }))
          .slice(0, 4)
      : [];

    return NextResponse.json({
      profile: {
        name: String(profile.name ?? "").trim(),
        category: String(profile.category ?? "").trim(),
        description: String(profile.description ?? "").trim(),
        website: String(profile.website ?? url).trim(),
        phone: String(profile.phone ?? "").trim(),
        hours: String(profile.hours ?? "").trim(),
        services,
        faqs,
      },
    });
  } catch {
    return NextResponse.json({ error: "AI extraction failed. Try again." }, { status: 502 });
  }
}
