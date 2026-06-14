import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!/^[\w-]+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const redesignDir = path.join(process.cwd(), "outputs", "redesigns");

  // Try both prefixes
  const candidates = [
    path.join(redesignDir, `analyze_${id}.html`),
    path.join(redesignDir, `maps_${id}.html`),
    path.join(redesignDir, `${id}.html`),
  ];

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
