import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";

export interface CalendarDay {
  day: number;
  weekday: string;
  type: "post" | "story" | "reel" | "blog" | "newsletter" | "rest";
  theme: string;
  caption: string;
  hashtags: string;
  bestTime: string;
  imageIdea: string;
}

export interface ContentCalendarResult {
  month: string;
  strategy: string;
  days: CalendarDay[];
  weeklyThemes: string[];
  tips: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { businessName, category, description, month, platforms = "instagram", frequency = "daily", language = "pt" } = body;

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

    const lang = language === "pt" ? "Português europeu" : language === "en" ? "English" : "Español";

    const freqLabel = frequency === "daily" ? "todos os dias (30 conteúdos)"
      : frequency === "weekdays" ? "dias úteis (20-22 conteúdos)"
      : frequency === "3x" ? "3 vezes por semana (12-13 conteúdos)"
      : "todos os dias (30 conteúdos)";

    const platformLabel = platforms === "instagram" ? "Instagram (posts, stories, reels)"
      : platforms === "multi" ? "Multi-plataforma (Instagram + Facebook + LinkedIn)"
      : "Instagram (posts, stories, reels)";

    const targetMonth = month || new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

    const prompt = `És um social media manager experiente. Cria um calendário editorial completo para o mês de ${targetMonth}.

## NEGÓCIO
Nome: ${businessName}
Categoria: ${category || "Geral"}
Descrição: ${description || "Não especificada"}
Plataformas: ${platformLabel}
Frequência: ${freqLabel}
Idioma: ${lang}

## REGRAS
- Cada dia com conteúdo deve ter: tipo (post/story/reel/blog/newsletter), tema, caption curta (2-3 frases de preview), hashtags (10-15), melhor hora, ideia de imagem
- Dias de descanso: type "rest", sem conteúdo — usar nos dias de menor engagement (tipicamente domingo)
- Variar tipos: ~50% posts, ~25% stories, ~15% reels, ~10% blog/newsletter
- Temas semanais: definir 4 pilares temáticos para o mês (ex: educação, bastidores, promoção, comunidade)
- Incluir: datas relevantes do mês, tendências sazonais, hooks virais adaptados ao negócio
- bestTime: horário recomendado baseado em dados gerais de engagement para ${lang === "Português europeu" ? "Portugal" : "o mercado-alvo"}
- Progressão: construir narrativa ao longo do mês (não repetir temas em dias consecutivos)

Responde APENAS com JSON (sem markdown):
{
  "month": "${targetMonth}",
  "strategy": "Resumo da estratégia do mês em 2-3 frases — o fio condutor e o objectivo principal",
  "weeklyThemes": ["Pilar 1: nome", "Pilar 2: nome", "Pilar 3: nome", "Pilar 4: nome"],
  "days": [
    {
      "day": 1,
      "weekday": "Terça",
      "type": "post",
      "theme": "Tema do conteúdo",
      "caption": "Preview do caption — 2-3 frases com hook",
      "hashtags": "#hashtag1 #hashtag2 ...",
      "bestTime": "10:00",
      "imageIdea": "Descrição da imagem ideal"
    },
    {
      "day": 6,
      "weekday": "Domingo",
      "type": "rest",
      "theme": "",
      "caption": "",
      "hashtags": "",
      "bestTime": "",
      "imageIdea": ""
    }
  ],
  "tips": [
    "Dica estratégica 1 — específica para este mês e negócio",
    "Dica sobre engagement",
    "Dica sobre reaproveitamento de conteúdo",
    "Dica sobre métricas a acompanhar"
  ]
}

Notas:
- Gera TODOS os dias do mês (1 a 28/30/31 conforme o mês)
- Escreve tudo em ${lang}
- Sê específico para o negócio — nada genérico`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Erro ao gerar calendário — tenta novamente." }, { status: 500 });

    try {
      const parsed = JSON.parse(match[0]);
      const result: ContentCalendarResult = {
        month: parsed.month || targetMonth,
        strategy: parsed.strategy || "",
        days: parsed.days || [],
        weeklyThemes: parsed.weeklyThemes || [],
        tips: parsed.tips || [],
      };
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Resposta inválida — tenta novamente." }, { status: 500 });
    }
  } catch (err) {
    console.error("[content-calendar] error:", err);
    const msg = (err as Error).message || "";
    if (msg.includes("API Key") || msg.includes("authentication") || msg.includes("401")) {
      return NextResponse.json({ error: "API Key inválida. Verifica as configurações." }, { status: 500 });
    }
    return NextResponse.json({ error: "Erro inesperado — tenta novamente." }, { status: 500 });
  }
}
