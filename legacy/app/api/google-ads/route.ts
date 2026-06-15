import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { qualityBar } from "@/lib/agent-quality";
import { extractJsonObject } from "@/lib/json-extract";

export type CampaignType = "search" | "pmax" | "display" | "remarketing";

export interface AdGroup {
  theme: string;
  headlines: string[];
  descriptions: string[];
  sitelinks: { title: string; description: string }[];
  callouts: string[];
}

export interface GoogleAdsResult {
  campaignType: CampaignType;
  adGroups: AdGroup[];
  negativeKeywords: string[];
  tips: string[];
  budgetSuggestion: string;
}

const CAMPAIGN_LABELS: Record<CampaignType, { pt: string; desc: string }> = {
  search:      { pt: "Search",          desc: "Anúncios de pesquisa Google — texto puro, intenção alta" },
  pmax:        { pt: "Performance Max", desc: "Campanha multiplataforma automatizada (Search + Display + YouTube + Discovery)" },
  display:     { pt: "Display",         desc: "Banners visuais na rede de display Google" },
  remarketing: { pt: "Remarketing",     desc: "Recuperar visitantes que já passaram pelo site" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { businessName, category, description, campaignType = "search", targetAudience, location, language = "pt" } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    }

    let userId: string | null = null;
    try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });
    }

    const campaign = CAMPAIGN_LABELS[campaignType as CampaignType] ?? CAMPAIGN_LABELS.search;
    const lang = language === "pt" ? "Português europeu" : language === "en" ? "English" : "Español";

    const prompt = `És um especialista certificado em Google Ads com vasta experiência em campanhas ${campaign.pt}. Cria copy completo para uma campanha do tipo "${campaign.pt}" para o seguinte negócio.

## NEGÓCIO
Nome: ${businessName}
Categoria: ${category || "Geral"}
Descrição: ${description || "Não especificada"}
Público-alvo: ${targetAudience || "geral"}
Localização: ${location || "Portugal"}
Idioma: ${lang}

## TIPO DE CAMPANHA
${campaign.pt}: ${campaign.desc}

## REGRAS GOOGLE ADS (OBRIGATÓRIAS)
- Headlines: EXACTAMENTE 30 caracteres máximo cada (incluindo espaços) — o Google rejeita se exceder
- Descriptions: EXACTAMENTE 90 caracteres máximo cada (incluindo espaços) — o Google rejeita se exceder
- Sitelink title: máximo 25 caracteres
- Sitelink description: máximo 35 caracteres
- Callout: máximo 25 caracteres
- Mínimo 15 headlines e 4 descriptions por ad group
- Headlines devem incluir: keyword principal, benefício, CTA, localização (se relevante), números/dados
- Não repetir a mesma ideia em headlines diferentes — variar ângulos
- Usar inserção de keyword onde fizer sentido: {KeyWord:fallback}

${qualityBar(language)}

Responde APENAS com JSON (sem markdown):
{
  "adGroups": [
    {
      "theme": "Tema/keyword principal do grupo",
      "headlines": ["Headline 1 (≤30ch)", "Headline 2 (≤30ch)", "...pelo menos 15"],
      "descriptions": ["Description 1 (≤90ch)", "Description 2 (≤90ch)", "...pelo menos 4"],
      "sitelinks": [
        { "title": "Sitelink (≤25ch)", "description": "Desc (≤35ch)" }
      ],
      "callouts": ["Callout 1 (≤25ch)", "Callout 2"]
    }
  ],
  "negativeKeywords": ["keyword negativa 1", "keyword negativa 2", "...mínimo 10"],
  "tips": [
    "Dica de otimização 1 — específica para esta campanha",
    "Dica de otimização 2",
    "Dica de otimização 3",
    "Dica sobre bidding/budget"
  ],
  "budgetSuggestion": "Sugestão de orçamento diário com justificação (ex: 15-25€/dia para Search em Lisboa, com CPC estimado de 0.80-1.50€)"
}

Notas:
- Cria 2-3 ad groups com temas/keywords diferentes
- Cada ad group = ângulo diferente (ex: serviço principal, localização, benefício)
- Escreve tudo em ${lang}
- CONTA OS CARACTERES — é crítico que respeites os limites`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const parsed = extractJsonObject<GoogleAdsResult>(raw);
    if (!parsed || !Array.isArray(parsed.adGroups) || parsed.adGroups.length === 0) {
      return NextResponse.json({ error: "Failed to generate ads — please try again." }, { status: 500 });
    }

    // Enforce Google's hard character limits so nothing gets rejected on upload.
    const cap = (s: string, n: number) => (typeof s === "string" ? (s.length > n ? s.slice(0, n).trim() : s) : "");
    const adGroups: AdGroup[] = parsed.adGroups.map((g) => ({
      theme: g.theme || "",
      headlines: (g.headlines || []).map((h) => cap(h, 30)).filter(Boolean),
      descriptions: (g.descriptions || []).map((d) => cap(d, 90)).filter(Boolean),
      sitelinks: (g.sitelinks || []).map((s) => ({ title: cap(s?.title, 25), description: cap(s?.description, 35) })).filter((s) => s.title),
      callouts: (g.callouts || []).map((c) => cap(c, 25)).filter(Boolean),
    }));

    const result: GoogleAdsResult = {
      campaignType: campaignType as CampaignType,
      adGroups,
      negativeKeywords: Array.isArray(parsed.negativeKeywords) ? parsed.negativeKeywords : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      budgetSuggestion: parsed.budgetSuggestion || "",
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[google-ads] error:", err);
    const msg = (err as Error).message || "";
    if (msg.includes("API Key") || msg.includes("authentication") || msg.includes("401")) {
      return NextResponse.json({ error: "Invalid API Key. Check your settings." }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error — please try again." }, { status: 500 });
  }
}
