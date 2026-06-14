# Website Builder (white-label, estilo Lovable)

Monorepo pnpm. Ver `CLAUDE.md` (arquitetura/convenções), `docs/BUILD-PLAN.md` (fases) e `docs/TARGET-ARCHITECTURE.md`.

```
apps/web        # builder UI — Vite + React + TS + Tailwind (chat | preview)
apps/api        # Hono API — orquestrador IA (tool use), auth, créditos, telemetria
packages/shared # Zod schemas + tipos partilhados
supabase/migrations  # SQL (multi-tenant + RLS + usage + credit ledger)
legacy/         # MVP v0 (Next.js, geração HTML) — referência, não desenvolver
```

## Correr (dev)
```bash
corepack enable        # garante pnpm
pnpm install
cp apps/api/.env.example apps/api/.env   # define ANTHROPIC_API_KEY
pnpm dev               # api (:8787) + web (:5173)
```

## Legacy (demo v0)
```bash
cd legacy && npm install && npm run dev   # :3000
```
