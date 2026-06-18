import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, getGoogleConnection, getGoogleClientId, clearGoogleConnection, getAnthropicKey, getVercelToken, getInstagramToken, getInstagramAccountId } from "@/lib/settings";
import { PRODUCT_SCOPES, type GoogleProduct } from "@/lib/google";

// Which products a connection covers, derived from the granted scopes.
function connectedProducts(scopes: string[]): GoogleProduct[] {
  const has = (need: string[]) => need.every((s) => scopes.includes(s));
  const out: GoogleProduct[] = [];
  (Object.keys(PRODUCT_SCOPES) as GoogleProduct[]).forEach((p) => {
    if (p === "login") return;
    if (has(PRODUCT_SCOPES[p])) out.push(p);
  });
  return out;
}

async function getUserId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getUserId();
  const s = readSettings(userId);
  const gc = getGoogleConnection(userId);
  return NextResponse.json({
    anthropicApiKey: s.anthropicApiKey ? maskKey(s.anthropicApiKey) : "",
    vercelToken: s.vercelToken ? maskKey(s.vercelToken) : "",
    claudeModel: s.claudeModel || "claude-sonnet-4-6",
    // has* reflect the resolved value (settings file OR environment variable),
    // so a key set via Render env vars correctly clears the "No API Key" banner.
    hasAnthropicKey: !!getAnthropicKey(userId),
    hasVercelToken: !!getVercelToken(userId),
    hasInstagramToken: !!getInstagramToken(userId),
    hasInstagramAccountId: !!getInstagramAccountId(userId),
    instagramAccountId: s.instagramAccountId ? maskKey(s.instagramAccountId) : "",
    // Google OAuth
    googleClientId: s.googleClientId ? maskKey(s.googleClientId) : "",
    hasGoogleClientId: !!getGoogleClientId(userId),
    hasGoogleClientSecret: !!(process.env.GOOGLE_CLIENT_SECRET || s.googleClientSecret || readSettings(null).googleClientSecret),
    googleConnected: gc.connected,
    googleEmail: gc.email,
    googleProducts: connectedProducts(gc.scopes),
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
  if (typeof body.claudeModel === "string" && body.claudeModel.trim()) {
    update.claudeModel = body.claudeModel.trim();
  }
  if (typeof body.googleClientId === "string") {
    update.googleClientId = body.googleClientId.trim();
  }
  if (typeof body.googleClientSecret === "string" && body.googleClientSecret.trim()) {
    update.googleClientSecret = body.googleClientSecret.trim();
  }

  // Disconnect the Google account (clears tokens, keeps app credentials).
  if (body.googleDisconnect === true) {
    clearGoogleConnection(userId);
  }

  writeSettings(update, userId);
  return NextResponse.json({ ok: true });
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 10) + "••••••••••••" + key.slice(-4);
}
