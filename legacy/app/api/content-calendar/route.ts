import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { qualityBar } from "@/lib/agent-quality";
import { extractJsonObject } from "@/lib/json-extract";

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
      return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    }

    let userId: string | null = null;
    try { userId = await (await import("@/lib/supabase/server")).getSupabaseUserId(); } catch {}
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });
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

${qualityBar(lang)}

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

    const stream = anthropic.messages.stream({
      model: claudeModel,
      max_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
    });
    const res = await stream.finalMessage();

    const textBlock = res.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "{}";
    const parsed = extractJsonObject<ContentCalendarResult>(raw);
    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      return NextResponse.json({ error: "Failed to generate calendar — please try again." }, { status: 500 });
    }

    // Normalize: rest days carry no content; sort by day.
    const days: CalendarDay[] = parsed.days
      .map((d) => d.type === "rest"
        ? { ...d, theme: d.theme || "Descanso", caption: "", hashtags: "", bestTime: "", imageIdea: "" }
        : d)
      .sort((a, b) => (a.day || 0) - (b.day || 0));

    const result: ContentCalendarResult = {
      month: parsed.month || targetMonth,
      strategy: parsed.strategy || "",
      days,
      weeklyThemes: Array.isArray(parsed.weeklyThemes) ? parsed.weeklyThemes : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[content-calendar] error:", err);
    const msg = (err as Error).message || "";
    if (msg.includes("API Key") || msg.includes("authentication") || msg.includes("401")) {
      return NextResponse.json({ error: "Invalid API Key. Check your settings." }, { status: 500 });
    }
    if (/overload|rate.?limit|\b429\b|\b529\b|\b503\b|timeout|timed out/i.test(msg)) {
      return NextResponse.json({ error: "The AI is busy right now. Wait a few seconds and try again." }, { status: 503 });
    }
    return NextResponse.json({ error: `Could not generate the calendar: ${msg.slice(0, 140) || "unexpected error"}. Please try again.` }, { status: 500 });
  }
}
