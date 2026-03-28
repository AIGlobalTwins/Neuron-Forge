import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "@/lib/settings";

async function getUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

export type ContentType = "blog" | "landing" | "meta" | "faq" | "service";

export interface SeoResult {
  type: ContentType;
  sections: { title: string; content: string }[];
  seoTips: string[];
  wordCount: number;
  keywords: string[];
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: "Artigo de Blog",
  landing: "Copy de Landing Page",
  meta: "Meta Tags",
  faq: "FAQs",
  service: "Descrição de Serviço",
};

function buildPrompt(
  contentType: ContentType,
  businessName: string,
  category: string,
  description: string,
  targetAudience: string,
  keywords: string,
  tone: string,
  language: string,
): string {
  const lang = language === "pt" ? "Português europeu" : language === "en" ? "English" : "Español";
  const toneLabel = tone === "professional" ? "profissional e autoritário"
    : tone === "friendly" ? "simpático e acessível"
    : tone === "inspirational" ? "inspirador e motivacional"
    : "direto e objetivo";

  const businessCtx = `
Negócio: ${businessName}
Categoria: ${category}
Descrição: ${description}
Público-alvo: ${targetAudience || "geral"}
Keywords alvo: ${keywords || "a definir com base no negócio"}
Tom: ${toneLabel}
Idioma: ${lang}
`.trim();

  const eeatGuidelines = `
Escreve seguindo as diretrizes E-E-A-T do Google (2024):
- EXPERTISE: usa dados concretos, estatísticas ou factos verificáveis; demonstra domínio técnico do tema
- EXPERIENCE: inclui exemplos específicos, cenários reais ou situações práticas do sector
- AUTHORITATIVENESS: tom seguro e direto, sem linguagem vaga ("pode ser", "talvez") — afirmações claras
- TRUSTWORTHINESS: honestidade sem exageros, sem promessas impossíveis; linguagem que gera confiança
`.trim();

  const geoGuidelines = `
Cada secção H2 deve ter entre 134 e 167 palavras — este é o comprimento ideal para ser citado por Google AI Overviews, ChatGPT e Perplexity. Cada secção deve ser um bloco autónomo e citável, respondendo a uma sub-questão específica com clareza.
`.trim();

  const base = `És um especialista em SEO e copywriting. ${businessCtx}\n\n`;

  if (contentType === "blog") {
    return base + `Escreve um artigo de blog SEO-optimizado.

${eeatGuidelines}

${geoGuidelines}

Devolve APENAS um objeto JSON com esta estrutura:
{
  "sections": [
    { "title": "Meta Title (≤60 chars)", "content": "o título do artigo" },
    { "title": "Meta Description (≤160 chars)", "content": "descrição apelativa para SERP" },
    { "title": "Introdução", "content": "2-3 parágrafos de introdução com a keyword principal naturalmente inserida" },
    { "title": "H2: [título secção 1]", "content": "conteúdo entre 134-167 palavras, autónomo e citável" },
    { "title": "H2: [título secção 2]", "content": "conteúdo entre 134-167 palavras, autónomo e citável" },
    { "title": "H2: [título secção 3]", "content": "conteúdo entre 134-167 palavras, autónomo e citável" },
    { "title": "Conclusão", "content": "parágrafo final com call-to-action" },
    { "title": "Slug sugerido", "content": "url-slug-seo-friendly" },
    { "title": "Alt text sugerido para imagem de destaque", "content": "descrição da imagem ideal" }
  ],
  "seoTips": ["dica 1", "dica 2", "dica 3", "dica 4"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;
  }

  if (contentType === "landing") {
    return base + `Escreve copy de landing page SEO-optimizada.

${eeatGuidelines}

Devolve APENAS um objeto JSON:
{
  "sections": [
    { "title": "Headline principal (H1)", "content": "headline poderosa com keyword — autoritária e direta" },
    { "title": "Subheadline", "content": "frase de apoio que reforça o valor com especificidade" },
    { "title": "Proposta de valor", "content": "2-3 frases sobre o que torna este negócio único — com dados ou factos concretos (E-E-A-T: Expertise)" },
    { "title": "Benefício 1", "content": "título + descrição curta (2 frases) com exemplo específico" },
    { "title": "Benefício 2", "content": "título + descrição curta (2 frases) com exemplo específico" },
    { "title": "Benefício 3", "content": "título + descrição curta (2 frases) com exemplo específico" },
    { "title": "Social Proof", "content": "frase de testemunho ou prova social — específica, credível, sem hipérboles (E-E-A-T: Trustworthiness)" },
    { "title": "Call-to-Action principal", "content": "texto do botão + frase de apoio" },
    { "title": "Meta Title (≤60 chars)", "content": "title tag para esta landing page" },
    { "title": "Meta Description (≤160 chars)", "content": "meta description apelativa" }
  ],
  "seoTips": ["dica 1", "dica 2", "dica 3", "dica 4"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;
  }

  if (contentType === "meta") {
    return base + `Gera meta tags SEO completas para o website deste negócio.

Devolve APENAS um objeto JSON:
{
  "sections": [
    { "title": "Title Tag (≤60 chars)", "content": "título otimizado" },
    { "title": "Meta Description (≤160 chars)", "content": "descrição apelativa" },
    { "title": "OG Title", "content": "título para partilha em redes sociais" },
    { "title": "OG Description", "content": "descrição para partilha em redes sociais" },
    { "title": "Keywords principais", "content": "lista de 8-10 keywords separadas por vírgula" },
    { "title": "Keywords long-tail", "content": "5-7 keywords de cauda longa com intenção de pesquisa" },
    { "title": "Schema markup sugerido", "content": "tipo de schema recomendado (LocalBusiness, Service, etc.) e campos principais" },
    { "title": "Alt text padrão para imagens", "content": "template de alt text com keyword" }
  ],
  "seoTips": ["dica 1", "dica 2", "dica 3", "dica 4"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;
  }

  if (contentType === "faq") {
    return base + `Cria uma secção de FAQs SEO-optimizada para featured snippets e AI Overviews.

Regras para cada resposta:
- 40-60 palavras por resposta (ideal para featured snippets do Google)
- Começa sempre com uma resposta direta na primeira frase
- Inclui a keyword da pergunta na resposta
- Linguagem clara, sem jargão desnecessário

NOTA IMPORTANTE SOBRE SCHEMA: O FAQ schema (JSON-LD com FAQPage) foi restrito pelo Google em Agosto 2023 — já não é recomendado para negócios comuns (apenas gov/health). Em vez disso, usa QAPage schema ou LocalBusiness schema com hasMap. Indica isto nas seoTips.

Devolve APENAS um objeto JSON:
{
  "sections": [
    { "title": "FAQ 1: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "FAQ 2: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "FAQ 3: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "FAQ 4: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "FAQ 5: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "FAQ 6: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "FAQ 7: [pergunta com keyword]", "content": "resposta direta de 40-60 palavras" },
    { "title": "Schema recomendado", "content": "JSON-LD QAPage schema pronto a usar, com as 3 perguntas mais importantes" }
  ],
  "seoTips": ["dica sobre FAQ schema deprecation (Aug 2023)", "dica sobre featured snippets", "dica sobre AI Overviews"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;
  }

  // service
  return base + `Escreve descrições SEO-optimizadas para os serviços deste negócio.

Devolve APENAS um objeto JSON:
{
  "sections": [
    { "title": "Descrição principal do negócio", "content": "150-200 palavras, keywords naturalmente integradas, para a homepage" },
    { "title": "Serviço 1: [nome]", "content": "descrição SEO 80-100 palavras" },
    { "title": "Serviço 2: [nome]", "content": "descrição SEO 80-100 palavras" },
    { "title": "Serviço 3: [nome]", "content": "descrição SEO 80-100 palavras" },
    { "title": "About Us / Sobre nós", "content": "parágrafo institucional 100-150 palavras" },
    { "title": "Tagline SEO", "content": "slogan curto com keyword principal" }
  ],
  "seoTips": ["dica 1", "dica 2", "dica 3", "dica 4"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const anthropicKey = getAnthropicKey(userId);
    if (!anthropicKey) {
      return NextResponse.json({ error: "Anthropic API Key não configurada. Adiciona em Configurações." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      contentType = "blog",
      businessName = "",
      category = "",
      description = "",
      targetAudience = "",
      keywords = "",
      tone = "professional",
      language = "pt",
    } = body;

    if (!businessName.trim()) {
      return NextResponse.json({ error: "Nome do negócio obrigatório." }, { status: 400 });
    }

    const prompt = buildPrompt(
      contentType as ContentType,
      businessName,
      category,
      description,
      targetAudience,
      keywords,
      tone,
      language,
    );

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const maxTokens = contentType === "blog" ? 3000 : contentType === "landing" ? 2500 : 2000;

    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida do modelo");

    const parsed = JSON.parse(match[0]) as { sections: { title: string; content: string }[]; seoTips: string[]; keywords: string[] };

    const wordCount = parsed.sections.reduce((acc, s) => acc + s.content.split(/\s+/).length, 0);

    const result: SeoResult = {
      type: contentType as ContentType,
      sections: parsed.sections || [],
      seoTips: parsed.seoTips || [],
      wordCount,
      keywords: parsed.keywords || [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[seo] error:", err);
    return NextResponse.json({ error: (err as Error).message || "Erro inesperado — tenta novamente." }, { status: 500 });
  }
}
