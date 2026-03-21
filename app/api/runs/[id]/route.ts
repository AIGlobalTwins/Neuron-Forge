import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const [run] = await db.select().from(runs).where(eq(runs.id, params.id));
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}
