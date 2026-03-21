# Beautiful Websites Agent

## What This Is

Sistema de agentes que encontra PMEs locais com sites fracos no Google Maps, redesenha-os automaticamente em HTML single-file com look de projeto $5k+, faz deploy em Vercel e entrega ao operador um link live + email draft pronto a enviar. Corre diariamente em batch, gerando dezenas de propostas visuais sem intervenção manual.

## Core Value

Entregar um link Vercel com redesign convincente + email draft personalizado para cada lead — pronto a enviar em 30 segundos de revisão.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Scraping de PMEs locais via Apify Google Maps com filtro website + email
- [ ] Qualificação visual automática de sites com Playwright screenshots + Claude Vision
- [ ] Geração de redesign HTML single-file via Claude API (look $5k+, design system embutido)
- [ ] Deploy automático de cada redesign via Vercel CLI com captura de URL live
- [ ] Email draft personalizado por lead (nome da empresa, antes/depois)
- [ ] Dashboard web dark (RUBRIC-inspired) com agent graph view e linear workflow view
- [ ] Histórico de runs com leads, status, links e drafts
- [ ] Batch diário com cron scheduler
- [ ] Sidebar Agent Kit com detalhes de cada skill e modal de step

### Out of Scope

- Envio automático de emails — risco de deliverability/GDPR, conversão melhor com toque manual em v1
- n8n — orquestração feita no backend próprio
- CRM integrado — v2 após validar o modelo
- OAuth / multi-user — ferramenta single-operator em v1
- Mobile app — web dashboard suficiente para v1

## Context

- Stack: Next.js 14 + Tailwind (frontend dark UI), Node.js/TypeScript (backend API), SQLite (runs/leads/results)
- Skills externas: Apify API (Google Maps scraper), Playwright (screenshots), Claude API claude-sonnet-4-6 (vision + HTML generation), Vercel CLI (deploy)
- Design de referência: RUBRIC by RoboLabs — hexagonal dark background, agent graph view (force-directed), linear workflow view (step 1→4), sidebar Agent Kit panel, skill tooltips/modals, Play button com live status
- Vercel CLI já instalado localmente (v44.7.3)
- Node v25.6.1 disponível
- Repositório greenfield

## Constraints

- **Stack**: Next.js + TypeScript — consistência frontend/backend no mesmo repo (monorepo)
- **LLM**: Claude claude-sonnet-4-6 via Anthropic SDK — vision para qualificação, HTML generation para redesign
- **Deploy target**: Vercel CLI — já disponível, sem setup adicional
- **Scope v1**: Sem envio de email automático — operador revê e envia manualmente
- **Autonomia**: Single-operator, sem auth em v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Parar no link Vercel + email draft (sem envio auto) | Conversão mais alta com toque manual; evita deliverability/GDPR em v1 | — Pending |
| HTML single-file por site | Simplicidade de deploy, sem dependências de build no output | — Pending |
| SQLite para persistência | Zero infra adicional, suficiente para volume de um operador solo | — Pending |
| Monorepo Next.js (frontend + API routes) | Simplicidade de deploy e desenvolvimento | — Pending |

---
*Last updated: 2026-03-21 after initialization*
