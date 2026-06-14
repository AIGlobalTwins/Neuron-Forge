import { NextRequest, NextResponse } from "next/server";
import { getSearchConsoleTopQueries } from "@/lib/google-api";

async function getUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

// GET /api/google/searchconsole/queries?site=<siteUrl>&days=28
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    const site = req.nextUrl.searchParams.get("site");
    const days = Number(req.nextUrl.searchParams.get("days")) || 28;
    if (!site) return NextResponse.json({ error: "site is required" }, { status: 400 });
    const queries = await getSearchConsoleTopQueries(userId, site, days);
    return NextResponse.json({ queries });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
