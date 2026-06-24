import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getClaudeModel, getWhatsAppAccessToken, getWhatsAppPhoneNumberId, getWhatsAppVerifyToken } from "@/lib/settings";
import { readBotConfig, buildSystemPrompt, readHistory, appendHistory } from "@/lib/whatsapp-bot";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v19.0";

// Verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body with the app secret).
function validSignature(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── GET: Webhook verification by Meta ────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = getWhatsAppVerifyToken();

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: Incoming message from Meta ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // Reject forged calls. Enforced when WHATSAPP_APP_SECRET is set; until then we only
  // warn so an existing bot keeps working (set the secret to close this).
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    if (!validSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } else {
    console.warn("[whatsapp/webhook] WHATSAPP_APP_SECRET not set — incoming webhooks are NOT verified");
  }

  let body: { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from: string; type: string; text?: { body?: string } }> } }> }> } | null = null;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  if (!body) return NextResponse.json({ ok: true });

  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Ignore non-text messages and status updates
    if (!message || message.type !== "text") return NextResponse.json({ ok: true });

    const from: string = message.from;
    const text: string = message.text?.body ?? "";
    if (!text.trim()) return NextResponse.json({ ok: true });

    const config = readBotConfig();
    if (!config.active) return NextResponse.json({ ok: true });

    const anthropicKey = getAnthropicKey();
    const claudeModel = getClaudeModel();
    const accessToken = getWhatsAppAccessToken();
    const phoneNumberId = getWhatsAppPhoneNumberId();
    if (!anthropicKey || !accessToken || !phoneNumberId) return NextResponse.json({ ok: true });

    // Build conversation history
    const history = readHistory(from);
    appendHistory(from, { role: "user", content: text, ts: Date.now() });

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 700,
      system: buildSystemPrompt(config),
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ],
    });

    let reply = res.content[0].type === "text" ? res.content[0].text.trim() : config.fallback;
    if (!reply) reply = config.fallback;
    // WhatsApp hard-limits text bodies to 4096 chars.
    if (reply.length > 4000) reply = reply.slice(0, 3997) + "…";
    appendHistory(from, { role: "assistant", content: reply, ts: Date.now() });

    // Send reply via WhatsApp
    await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply },
      }),
    });
  } catch (err) {
    console.error("[whatsapp/webhook]", err);
  }

  return NextResponse.json({ ok: true });
}
