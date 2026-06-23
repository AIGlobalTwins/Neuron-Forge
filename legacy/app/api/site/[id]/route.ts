import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export interface SiteConfig {
  whatsapp?: { number?: string; message?: string };
  gaId?: string;
  customHead?: string;
  customBody?: string;
}

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
function configPathFor(id: string): string {
  return path.join(DATA_DIR, `${id}.config.json`);
}

function readConfig(id: string): SiteConfig {
  try {
    const p = configPathFor(id);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch { /* ignore */ }
  return {};
}

// Idempotent: strip any previous Neuron-injected blocks, then re-insert from config.
function stripBlocks(html: string): string {
  return html
    .replace(/<!-- nf:head:start -->[\s\S]*?<!-- nf:head:end -->/g, "")
    .replace(/<!-- nf:body:start -->[\s\S]*?<!-- nf:body:end -->/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function buildHead(c: SiteConfig): string {
  const parts: string[] = [];
  if (c.gaId?.trim()) {
    const id = c.gaId.trim();
    parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`);
  }
  if (c.customHead?.trim()) parts.push(c.customHead.trim());
  return parts.length ? `<!-- nf:head:start -->\n${parts.join("\n")}\n<!-- nf:head:end -->` : "";
}

function buildBody(c: SiteConfig): string {
  const parts: string[] = [];
  const num = (c.whatsapp?.number || "").replace(/[^0-9]/g, "");
  if (num) {
    const msg = encodeURIComponent(c.whatsapp?.message?.trim() || "Olá! Vim pelo vosso site.");
    parts.push(`<a href="https://wa.me/${num}?text=${msg}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style="position:fixed;right:20px;bottom:20px;z-index:2147483000;width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.28)"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2"/></svg></a>`);
  }
  if (c.customBody?.trim()) parts.push(c.customBody.trim());
  return parts.length ? `<!-- nf:body:start -->\n${parts.join("\n")}\n<!-- nf:body:end -->` : "";
}

function inject(html: string, c: SiteConfig): string {
  let h = stripBlocks(html);
  const head = buildHead(c);
  const body = buildBody(c);
  if (head) h = h.includes("</head>") ? h.replace("</head>", `${head}\n</head>`) : `${head}\n${h}`;
  if (body) h = h.includes("</body>") ? h.replace("</body>", `${body}\n</body>`) : `${h}\n${body}`;
  return h;
}

async function requireUser(): Promise<boolean> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    const uid = await getSupabaseUserId();
    return !!uid;
  } catch {
    return true; // supabase off → open
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireUser())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json({ config: readConfig(params.id) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireUser())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const htmlPath = htmlPathFor(params.id);
  if (!htmlPath) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const config = (body.config ?? {}) as SiteConfig;

  try {
    fs.writeFileSync(configPathFor(params.id), JSON.stringify(config, null, 2), "utf-8");
    const html = fs.readFileSync(htmlPath, "utf-8");
    fs.writeFileSync(htmlPath, inject(html, config), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Save failed." }, { status: 500 });
  }
}
