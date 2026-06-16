import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { qualityBar } from "@/lib/agent-quality";
import { extractJsonObject } from "@/lib/json-extract";
import fs from "fs";
import path from "path";

export interface ActionItem {
  phase: string;
  task: string;
  owner: string;
  timing: string;
}

export interface ForgeToolRec {
  id: string;
  name: string;
  reason: string;
}

export interface ConsultingPlan {
  title: string;
  executive: string;
  diagnosis: string[];
  objectives: string[];
  actions: ActionItem[];
  kpis: { metric: string; target: string }[];
  risks: { risk: string; mitigation: string }[];
  forgeTools: ForgeToolRec[];
}

function loadForgeTools(): string {
  try {
    const filePath = path.join(process.cwd(), "data", "forge-tools.md");
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { area, problem, questions, answers } = body;

    if (!area || !problem || !questions || !answers) {
      return NextResponse.json({ error: "Incomplete data." }, { status: 400 });
    }

    let userId: string | null = null;
    try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });
    }

    const forgeToolsMd = loadForgeTools();

    const qa = questions
      .map((q: { id: string; text: string }, i: number) => `P${i + 1}: ${q.text}\nR: ${answers[q.id] ?? "(sem resposta)"}`)
      .join("\n\n");

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const prompt = `You are a senior business consultant specialized in ${area}. Analyze the full diagnosis and build a professional consulting plan.

## INITIAL PROBLEM
${problem}

## DIAGNOSIS ANSWERS
${qa}

${forgeToolsMd ? `## TOOLS AVAILABLE IN NEURON FORGE
Below are the tools you may recommend if they are genuinely relevant to solving part of the problem. Only recommend one if there is a clear, real link between the diagnosed problem and the tool. Maximum 2 tools.

${forgeToolsMd}` : ""}

${qualityBar("en")}

Build the plan as JSON. Respond ONLY with JSON (no markdown):
{
  "title": "Plan title (specific to the problem)",
  "executive": "Executive summary in 2-3 sentences — what is wrong and what will change",
  "diagnosis": [
    "Identified root problem 1",
    "Identified root problem 2",
    "Identified root problem 3"
  ],
  "objectives": [
    "SMART objective 1",
    "SMART objective 2",
    "SMART objective 3"
  ],
  "actions": [
    { "phase": "Phase 1 — Name", "task": "Task description", "owner": "Who executes (e.g. CEO, Marketing Team)", "timing": "Week 1-2" },
    { "phase": "Phase 1 — Name", "task": "Another task", "owner": "Owner", "timing": "Week 2" },
    { "phase": "Phase 2 — Name", "task": "Next task", "owner": "Owner", "timing": "Month 2" }
  ],
  "kpis": [
    { "metric": "Metric name", "target": "Target value and deadline" }
  ],
  "risks": [
    { "risk": "Risk description", "mitigation": "How to mitigate" }
  ],
  "forgeTools": [
    { "id": "analyze", "name": "Analyze & Redesign", "reason": "Specific reason for this case — tie it to the diagnosed problem" }
  ]
}

Notes:
- At least 6 action items across 2-3 phases
- At least 4 KPIs
- At least 3 risks
- forgeTools can be an empty array [] if no tools are genuinely relevant
- Write everything in English
- Be specific — nothing generic`;

    // Stream the plan — Opus 4.8 plans can take ~50s; streaming keeps the request
    // alive and avoids the gateway timeouts that surfaced as intermittent errors.
    const stream = anthropic.messages.stream({
      model: claudeModel,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });
    const res = await stream.finalMessage();

    const textBlock = res.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "{}";
    const plan = extractJsonObject<ConsultingPlan>(raw);
    if (!plan || !Array.isArray(plan.actions)) {
      return NextResponse.json({ error: "Failed to generate plan — please try again." }, { status: 500 });
    }
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("[consulting/plan] error:", err);
    const msg = (err as Error).message || "";
    if (msg.includes("API Key") || msg.includes("authentication") || msg.includes("401")) {
      return NextResponse.json({ error: "Invalid API Key. Check your settings." }, { status: 500 });
    }
    if (/overload|rate.?limit|\b429\b|\b529\b|\b503\b|timeout|timed out/i.test(msg)) {
      return NextResponse.json({ error: "The AI is busy right now. Wait a few seconds and try again." }, { status: 503 });
    }
    return NextResponse.json({ error: `Could not generate the plan: ${msg.slice(0, 140) || "unexpected error"}. Please try again.` }, { status: 500 });
  }
}
