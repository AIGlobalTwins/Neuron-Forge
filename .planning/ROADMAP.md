# Roadmap: Beautiful Websites Agent

## Overview

The Beautiful Websites Agent is built in five phases that follow the natural dependency chain of the system: scaffold the foundation before writing any pipeline code, build and validate the four-skill pipeline end-to-end before wiring any UI, expose clean API routes before the dashboard consumes them, build the full dark dashboard UI, then harden the operational layer for daily unattended batch runs. Each phase delivers a coherent, independently verifiable capability. Nothing is built ahead of what it depends on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, SQLite schema with WAL mode, env secrets, runtime pins
- [ ] **Phase 2: Pipeline Core** - All four skills end-to-end (Scrape → Qualify → Redesign → Deploy) plus email draft and orchestrator
- [ ] **Phase 3: API Layer** - Next.js API routes for runs CRUD, SSE event stream, lead data reads
- [ ] **Phase 4: Dashboard UI** - Full dark dashboard: graph view, workflow view, run history, lead cards, sidebar Agent Kit
- [ ] **Phase 5: Operational Polish** - Cron scheduler, Play button wired to API, cost tracking UI, batch idempotency recovery

## Phase Details

### Phase 1: Foundation

**Goal**: A runnable Next.js monorepo exists with a correct SQLite schema, all secrets loaded from env, and the runtime pinned — so every subsequent phase builds on a stable, crash-safe base with no schema debt.

**Depends on**: Nothing (first phase)

**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08

**Success Criteria** (what must be TRUE when this phase is complete):
1. `next dev` starts without errors and serves the default Next.js page on localhost
2. `better-sqlite3` database file is created on first start with all five tables (`runs`, `leads`, `qualify_results`, `redesigns`, `deployments`) in WAL mode — verifiable via `PRAGMA journal_mode`
3. Running `node -e "require('./.env.local')"` shows all three required keys (APIFY_TOKEN, ANTHROPIC_API_KEY, VERCEL_TOKEN); `.gitignore` prevents them from being committed
4. Lead `status` column accepts all defined transitions and rejects invalid ones — verifiable via a quick `db.prepare` insert test
5. `node --version` inside the project resolves to Node 20 LTS via `.nvmrc`

**Plans**: TBD

Plans:
- [ ] 01-01: Monorepo scaffold — Next.js 14 + TypeScript + Tailwind dark theme + folder structure
- [ ] 01-02: SQLite foundation — better-sqlite3 + Drizzle ORM, WAL mode, full schema, status field transitions
- [ ] 01-03: Environment and runtime — .env.local, .gitignore, .nvmrc, package.json engines

---

### Phase 2: Pipeline Core

**Goal**: A Node.js pipeline script runs the complete four-skill sequence (Apify scrape → Playwright qualify → Claude redesign → Vercel deploy) and produces a Vercel live URL plus an email draft for each qualified lead — all persisted to SQLite — with browser lifecycle safety, cost tracking, and idempotent status writes throughout.

**Depends on**: Phase 1

**Requirements**: SCRAPE-01, SCRAPE-02, SCRAPE-03, SCRAPE-04, SCRAPE-05, SCRAPE-06, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-08, REDESIGN-01, REDESIGN-02, REDESIGN-03, REDESIGN-04, REDESIGN-05, REDESIGN-06, REDESIGN-07, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, EMAIL-01, EMAIL-02, EMAIL-03, OPS-04, OPS-05

**Success Criteria** (what must be TRUE when this phase is complete):
1. Running the orchestrator against a real query produces at least one Vercel live URL accessible in a browser — the complete pipeline has traversed all four skills without crashing
2. After the pipeline finishes, SQLite contains one row in each of `leads`, `qualify_results`, `redesigns`, and `deployments` for each processed lead — data is fully persisted
3. Killing the orchestrator mid-run and relaunching it skips leads whose `status` is `complete` and does not re-spend API credits on them
4. The Playwright browser is not running after the batch ends — the `finally` block closes it even when individual leads fail
5. SQLite `qualify_results` rows contain a `tokens_used` value greater than zero for every Claude Vision call, confirming cost tracking is active

**Plans**: TBD

Plans:
- [ ] 02-01: Skill 01 — Apify scrape with lead validation, filtering, and SQLite insert
- [ ] 02-02: Skill 02 — Playwright qualify with single-browser lifecycle, Claude Vision scoring, and result persist
- [ ] 02-03: Skill 03 — Claude redesign (taste-skill pattern), HTML validation, Unsplash stock photos, token tracking
- [ ] 02-04: Skill 04 — Vercel CLI deploy via child_process, URL capture, project quota pre-check
- [ ] 02-05: Email draft generation and orchestrator — sequences skills, emits EventEmitter events, per-lead error isolation, SSE stream plumbing

