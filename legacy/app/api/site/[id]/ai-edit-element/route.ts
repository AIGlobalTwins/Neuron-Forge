import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

async function userId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  const delays = [1200, 4000];
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number })?.status;
      const msg = String((e as Error)?.message || "");
      const transient = status === 529 || status === 429 || status === 503 || /overloaded|rate.?limit|529|503/i.test(msg);
      if (!transient || i >= tries - 1) throw e;
      await new Promise((r) => setTimeout(r, delays[i] ?? 4000));
    }
  }
}

/**
 * Scoped AI edit: rewrite a SINGLE selected element from the visual editor. The
 * editor sends the element's outerHTML + an instruction; we return only the updated
 * element HTML, which the editor swaps in live (and persists on Save). Small payload
 * → fast and never truncates the whole page.
 */
export async function POST(req: NextRequest) {
  const uid = await userId();
  const body = await req.json().catch(() => ({}));
  const instruction = String(body.instruction ?? "").trim();
  const elementHtml = String(body.elementHtml ?? "").trim();

  if (!instruction) return NextResponse.json({ error: "Describe the change you want." }, { status: 400 });
  if (!elementHtml || elementHtml.length > 60000) return NextResponse.json({ error: "Select a smaller element." }, { status: 400 });

  const anthropicKey = getAnthropicKey(uid);
  if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });

  const prompt = `You are editing ONE element of a static marketing website built with Tailwind CSS (CDN). Apply the user's change to THIS element only.

Return ONLY the updated element HTML — the SAME root tag — with no markdown fences, no explanation, no <html>/<head>/<body> wrapper.

RULES:
- Keep it valid and self-contained. Keep existing Tailwind classes unless the change requires altering them; keep href/src/alt/id attributes and inner content unless the user asks to change them.
- Prefer Tailwind utility classes for styling; inline style="" is also fine.
- Do NOT add <script> tags. Do NOT route links to pages that may not exist — keep existing hrefs.
- Keep the same language as the content.

USER REQUEST: ${instruction}

CURRENT ELEMENT:
${elementHtml}

Return ONLY the updated element HTML.`;

  let out = "";
  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const msg = await withRetry(() =>
      anthropic.messages.create({ model: "claude-sonnet-4-6", max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
    );
    const block = msg.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    out = block && block.type === "text" ? block.text : "";
  } catch (e) {
    const m = String((e as Error).message || "");
    console.error("[ai-edit-element] error:", m);
    if (/overloaded|529/i.test(m)) return NextResponse.json({ error: "Anthropic is overloaded — try again in a moment." }, { status: 503 });
    return NextResponse.json({ error: `AI edit failed: ${m.slice(0, 160)}` }, { status: 502 });
  }

  // Strip any fences / stray prose; keep from the first tag to the last.
  out = out.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = out.indexOf("<");
  const last = out.lastIndexOf(">");
  if (first > 0) out = out.slice(first);
  if (last >= 0 && last < out.length - 1) out = out.slice(0, out.lastIndexOf(">") + 1);

  if (!out || out[0] !== "<" || out.length < 3) {
    return NextResponse.json({ error: "The edit didn't produce valid HTML. Try rephrasing." }, { status: 422 });
  }

  return NextResponse.json({ html: out });
}
