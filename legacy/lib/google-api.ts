/**
 * Thin REST clients for the connected Google products (server-only).
 * Each helper mints a fresh access token via getGoogleAccessToken(userId) and
 * returns normalized shapes the agents/UI can use directly.
 *
 * Approval notes:
 *  - Search Console / Analytics: work once the API is enabled + user consents.
 *  - Business Profile: requires Google quota approval (APIs are allowlisted).
 *  - Google Ads: requires a developer token + Basic Access approval.
 * On permission errors Google returns 403; we surface a clear message.
 */

import { getGoogleAccessToken } from "@/lib/google";

async function gfetch(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const txt = await res.text();
    let msg = `${res.status}`;
    try { msg = JSON.parse(txt)?.error?.message || msg; } catch { /* keep status */ }
    if (res.status === 403) {
      throw new Error(`Google denied access (403): ${msg}. The API may need to be enabled or approved for your project.`);
    }
    throw new Error(`Google API error (${res.status}): ${msg}`);
  }
  return res.json();
}

// ── Business Profile ────────────────────────────────────────────────────────

export interface BusinessLocation {
  id: string;          // "locations/123"
  title: string;
  address: string;
  phone: string;
  category: string;
  website: string;
  mapsUri: string;
}

export async function listBusinessLocations(userId?: string | null): Promise<BusinessLocation[]> {
  const token = await getGoogleAccessToken(userId);
  const accs = await gfetch(token, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
  const accounts: { name: string }[] = accs.accounts || [];
  const out: BusinessLocation[] = [];
  const readMask = "name,title,storefrontAddress,phoneNumbers,categories,websiteUri,metadata";
  for (const acc of accounts.slice(0, 5)) {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=50`;
    const data = await gfetch(token, url).catch(() => ({ locations: [] }));
    for (const loc of (data.locations || [])) {
      const addr = loc.storefrontAddress;
      const addressStr = addr
        ? [...(addr.addressLines || []), addr.locality, addr.postalCode].filter(Boolean).join(", ")
        : "";
      out.push({
        id: loc.name || "",
        title: loc.title || "",
        address: addressStr,
        phone: loc.phoneNumbers?.primaryPhone || "",
        category: loc.categories?.primaryCategory?.displayName || "",
        website: loc.websiteUri || "",
        mapsUri: loc.metadata?.mapsUri || "",
      });
    }
  }
  return out;
}

// ── Search Console ──────────────────────────────────────────────────────────

export async function listSearchConsoleSites(userId?: string | null): Promise<string[]> {
  const token = await getGoogleAccessToken(userId);
  const data = await gfetch(token, "https://searchconsole.googleapis.com/webmasters/v3/sites");
  return (data.siteEntry || [])
    .filter((s: { permissionLevel?: string }) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s: { siteUrl: string }) => s.siteUrl);
}

export interface GscQuery { query: string; clicks: number; impressions: number; position: number; }

export async function getSearchConsoleTopQueries(
  userId: string | null | undefined,
  siteUrl: string,
  days = 28,
  rowLimit = 25,
): Promise<GscQuery[]> {
  const token = await getGoogleAccessToken(userId);
  // Search Console data lags ~3 days; window the request accordingly.
  const end = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const start = new Date(Date.now() - (days + 3) * 86400000).toISOString().slice(0, 10);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const data = await gfetch(token, url, {
    method: "POST",
    body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["query"], rowLimit }),
  });
  return (data.rows || []).map((r: { keys: string[]; clicks: number; impressions: number; position: number }) => ({
    query: r.keys[0],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    position: Math.round(r.position * 10) / 10,
  }));
}

// ── Analytics (GA4) ─────────────────────────────────────────────────────────

export interface AnalyticsProperty { property: string; displayName: string; }

export async function listAnalyticsProperties(userId?: string | null): Promise<AnalyticsProperty[]> {
  const token = await getGoogleAccessToken(userId);
  const data = await gfetch(token, "https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
  const out: AnalyticsProperty[] = [];
  for (const acc of (data.accountSummaries || [])) {
    for (const p of (acc.propertySummaries || [])) {
      out.push({ property: p.property, displayName: p.displayName });
    }
  }
  return out;
}

// ── Google Ads (requires developer token) ───────────────────────────────────

export async function listAdsCustomers(userId?: string | null): Promise<string[]> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
  if (!devToken) {
    throw new Error("Google Ads needs a developer token (GOOGLE_ADS_DEVELOPER_TOKEN) with Basic Access approval.");
  }
  const token = await getGoogleAccessToken(userId);
  const res = await fetch("https://googleads.googleapis.com/v18/customers:listAccessibleCustomers", {
    headers: { Authorization: `Bearer ${token}`, "developer-token": devToken },
  });
  if (!res.ok) throw new Error(`Google Ads API error (${res.status}). Check developer token approval.`);
  const data = await res.json();
  return (data.resourceNames || []).map((r: string) => r.replace("customers/", ""));
}
