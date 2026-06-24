import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { currentUid, canAccessSite } from "@/lib/site-store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!/^[\w-]+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Owner-scoped (new sites carry an owner sidecar); legacy sites with no owner stay viewable.
  if (!canAccessSite(id, await currentUid())) {
    return new NextResponse("Not found", { status: 404 });
  }

  // data/ is the mounted disk (persists across redeploys); outputs/ kept for back-compat.
  const dirs = [
    path.join(process.cwd(), "data", "redesigns"),
    path.join(process.cwd(), "outputs", "redesigns"),
  ];
  const candidates = dirs.flatMap((d) => [
    path.join(d, `analyze_${id}.html`),
    path.join(d, `maps_${id}.html`),
    path.join(d, `${id}.html`),
  ]);

  for (const htmlPath of candidates) {
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, "utf-8");
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
