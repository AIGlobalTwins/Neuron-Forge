import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getGoogleClientId } from "@/lib/settings";
import { buildAuthUrl, redirectUriFromRequest, scopesForProducts, isGoogleProduct, type GoogleProduct } from "@/lib/google";

async function getUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

// GET /api/google/connect?products=business,ads,analytics,searchconsole
// Starts the OAuth consent flow for the requested products.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  const origin = redirectUriFromRequest(req).replace("/api/google/callback", "");

  const clientId = getGoogleClientId(userId);
  if (!clientId) {
    return NextResponse.redirect(`${origin}/?google=error&reason=no_client_id`);
  }

  const requested = (req.nextUrl.searchParams.get("products") || "login")
    .split(",")
    .map((p) => p.trim())
    .filter(isGoogleProduct) as GoogleProduct[];
  const products: GoogleProduct[] = requested.length ? requested : ["login"];

  const scopes = scopesForProducts(products);
  const nonce = randomUUID();
  const state = `${nonce}:${products.join(",")}`;

  const url = buildAuthUrl({
    clientId,
    redirectUri: redirectUriFromRequest(req),
    scopes,
    state,
  });

  const res = NextResponse.redirect(url);
  // CSRF: mirror the nonce in an httpOnly cookie; the callback checks it matches.
  res.cookies.set("g_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
