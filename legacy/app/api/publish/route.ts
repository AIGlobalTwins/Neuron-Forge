import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { deploySite, cloudflareEnabled } from "@/lib/cloudflare-deploy";
import { siteAccess } from "@/lib/site-store";
import { scriptNameFor, setPublished } from "@/lib/publish-store";

export const runtime = "nodejs";
export const maxDuration = 60;

// Read a generated site's HTML from disk (same candidates the preview route serves).
function readSiteHtml(id: string): string | null {
  if (!/^[\w-]+$/.test(id)) return null;
  const dirs = [path.join(process.cwd(), "data", "redesigns"), path.join(process.cwd(), "outputs", "redesigns")];
  const files = dirs.flatMap((d) => [path.join(d, `analyze_${id}.html`), path.join(d, `maps_${id}.html`), path.join(d, `${id}.html`)]);
  for (const f of files) {
    try { if (fs.existsSync(f)) return fs.readFileSync(f, "utf-8"); } catch { /* ignore */ }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!cloudflareEnabled()) {
    return NextResponse.json({ error: "Publishing is not configured yet (missing Cloudflare token). Ask your admin to enable it." }, { status: 503 });
  }

  // Require a signed-in user (the middleware already gates this route).
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    const userId = await getSupabaseUserId();
    if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  } catch { /* supabase off — allow */ }

  const body = await req.json().catch(() => ({}));
  const websiteId = String(body.websiteId ?? "").trim();
  if (!websiteId) return NextResponse.json({ error: "websiteId required" }, { status: 400 });

  const acc = await siteAccess(websiteId);
  if (!acc.ok) return NextResponse.json({ error: acc.status === 401 ? "Sign in required." : "Could not find that generated site to publish." }, { status: acc.status });

  const html = readSiteHtml(websiteId);
  if (!html) return NextResponse.json({ error: "Could not find that generated site to publish." }, { status: 404 });

  try {
    // Stable, id-derived script name so re-publishing (even after a rename) always
    // updates the SAME Worker/URL instead of orphaning the old one.
    const scriptName = scriptNameFor(websiteId);
    const result = await deploySite(scriptName, html);
    if (!result.url) {
      return NextResponse.json({ error: "Published, but couldn't resolve the live URL. Enable the workers.dev subdomain in Cloudflare." }, { status: 502 });
    }
    setPublished(websiteId, scriptName, result.url);
    return NextResponse.json({ url: result.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Publish failed." }, { status: 502 });
  }
}
