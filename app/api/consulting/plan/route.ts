import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey } from "@/lib/settings";
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
  const body = await req.json().catch(() => ({}));
  const { area, problem, questions, answers } = body;

  if (!area || !problem || !questions || !answers) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  let userId: string | null = null;
  try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
  const anthropicKey = getAnthropicKey(userId);
  if (!anthropicKey) {
    return NextResponse.json({ error: "Anthropic API Key não configurada." }, { status: 500 });
  }

  const forgeToolsMd = loadForgeTools();

  const qa = questions
    .map((q: { id: string; text: string }, i: number) => `P${i + 1}: ${q.text}\nR: ${answers[q.id] ?? "(sem resposta)"}`)
    .join("\n\n");

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const prompt = `És um consultor de negócios sénior especializado em ${area}. Analisa o diagnóstico completo e constrói um plano de consultoria profissional.

## PROBLEMA INICIAL
${problem}

## RESPOSTAS DO DIAGNÓSTICO
${qa}

${forgeToolsMd ? `## FERRAMENTAS DISPONÍVEIS NO NEURON FORGE
Abaixo estão as ferramentas que podes recomendar se forem genuinamente relevantes para resolver parte do problema. Só recomenda se existir uma ligação clara e real entre o problema diagnosticado e a ferramenta. Máximo 2 ferramentas.

${forgeToolsMd}` : ""}

Constrói o plano em JSON. Responde APENAS com JSON (sem markdown):
{
  "title": "Título do plano (específico ao problema)",
  "executive": "Resumo executivo em 2-3 frases — o que está mal e o que vai mudar",
  "diagnosis": [
    "Problema raiz 1 identificado",
    "Problema raiz 2 identificado",
    "Problema raiz 3 identificado"
  ],
  "objectives": [
    "Objetivo SMART 1",
    "Objetivo SMART 2",
    "Objetivo SMART 3"
  ],
  "actions": [
    { "phase": "Fase 1 — Nome", "task": "Descrição da tarefa", "owner": "Quem executa (ex: CEO, Equipa de Marketing)", "timing": "Semana 1-2" },
    { "phase": "Fase 1 — Nome", "task": "Outra tarefa", "owner": "Responsável", "timing": "Semana 2" },
    { "phase": "Fase 2 — Nome", "task": "Tarefa seguinte", "owner": "Responsável", "timing": "Mês 2" }
  ],
  "kpis": [
    { "metric": "Nome da métrica", "target": "Valor alvo e prazo" }
  ],
  "risks": [
    { "risk": "Descrição do risco", "mitigation": "Como mitigar" }
  ],
  "forgeTools": [
    { "id": "analyze", "name": "Analyze & Redesign", "reason": "Motivo específico para este caso — ligar ao problema diagnosticado" }
  ]
}

Notas:
- Mínimo 6 action items distribuídos por 2-3 fases
- Mínimo 4 KPIs
- Mínimo 3 riscos
- forgeTools pode ser array vazio [] se não houver ferramentas genuinamente relevantes
- Escreve tudo em Português de Portugal
- Sê específico — nada genérico`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Erro ao gerar plano" }, { status: 500 });

  try {
    const plan: ConsultingPlan = JSON.parse(match[0]);
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }
}
