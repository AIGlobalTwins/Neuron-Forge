import { NextResponse } from "next/server";
import { listSearchConsoleSites } from "@/lib/google-api";

async function getUserId(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    const sites = await listSearchConsoleSites(userId);
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
