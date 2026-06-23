import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 120;

const DIRS = [path.join(process.cwd(), "data", "redesigns"), path.join(process.cwd(), "outputs", "redesigns")];

function htmlPathFor(id: string): string | null {
  if (!/^[\w-]+$/.test(id)) return null;
  for (const d of DIRS) {
    for (const f of [`analyze_${id}.html`, `maps_${id}.html`, `${id}.html`]) {
      const p = path.join(d, f);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

async function userId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  const delays = [1500, 5000];
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number })?.status;
      const msg = String((e as Error)?.message || "");
      const transient = status === 529 || status === 429 || status === 503 || /overloaded|rate.?limit|529|503/i.test(msg);
      if (!transient || i >= tries - 1) throw e;
      await new Promise((r) => setTimeout(r, delays[i] ?? 5000));
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await userId();
  // (middleware already gates this route; uid may be null only when supabase is off)

  const htmlPath = htmlPathFor(params.id);
  if (!htmlPath) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  const prevPath = `${htmlPath}.prev`;

  const body = await req.json().catch(() => ({}));

  // ── Undo: restore the last backup ────────────────────────────────────────
  if (body.undo) {
    if (!fs.existsSync(prevPath)) return NextResponse.json({ error: "Nothing to undo." }, { status: 400 });
    try {
      fs.copyFileSync(prevPath, htmlPath);
      fs.unlinkSync(prevPath);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const instruction = String(body.instruction ?? "").trim();
  if (!instruction) return NextResponse.json({ error: "Describe the change you want." }, { status: 400 });

  const anthropicKey = getAnthropicKey(uid);
  if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });

  let html = "";
  try { html = fs.readFileSync(htmlPath, "utf-8"); } catch { return NextResponse.json({ error: "Could not read the site." }, { status: 500 }); }

  const prompt = `You are an expert web designer editing an existing single-file HTML website. Apply ONLY the change the user asks for, then return the COMPLETE updated HTML document — nothing else (no markdown fences, no explanation).

RULES:
- Preserve everything not related to the request: structure, ALL <script> blocks (hash router, motion, site-guard, WhatsApp logic), and any integration blocks between <!-- nf:... --> markers. Never remove these.
- Every button/link must point to a REAL target: an existing page route (#/name, where a matching <div data-page="name"> exists), tel:/mailto:/a wa.me link, or an existing #id to scroll to. Never output href="#" or a route to a page that does not exist. If you add a new page, also add its <div data-page="..."> section and a matching nav entry.
- Keep it ONE self-contained HTML file (inline CSS/JS; images stay as their URLs).
- Make the result polished, modern and responsive. Improve visual hierarchy, spacing and typography where it helps.
- If the request is vague (e.g. "make it better"), elevate the design (hero, contrast, whitespace, type scale) without changing the meaning of the content.
- Keep the same language as the site.

USER REQUEST: ${instruction}

CURRENT HTML:
${html}

Return ONLY the full updated HTML document, starting with <!DOCTYPE html>.`;

  let out = "";
  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const msg = await withRetry(() =>
      anthropic.messages.stream({ model: "claude-sonnet-4-6", max_tokens: 32000, messages: [{ role: "user", content: prompt }] }).finalMessage(),
    );
    const block = msg.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    out = block && block.type === "text" ? block.text : "";
  } catch (e) {
    const m = String((e as Error).message || "");
    console.error("[ai-edit] error:", m);
    if (/overloaded|529/i.test(m)) return NextResponse.json({ error: "Anthropic is overloaded right now — try again in a moment." }, { status: 503 });
    return NextResponse.json({ error: `AI edit failed: ${m.slice(0, 200)}` }, { status: 502 });
  }

  // Clean fences + locate the document.
  out = out.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const docStart = out.indexOf("<!DOCTYPE");
  if (docStart > 0) out = out.slice(docStart);

  // Safety: only overwrite if it really looks like a full HTML document.
  if (out.length < 500 || !/<html[\s>]/i.test(out) || !/<\/body>/i.test(out)) {
    return NextResponse.json({ error: "The edit didn't produce a valid page. Try rephrasing." }, { status: 422 });
  }

  try {
    fs.copyFileSync(htmlPath, prevPath); // backup for undo
    fs.writeFileSync(htmlPath, out, "utf-8");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
