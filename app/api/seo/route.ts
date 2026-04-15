import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getClaudeModel } from "@/lib/settings";

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
- AUTHORITATIVENESS: tom seguro e direto, sem linguagem vaga ("pode ser", "talvez") — afirmações claras e directas
- TRUSTWORTHINESS: honestidade sem exageros, sem promessas impossíveis; linguagem que gera confiança
`.trim();

  const geoGuidelines = `
GEO (Generative Engine Optimization) — regras para ser citado por Google AI Overviews, ChatGPT e Perplexity:
- Cada secção H2 deve ter entre 134 e 167 palavras — comprimento ideal para extracção por AI
- Cada secção é um bloco autónomo: responde a uma sub-questão completa, começa com uma definição ou afirmação directa
- Inclui pelo menos 1 dado numérico por secção (%, tempo, preço, quantidade) — estatísticas aumentam citação em +37%
- Usa afirmações directas: "X reduz Y em 40%" em vez de "pode ajudar a reduzir"
- Inclui freshness signals: "em 2024", "actualmente", "segundo dados recentes" — aumenta relevância temporal
- NUNCA fazer keyword stuffing — reduz visibilidade AI em -10%
`.trim();

  const base = `És um especialista em SEO e copywriting. ${businessCtx}\n\n`;

  if (contentType === "blog") {
    return base + `Escreve um artigo de blog SEO-optimizado.

${eeatGuidelines}

${geoGuidelines}

Devolve APENAS um objeto JSON com esta estrutura:
{
  "sections": [
    { "title": "Meta Title (≤60 chars)", "content": "título com keyword no início, sem clickbait" },
    { "title": "Meta Description (≤160 chars)", "content": "descrição apelativa com keyword e CTA implícito" },
    { "title": "Introdução", "content": "2-3 parágrafos: define o tema na 1ª frase, inclui keyword principal, freshness signal (ex: em 2024)" },
    { "title": "H2: [título secção 1]", "content": "134-167 palavras, bloco autónomo, começa com definição directa, inclui 1 dado numérico específico" },
    { "title": "H2: [título secção 2]", "content": "134-167 palavras, bloco autónomo, começa com definição directa, inclui 1 dado numérico específico" },
    { "title": "H2: [título secção 3]", "content": "134-167 palavras, bloco autónomo, começa com definição directa, inclui 1 dado numérico específico" },
    { "title": "Conclusão", "content": "parágrafo final com síntese e call-to-action directo" },
    { "title": "Slug sugerido", "content": "url-slug-seo-friendly-sem-acentos" },
    { "title": "Alt text sugerido para imagem de destaque", "content": "descrição da imagem com keyword contextual" }
  ],
  "seoTips": ["dica sobre GEO/AI Overviews", "dica E-E-A-T específica para este sector", "dica técnica SEO", "dica de distribuição/amplificação"],
  "keywords": ["kw principal", "kw long-tail 1", "kw long-tail 2", "kw relacionada 1", "kw relacionada 2"]
}`;
  }

  if (contentType === "landing") {
    return base + `Escreve copy de landing page SEO-optimizada.

${eeatGuidelines}

Regra crítica: usa dados numéricos concretos em vez de afirmações genéricas. "Reduzimos o tempo de espera em 40%" é melhor do que "somos rápidos". Estatísticas específicas aumentam credibilidade E-E-A-T e citabilidade AI em +37%.

