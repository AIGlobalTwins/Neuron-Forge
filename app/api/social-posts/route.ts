import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey, getClaudeModel } from "@/lib/settings";

export interface GeneratedPost {
  caption: string;
  hashtags: string;
  imagePrompt: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { businessName, category, description, postType, tone, count = 1 } = body;

  if (!businessName || !description) {
    return NextResponse.json({ error: "businessName e description são obrigatórios" }, { status: 400 });
  }

  let userId: string | null = null;
  try { const { auth } = await import("@clerk/nextjs/server"); const a = await auth(); userId = a.userId; } catch {}
  const anthropicKey = getAnthropicKey(userId);
  const claudeModel = getClaudeModel(userId);
  if (!anthropicKey) {
    return NextResponse.json({ error: "Anthropic API Key não configurada. Adiciona nas Configurações." }, { status: 500 });
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
- Caption: máximo 2200 caracteres, começa com um gancho forte (primeira linha = hook que para o scroll)
- Inclui chamada à ação clara no final
- Hashtags: 15-20 hashtags relevantes misturando PT e EN, separadas por espaço
- Image prompt: descreve uma imagem fotorrealista ideal para este post (para usar no Canva ou IA)
- Escreve em Português de Portugal
- NÃO uses aspas em volta da caption

Responde APENAS com um JSON array (sem markdown):
[
  {
    "caption": "texto completo do post",
    "hashtags": "#hashtag1 #hashtag2 ...",
    "imagePrompt": "descrição da imagem ideal"
  }
]`;

  const res = await anthropic.messages.create({
    model: claudeModel,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    return NextResponse.json({ error: "Erro ao gerar posts — tenta novamente" }, { status: 500 });
  }

  let posts: GeneratedPost[];
  try {
    posts = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "Resposta inválida do Claude" }, { status: 500 });
  }

  return NextResponse.json({ posts });
}
