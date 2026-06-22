import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getSupabaseUserId } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

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
  // RLS still scopes both branches to the current user.
  if (id) await supabase.from("generations").delete().eq("id", id);
  else await supabase.from("generations").delete().eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