Devolve APENAS um objeto JSON:
{
  "sections": [
    { "title": "Headline principal (H1)", "content": "headline directa com keyword — específica, sem clickbait (ex: 'Clínica Dentária em Lisboa — Consulta em 24h')" },
    { "title": "Subheadline", "content": "frase de apoio com dado numérico ou benefício específico" },
    { "title": "Proposta de valor", "content": "2-3 frases com dados concretos — o que torna este negócio único, com número ou facto verificável" },
    { "title": "Benefício 1", "content": "título + 2 frases com exemplo específico e dado numérico" },
    { "title": "Benefício 2", "content": "título + 2 frases com exemplo específico e dado numérico" },
    { "title": "Benefício 3", "content": "título + 2 frases com exemplo específico e dado numérico" },
    { "title": "Social Proof", "content": "prova social específica e credível — número de clientes, avaliação, anos de experiência (E-E-A-T: Trustworthiness)" },
    { "title": "Call-to-Action principal", "content": "texto do botão (imperativo, específico) + frase de apoio que reduz friction" },
    { "title": "Meta Title (≤60 chars)", "content": "keyword no início + diferenciador + localização se relevante" },
    { "title": "Meta Description (≤160 chars)", "content": "proposta de valor + CTA implícito" }
  ],
  "seoTips": ["dica E-E-A-T específica para landing pages", "dica sobre Core Web Vitals e conversão", "dica sobre schema markup (LocalBusiness/Service)", "dica GEO para landing pages"],
  "keywords": ["kw principal", "kw long-tail 1", "kw long-tail 2", "kw relacionada 1", "kw relacionada 2"]
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

${eeatGuidelines}

Cada descrição de serviço deve incluir: (1) o que é o serviço em linguagem directa, (2) um benefício concreto com dado numérico ou resultado específico, (3) diferenciador face à concorrência.

Devolve APENAS um objeto JSON:
{
  "sections": [
    { "title": "Descrição principal do negócio", "content": "150-200 palavras para homepage: keyword na 1ª frase, dado de credibilidade (anos, clientes, avaliação), freshness signal" },
    { "title": "Serviço 1: [nome real do serviço]", "content": "80-100 palavras: o que é, benefício com dado numérico, para quem é indicado" },
    { "title": "Serviço 2: [nome real do serviço]", "content": "80-100 palavras: o que é, benefício com dado numérico, para quem é indicado" },
    { "title": "Serviço 3: [nome real do serviço]", "content": "80-100 palavras: o que é, benefício com dado numérico, para quem é indicado" },
    { "title": "About Us / Sobre nós", "content": "100-150 palavras institucionais: história, valores, dado de autoridade (anos, equipa, certificações)" },
    { "title": "Tagline SEO", "content": "slogan ≤10 palavras com keyword principal e diferenciador claro" }
  ],
  "seoTips": ["dica E-E-A-T para páginas de serviço", "dica sobre schema markup Service/LocalBusiness", "dica sobre internal linking entre serviços", "dica GEO para páginas de serviço"],
  "keywords": ["kw serviço principal", "kw long-tail 1", "kw long-tail 2", "kw localização se relevante", "kw relacionada"]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const anthropicKey = getAnthropicKey(userId);
    const claudeModel = getClaudeModel(userId);
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
    const maxTokens = contentType === "blog" ? 4000 : contentType === "landing" ? 3000 : 2500;

    const res = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: maxTokens,
      system: "You are an SEO expert. Always respond with a single valid JSON object only. No markdown, no code fences, no extra text before or after the JSON.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida — tenta novamente.");

    let parsed: { sections: { title: string; content: string }[]; seoTips: string[]; keywords: string[] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      // Attempt to extract partial data if JSON is truncated
      const sectionsMatch = match[0].match(/"sections"\s*:\s*(\[[\s\S]*?\](?=\s*[,}]))/);
      const tipsMatch = match[0].match(/"seoTips"\s*:\s*(\[[\s\S]*?\](?=\s*[,}]))/);
      const kwMatch = match[0].match(/"keywords"\s*:\s*(\[[\s\S]*?\](?=\s*[,}]))/);
      if (!sectionsMatch) throw new Error("Não foi possível processar a resposta. Tenta novamente.");
      parsed = {
        sections: JSON.parse(sectionsMatch[1]),
        seoTips: tipsMatch ? JSON.parse(tipsMatch[1]) : [],
        keywords: kwMatch ? JSON.parse(kwMatch[1]) : [],
      };
    }

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
