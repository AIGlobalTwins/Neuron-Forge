import { db, initDb } from "@/lib/db";
import { runs, leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { emit } from "@/lib/emitter";
import { skill01ApifyScrape } from "./skills/01-apify-scrape";
import { skill02SiteQualify } from "./skills/02-site-qualify";
import { skill03SiteRedesign } from "./skills/03-site-redesign";
import { skill04VercelDeploy } from "./skills/04-vercel-deploy";

const CLAUDE_INPUT_COST = 3 / 1_000_000;
const CLAUDE_OUTPUT_COST = 15 / 1_000_000;

export async function runPipeline(query: string, maxLeads = 50): Promise<string> {
  await initDb();

  const runId = `run_${Date.now()}`;
  const now = new Date().toISOString();

  // Create run record
  await db.insert(runs).values({
    id: runId,
    query,
    status: "running",
    startedAt: now,
    createdAt: now,
  });

  emit({ type: "run:started", runId, query });
  console.log(`\n[Pipeline] Starting run ${runId} — query: "${query}"`);

  let totalTokens = 0;
  let qualifiedCount = 0;
  let deployedCount = 0;

  try {
    // ── Skill 01: Scrape ──────────────────────────────────────────────────
    const scrapedLeads = await skill01ApifyScrape(runId, query, maxLeads);

    await db.update(runs).set({ totalLeads: scrapedLeads.length }).where(eq(runs.id, runId));

    for (const lead of scrapedLeads) {
      emit({ type: "lead:scraped", runId, leadId: lead.id, name: lead.name });
    }

    // ── Skill 02: Qualify ─────────────────────────────────────────────────
    const qualifyResults = await skill02SiteQualify(
      scrapedLeads,
      (_leadId, result) => {
        const lead = scrapedLeads.find((l) => l.id === result.leadId)!;
        totalTokens += result.tokensUsed;
        emit({
          type: "lead:qualified",
          runId,
          leadId: result.leadId,
          name: lead.name,
          score: result.score,
          decision: result.decision,
        });
      }
    );

    const passedLeads = qualifyResults
      .filter((r) => r.decision === "pass")
      .map((r) => scrapedLeads.find((l) => l.id === r.leadId)!);

    qualifiedCount = passedLeads.length;
    await db.update(runs).set({ qualifiedLeads: qualifiedCount }).where(eq(runs.id, runId));

    // ── Skills 03 + 04: Redesign + Deploy (sequential per lead) ──────────
    for (const lead of passedLeads) {
      // Skip if already complete (idempotency)
      const [existing] = await db
        .select({ status: leads.status })
        .from(leads)
        .where(eq(leads.id, lead.id));

      if (existing?.status === "complete") {
        console.log(`[Pipeline] Skipping ${lead.name} — already complete`);
        deployedCount++;
        continue;
      }

      // Skill 03 — Redesign
      emit({ type: "lead:redesigning", runId, leadId: lead.id, name: lead.name });

      const redesign = await skill03SiteRedesign(lead, () => {
        emit({ type: "lead:redesigned", runId, leadId: lead.id, name: lead.name });
      });

      if (!redesign) {
        emit({ type: "lead:failed", runId, leadId: lead.id, name: lead.name, error: "Redesign failed" });
        await db.update(leads).set({ status: "failed", updatedAt: new Date().toISOString() }).where(eq(leads.id, lead.id));
        continue;
      }

      totalTokens += redesign.tokensUsed;

      // Skill 04 — Deploy
      emit({ type: "lead:deploying", runId, leadId: lead.id, name: lead.name });

      const deployment = await skill04VercelDeploy(lead, redesign, runId, (_leadId, url) => {
        emit({ type: "lead:deployed", runId, leadId: lead.id, name: lead.name, url });
      });

      if (deployment) {
        deployedCount++;
        await db.update(runs).set({ deployedLeads: deployedCount }).where(eq(runs.id, runId));
      } else {
        emit({ type: "lead:failed", runId, leadId: lead.id, name: lead.name, error: "Deploy failed" });
        await db.update(leads).set({ status: "failed", updatedAt: new Date().toISOString() }).where(eq(leads.id, lead.id));
      }
    }

    // ── Finalize run ──────────────────────────────────────────────────────
    const estimatedCostUsd = totalTokens * ((CLAUDE_INPUT_COST + CLAUDE_OUTPUT_COST) / 2);

    await db.update(runs).set({
      status: "complete",
      completedAt: new Date().toISOString(),
      totalTokens,
      estimatedCostUsd,
      qualifiedLeads: qualifiedCount,
      deployedLeads: deployedCount,
    }).where(eq(runs.id, runId));

    emit({
      type: "run:complete",
      runId,
      stats: {
        totalLeads: scrapedLeads.length,
        qualifiedLeads: qualifiedCount,
        deployedLeads: deployedCount,
        totalTokens,
        estimatedCostUsd,
      },
    });

    console.log(`\n[Pipeline] ✓ Run complete: ${deployedCount} sites deployed, ~$${estimatedCostUsd.toFixed(4)}`);

  } catch (err) {
    const message = (err as Error).message;
    await db.update(runs).set({
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: message,
    }).where(eq(runs.id, runId));

    emit({ type: "run:failed", runId, error: message });
    console.error(`[Pipeline] ✗ Run failed: ${message}`);
  }

  return runId;
}

// CLI entrypoint
if (require.main === module) {
  const query = process.argv[2] ?? "restaurantes Lisboa";
  const max = parseInt(process.argv[3] ?? "20");
  runPipeline(query, max).then(() => process.exit(0));
}
