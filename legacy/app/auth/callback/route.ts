import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

// OAuth redirect target: exchange the ?code for a session (sets the cookies via
// the server client), then send the user where they were headed.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (supabaseEnabled() && code) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
