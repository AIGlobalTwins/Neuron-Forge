# CLAUDE.md — Website Builder White-Label (TARGET ARCHITECTURE)

> Spec canónico do produto-alvo (estilo Lovable). Mandatório. A implementação
> atual (Next.js + geração de HTML estático) é o MVP v0 e diverge deste alvo —
> ver gap em `docs/BUILD-PLAN.md` e na secção "Estado atual" do CLAUDE.md raiz.

## O que é este projeto
SaaS white-label de criação de sites com IA (estilo Lovable), vendido B2B a plataformas com redes de membros (primeiro cliente alvo: JIFU). Membros usam a ferramenta para criar e vender sites a PMEs.

## Stack (fixa — não propor alternativas sem ser pedido)
- Monorepo pnpm: `apps/web` (React + Vite + TS + Tailwind), `apps/api` (Node + Hono + TS), `packages/shared` (tipos e schemas Zod)
- DB/Auth/Storage: Supabase (Postgres com RLS por tenant)
- IA: API Anthropic; tool use estruturado; prompt caching sempre ativo
- Preview: WebContainers no browser
- Deploy de sites gerados: Cloudflare Pages API
- Sites gerados pelos utilizadores: SEMPRE React + Vite + Tailwind, estáticos

## Arquitetura essencial
- Multi-tenant: `tenants` → `members` → `projects` → `sites`. RLS em tudo.
- Orquestrador de IA no backend: recebe pedido + estado do projeto, devolve tool calls (`create_file`, `edit_file`, `delete_file`); nunca texto livre com código.
- Auto-correção: erros de build do preview voltam ao modelo (máx. 2 retries).
- Telemetria: TODA a chamada à API regista em `usage_events` (tokens in/out, custo, operação, member_id, tenant_id).
- Créditos: ledger append-only (`credit_transactions`), com reserva antes da chamada e confirmação/devolução depois. Nunca um campo "saldo" mutável.
- Auth: abstraída numa interface (`AuthProvider`) — Supabase Auth no MVP, SSO de tenant no futuro.

## Convenções
- TypeScript strict; validação de inputs com Zod em todas as rotas
- Erros: nunca engolir; logar com contexto (tenant, member, project)
- Migrações SQL versionadas em `supabase/migrations`
- Testes: vitest; mínimo para orquestrador, ledger e parsing de tool calls
- Commits pequenos, mensagens em inglês, conventional commits
- UI em PT-PT por omissão; strings centralizadas para i18n futura

## Regras de segurança
- Chaves de API só no backend; o frontend nunca fala diretamente com a Anthropic
- Whitelist de pacotes npm que o modelo pode "instalar" nos sites gerados
- Rate limiting por membro E por tenant em todas as rotas de IA

## Estado atual
(Atualizar no fim de cada sessão: fase do plano, o que está feito, próximos passos)
- Fase: 0 — setup
