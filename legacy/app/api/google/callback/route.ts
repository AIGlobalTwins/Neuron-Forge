import { NextRequest, NextResponse } from "next/server";
import { getGoogleClientId, getGoogleClientSecret, getGoogleConnection, saveGoogleConnection } from "@/lib/settings";
import { exchangeCode, emailFromIdToken, redirectUriFromRequest } from "@/lib/google";

async function getUserId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

// GET /api/google/callback?code=...&state=...
// Exchanges the authorization code, stores the per-user refresh token + scopes.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  const origin = redirectUriFromRequest(req).replace("/api/google/callback", "");
  const params = req.nextUrl.searchParams;

  const fail = (reason: string) => NextResponse.redirect(`${origin}/?google=error&reason=${encodeURIComponent(reason)}`);

  if (params.get("error")) return fail(params.get("error") || "denied");

  const code = params.get("code");
  const state = params.get("state") || "";
  if (!code) return fail("no_code");

  // CSRF: state must start with the nonce we stored in the cookie.
  const nonce = req.cookies.get("g_oauth_state")?.value || "";
  if (!nonce || !state.startsWith(`${nonce}:`)) return fail("bad_state");

  const clientId = getGoogleClientId(userId);
  const clientSecret = getGoogleClientSecret(userId);
  if (!clientId || !clientSecret) return fail("no_client");

  try {
    const tokens = await exchangeCode({
      code,
      clientId,
      clientSecret,
      redirectUri: redirectUriFromRequest(req),
    });

    // Google omits refresh_token on re-consent for an already-authorized app;
    // keep the existing one in that case so the connection survives.
    const existing = getGoogleConnection(userId);
    const refreshToken = tokens.refresh_token || existing.refreshToken;
    if (!refreshToken) return fail("no_refresh_token");

    saveGoogleConnection(
      {
        refreshToken,
        scopes: tokens.scope || existing.scopes.join(" "),
        email: emailFromIdToken(tokens.id_token) || existing.email,
      },
      userId,
    );

    const res = NextResponse.redirect(`${origin}/?google=connected`);
    res.cookies.delete("g_oauth_state");
    return res;
  } catch (err) {
    console.error("[google/callback]", err);
    return fail("exchange_failed");
  }
}