---

### Phase 3: API Layer

**Goal**: The Next.js server exposes clean, typed HTTP routes that the dashboard (Phase 4) can consume — runs CRUD, real-time SSE progress stream, and lead data reads — so the UI never touches SQLite directly.

**Depends on**: Phase 2

**Requirements**: OPS-04

**Success Criteria** (what must be TRUE when this phase is complete):
1. `POST /api/runs` starts a pipeline run and returns a run ID; a subsequent `GET /api/runs` returns that run in the list with correct status
2. Opening `/api/runs/[id]/stream` in a browser shows a live `text/event-stream` response that emits a new event each time a lead changes status during an active run
3. `GET /api/runs/[id]/leads` returns all lead records for that run including qualify score, Vercel URL, and email draft — parseable as JSON

**Plans**: TBD

Plans:
- [ ] 03-01: Runs API — POST trigger, GET list, GET detail, GET leads — with Zod request validation
- [ ] 03-02: SSE stream route — EventEmitter bridge to `text/event-stream`, client reconnect, run-scoped event filtering

---

### Phase 4: Dashboard UI

**Goal**: The operator opens the dashboard and sees the full RUBRIC-inspired dark interface — agent graph, linear workflow, run history, lead cards with email drafts and Vercel links — so the entire lead-to-proposal workflow is visible and actionable without touching a terminal.

**Depends on**: Phase 3

**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05, GRAPH-06, WORKFLOW-01, WORKFLOW-02, WORKFLOW-03, WORKFLOW-04, WORKFLOW-05, WORKFLOW-06, HISTORY-01, HISTORY-02, HISTORY-03, HISTORY-04, HISTORY-05

**Success Criteria** (what must be TRUE when this phase is complete):
1. Navigating to the dashboard shows a dark hexagonal background with the agent graph — four skill nodes connected to a central agent node, each node color-updating in real time during an active run
2. Clicking "Visualize Workflow" switches to the linear step view (Step 1 → 4) and labels update live ("Running...", "Complete") via SSE without a page reload
3. The run history list shows past runs with their lead counts; expanding a run shows lead cards with qualification score, Vercel link (clickable), and a "Ver email draft" button that opens the draft in a modal
4. The "Copiar link Vercel" button on a lead card writes the URL to the clipboard and gives visible confirmation
5. Hovering a skill node in the graph shows a tooltip; clicking a step in the workflow view opens the skill detail modal

**Plans**: TBD

Plans:
- [ ] 04-01: Layout shell — dark theme, hexagonal SVG background, header, sidebar Agent Kit panel, view toggle
- [ ] 04-02: Agent Graph View — force-directed nodes, color states, tooltips, Visualize Workflow button
- [ ] 04-03: Linear Workflow View — step sequence, SSE-driven status labels, skill modal, Back to Graph, Play button stub
- [ ] 04-04: Run History and Lead Cards — run list, expandable leads, email draft modal, clipboard copy

---

### Phase 5: Operational Polish

**Goal**: The system runs autonomously every night via cron, the Play button in the dashboard triggers a real run, cost-per-run is visible in the UI, and a crashed batch can be recovered without re-spending credits — so the operator only needs to open the dashboard in the morning, review proposals, and send emails.

**Depends on**: Phase 4

**Requirements**: OPS-01, OPS-02, OPS-03, OPS-05

**Success Criteria** (what must be TRUE when this phase is complete):
1. The server starts, and at the configured cron hour a new run appears in the dashboard run history without the operator doing anything
2. Clicking the Play button in the dashboard triggers a new run — the graph nodes begin animating live and leads appear in history as the run progresses
3. Each completed run shows an estimated cost (Claude tokens × price/token) visible in the run detail
4. Stopping the server mid-run, restarting it, and clicking Play again completes the batch without duplicating work for leads already marked `complete`

**Plans**: TBD

Plans:
- [ ] 05-01: Cron scheduler — node-cron in instrumentation.ts with NEXT_RUNTIME guard, configurable hour via env
- [ ] 05-02: Play button wired — WORKFLOW-06 Play button calls POST /api/runs, disables during active run
- [ ] 05-03: Cost tracking UI and idempotency recovery — OPS-03 cost display on run cards, OPS-05 stale-processing reset on startup

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Pipeline Core | 0/5 | Not started | - |
| 3. API Layer | 0/2 | Not started | - |
| 4. Dashboard UI | 0/4 | Not started | - |
| 5. Operational Polish | 0/3 | Not started | - |
