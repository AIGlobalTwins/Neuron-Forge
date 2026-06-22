import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getSupabaseUserId } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

const COLS = "id, name, category, description, website, phone, hours, services, faqs, created_at";
const FIELDS = ["name", "category", "description", "website", "phone", "hours", "services", "faqs"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabaseEnabled()) return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  const userId = await getSupabaseUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of FIELDS) if (k in b) patch[k] = b[k];

  const supabase = createServerSupabase(); // RLS scopes the update to the user's own row
  const { data, error } = await supabase.from("clients").update(patch).eq("id", params.id).select(COLS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabaseEnabled()) return NextResponse.json({ ok: true });
  const userId = await getSupabaseUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const supabase = createServerSupabase();
  await supabase.from("clients").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
