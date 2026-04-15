import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";

export type SequenceType = "welcome" | "nurture" | "reengagement" | "promotion" | "abandoned";

export interface EmailEntry {
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  sendDay: string;
}

export interface EmailMarketingResult {
  sequenceType: SequenceType;
  emails: EmailEntry[];
  tips: string[];
  subjectLineVariants: string[];
}

const SEQUENCE_LABELS: Record<SequenceType, { pt: string; desc: string; count: number }> = {
  welcome:       { pt: "Boas-vindas",    desc: "Sequência de onboarding para novos subscritores/clientes", count: 5 },
  nurture:       { pt: "Nurturing",      desc: "Sequência de nutrição de leads — confiança progressiva até à conversão", count: 6 },
  reengagement:  { pt: "Re-engagement",  desc: "Sequência para reativar contactos inativos (sem abrir emails há 60+ dias)", count: 4 },
  promotion:     { pt: "Promoção",       desc: "Sequência de campanha promocional com urgência e escassez", count: 5 },
  abandoned:     { pt: "Carrinho abandonado", desc: "Sequência de recuperação de carrinho/lead abandonado", count: 4 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { businessName, category, description, sequenceType = "welcome", tone = "professional", language = "pt" } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: "Nome do negócio obrigatório." }, { status: 400 });
    }

    let userId: string | null = null;
    try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key não configurada. Adiciona em Configurações." }, { status: 500 });
    }

    const seq = SEQUENCE_LABELS[sequenceType as SequenceType] ?? SEQUENCE_LABELS.welcome;
    const lang = language === "pt" ? "Português europeu" : language === "en" ? "English" : "Español";
    const toneLabel = tone === "professional" ? "profissional e confiante"
      : tone === "friendly" ? "simpático e próximo"
      : tone === "bold" ? "direto e ousado"
      : "profissional e confiante";

    const prompt = `És um especialista em email marketing e copywriting de conversão. Cria uma sequência completa de ${seq.count} emails do tipo "${seq.pt}" para o seguinte negócio.

## NEGÓCIO
Nome: ${businessName}
Categoria: ${category || "Geral"}
Descrição: ${description || "Não especificada"}
Tom: ${toneLabel}
Idioma: ${lang}

## TIPO DE SEQUÊNCIA
${seq.pt}: ${seq.desc}

## REGRAS
- Cada email deve ter: subject line (≤60 chars), preheader (≤90 chars), body (150-250 palavras), CTA (texto do botão)
- Subject lines: usar curiosidade, números ou urgência — sem clickbait óbvio
- Preheader: complementa o subject, nunca repete
- Body: formato scannable — parágrafos curtos (2-3 frases), bullet points quando relevante
- CTA: imperativo, específico, máximo 5 palavras (ex: "Reservar agora", "Ver colecção")
- Progressão lógica: cada email constrói sobre o anterior — não repetir argumentos
- Último email: urgência natural ou resumo de valor (sem spam)
- sendDay: quando enviar relativamente ao trigger (ex: "Dia 0", "Dia 2", "Dia 5")

Responde APENAS com JSON (sem markdown):
{
  "emails": [
    {
      "subject": "Subject line aqui",
      "preheader": "Preheader aqui",
      "body": "Corpo do email com formatação clara...",
      "cta": "Texto do botão",
      "sendDay": "Dia 0"
    }
  ],
  "tips": [
    "Dica de implementação 1 — específica para este tipo de sequência",
    "Dica de implementação 2",
    "Dica de implementação 3",
    "Dica sobre automação/segmentação"
  ],
  "subjectLineVariants": [
    "Variante A/B do subject do email 1",
    "Variante A/B do subject do email 2",
    "Variante A/B do subject do email 3"
  ]
}

Notas:
- Escreve tudo em ${lang}
- Sê específico para o negócio — nada genérico
- Inclui dados concretos onde possível (%, tempo, quantidade)`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Erro ao gerar sequência — tenta novamente." }, { status: 500 });

    try {
      const parsed = JSON.parse(match[0]);
      const result: EmailMarketingResult = {
        sequenceType: sequenceType as SequenceType,
        emails: parsed.emails || [],
        tips: parsed.tips || [],
        subjectLineVariants: parsed.subjectLineVariants || [],
      };
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Resposta inválida — tenta novamente." }, { status: 500 });
    }
  } catch (err) {
    console.error("[email-marketing] error:", err);
    const msg = (err as Error).message || "";
    if (msg.includes("API Key") || msg.includes("authentication") || msg.includes("401")) {
      return NextResponse.json({ error: "API Key inválida. Verifica as configurações." }, { status: 500 });
    }
    return NextResponse.json({ error: "Erro inesperado — tenta novamente." }, { status: 500 });
  }
}
