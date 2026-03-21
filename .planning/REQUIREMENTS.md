# Requirements: Beautiful Websites Agent

**Defined:** 2026-03-21
**Core Value:** Entregar um link Vercel com redesign convincente + email draft personalizado para cada lead — pronto a enviar em 30 segundos de revisão.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Monorepo Next.js 14 + TypeScript inicializado com estrutura de pastas (app/, lib/, skills/, db/)
- [ ] **FOUND-02**: Tailwind CSS configurado com tema dark (background hexagonal, paleta RUBRIC-inspired)
- [ ] **FOUND-03**: Ficheiro .env.local com APIFY_TOKEN, ANTHROPIC_API_KEY, VERCEL_TOKEN — nunca commitado
- [ ] **FOUND-04**: .gitignore cobre .env*, .planning/ não (tracked), node_modules, .vercel, outputs/
- [ ] **FOUND-05**: .nvmrc com Node 20 LTS + engines no package.json
- [ ] **FOUND-06**: SQLite via better-sqlite3 + Drizzle ORM inicializado com WAL mode
- [ ] **FOUND-07**: Schema SQLite: tabelas `runs`, `leads`, `qualify_results`, `redesigns`, `deployments`
- [ ] **FOUND-08**: Cada lead tem campo `status` com transições atómicas (pending → scraping → qualifying → redesigning → deploying → complete | failed)

### Skill 01 — Apify Scrape

- [ ] **SCRAPE-01**: Integração com Apify API para correr o Google Maps scraper Actor
- [ ] **SCRAPE-02**: Parâmetros de run configuráveis: query (ex: "restaurantes Lisboa"), limite de resultados
- [ ] **SCRAPE-03**: Filtro: apenas leads com website URL válido E email presente
- [ ] **SCRAPE-04**: Filtro: eliminar cadeias nacionais/internacionais (detecção por nome ou domínio)
- [ ] **SCRAPE-05**: Leads guardados em SQLite com status `scraped` antes de avançar para qualificação
- [ ] **SCRAPE-06**: Skill retorna array de leads normalizado (nome, website, email, endereço, categoria)

### Skill 02 — Site Qualify

- [ ] **QUAL-01**: Playwright lança um único browser Chromium por batch (não por lead)
- [ ] **QUAL-02**: Screenshot de cada website lead (1280x800, `waitUntil: domcontentloaded`, timeout 15s)
- [ ] **QUAL-03**: Screenshot guardado em `outputs/screenshots/{lead-id}.png`
- [ ] **QUAL-04**: Claude Vision (claude-sonnet-4-6) avalia screenshot com critérios: layout antiquado, tipografia fraca, estrutura confusa, aspecto pouco profissional
- [ ] **QUAL-05**: Score de 1-10 retornado com justificação em JSON estruturado
- [ ] **QUAL-06**: Threshold configurável (default: score ≤ 5 → qualificado para redesign)
- [ ] **QUAL-07**: Resultado guardado em `qualify_results` com score, justificação, e decisão (pass/fail)
- [ ] **QUAL-08**: Browser fechado explicitamente em bloco `finally` após processar todos os leads

### Skill 03 — Site Redesign (taste-skill)

