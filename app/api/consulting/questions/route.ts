import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";

export interface Question {
  id: string;
  text: string;
  type: "text" | "scale" | "choice";
  options?: string[];        // for "choice" type
  scaleMin?: string;         // for "scale" type
  scaleMax?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { area, problem } = body;

  if (!area || !problem) {
    return NextResponse.json({ error: "area e problem são obrigatórios" }, { status: 400 });
  }

  let userId: string | null = null;
  try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
  const anthropicKey = getAnthropicKey(userId);
  const claudeModel = getClaudeModel(userId);
  if (!anthropicKey) {
    return NextResponse.json({ error: "Anthropic API Key não configurada." }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const prompt = `És um consultor de negócios sénior especializado em ${area}. Um cliente descreveu o seguinte problema:

"${problem}"

Gera exactamente 7 perguntas de diagnóstico altamente específicas a este problema e área. As perguntas devem revelar as causas raiz, o contexto do negócio, os recursos disponíveis e os constrangimentos reais.

Regras:
- Cada pergunta deve ser accionável — a resposta deve influenciar directamente o plano de solução
- Mistura tipos: algumas abertas (text), algumas de escala (scale), algumas de escolha múltipla (choice)
- Não faças perguntas genéricas que se apliquem a qualquer negócio
- Adapta 100% ao problema descrito e à área de ${area}
- Escreve em Português de Portugal

Responde APENAS com JSON array (sem markdown):
[
  {
    "id": "q1",
    "text": "Pergunta aqui?",
    "type": "text"
  },
  {
    "id": "q2",
    "text": "Numa escala de 1 a 10, como avalias X?",
    "type": "scale",
    "scaleMin": "Muito mau",
    "scaleMax": "Excelente"
  },
  {
    "id": "q3",
    "text": "Qual a principal razão para Y?",
    "type": "choice",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"]
  }
]`;

  const res = await anthropic.messages.create({
    model: claudeModel,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return NextResponse.json({ error: "Erro ao gerar perguntas" }, { status: 500 });

  try {
    const questions: Question[] = JSON.parse(match[0]);
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }
}
