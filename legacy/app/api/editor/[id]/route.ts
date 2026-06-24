import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { html } = body;
  if (!html || typeof html !== "string") {
    return NextResponse.json({ error: "html required" }, { status: 400 });
  }

  // Generators write to data/redesigns; older builds used outputs/redesigns. Check both.
  const dirs = [path.join(process.cwd(), "data", "redesigns"), path.join(process.cwd(), "outputs", "redesigns")];
  const candidates = dirs.flatMap((d) => [
    path.join(d, `analyze_${id}.html`),
    path.join(d, `maps_${id}.html`),
    path.join(d, `${id}.html`),
  ]);

  let targetPath: string | null = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  fs.writeFileSync(targetPath, html, "utf-8");
  return NextResponse.json({ ok: true });
}
