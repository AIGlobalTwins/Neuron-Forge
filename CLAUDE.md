# Neuron Forge Agents — CLAUDE.md

Instruções para o assistente AI em todas as sessões neste projecto.

---

## O que é este projecto

**Neuron Forge Agents** é uma plataforma multi-agente em Next.js 14 App Router (TypeScript) que gera websites profissionais e automatiza tarefas de marketing/negócio usando Claude Sonnet 4.6 + Playwright.

Repo: https://github.com/AIGlobalTwins/Neuron-Forge

---

## Stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **AI:** Anthropic Claude (modelo configurável via Settings — sonnet-4-6, opus-4-6, haiku-4-5)
- **Browser automation:** Playwright (screenshots, crawl, PDF export)
- **Auth:** Clerk (opcional — ativado se `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` começa com `pk_live_` ou `pk_test_`)
- **Storage:** Filesystem local (`data/`) — settings por utilizador, bot config, histórico WhatsApp
- **Deploy:** Vercel (deploy automático do HTML gerado via `lib/vercel-deploy.ts`)
- **Fotos:** Catálogo Unsplash curado em `PHOTO_CATALOG` no route create-from-maps

---

## Agentes

| Rota API | Modal | Descrição |
|---|---|---|
| `app/api/analyze/` | `AnalyzeModal.tsx` | Screenshot de site existente → redesign (8000t, single-pass) |
| `app/api/create-from-maps/` | `GoogleMapsModal.tsx` | Google Maps URL → website completo (two-pass: 4000+4000t) |
| `app/api/social-posts/` | `SocialPostsModal.tsx` | Gera posts Instagram com captions e hashtags |
| `app/api/instagram-publish/` | (via SocialPosts) | Publica diretamente no Instagram Business |
| `app/api/whatsapp/webhook/` | `WhatsAppModal.tsx` | Agente WhatsApp 24/7 com histórico por número |
| `app/api/consulting/` | `ConsultingModal.tsx` | Diagnóstico de negócio + plano + PDF |
| `app/api/seo/` | `SeoModal.tsx` | Conteúdo SEO: blog, meta tags, landing, FAQ, serviços |
| `app/api/security/` | `SecurityModal.tsx` | Auditoria passiva de segurança (headers, JS, forms, paths) |
| `app/api/email-marketing/` | `EmailMarketingModal.tsx` | Sequências de email (welcome, nurture, promo, re-engagement, abandoned) |
| `app/api/google-ads/` | `GoogleAdsModal.tsx` | Copy para campanhas Google Ads (search, pmax, display, remarketing) |
| `app/api/content-calendar/` | `ContentCalendarModal.tsx` | Calendário editorial mensal (30 dias, temas, captions, hashtags) |
| `app/api/settings/` | `SettingsModal.tsx` | CRUD de credenciais por utilizador |

---

## Dois fluxos de geração de websites

### Fluxo 1 — Analyze & Redesign (`app/api/analyze/`)
1. Playwright screenshot do URL + crawl de sub-páginas
2. Claude Vision extrai cores, fontes, CTAs, conteúdo
3. Single-pass geração HTML com Tailwind CDN (max 8000 tokens)

### Fluxo 2 — Create from Google Maps (`app/api/create-from-maps/`)
1. Playwright extrai nome, morada, telefone, categoria do Google Maps
2. Fotos uploaded analisadas por Claude Vision (cores, personalidade, tagline)
3. **Two-pass generation:**
   - Part 1 (4000t): `<!DOCTYPE>` + HEAD + NAV + HERO + SERVICES/ABOUT + WHY US
   - Part 2 (4000t): MENU SHOWCASE (food) ou nada + TEAM (opcional) + CONTACT + FOOTER
4. `fixHtml(part1, part2)` combina e fecha tags abertas
5. Deploy automático para Vercel (se token configurado)

---

## Regras críticas — NUNCA quebrar

### Geração de HTML

1. **Tailwind CDN obrigatório** — Nunca usar blocos `<style>` custom no HTML gerado.
   - Razão: Claude esgota tokens a gerar CSS → `<style>` nunca fecha → browser interpreta HTML como CSS → página branca.
   - Sempre: `<script src="https://cdn.tailwindcss.com"></script>` + `tailwind.config` inline.
   - **Motion:** o dinamismo (scroll-reveal, counters, hover-lift) vem de `lib/motion.ts` injetado por CÓDIGO (`REVEAL_CSS` no reset `<style>` + `MOTION_SCRIPT` antes de `</body>`). O modelo só adiciona hooks (`data-reveal`, `data-reveal-delay`, `data-count`) — NUNCA gerar `<style>`/`@keyframes`. Não reverter isto para CSS gerado pelo modelo.

