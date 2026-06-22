import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createServerSupabase, getSupabaseUserId } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export const runtime = "nodejs";

// Remove a generated website's HTML file from disk (data/ mounted disk + legacy
// outputs/). Mirrors the candidate paths the preview route serves, so deleting a
// generation reclaims the disk space too — not just the Supabase row.
function deleteWebsiteFiles(websiteId: string) {
  if (!/^[\w-]+$/.test(websiteId)) return;
  const dirs = [path.join(process.cwd(), "data", "redesigns"), path.join(process.cwd(), "outputs", "redesigns")];
  const files = dirs.flatMap((d) => [
    path.join(d, `analyze_${websiteId}.html`),
    path.join(d, `maps_${websiteId}.html`),
    path.join(d, `${websiteId}.html`),
  ]);
  for (const f of files) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ }
  }
}

// Per-user generation history, stored in Supabase (RLS: a user only ever sees/
// writes their own rows). The middleware already requires a signed-in session for
// this route, so getUser()/RLS resolve to the current user.

export async function GET() {
  if (!supabaseEnabled()) return NextResponse.json({ generations: [] });
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("generations")
    .select("id, type, name, payload, client_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ generations: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseEnabled()) return NextResponse.json({ ok: false });
  const userId = await getSupabaseUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, name, payload, client_id } = body as { type?: string; name?: string; payload?: unknown; client_id?: string | null };
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("generations")
    .insert({ user_id: userId, type, name: name ?? "", payload: payload ?? {}, client_id: client_id ?? null })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function DELETE(req: NextRequest) {
  if (!supabaseEnabled()) return NextResponse.json({ ok: true });
  const userId = await getSupabaseUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  const supabase = createServerSupabase();
  // RLS scopes every query below to the current user's own rows.
  if (id) {
    // Look the row up first so we can also drop its generated website file.
    const { data: row } = await supabase.from("generations").select("payload").eq("id", id).single();
    const websiteId = (row?.payload as { websiteId?: string } | null)?.websiteId;
    if (websiteId) deleteWebsiteFiles(websiteId);
    await supabase.from("generations").delete().eq("id", id);
  } else {
    // Clear all: drop every generated website file this user owns, then the rows.
    const { data: rows } = await supabase.from("generations").select("payload").eq("user_id", userId);
    for (const r of rows ?? []) {
      const wid = (r.payload as { websiteId?: string } | null)?.websiteId;
      if (wid) deleteWebsiteFiles(wid);
    }
    await supabase.from("generations").delete().eq("user_id", userId);
  }
  return NextResponse.json({ ok: true });
}
