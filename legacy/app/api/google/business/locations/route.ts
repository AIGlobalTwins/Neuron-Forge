import { NextResponse } from "next/server";
import { listBusinessLocations } from "@/lib/google-api";

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
    const items = await listBusinessLocations(userId);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
