import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getWhatsAppAccessToken, getWhatsAppPhoneNumberId, getWhatsAppVerifyToken } from "@/lib/settings";
import { readBotConfig, buildSystemPrompt, readHistory, appendHistory } from "@/lib/whatsapp-bot";

const GRAPH = "https://graph.facebook.com/v19.0";

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
  const body = await req.json().catch(() => null);
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
    const accessToken = getWhatsAppAccessToken();
    const phoneNumberId = getWhatsAppPhoneNumberId();
    if (!anthropicKey || !accessToken || !phoneNumberId) return NextResponse.json({ ok: true });

    // Build conversation history
    const history = readHistory(from);
    appendHistory(from, { role: "user", content: text, ts: Date.now() });

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: buildSystemPrompt(config),
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ],
    });

    const reply = res.content[0].type === "text" ? res.content[0].text.trim() : config.fallback;
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
