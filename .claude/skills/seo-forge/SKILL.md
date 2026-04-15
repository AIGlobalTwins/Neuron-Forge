# SEO Forge Skill

Skill unificada para o SEO Agent do Neuron Forge. Combina GEO (Generative Engine Optimization), E-E-A-T e auditoria técnica numa única referência.

---

## Pilar 1 — Estrutura (Extractabilidade)

Conteúdo que os motores de AI conseguem extrair e citar:

- **Blocos autónomos:** cada secção H2 responde a uma sub-questão de forma completa (134–167 palavras). Quem ler só essa secção deve ficar com a resposta.
- **Definição na abertura:** a primeira frase de cada secção define o tema — Google AI Overviews cita blocos que começam com definições claras.
- **Tabelas de comparação:** usar sempre que houver 2+ opções ou alternativas. Aumenta citação em contextos de pesquisa comparativa.
- **FAQs com resposta directa:** a resposta começa na primeira frase, com a keyword da pergunta incluída. 40–60 palavras por resposta (comprimento ideal para featured snippets).
- **Estrutura de headings limpa:** H1 único, H2 para secções principais, H3 para subsecções. Nunca saltar níveis.

---

## Pilar 2 — Autoridade (Citabilidade)

Dados de investigação Princeton GEO (2024) — o que aumenta a probabilidade de ser citado por AI:

| Táctica | Aumento de citação |
|---|---|
| Incluir citações/fontes | +40% |
| Incluir estatísticas com números | +37% |
| Incluir quotações de especialistas | +30% |
| Keyword stuffing | -10% |

Aplicação prática:
- Cada secção H2 deve ter pelo menos **1 dado numérico** (percentagem, tempo, preço, quantidade)
- Usar afirmações directas: "X reduz Y em Z%" em vez de "pode ajudar a reduzir"
- Incluir **freshness signals**: datas, "em 2024", "actualmente", "segundo dados recentes de..."
- E-E-A-T: demonstrar Experiência (exemplos reais), Expertise (domínio técnico), Autoridade (tom directo), Confiança (sem promessas impossíveis)

---

## Pilar 3 — Presença (Visibilidade AI)

- Google AI Overviews: correlaciona forte com rankings tradicionais — necessita de SEO técnico sólido
- ChatGPT / Perplexity: indexam além do top-10 — conteúdo bem estruturado com autoridade pode ser citado mesmo sem ranking alto
- Formatos mais citados: artigos de comparação (33%), guias definitivos (15%), investigação original (12%), listas best-of (10%)

---

## Tipos de Conteúdo — Regras Específicas

### Blog
- Estrutura: meta title + meta description + introdução + 3-5 H2 (134-167 palavras cada) + conclusão com CTA
- Cada H2 = bloco autónomo e citável
- Incluir: 1 statistic por H2, slug SEO-friendly, alt text para imagem de destaque

### Landing Page
- Headline H1 com keyword principal (evitar clickbait, preferir especificidade)
- Proposta de valor com dados concretos (não "somos os melhores" — "reduzimos tempo de X em 40%")
- Social proof específico e credível

### Meta Tags
- Title: 50-60 chars, keyword no início
- Meta description: 150-160 chars, CTA implícito
- Schema markup: LocalBusiness para negócios locais, Service para serviços, FAQPage para FAQs

### FAQs
- FAQ schema (JSON-LD FAQPage) foi restringido pelo Google em Agosto 2023 — não usar para negócios comuns
- Alternativa: QAPage schema ou mencionar nas seoTips
- 7-10 perguntas ordenadas da mais pesquisada à menos

### Descrições de Serviço
- Keyword principal no primeiro parágrafo
- Benefícios com dados específicos (tempo, preço, resultado)
- Diferenciador claro do concorrente

---

## Erros Comuns a Evitar

- Keyword stuffing (reduz visibilidade AI em -10%)
- Conteúdo genérico sem dados — "oferecemos qualidade" vs "94% dos clientes voltam"
- Títulos vagos — "O Melhor Serviço" vs "Limpeza de Dentes em Lisboa — sem dor"
- Bloquear AI bots no robots.txt (GPTBot, ClaudeBot, PerplexityBot)
- Publicar sem freshness signals — incluir sempre data ou referência temporal

---

## Auditoria Técnica SEO (Referência)

Checklist para implementação futura com Playwright:

**Rastreabilidade**
- robots.txt permite crawl das páginas principais
- sitemap.xml existe e está submetido no GSC
- Sem redirect chains (máx 1 redirect)
- Estrutura de URLs limpa: sem parâmetros desnecessários

**Indexação**
- Meta robots: index, follow nas páginas principais
- Canonical tags correctas (sem conflito)
- Sem conteúdo duplicado entre versões www / non-www / http / https

**Performance**
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Imagens com width/height declarados (evita CLS)
- HTTPS activo

**On-Page**
- H1 único por página
- Title tags 50-60 chars com keyword no início
- Meta descriptions 150-160 chars
- Alt text em todas as imagens relevantes
- Internal links para páginas principais

**Nota sobre schema:** JSON-LD injectado via JavaScript não é detectável por web_fetch/curl — usar Google Rich Results Test para validação.
