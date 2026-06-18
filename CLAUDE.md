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

Estado do legacy (2026-06-17):
- **Auth**: Supabase Auth (Google login) — funciona no domínio grátis (Clerk falhou: dev keys + cookies 3rd-party). Gate por middleware (`supabaseEnabled()`); sem `NEXT_PUBLIC_SUPABASE_*` fica aberto.
- **Memória per-user**: `userId` da sessão Supabase em todas as rotas; settings/key em `data/users/{id}/` (disco); history na DB (`generations` jsonb + RLS) via `/api/generations` + `lib/history.ts`. Migration: `legacy/supabase/migrations/0001_auth_memory.sql`. `REQUIRE_OWN_KEYS=1` força key própria.
- **Agentes**: 2 de geração de sites (analyze[URL→screenshot→redesign] + maps[Google Maps→site], usam Playwright/chromium — pesado nos 512MB do Render starter) + SEO, Email, Google Ads, Content Calendar, Consulting, Security, Instagram (texto, streaming).
- **Geração**: multi-página (hash router + dropdown nav), WhatsApp deep-link garantido, site-guard (botões funcionam sempre), imagens validadas por visão (Haiku), design-engine + heroGuidance + motion. **ui-ux-pro-max inativo** (ver Layout) → fallback inline.
- **White-label**: zero "Claude" na UI/PDFs; favicon próprio. **Resiliência**: `safeJson` (não rebenta com HTML 502), streaming nos agentes de texto.
- **Padrões Docker/OAuth**: `NEXT_PUBLIC_*` lido em runtime (bracket notation + `<html data-sb-*>` + layout `force-dynamic`); callback OAuth via `x-forwarded-host` (req.url interno = localhost:10000); Supabase Site URL = onrender.

## Preferências do utilizador (Danilo)
- Responder sempre em Português de Portugal. Iterações rápidas, sem resumos longos. Screenshots = mudança direta. Sem emojis.
- Pedir o plano da feature, rever, só depois implementar. Uma feature por sessão; CLAUDE.md sempre atualizado.

## Estado atual (2026-06-17)
- **Legacy = demo live** em uso para teste com clientes (~50 users): Render + Supabase Google login + memória per-user (history na DB) + white-label. Ver secção Legacy. É aqui que o desenvolvimento está a acontecer.
- **Monorepo (alvo estratégico)**: Fase 0 concluída (apps/web, apps/api, packages/shared, migration multi-tenant). Fase 1 (orquestrador tool-use + WebContainers + auto-correção) **pendente/em pausa** — foco no legacy para o teste com clientes.