- [ ] **REDESIGN-01**: Conteúdo do site original extraído via WebFetch (título, descrição, serviços, contactos)
- [ ] **REDESIGN-02**: Claude API gera HTML single-file completo (HTML + CSS + JS inline) com design system embutido
- [ ] **REDESIGN-03**: Prompt usa taste-skill pattern (https://github.com/Leonxlnx/taste-skill) — paleta única, font combo, layout premium
- [ ] **REDESIGN-04**: Fotos de stock verificadas de Unsplash (URLs diretos, sem API key) integradas no HTML
- [ ] **REDESIGN-05**: Output HTML validado: deve conter `<html>`, `<head>`, `<body>` e ter >5KB
- [ ] **REDESIGN-06**: HTML guardado em `outputs/redesigns/{lead-id}.html` e caminho em SQLite
- [ ] **REDESIGN-07**: Tokens Claude por chamada guardados no SQLite para tracking de custo

### Skill 04 — Vercel Deploy

- [ ] **DEPLOY-01**: Cada redesign HTML deployado como projeto Vercel via CLI (`vercel deploy --prod`)
- [ ] **DEPLOY-02**: Nome do projeto: `bwa-{lead-slug}-{run-id-curto}` (máx 52 chars)
- [ ] **DEPLOY-03**: URL live capturada do output do CLI e guardada em SQLite
- [ ] **DEPLOY-04**: Verificação prévia do número de projetos Vercel (aviso se >80, bloqueio se >95)
- [ ] **DEPLOY-05**: Deploy executado como child_process com timeout de 60s

### Email Draft

- [ ] **EMAIL-01**: Draft gerado por lead após deploy bem-sucedido
- [ ] **EMAIL-02**: Draft inclui: nome da empresa, URL do site actual, URL do redesign live, frase de abertura personalizada
- [ ] **EMAIL-03**: Draft guardado em SQLite e visível no lead card do dashboard

### Dashboard — Layout e Navegação

- [ ] **DASH-01**: Dark theme com background hexagonal (SVG pattern, tons #0a0a0a / #111)
- [ ] **DASH-02**: Sidebar Agent Kit (painel direito) com nome do kit activo, lista de skills com ícones, botão Play
- [ ] **DASH-03**: Navegação entre "Graph View" e "Workflow View" via botão toggle
- [ ] **DASH-04**: Header com logo/nome do sistema e barra de pesquisa (filtra runs por query)

### Dashboard — Agent Graph View

- [ ] **GRAPH-01**: Nó central "Agent" (ícone RUBRIC-style, cor laranja)
- [ ] **GRAPH-02**: 4 nós de skill ao redor (Apify Scrape, Site Qualify, Site Redesign, Vercel Deploy) com ícones distintos
- [ ] **GRAPH-03**: Linhas de conexão entre Agent e cada skill node
- [ ] **GRAPH-04**: Estado de cada skill reflectido na cor do nó (cinzento=pendente, verde=activo/completo, laranja=a correr)
- [ ] **GRAPH-05**: Tooltip ao hover em cada nó com nome e descrição da skill
- [ ] **GRAPH-06**: Botão "Visualize Workflow" para passar para a vista linear

### Dashboard — Linear Workflow View

- [ ] **WORKFLOW-01**: Vista sequencial: Agent → Step 1 → Step 2 → Step 3 → Step 4
- [ ] **WORKFLOW-02**: Status de cada step actualizado em tempo real via SSE
- [ ] **WORKFLOW-03**: Label de estado acima de cada step ("Waiting...", "Running...", "Complete ✓", "Failed ✗")
- [ ] **WORKFLOW-04**: Modal de skill ao clicar em qualquer step (nome, descrição, botão "View SKILL.md")
- [ ] **WORKFLOW-05**: Botão "Back to Graph" para voltar à vista radial
- [ ] **WORKFLOW-06**: Botão "Play" para iniciar run manual — desactivado durante run activo

### Dashboard — Run History e Lead Cards

- [ ] **HISTORY-01**: Lista de runs anteriores com data, query usada, nº de leads, nº qualificados, nº deployados
- [ ] **HISTORY-02**: Cada run expansível mostrando lead cards
- [ ] **HISTORY-03**: Lead card mostra: nome empresa, website original, score de qualificação, link Vercel, status
- [ ] **HISTORY-04**: Lead card tem botão "Ver email draft" que abre o draft numa modal
- [ ] **HISTORY-05**: Lead card tem botão "Copiar link Vercel" para clipboard

### Operacional

- [ ] **OPS-01**: Cron job diário via node-cron em Next.js instrumentation.ts, hora configurável via env
- [ ] **OPS-02**: Run manual via botão Play no dashboard (POST /api/runs)
- [ ] **OPS-03**: Custo estimado por run visível: tokens Claude × preço/token, guardado em SQLite
- [ ] **OPS-04**: SSE endpoint (/api/runs/[id]/stream) emite eventos de progresso em tempo real
- [ ] **OPS-05**: Batch idempotente: crash a meio pode ser retomado relançando o run (leads com status `complete` são saltados)

## v2 Requirements

### Outreach

- **OUTREACH-01**: Envio automático de emails via SendGrid/Resend com tracking de opens
- **OUTREACH-02**: CRM básico: status de follow-up por lead (enviado, respondeu, fechou)
- **OUTREACH-03**: Templates de email editáveis na UI

### Multi-operator

- **MULTI-01**: Auth básica para múltiplos utilizadores
- **MULTI-02**: Workspaces isolados por utilizador

### Operacional Avançado

- **ADV-01**: Retry de step individual por lead (sem re-correr todo o batch)
- **ADV-02**: Preview do redesign embebido no lead card (iframe)
- **ADV-03**: Configuração de queries e threshold de qualificação via UI (sem editar .env)
- **ADV-04**: Exportação CSV do batch para outreach externo

## Out of Scope

| Feature | Reason |
|---------|--------|
| Envio automático de emails | Risco deliverability/GDPR; conversão melhor com toque manual em v1 |
| CRM integrado | v2 após validar modelo |
| Multi-user / auth | Single-operator em v1; complexidade não justificada |
| Mobile app | Web dashboard suficiente |
| n8n | Orquestração feita no backend próprio |
| Redesigns multi-página | HTML single-file é o formato correcto para cold outreach |
| Client-facing portal | Fora do scope — é uma ferramenta interna |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 — Foundation | Pending |
| FOUND-02 | Phase 1 — Foundation | Pending |
| FOUND-03 | Phase 1 — Foundation | Pending |
| FOUND-04 | Phase 1 — Foundation | Pending |
| FOUND-05 | Phase 1 — Foundation | Pending |
| FOUND-06 | Phase 1 — Foundation | Pending |
| FOUND-07 | Phase 1 — Foundation | Pending |
| FOUND-08 | Phase 1 — Foundation | Pending |
| SCRAPE-01 | Phase 2 — Pipeline Core | Pending |
| SCRAPE-02 | Phase 2 — Pipeline Core | Pending |
| SCRAPE-03 | Phase 2 — Pipeline Core | Pending |
| SCRAPE-04 | Phase 2 — Pipeline Core | Pending |
| SCRAPE-05 | Phase 2 — Pipeline Core | Pending |
| SCRAPE-06 | Phase 2 — Pipeline Core | Pending |
| QUAL-01 | Phase 2 — Pipeline Core | Pending |
| QUAL-02 | Phase 2 — Pipeline Core | Pending |
| QUAL-03 | Phase 2 — Pipeline Core | Pending |
| QUAL-04 | Phase 2 — Pipeline Core | Pending |
| QUAL-05 | Phase 2 — Pipeline Core | Pending |
| QUAL-06 | Phase 2 — Pipeline Core | Pending |
| QUAL-07 | Phase 2 — Pipeline Core | Pending |
| QUAL-08 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-01 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-02 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-03 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-04 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-05 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-06 | Phase 2 — Pipeline Core | Pending |
| REDESIGN-07 | Phase 2 — Pipeline Core | Pending |
| DEPLOY-01 | Phase 2 — Pipeline Core | Pending |
| DEPLOY-02 | Phase 2 — Pipeline Core | Pending |
| DEPLOY-03 | Phase 2 — Pipeline Core | Pending |
| DEPLOY-04 | Phase 2 — Pipeline Core | Pending |
| DEPLOY-05 | Phase 2 — Pipeline Core | Pending |
| EMAIL-01 | Phase 2 — Pipeline Core | Pending |
| EMAIL-02 | Phase 2 — Pipeline Core | Pending |
| EMAIL-03 | Phase 2 — Pipeline Core | Pending |
| OPS-05 | Phase 2 — Pipeline Core | Pending |
| OPS-04 | Phase 3 — API Layer | Pending |
| DASH-01 | Phase 4 — Dashboard UI | Pending |
| DASH-02 | Phase 4 — Dashboard UI | Pending |
| DASH-03 | Phase 4 — Dashboard UI | Pending |
| DASH-04 | Phase 4 — Dashboard UI | Pending |
| GRAPH-01 | Phase 4 — Dashboard UI | Pending |
| GRAPH-02 | Phase 4 — Dashboard UI | Pending |
| GRAPH-03 | Phase 4 — Dashboard UI | Pending |
| GRAPH-04 | Phase 4 — Dashboard UI | Pending |
| GRAPH-05 | Phase 4 — Dashboard UI | Pending |
| GRAPH-06 | Phase 4 — Dashboard UI | Pending |
| WORKFLOW-01 | Phase 4 — Dashboard UI | Pending |
| WORKFLOW-02 | Phase 4 — Dashboard UI | Pending |
| WORKFLOW-03 | Phase 4 — Dashboard UI | Pending |
| WORKFLOW-04 | Phase 4 — Dashboard UI | Pending |
| WORKFLOW-05 | Phase 4 — Dashboard UI | Pending |
| WORKFLOW-06 | Phase 4 — Dashboard UI | Pending |
| HISTORY-01 | Phase 4 — Dashboard UI | Pending |
| HISTORY-02 | Phase 4 — Dashboard UI | Pending |
| HISTORY-03 | Phase 4 — Dashboard UI | Pending |
| HISTORY-04 | Phase 4 — Dashboard UI | Pending |
| HISTORY-05 | Phase 4 — Dashboard UI | Pending |
| OPS-01 | Phase 5 — Operational Polish | Pending |
| OPS-02 | Phase 5 — Operational Polish | Pending |
| OPS-03 | Phase 5 — Operational Polish | Pending |

**Coverage:**
- v1 requirements: 63 mapped (all requirements from all categories)
- Mapped to phases: 63
- Unmapped: 0 ✓

**Note on count:** 63 requirements counted by individual ID (FOUND×8, SCRAPE×6, QUAL×8, REDESIGN×7, DEPLOY×5, EMAIL×3, DASH×4, GRAPH×6, WORKFLOW×6, HISTORY×5, OPS×5 = 63).

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability updated to 5-phase roadmap*