7. **Integridade estrutural obrigatória** — TODO o HTML gerado passa por `balanceBlocks()` de `lib/html-fix.ts` (em `fixHtml` do maps + na montagem do analyze). Razão: o modelo às vezes esquece um `</div>`/`</section>`, e secções seguintes ficam aninhadas num contentor `absolute` anterior → cards esmagados, texto vertical, sobreposição. `balanceBlocks` fecha divs em falta, remove closes órfãos e força as `<section>`/`<footer>` como irmãos de nível body (flat). É idempotente. NUNCA remover esta sanitização; secções são sempre irmãs (nunca aninhar `<section>` dentro de `<div>` nos templates).

2. **Zero botões mortos** — Nunca `href="#"` solto.
   - `<a>` → sempre `href="#section-id"`, `href="tel:..."`, ou `href="mailto:..."`
   - `<button>` → `type="submit"` em form, ou `onclick="document.getElementById('X').scrollIntoView({behavior:'smooth'})"`

3. **CTAs adaptados à categoria** — Nunca "Marcar Consulta" num restaurante.
   - Usar sempre `getCategoryMeta(category)` para obter ctaPrimary, ctaSecondary, navCta, contactBtn.

4. **Sem texto vertical** — Nunca `writing-mode`, `transform:rotate`, texto decorativo lateral.
   - Sempre incluir no prompt: `NEVER add vertical text, writing-mode, rotated text`.

5. **Fotos uploaded → hero** — Se o utilizador fez upload de fotos, a primeira vai para o hero background (não Unsplash).
   - `const heroImage = savedImageUrls.length > 0 ? savedImageUrls[0] : catalog.hero[0]`

6. **Fotos Unsplash para conteúdo** — Usar `getCatalog(finalCategory).content[n]` para imagens de secções.
   - Nunca embutir fotos uploaded em base64 no HTML gerado.

### Settings e API keys

- Usar sempre `getAnthropicKey(userId)`, `getVercelToken(userId)`, `getClaudeModel(userId)` de `lib/settings.ts`.
- Nunca `process.env.ANTHROPIC_API_KEY` diretamente nas routes.
- Clerk é opcional: só ativa quando a publishable key começa com `pk_live_` ou `pk_test_` (qualquer letra depois do underscore).

### Two-pass (fluxo Maps)

- Part 1 termina com `Stop after the WHY US closing </section>. Do NOT add </body> or </html>.`
- Part 2 começa com secções raw (sem `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`).
- `cleanPart2()` remove qualquer wrapper antes de concatenar.
- Se adicionar nova secção ao Part 2, verificar que não excede 4000 tokens de output.

---

## Estrutura de ficheiros relevante

```
app/
  page.tsx                        # Homepage — todos os agent cards
  layout.tsx                      # Clerk opcional (guarda pk_live_ ou pk_test_)
  sign-in/[[...sign-in]]/page.tsx # Clerk sign-in page
  sign-up/[[...sign-up]]/page.tsx # Clerk sign-up page
  api/
    analyze/route.ts
    create-from-maps/route.ts     # Two-pass, PHOTO_CATALOG, getCatalog(), getCategoryMeta()
    social-posts/route.ts
    instagram-publish/route.ts
    whatsapp/webhook/route.ts
    whatsapp/configure/route.ts
    whatsapp/status/route.ts
    consulting/questions/route.ts
    consulting/plan/route.ts
    consulting/pdf/route.ts
    seo/route.ts
    security/route.ts
    security/pdf/route.ts
    email-marketing/route.ts
    google-ads/route.ts
    content-calendar/route.ts
    settings/route.ts
    preview/[id]/route.ts

components/
  AnalyzeModal.tsx
  GoogleMapsModal.tsx
  SocialPostsModal.tsx
  WhatsAppModal.tsx
  ConsultingModal.tsx
  SeoModal.tsx
  SecurityModal.tsx
  EmailMarketingModal.tsx
  GoogleAdsModal.tsx
  ContentCalendarModal.tsx
  SettingsModal.tsx               # Inclui seletor de modelo Claude
  HistoryModal.tsx
  DemoModal.tsx                   # Demo sem API key

lib/
  settings.ts                     # getAnthropicKey, getVercelToken, getClaudeModel, AVAILABLE_MODELS
  design-engine.ts                # DESIGN_TYPES, buildDesignBrief, formatDesignBriefForPrompt, darkThemeInstruction (rotea skills por tipo)
  json-extract.ts                 # extractJsonObject/Array — parsing robusto (fences, truncação) usado por todas as rotas
  google.ts                       # OAuth 2.0 (scopes por produto, auth URL, code exchange, refresh, getGoogleAccessToken)
  google-api.ts                   # REST clients: Business locations, Search Console sites/queries, Analytics props, Ads customers
  motion.ts                       # Camada de motion DETERMINÍSTICA (REVEAL_CSS + MOTION_SCRIPT + MOTION_PROMPT) injetada nos sites gerados
  html-fix.ts                     # balanceBlocks() — repara HTML gerado (divs/sections não fechados) para estrutura sempre alinhada
  website-planner.ts              # planWebsite (aceita designBrief), formatPlanForPrompt, deriveDesignDirection
  vercel-deploy.ts
  whatsapp-bot.ts
  history.ts                      # Client-side (localStorage), 10 tipos: maps, analyze, seo, instagram, consulting, security, email, ads, calendar

data/
  settings.json                   # Credenciais globais (gitignored)
  forge-tools.md                  # Registry de ferramentas — lido pelo Consulting Agent

outputs/redesigns/                # HTML gerado (analyze_UUID.html, maps_UUID.html)
public/uploads/                   # Fotos uploaded (UUID.ext)

middleware.ts                     # Clerk guard (sk_live_ ou sk_test_)
```

