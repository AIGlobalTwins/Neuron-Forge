import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { runs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { runPipeline } from "@/lib/pipeline/run";

// GET /api/runs — list all runs
export async function GET() {
  await initDb();
  const allRuns = await db.select().from(runs).orderBy(desc(runs.createdAt));
  return NextResponse.json(allRuns);
}

// POST /api/runs — trigger a new pipeline run
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = body.query ?? "restaurantes Lisboa";
  const maxLeads = body.maxLeads ?? parseInt(process.env.MAX_LEADS_PER_RUN ?? "50");

  // Fire and forget — don't await pipeline
  runPipeline(query, maxLeads).catch(console.error);

  return NextResponse.json({ ok: true, message: "Pipeline started", query });
}
