import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settings";

export async function GET() {
  const s = readSettings();
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

  writeSettings(update);
  return NextResponse.json({ ok: true });
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 10) + "••••••••••••" + key.slice(-4);
}
