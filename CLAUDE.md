# CLAUDE.md — Website Builder White-Label

## O que é este projeto
SaaS white-label de criação de sites com IA (estilo Lovable), vendido B2B a plataformas com redes de membros (primeiro cliente alvo: JIFU). Membros usam a ferramenta para criar e vender sites a PMEs.

> Spec completo do alvo: `docs/TARGET-ARCHITECTURE.md`. Plano por fases: `docs/BUILD-PLAN.md`. Ambos mandatórios.

## Stack (fixa — não propor alternativas sem ser pedido)
- Monorepo pnpm: `apps/web` (React + Vite + TS + Tailwind), `apps/api` (Node + Hono + TS), `packages/shared` (tipos e schemas Zod)
- DB/Auth/Storage: Supabase (Postgres com RLS por tenant)
- IA: API Anthropic; tool use estruturado; prompt caching sempre ativo
- Preview: WebContainers no browser
- Deploy de sites gerados: Cloudflare Pages API
- Sites gerados pelos utilizadores: SEMPRE React + Vite + Tailwind, estáticos

## Arquitetura essencial
- Multi-tenant: `tenants` → `members` → `projects` → `sites`. RLS em tudo.
- Orquestrador de IA no backend: recebe pedido + estado do projeto, devolve tool calls (`create_file`, `edit_file`, `delete_file`, `npm_install` whitelist); nunca texto livre com código.
- Auto-correção: erros de build do preview voltam ao modelo (máx. 2 retries).
- Telemetria: TODA a chamada à API regista em `usage_events` (tokens in/out, custo, operação, member_id, tenant_id).
- Créditos: ledger append-only (`credit_transactions`), com reserva antes da chamada e confirmação/devolução depois. Nunca um campo "saldo" mutável.
- Auth: abstraída numa interface (`AuthProvider`) — Supabase Auth no MVP, SSO de tenant no futuro.

## Convenções
- TypeScript strict; validação de inputs com Zod em todas as rotas (schemas partilhados em `packages/shared`)
- Erros: nunca engolir; logar com contexto (tenant, member, project)
- Migrações SQL versionadas em `supabase/migrations`
- Testes: vitest; mínimo para orquestrador, ledger e parsing de tool calls
- Commits pequenos, mensagens em inglês, conventional commits
- UI em PT-PT por omissão; strings centralizadas para i18n futura

## Regras de segurança
- Chaves de API só no backend; o frontend nunca fala diretamente com a Anthropic
- Whitelist de pacotes npm que o modelo pode "instalar" nos sites gerados
- Rate limiting por membro E por tenant em todas as rotas de IA

## Modelos Anthropic (via `packages/shared`)
- Geração inicial: `claude-opus-4-8` (mais capaz). Edições: `claude-sonnet-4-6` (custo/qualidade). Não enviar `temperature`/`budget_tokens` (Opus 4.8 rejeita-os).

## Layout do repositório
```
apps/web        # builder UI (Vite + React + TS + Tailwind): chat | preview | ficheiros
apps/api        # Hono API: orquestrador IA, auth, créditos, telemetria
packages/shared # Zod schemas + tipos partilhados (web/api)
supabase/migrations  # SQL versionado (multi-tenant + RLS)
docs/           # TARGET-ARCHITECTURE.md, BUILD-PLAN.md
legacy/         # demo LIVE em produção (Render) — desenvolvida até o builder novo a substituir
.claude/skills/ # refs de design (taste, huashu, ui-ux-pro-max) — NOTA: no root, fora do contexto Docker do legacy → ui-ux-pro-max inativo na geração (fallback). Para ativar: copiar para legacy/.claude/skills/
```

## Legacy (`legacy/`) — **demo LIVE em uso por clientes**
Next.js 14 single-app que gera HTML estático (React+Vite+Tailwind). É o que está **em produção** (Render, Docker, `neuron-forge.onrender.com`, auto-deploy de `main`). O monorepo acima continua o alvo estratégico, mas o legacy está à frente de clientes/investidor — por isso É desenvolvido aqui até o builder novo o substituir.

