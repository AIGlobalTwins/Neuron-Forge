import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { siteAccess } from "@/lib/site-store";
import { type SiteConfig, readConfig, inject, configPathFor } from "@/lib/integrations";
import { getPublishInfo, markContentUpdated } from "@/lib/publish-store";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data", "redesigns");
const LEGACY_DIR = path.join(process.cwd(), "outputs", "redesigns");

function htmlPathFor(id: string): string | null {
  if (!/^[\w-]+$/.test(id)) return null;
  for (const d of [DATA_DIR, LEGACY_DIR]) {
    for (const f of [`analyze_${id}.html`, `maps_${id}.html`, `${id}.html`]) {
      const p = path.join(d, f);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const acc = await siteAccess(params.id);
  if (!acc.ok) return NextResponse.json({ error: acc.status === 401 ? "Sign in required." : "Not found." }, { status: acc.status });
  return NextResponse.json({ config: readConfig(params.id), publish: getPublishInfo(params.id) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const acc = await siteAccess(params.id);
  if (!acc.ok) return NextResponse.json({ error: acc.status === 401 ? "Sign in required." : "Not found." }, { status: acc.status });
  const htmlPath = htmlPathFor(params.id);
  if (!htmlPath) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const config = (body.config ?? {}) as SiteConfig;

  try {
    fs.writeFileSync(configPathFor(params.id), JSON.stringify(config, null, 2), "utf-8");
    const html = fs.readFileSync(htmlPath, "utf-8");
    fs.writeFileSync(htmlPath, inject(html, config), "utf-8");
    markContentUpdated(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Save failed." }, { status: 500 });
  }
}
