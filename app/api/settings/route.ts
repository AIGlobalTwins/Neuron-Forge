import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settings";

async function getUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getUserId();
  const s = readSettings(userId);
  return NextResponse.json({
    anthropicApiKey: s.anthropicApiKey ? maskKey(s.anthropicApiKey) : "",
    vercelToken: s.vercelToken ? maskKey(s.vercelToken) : "",
    hasAnthropicKey: !!s.anthropicApiKey,
    hasVercelToken: !!s.vercelToken,
    hasInstagramToken: !!s.instagramToken,
    hasInstagramAccountId: !!s.instagramAccountId,
    instagramAccountId: s.instagramAccountId ? maskKey(s.instagramAccountId) : "",
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  const body = await req.json().catch(() => ({}));
  const update: Record<string, string> = {};

  if (typeof body.anthropicApiKey === "string" && body.anthropicApiKey.trim()) {
    update.anthropicApiKey = body.anthropicApiKey.trim();
  }
  if (typeof body.vercelToken === "string") {
    update.vercelToken = body.vercelToken.trim();
  }
  if (typeof body.instagramToken === "string") {
    update.instagramToken = body.instagramToken.trim();
  }
  if (typeof body.instagramAccountId === "string") {
    update.instagramAccountId = body.instagramAccountId.trim();
  }
  if (typeof body.whatsappPhoneNumberId === "string") {
    update.whatsappPhoneNumberId = body.whatsappPhoneNumberId.trim();
  }
  if (typeof body.whatsappAccessToken === "string") {
    update.whatsappAccessToken = body.whatsappAccessToken.trim();
  }
  if (typeof body.whatsappVerifyToken === "string") {
    update.whatsappVerifyToken = body.whatsappVerifyToken.trim();
  }

  writeSettings(update, userId);
  return NextResponse.json({ ok: true });
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 10) + "••••••••••••" + key.slice(-4);
}