Estado do legacy (2026-06-23):
- **Auth**: Supabase Auth (Google login) — funciona no domínio grátis (Clerk falhou: dev keys + cookies 3rd-party). Gate por middleware (`supabaseEnabled()`); sem `NEXT_PUBLIC_SUPABASE_*` fica aberto.
- **Memória per-user**: `userId` da sessão Supabase em todas as rotas; settings/key em `data/users/{id}/` (disco); history na DB (`generations` jsonb + RLS) via `/api/generations` + `lib/history.ts`. Migration: `0001_auth_memory.sql`. `REQUIRE_OWN_KEYS=1` força key própria. **Apagar do history** apaga a linha (RLS) E o ficheiro do site gerado no disco (`data/redesigns`), com confirmação.
- **Client Workspace** (migration `0002_clients.sql`, RLS): tabela `clients` = ficha do negócio (nome/categoria/descrição/website/telefone/horário/serviços/FAQs). Landing **client-first**; cada agente **pré-preenche** do cliente ativo + **agrupa** outputs (`generations.client_id`, filtro no History). **AI Auto-fill**: cola o website → chromium extrai → preenche a ficha (`/api/client-research`). **Business context**: o perfil completo é injetado no prompt de cada agente (`lib/business-context.ts`). Contexto React: `lib/client-context.tsx`.
- **Agentes (11)**, cada um abre como **página** (não modal) na coluna de conteúdo: 2 de sites (analyze[URL→screenshot→redesign] + maps[Google Maps→site], Playwright/chromium — pesado nos 512MB do Render) + SEO, Email, Google Ads, Content Calendar, Consulting, Security, Instagram, **Social Analyzer** (audita qualquer perfil Instagram → nota+recomendações+plano 7 dias; usa Apify se `APIFY_TOKEN`, senão screenshot+visão).
- **Security**: auditoria **real** e por-site (TLS ao vivo, redirect HTTPS, flags de cookies, mixed content, SRI, qualidade do CSP, `.env`/`.git` determinístico) — já não é relatório genérico.
- **UI/UX**: **sidebar** esquerda (colapsa ao clicar no logo) com Clients/History/Settings/Documentation + conta; tema **cinematográfico** (fundo `hex-bg` com feixes laranja+índigo, cards com glow, utilitários `.glow-card`/`.btn-glow`; fonte Inter). **Documentation = página** (grelha de cards por agente + detalhe + slot de vídeo por agente).
- **Geração de sites** (pipeline): **Analyze** = multi-página (hash router `#/page` via secções `data-page` + PAGE_BOOT em `lib/multipage.ts`, dropdown nav); **Maps** = single-page two-pass (Sonnet, `max_tokens` 12000/passagem). Camadas partilhadas: **design-engine** (`buildDesignBrief` — paletas/fontes/princípios por tipo de design) + **heroGuidance** + **motion**; **business-context** do cliente injetado no prompt; **style-ref** — imagem de referência **sobrepõe** o design-engine (`formatDesignBriefForPrompt(brief, hasReference)` demove "NON-NEGOTIABLE"→"defaults"); imagens validadas por visão (Haiku); retry a 529 (`withOverloadRetry`). **site-guard** (`lib/site-guard.ts`, corre a cada load E após edição IA): garante que TODOS os links/botões funcionam (remap de rotas `#/x` inválidas, dead→contacto), **WhatsApp** sempre funcional (liga qualquer botão WA ao número real + `target=_blank`; **fallback ao telefone do cliente**; FAB se nenhum existe), forms estáticos mostram sucesso, **mapas Google sem key** (reescreve Embed-API/`key=`→`maps?q=ADDRESS&output=embed`). Regras de prompt: **sem botões sem destino** (omitir CTAs decorativos), mapas **sem API key**, instruções do user em **prioridade máxima**. **Agendamento online** opcional (`lib/booking-spec.ts`): calendário dinâmico + slots → confirma via WhatsApp; toggle nos geradores + botão no editor. **ui-ux-pro-max inativo** (ver Layout) → fallback inline.
- **Deploy & edição de sites**: cada site tem página dedicada `/site/[id]` (tabs Design / Integrations / Publish). **Publish** = Cloudflare Workers (`lib/cloudflare-deploy.ts`, 1 Worker/site, env `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_WORKERS_SUBDOMAIN`). **Editar com IA** (`/api/site/[id]/ai-edit`, Sonnet, reescreve o HTML todo): chat + sugestões + **undo** (backup `.prev`). **Integrations**: WhatsApp/GA/código custom injetados entre markers `nf:head`/`nf:body` (`/api/site/[id]`). Vercel **removido**.
- **White-label**: zero "Claude" na UI/PDFs; favicon próprio. **Resiliência**: `safeJson` (não rebenta com HTML 502), streaming nos agentes de texto.
- **Padrões Docker/OAuth**: `NEXT_PUBLIC_*` lido em runtime (bracket notation + `<html data-sb-*>` + layout `force-dynamic`); callback OAuth via `x-forwarded-host` (req.url interno = localhost:10000); Supabase Site URL = onrender.
- **Build gotcha**: `tsc` passa mas o deploy corre `next build` (ESLint) — escapar apóstrofos em texto JSX (`&apos;`); correr `next build` antes do push.

## Preferências do utilizador (Danilo)
- Responder sempre em Português de Portugal. Iterações rápidas, sem resumos longos. Screenshots = mudança direta. Sem emojis.
- Pedir o plano da feature, rever, só depois implementar. Uma feature por sessão; CLAUDE.md sempre atualizado.

## Estado atual (2026-06-23)
- **Legacy = demo live** (~50 users): Render + Supabase Google login + memória per-user + **Client Workspace** (clientes + pré-preenchimento + business-context) + **11 agentes** (inclui Social Analyzer) + tema cinematográfico + Documentation como página. **Geração de sites madura**: multi-página, site-guard bulletproof (links/botões/WhatsApp/mapas), style-ref que sobrepõe o design-engine, agendamento online, deploy Cloudflare + editor IA com undo. É aqui que o desenvolvimento acontece. Migrations `0001` e `0002` **aplicadas** no Supabase de produção.
- **Modelo de negócio (alvo)**: vender à **JIFU**; economia interna de **tokens JIFU** (€→tokens), a plataforma segura todas as keys reais (Anthropic, Apify) e cobra cada operação a ~5× o custo real. **Em standby** até reunião do board — depois constrói-se o ledger de créditos + integração API JIFU.
- **Monorepo (alvo estratégico)**: Fase 0 concluída; Fase 1 (orquestrador tool-use + WebContainers) **em pausa** — foco no legacy.
- **Env (Render)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (auth/RLS); opcionais `ANTHROPIC_API_KEY` e `APIFY_TOKEN` (fallback de plataforma p/ key própria do user e p/ o Social Analyzer); `REQUIRE_OWN_KEYS=1`.
