import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "@/lib/settings";
import { siteAccess } from "@/lib/site-store";
import { siteGuard, stripSiteGuard } from "@/lib/site-guard";
import { waLink } from "@/lib/phone";
import { inject, readConfig } from "@/lib/integrations";
import { markContentUpdated } from "@/lib/publish-store";

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

  const acc = await siteAccess(params.id);
  if (!acc.ok) return NextResponse.json({ error: acc.status === 401 ? "Sign in required." : "Site not found." }, { status: acc.status });

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
      markContentUpdated(params.id);
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
- SURGICAL EDIT — change ONLY what the request asks. Return the COMPLETE document with EVERY existing section, heading, paragraph, image and <script> kept intact and in the same order. Do NOT delete, shorten, summarise, rebuild from scratch, or omit ANY content the request did not explicitly ask to change. The output must be at least as long as the input unless the user explicitly asked to remove something.
- If the request is ambiguous, or you are not sure exactly which element to change, make the SMALLEST safe change (or none) and keep everything else byte-for-byte — NEVER guess by deleting or regenerating sections.
- Preserve structure, ALL <script> blocks (hash router, motion, site-guard, WhatsApp logic), and any integration blocks between <!-- nf:... --> markers. Never remove these.
- Every button/link must point to a REAL target: an existing page route (#/name, where a matching <div data-page="name"> exists), tel:/mailto:/a wa.me link, or an existing #id to scroll to. Never output href="#" or a route to a page that does not exist. If you add a new page, also add its <div data-page="..."> section and a matching nav entry.
- Maps: use a key-less embed — <iframe src="https://www.google.com/maps?q=ADDRESS&output=embed">. Never use the Google Maps Embed API (/maps/embed/v1) or any key=.
- Keep it ONE self-contained HTML file (inline CSS/JS; images stay as their URLs). Keep the same language as the site.
- For a "make it better" request, improve styling (spacing, contrast, type scale) IN PLACE — do not remove sections or content.

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

  // Preservation guard: unless the user explicitly asked to remove something, refuse an
  // edit that wipes out a large chunk of the site (the model rebuilding from scratch and
  // dropping sections). Ask for specifics instead of nuking the page.
  const removalIntent = /\b(remov|apag|delete|elimin|tira|tirar|retir)/i.test(instruction);
  if (!removalIntent) {
    const strip = (h: string) => h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const count = (h: string, re: RegExp) => (h.match(re) || []).length;
    const inText = strip(html).length;
    const outText = strip(out).length;
    const inSec = count(html, /<section\b/gi) + count(html, /data-page=/gi);
    const outSec = count(out, /<section\b/gi) + count(out, /data-page=/gi);
    const inImg = count(html, /<img\b/gi);
    const outImg = count(out, /<img\b/gi);
    const lostText = inText > 400 && outText < inText * 0.6;
    const lostSecs = inSec >= 3 && outSec < inSec * 0.6;
    const lostImgs = inImg >= 3 && outImg < inImg * 0.5;
    if (lostText || lostSecs || lostImgs) {
      return NextResponse.json(
        {
          error:
            'Não apliquei: a edição ia remover grande parte do site. Sê mais específico — diz a secção e o que mudar (ex: "na secção Contacto, corrige o mapa"), ou anexa um print do que queres alterado. Para mudanças cirúrgicas usa "Fine-tune manually" e seleciona o elemento.',
          needsDetail: true,
        },
        { status: 422 },
      );
    }
  }

  // Re-apply the runtime safety net + the reseller's integrations — a full rewrite can
  // drop the site-guard scripts and the nf:head/nf:body blocks, silently regressing a
  // live client site (dead buttons, dead WhatsApp, lost GA/pixel).
  try {
    out = stripSiteGuard(out);
    const cfg = readConfig(params.id);
    const num = (cfg.whatsapp?.number || "").replace(/[^0-9]/g, "");
    const waFromHtml = (out.match(/wa\.me\/(\d{6,15})/) || [])[1] || "";
    const waUrl = num ? waLink(num, "") : waFromHtml ? `https://wa.me/${waFromHtml}` : "";
    const contactHref = /data-page=/i.test(out) ? "#/contacto" : "#contact";
    const guard = siteGuard({ waUrl, contactHref });
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${guard}\n</body>`) : out + guard;
    out = inject(out, cfg);
  } catch (e) {
    console.error("[ai-edit] re-apply guard/integrations failed:", (e as Error).message);
  }

  try {
    fs.copyFileSync(htmlPath, prevPath); // backup for undo
    fs.writeFileSync(htmlPath, out, "utf-8");
    markContentUpdated(params.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
