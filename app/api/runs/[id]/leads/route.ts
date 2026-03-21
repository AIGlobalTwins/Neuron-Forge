import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { leads, qualifyResults, deployments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();

  const runLeads = await db.select().from(leads).where(eq(leads.runId, params.id));

  // Join qualify results and deployments
  const enriched = await Promise.all(
    runLeads.map(async (lead) => {
      const [qualify] = await db.select().from(qualifyResults).where(eq(qualifyResults.leadId, lead.id));
      const [deployment] = await db.select().from(deployments).where(eq(deployments.leadId, lead.id));
      return { ...lead, qualify: qualify ?? null, deployment: deployment ?? null };
    })
  );

  return NextResponse.json(enriched);
}
