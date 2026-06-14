/**
 * Google OAuth 2.0 foundation (server-only).
 *
 * One OAuth client (the platform's) requests, per user, the scopes needed for
 * the products the user connects: Login, Business Profile, Google Ads,
 * Analytics / Search Console. The refresh token is stored per user in settings;
 * access tokens are derived on demand.
 *
 * Implemented with plain fetch — no extra dependency. API consumers (agents)
 * call getGoogleAccessToken(userId) and hit the relevant Google REST API.
 *
 * Security: the client secret never leaves the server. The OAuth `state` is a
 * random nonce mirrored in an httpOnly cookie (CSRF protection) — see the
 * connect/callback routes.
 */

import { getGoogleClientId, getGoogleClientSecret, getGoogleConnection } from "@/lib/settings";

export const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type GoogleProduct = "login" | "business" | "ads" | "analytics" | "searchconsole";

// Minimum scopes required per product. Google merges all granted scopes into a
// single connection, so connecting another product later just adds scopes.
export const PRODUCT_SCOPES: Record<GoogleProduct, string[]> = {
  login: ["openid", "email", "profile"],
  business: ["https://www.googleapis.com/auth/business.manage"],
  ads: ["https://www.googleapis.com/auth/adwords"],
  analytics: ["https://www.googleapis.com/auth/analytics.readonly"],
  searchconsole: ["https://www.googleapis.com/auth/webmasters.readonly"],
};

export const PRODUCT_LABELS: Record<GoogleProduct, string> = {
  login: "Login",
  business: "Business Profile",
  ads: "Google Ads",
  analytics: "Analytics",
  searchconsole: "Search Console",
};

export function isGoogleProduct(v: string): v is GoogleProduct {
  return v === "login" || v === "business" || v === "ads" || v === "analytics" || v === "searchconsole";
}

/** Build the union of scopes for the requested products (always includes identity). */
export function scopesForProducts(products: GoogleProduct[]): string[] {
  const set = new Set<string>(["openid", "email", "profile"]);
  for (const p of products) for (const s of PRODUCT_SCOPES[p]) set.add(s);
  return Array.from(set);
}

/** Resolve the OAuth redirect URI from the incoming request origin. */
export function redirectUriFromRequest(req: { url: string; headers: Headers }): string {
  const envBase = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const base = envBase || originFromRequest(req);
  return `${base.replace(/\/$/, "")}/api/google/callback`;
}

function originFromRequest(req: { url: string; headers: Headers }): string {
  // Honor proxy headers (Vercel) when present, else fall back to the URL origin.
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto || "https"}://${host}`;
  return new URL(req.url).origin;
}

export function buildAuthUrl(opts: { clientId: string; redirectUri: string; scopes: string[]; state: string }): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: opts.scopes.join(" "),
    access_type: "offline",          // request a refresh token
    include_granted_scopes: "true",  // incremental authorization
    prompt: "consent",               // ensure a refresh token is returned
    state: opts.state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  token_type: string;
}

export async function exchangeCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  return res.json();
}

export async function refreshAccessToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: opts.refreshToken,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data: TokenResponse = await res.json();
  return data.access_token;
}

/** Extract the email claim from a Google id_token (JWT) without verifying signature. */
export function emailFromIdToken(idToken?: string): string {
  if (!idToken) return "";
  try {
    const payload = idToken.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    return JSON.parse(json).email || "";
  } catch {
    return "";
  }
}

/**
 * Get a fresh access token for a connected user. Agents call this before hitting
 * a Google REST API. Throws a clear error when the user has not connected.
 */
export async function getGoogleAccessToken(userId?: string | null): Promise<string> {
  const conn = getGoogleConnection(userId);
  if (!conn.connected) throw new Error("No Google account connected. Connect one in Settings.");
  const clientId = getGoogleClientId(userId);
  const clientSecret = getGoogleClientSecret(userId);
  if (!clientId || !clientSecret) throw new Error("Google OAuth app not configured (Client ID/Secret).");
  return refreshAccessToken({ refreshToken: conn.refreshToken, clientId, clientSecret });
}
