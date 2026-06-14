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
legacy/         # MVP v0 (Next.js + geração HTML estático) — referência, NÃO desenvolver
.claude/skills/ # refs de design reutilizáveis (taste, huashu, ui-ux-pro-max)
```

## Legacy (`legacy/`)
A 1.ª versão (Neuron Forge: Next.js single-app que gerava HTML estático com prompts-template, deploy Vercel) está em `legacy/`. Continua a correr de lá (`cd legacy && npm run dev`) só para a demo/referência. NÃO adicionar features lá — tudo novo segue a stack acima. Boas ideias a aproveitar do legacy: design-engine (tipos de design + skills), motion layer, image-search (Unsplash/Pexels), Google OAuth.

## Preferências do utilizador (Danilo)
- Responder sempre em Português de Portugal. Iterações rápidas, sem resumos longos. Screenshots = mudança direta. Sem emojis.
- Pedir o plano da feature, rever, só depois implementar. Uma feature por sessão; CLAUDE.md sempre atualizado.

## Estado atual
- **Fase 1 — Loop central de geração** (em curso). Fase 0 concluída: monorepo pnpm (apps/web, apps/api, packages/shared), Supabase migration inicial (multi-tenant + RLS + usage_events + credit ledger), skeletons web/api a arrancar.
- Próximo: orquestrador IA (tool use create/edit/delete_file + system prompt React+Vite+Tailwind + prompt caching) e preview WebContainers com auto-correção.
