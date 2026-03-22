import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  // Only allow safe filenames
  if (!/^[\w-]+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const htmlPath = path.join(process.cwd(), "outputs", "redesigns", `analyze_${id}.html`);

  if (!fs.existsSync(htmlPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
