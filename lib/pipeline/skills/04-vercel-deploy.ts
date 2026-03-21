import { execSync, spawnSync } from "child_process";
import { db, initDb } from "@/lib/db";
import { leads, deployments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { ScrapedLead } from "./01-apify-scrape";
import type { RedesignResult } from "./03-site-redesign";

const VERCEL_PROJECT_LIMIT = 95; // Warn at 80, block at 95 (free tier ~100)

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);
}

function getVercelProjectCount(): number {
  try {
    const token = process.env.VERCEL_TOKEN;
    if (!token) return 0;
    const res = execSync(
      `curl -sf -H "Authorization: Bearer ${token}" "https://api.vercel.com/v9/projects?limit=100"`,
      { timeout: 10_000 }
    ).toString();
    const data = JSON.parse(res);
    return data?.projects?.length ?? 0;
  } catch {
    return 0;
  }
}

function generateEmailDraft(lead: ScrapedLead, vercelUrl: string): string {
  return `Assunto: Redesenhei o site de ${lead.name} — veja o resultado

Olá,

Chamo-me [NOME] e trabalho com redesign de websites para negócios locais.

Reparei que o site de ${lead.name} (${lead.website}) tem potencial para melhorar bastante a imagem online. Tomei a iniciativa de criar uma versão redesenhada — pode ver aqui:

👉 ${vercelUrl}

É um redesign completo, moderno e profissional — sem custos para si ver.

Se gostar do resultado e quiser saber mais sobre como implementar algo assim para ${lead.name}, responda a este email e marcamos uma chamada rápida.

Cumprimentos,
[NOME]
[TELEFONE]`;
}

export interface DeployResult {
  leadId: string;
  vercelUrl: string;
  projectName: string;
  emailDraft: string;
}

export async function skill04VercelDeploy(
  lead: ScrapedLead,
  redesign: RedesignResult,
  runId: string,
  onProgress?: (leadId: string, url: string) => void
): Promise<DeployResult | null> {
  await initDb();

  // Pre-flight: check project quota
  const projectCount = getVercelProjectCount();
  if (projectCount >= VERCEL_PROJECT_LIMIT) {
    console.error(`[Skill 04] Vercel project limit reached (${projectCount}). Skipping deploy.`);
    return null;
  }
  if (projectCount >= 80) {
    console.warn(`[Skill 04] ⚠ Vercel project count high (${projectCount}/~100). Consider cleanup.`);
  }

  // Mark lead as deploying
  await db.update(leads).set({
    status: "deploying",
    updatedAt: new Date().toISOString(),
  }).where(eq(leads.id, lead.id));

  // Create temp deploy directory with index.html
  const slug = slugify(lead.name);
  const shortId = runId.slice(-6);
  const projectName = `bwa-${slug}-${shortId}`.slice(0, 52);
  const deployDir = path.join("/tmp", `bwa-deploy-${lead.id}`);

  fs.mkdirSync(deployDir, { recursive: true });
  fs.copyFileSync(redesign.htmlPath, path.join(deployDir, "index.html"));

  // Create vercel.json for static deployment
  fs.writeFileSync(
    path.join(deployDir, "vercel.json"),
    JSON.stringify({ cleanUrls: true, trailingSlash: false })
  );

  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not set");

  const teamFlag = process.env.VERCEL_TEAM_ID ? `--scope ${process.env.VERCEL_TEAM_ID}` : "";

  let vercelUrl = "";

  try {
    const result = spawnSync(
      "vercel",
      [
        deployDir,
        "--prod",
        "--yes",
        `--name`, projectName,
        `--token`, token,
        ...teamFlag.split(" ").filter(Boolean),
      ],
      { timeout: 60_000, encoding: "utf-8" }
    );

    const output = (result.stdout ?? "") + (result.stderr ?? "");

    // Extract URL from output
    const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/);
    if (urlMatch) {
      vercelUrl = urlMatch[0];
    } else if (result.status !== 0) {
      console.error(`[Skill 04] Vercel CLI error for ${lead.name}:\n${output.slice(0, 500)}`);
      return null;
    }
  } finally {
    // Cleanup temp dir
    fs.rmSync(deployDir, { recursive: true, force: true });
  }

  if (!vercelUrl) {
    console.warn(`[Skill 04] Could not extract URL for ${lead.name}`);
    return null;
  }

  const emailDraft = generateEmailDraft(lead, vercelUrl);
  const now = new Date().toISOString();

  await db.insert(deployments).values({
    id: randomUUID(),
    leadId: lead.id,
    vercelProjectName: projectName,
    vercelUrl,
    emailDraft,
    deployedAt: now,
    createdAt: now,
  });

  await db.update(leads).set({
    status: "complete",
    updatedAt: now,
  }).where(eq(leads.id, lead.id));

  console.log(`[Skill 04] Deployed ${lead.name}: ${vercelUrl}`);
  onProgress?.(lead.id, vercelUrl);

  return { leadId: lead.id, vercelUrl, projectName, emailDraft };
}