---

## Ficheiros legacy (existem mas não estão activos)

- `components/graph/`, `components/history/`, `components/workflow/`
- `app/api/runs/`, `app/api/stream/`
- `components/AgentKitSidebar.tsx`, `components/RunModal.tsx`
- `lib/types.ts` (interfaces RunSummary, SkillStatus)

Não editar estes ficheiros. Não os referenciar em novo código.

---

## Skills (.claude/skills/)

Skills de design roteados em runtime por `lib/design-engine.ts` consoante o **tipo de design escolhido pelo utilizador**.

- **ui-ux-pro-max** — `scripts/search.py` (BM25 sobre 67 styles, 57 font pairings, 96 palettes). Consultado via `execSync` por `lib/design-engine.ts` (domínios `style` e `typography`) para enriquecer o design brief (AI prompt keywords, effects, font pairing). Cada design type aponta para uma `Style Category` EXACTA para evitar enriquecimento conflituoso (ex: nada de neon/glass num estilo de luxo).
- **taste-skill** — Anti-AI-slop, tipografia, cor, minimalismo. **Agora carregadas em runtime** como `ANTI_SLOP` + `MINIMALIST` em `lib/design-engine.ts`, injetadas em todos os prompts de geração.
- **seo-forge** — Skill unificada para o SEO Agent. Combina GEO (Generative Engine Optimization com dados Princeton 2024), E-E-A-T e auditoria técnica. Regras inlined nos prompts de `app/api/seo/route.ts`.

### Tipo de design escolhido pelo utilizador (NOVO)

- `components/DesignTypePicker.tsx` (em `GoogleMapsModal` + `AnalyzeModal`) → campo `designType` no POST. Opções: `auto`, `minimal`, `elegant`, `luxury`, `warm`, `bold`, `playful`, `tech`, `dark`.
- `buildDesignBrief()` resolve o tipo num `DesignBrief` e roteia os skills certos; `auto` mantém comportamento antigo (plano/fotos decidem). `dark` traduz classes light→dark via `darkThemeInstruction()` (inclui regra de contraste dos botões).
- Brief passado a `planWebsite({ designBrief })` e usado nas fontes/Unsplash query de `analyze` e `create-from-maps`.

### Integração Google (OAuth) (NOVO)

- Ligar contas Google em **Settings → Google accounts**. Uma OAuth app (`GOOGLE_CLIENT_ID/SECRET` em env ou settings), refresh token por user. Fluxo: `/api/google/connect` → consent → `/api/google/callback` (CSRF nonce cookie). Guia: `GOOGLE_SETUP.md`.
- **Consumido pelos agents:** Maps agent (`GoogleMapsModal`) tem "Import from Google Business" (`/api/google/business/locations` → prefill nome/morada/telefone/categoria/mapsUrl); SEO agent (`SeoModal`) tem "Import from Search Console" (`/api/google/searchconsole/queries` → preenche keywords reais).
- **Login com Google:** ativar Google no dashboard Clerk (sem código).
- Analytics/Search Console funcionam após ativar API + consent. Business Profile + Ads precisam de aprovação Google (quota / developer token).

### Parsing robusto (NOVO)

- `lib/json-extract.ts` substitui `raw.match(/\{[\s\S]*\}/)` em todas as rotas: remove fences, slice balanceado string-aware e **repara JSON truncado** — recupera output cortado por `max_tokens`. `google-ads` faz clamp dos limites de caracteres do Google; `social/email/calendar` normalizam saída.

---

## Padrão de design dos websites gerados (referência: Lovable)

O output dos websites deve aproximar-se do estilo Lovable:
- **Tipografia:** Playfair Display (serif) + Lora — ou Poppins + Inter (sans). Escolha baseada em `photoAnalysis.fontStyle`.
- **Headings dois tons:** linha 1 em cor normal, linha 2 em `<span class="italic" style="color:accentColor">`.
- **Overlines:** `<p class="tracking-[0.3em] text-xs uppercase">` antes dos H2.
- **Fondos:** `bg-stone-50` / `bg-slate-50` para secções alternadas (não sempre branco).
- **Restaurantes:** About/Story com stats → Menu showcase alternado (image+lista) → Contact + Footer.
- **Outros:** Services showcase alternado (image+pontos) → WHY US → Contact + Footer.
- **Sem testemunhos** — secção removida do output por decisão do utilizador.

---

## Preferências do utilizador (Danilo)

- Responder sempre em **Português de Portugal**.
- Iterações rápidas — sem resumos longos após completar tarefas.
- Screenshots = pedido de mudança direta, não discussão.
- Sem emojis.
