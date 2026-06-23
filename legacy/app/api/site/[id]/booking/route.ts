import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { injectBooking } from "@/lib/booking-widget";

export const runtime = "nodejs";

const DIRS = [path.join(process.cwd(), "data", "redesigns"), path.join(process.cwd(), "outputs", "redesigns")];

function htmlPathFor(id: string): string | null {
  if (!/^[\w-]+$/.test(id)) return null;
  for (const d of DIRS) {
    for (const f of [`analyze_${id}.html`, `maps_${id}.html`, `${id}.html`]) {
      const p = path.join(d, f);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/** Inject the online-booking calendar section into a saved site. Deterministic (no AI). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const htmlPath = htmlPathFor(params.id);
  if (!htmlPath) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  let html = "";
  try {
    html = fs.readFileSync(htmlPath, "utf-8");
  } catch {
    return NextResponse.json({ error: "Could not read the site." }, { status: 500 });
  }

  if (/id=["']agendamento["']/i.test(html)) {
    return NextResponse.json({ ok: true, already: true });
  }

  // Reuse the site's own WhatsApp number for the booking confirmation.
  const m = html.match(/wa\.me\/(\d{6,15})/);
  const waUrl = m ? `https://wa.me/${m[1]}` : "";

  const out = injectBooking(html, { waUrl });
  try {
    fs.copyFileSync(htmlPath, `${htmlPath}.prev`); // backup so the editor's Undo restores it
    fs.writeFileSync(htmlPath, out, "utf-8");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
