import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getSupabaseUserId } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

const COLS = "id, name, category, description, website, phone, hours, services, faqs, created_at";

export async function GET() {
  if (!supabaseEnabled()) return NextResponse.json({ clients: [] });
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("clients").select(COLS).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseEnabled()) return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  const userId = await getSupabaseUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const row = {
    user_id: userId,
    name: String(b.name).trim(),
    category: b.category ?? "",
    description: b.description ?? "",
    website: b.website ?? "",
    phone: b.phone ?? "",
    hours: b.hours ?? "",
    services: Array.isArray(b.services) ? b.services : [],
    faqs: Array.isArray(b.faqs) ? b.faqs : [],
  };

  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("clients").insert(row).select(COLS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}
