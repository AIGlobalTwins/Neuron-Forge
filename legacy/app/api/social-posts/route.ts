import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";
import { extractJsonArray } from "@/lib/json-extract";
import { buildBusinessContext, type BusinessProfile } from "@/lib/business-context";

export interface GeneratedPost {
  caption: string;
  hashtags: string;
  imagePrompt: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { businessName, category, description, postType, tone, count = 1 } = body;
  const clientProfile = body.clientProfile as BusinessProfile | null | undefined;
  const businessContext = buildBusinessContext(clientProfile);

  if (!businessName || !description) {
    return NextResponse.json({ error: "businessName and description are required" }, { status: 400 });
  }

  let userId: string | null = null;
  try { userId = await (await import("@/lib/supabase/server")).getSupabaseUserId(); } catch {}
  const anthropicKey = getAnthropicKey(userId);
  const claudeModel = getClaudeModel(userId);
  if (!anthropicKey) {
    return NextResponse.json({ error: "Anthropic API Key not configured. Add it in Settings." }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const toneMap: Record<string, string> = {
    profissional: "formal, confiante, autoritativo — sem emojis excessivos",
    casual: "descontraído, próximo, linguagem do dia-a-dia — emojis moderados",
    criativo: "criativo, original, surpreendente — usa metáforas e emojis expressivos",
    inspiracional: "motivador, positivo, emocional — convida à ação com energia",
  };

  const postTypeMap: Record<string, string> = {
    promocao: "Promoção ou desconto especial",
    novidade: "Novidade, novo produto ou serviço",
    testemunho: "Testemunho de cliente satisfeito (escreve na voz do cliente)",
    dica: "Dica útil ou conselho relacionado com o negócio",
    lancamento: "Lançamento oficial de produto, serviço ou evento",
  };

  const toneDesc = toneMap[tone?.toLowerCase()] || toneMap["casual"];
  const postTypeDesc = postTypeMap[postType?.toLowerCase()] || postTypeMap["novidade"];

  const prompt = `És um especialista em copywriting para redes sociais. Cria ${count} post(s) para Instagram para o seguinte negócio.

Negócio: ${businessName}
Categoria: ${category}
Descrição: ${description}
Tipo de post: ${postTypeDesc}
Tom: ${toneDesc}

Regras:
- Gera EXACTAMENTE ${count} post(s) — nem mais, nem menos. Cada post com ângulo/gancho diferente.
- Caption (estrutura): linha 1 = hook que para o scroll; 2-4 frases de corpo com 1 dado/benefício concreto; última linha = chamada à ação clara. Máximo 2200 caracteres. Usa quebras de linha entre blocos.
- Hashtags: 15-20 hashtags relevantes misturando PT e EN, separadas por espaço (nicho + locais + amplas)
- Image prompt: descreve uma imagem fotorrealista ideal para este post (sujeito, enquadramento, luz, mood) — para usar no Canva ou IA
- Escreve em Português de Portugal. ${toneDesc.includes("emoji") ? "Emojis com moderação, alinhados ao tom." : "Sem emojis a não ser que o tom o peça."}
- NÃO uses aspas em volta da caption

Responde APENAS com um JSON array de ${count} objecto(s) (sem markdown):
[
  {
    "caption": "texto completo do post",
    "hashtags": "#hashtag1 #hashtag2 ...",
    "imagePrompt": "descrição da imagem ideal"
  }
]${businessContext}`;

  let res: Anthropic.Message;
  try {
    res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: Math.min(8000, 1500 + Number(count) * 900),
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    const m = String((e as Error).message || "");
    if (/401|invalid|authentication/i.test(m)) return NextResponse.json({ error: "Invalid Anthropic API Key." }, { status: 401 });
    if (/overloaded|429|503|rate.?limit/i.test(m)) return NextResponse.json({ error: "AI está ocupado — tenta novamente." }, { status: 503 });
    return NextResponse.json({ error: `Erro ao gerar posts: ${m.slice(0, 120)}` }, { status: 500 });
  }

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "[]";
  const parsed = extractJsonArray<GeneratedPost>(raw);
  if (!parsed) {
    return NextResponse.json({ error: "Erro ao gerar posts — tenta novamente" }, { status: 500 });
  }

  // Normalize: keep valid posts, clamp caption to Instagram's 2200 limit.
  const posts: GeneratedPost[] = parsed
    .filter((p) => p && typeof p.caption === "string")
    .map((p) => ({
      caption: p.caption.length > 2200 ? p.caption.slice(0, 2197) + "…" : p.caption,
      hashtags: typeof p.hashtags === "string" ? p.hashtags : "",
      imagePrompt: typeof p.imagePrompt === "string" ? p.imagePrompt : "",
    }));

  if (posts.length === 0) {
    return NextResponse.json({ error: "Invalid response from AI — please try again" }, { status: 500 });
  }

  return NextResponse.json({ posts });
}
