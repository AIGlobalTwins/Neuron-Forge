# Project Research Summary

**Project:** Beautiful Websites Agent
**Domain:** AI agent pipeline — web scraping + browser automation + LLM generation + PaaS deploy
**Researched:** 2026-03-21
**Confidence:** HIGH (core stack and architecture), MEDIUM (Apify actor schema, Vercel limits)

---

## Executive Summary

The Beautiful Websites Agent is a single-operator batch automation tool: it scrapes local business leads from Google Maps via Apify, screenshots their existing websites with Playwright, uses Claude Vision to qualify which sites are bad enough to redesign, generates a complete single-file HTML redesign with Claude, deploys each redesign to a live Vercel URL, and produces a personalized cold email draft — all overnight, on a cron. The product is explicitly not a SaaS, not multi-user, and not connected to an email-sending pipeline. The architectural shape is a linear 4-skill pipeline that writes to SQLite, with a Next.js dark dashboard providing run history and live batch status via SSE.

The recommended stack is unambiguous: Next.js 14 (not 15 — breaking fetch changes), Tailwind v3 + shadcn/ui (not v4 — shadcn integration still maturing), better-sqlite3 + Drizzle ORM (not Prisma — too heavy for 4 tables), @anthropic-ai/sdk direct (not LangChain — pure overhead for a 3-step pipeline), Playwright (not Puppeteer — superseded), Apify cloud actor (not DIY Maps scraping — Google blocks it), and node-cron in-process (not Vercel Cron — can't run Playwright). All version choices prioritize stability and proven integration over cutting-edge releases.

The top risk in this system is not technical — it is operational reliability at batch scale. Playwright browser context leaks, mid-run crashes with no recovery path, dirty leads from Apify wasting downstream Claude tokens, and Vercel's free tier project limit are all pitfalls that will surface on the first real 50-lead batch run if not designed around from day one. Idempotency (write lead status to SQLite before any API call), strict browser lifecycle management (one browser per run, try/finally on every page), and a pre-flight lead validation step (filter Facebook/aggregator URLs before Playwright ever launches) are non-negotiable requirements for the pipeline to be trustworthy.

---

## Key Findings

### Recommended Stack

The stack is a Node.js monorepo with Next.js 14 as both the frontend framework and API layer. There is no separate Express server. The agent pipeline runs as a persistent Node process within the same Next.js server, communicating with the dashboard via an in-process EventEmitter bridged to SSE. The database is a local SQLite file accessed via better-sqlite3 (synchronous, zero-config). All AI calls go directly through @anthropic-ai/sdk against claude-sonnet-4-6 with vision capability.

**Core technologies:**
- **Node.js 20 LTS** (not 25): Runtime — native addon stability (better-sqlite3, Playwright)
- **Next.js 14 + React 18**: App shell + API routes — App Router stable, v15 has breaking fetch changes
- **Tailwind CSS 3.4 + shadcn/ui**: Dark dashboard styling — own the component source, v4 shadcn integration still catching up
- **@anthropic-ai/sdk ~0.26 + claude-sonnet-4-6**: Vision qualification and HTML generation — 200k context, vision support, direct SDK control
- **apify-client ~2.9**: Google Maps lead scraping — Apify handles proxy rotation and bot detection
- **Playwright ~1.44** (Chromium only): Full-page screenshots — headless, handles SPAs, `fullPage: true`; MUST run as a separate Node process, NOT inside Vercel serverless functions
- **better-sqlite3 ~9.6 + Drizzle ORM ~0.31**: SQLite persistence — synchronous API, type-safe queries, schema push mode
- **node-cron ~3.0**: Daily batch trigger — embedded in Next.js process via `instrumentation.ts`
- **Vercel CLI v44 (already installed)**: Deploy single-file HTML redesigns — `vercel --yes --prod` per lead
- **tsx ~4.15**: Run TypeScript scripts without compile step during development
- **zod ~3.22**: API request validation

**Version pins are from training data (Aug 2025). Run `npm show [package] version` before install to confirm no breaking major bumps.**

Full dependency list: see `.planning/research/STACK.md`

---

### Expected Features

**Must have (table stakes — pipeline integrity):**
- Google Maps scraping via Apify with website + email filter
- Playwright screenshot capture per lead
- Claude Vision quality scoring with qualification gate (score < 4/10 → qualified)
- Claude API single-file HTML redesign generation (self-contained, no external JS deps)
- Vercel CLI deploy + persistent live URL capture
- Claude API personalized email draft per lead
- SQLite run + lead + result persistence
- Batch orchestration with daily cron trigger
- Run history view with lead cards (status, quality score, Vercel URL, email draft)
- Agent graph view with live step status during run (SSE-powered)
- Linear 4-step workflow indicator
- Sidebar Agent Kit panel with skill details
- One-click email draft copy

**Should have (differentiators for operator trust and UX):**
- "Why this lead" qualification reasoning visible (persist Claude's qualification response)
- Before/after visual framing in email draft (screenshot embed + Vercel URL)
- Run summary stats (X qualified, Y deployed, Z emails generated)
- Filter/sort leads by status, quality score, date
- Configurable batch size and target city
- Retry failed steps per lead (step-level, not full rerun)

**Defer to v2+:**
- Automatic email sending (GDPR/CAN-SPAM risk, deliverability complexity)
- CRM integration (premature — workflow unproven at scale)
- Multi-user auth (single-operator v1)
- Mobile-responsive dashboard (operator tool, desktop-first is fine)
- Redesign style selector (style variance dilutes output consistency)
- A/B testing email variants (insufficient volume for signal in v1)

**Anti-features to explicitly avoid:** n8n orchestrator, LangChain, public client portal, email sending queue, lead scoring ML.

---

### Architecture Approach

The system is a single Next.js monorepo running on a local machine as a persistent `next start` process. There is one hard architectural boundary: the agent pipeline (Playwright + Claude + Vercel CLI) runs inside the Node.js process as a called library, not as a Vercel serverless function. The pipeline writes results to SQLite as it progresses; API routes read SQLite to serve the dashboard. Live status during a batch run flows via an in-process EventEmitter → SSE route → browser EventSource.

**Major components and build order:**

1. **SQLite schema + lib/db/ queries** — foundation, no dependencies; enable WAL mode immediately
2. **lib/emitter.ts** — in-process EventEmitter singleton bridging pipeline to SSE
3. **lib/pipeline/skills/01-scrape.ts** — Apify client call, lead validation, SQLite insert
4. **lib/pipeline/skills/02-qualify.ts** — single browser instance, newPage() per lead, Claude Vision scoring, qualification gate
5. **lib/pipeline/skills/03-redesign.ts** — Claude HTML generation (returns HTML + email draft from one call), post-generation HTML validation, write to /public/redesigns/{lead_id}.html
6. **lib/pipeline/skills/04-deploy.ts** — Vercel CLI via child_process.exec, parse URL from stdout, store in SQLite
7. **lib/pipeline/orchestrator.ts** — sequences skills, emits events via emitter, error isolation per lead
8. **instrumentation.ts** — initializes node-cron once on server start
9. **app/api/pipeline/trigger + stream** — POST to start run, GET SSE stream
10. **app/api/runs + leads** — read endpoints for dashboard
11. **app/(dashboard)** — React UI: graph view, run list, lead cards, sidebar

**Critical path:** SQLite schema → Skills 01–04 → Orchestrator → API routes → Dashboard UI. Build and test the pipeline end-to-end before any UI work.

**Key patterns:**
- One Playwright browser per batch run, `newPage()` per lead, `finally { page.close() }` mandatory
- Lead status written to SQLite at each transition (not just at completion)
- HTML files stored on filesystem (`/public/redesigns/`), only paths stored in SQLite
- Email draft generated in the same Claude call as the HTML redesign (one API call, parsed via delimiter)
- Each lead processed sequentially for skills 3+4 (avoids Claude rate limits, enables progressive dashboard updates)

Full schema, data flow, and component boundaries: see `.planning/research/ARCHITECTURE.md`

---

### Critical Pitfalls

1. **Playwright browser context leak** — pages not closed in error paths cause memory growth until OOM crash mid-batch. Prevention: `try/finally { page.close(); context.close() }` on every lead, one browser instance per run closed at skill completion. Implement on day one.

2. **No mid-run recovery (batch crash = full rerun cost)** — without idempotency, a crash at lead 40/50 re-spends Apify credits, Claude tokens, and Vercel deploys on re-run. Prevention: write `status='processing'` to SQLite before any API call; skip leads with `status='complete'`; reset stale `processing` leads on startup. Design idempotency into the schema before any pipeline code.

3. **Dirty leads poisoning downstream pipeline** — 20–40% of Apify results have no real website (Facebook pages, Yelp listings, chains). Each passes through Playwright and Claude before being useful. Prevention: validate website URL immediately post-scrape (block `facebook.com`, `yelp.com`, aggregators); filter as early as possible before any I/O call.

4. **Claude API cost explosion** — 50 leads/day with full-resolution screenshots and unbounded output tokens can hit $5–$15/run. Prevention: resize screenshots to max 1280px before Vision call; set `max_tokens` on every Claude call (3000–4000 for HTML generation); log `prompt_tokens` + `completion_tokens` per call to SQLite.

5. **Vercel free tier project limit** — 100 projects on Hobby plan (verify before launch). Daily batches at 30–50 leads saturate this within days. Prevention: predictable naming (`bwa-{lead_id}`), programmatic cleanup of old projects, pre-deploy count check against quota.

Additional pitfalls documented in `.planning/research/PITFALLS.md`: Playwright timeout on anti-bot sites (use `domcontentloaded` not `networkidle`, 15s timeout), Claude HTML output inconsistency (structured prompt + automated HTML validation + retry once), dashboard state lag (write status at each transition, use SSE not polling), SQLite write contention (WAL mode from day one), Vercel cold starts (static-only deploy, no functions), Apify actor schema drift (pin version, validate output fields).

---

## Implications for Roadmap

Based on the dependency chain in ARCHITECTURE.md (Foundation → Skills → Orchestrator → API → Dashboard) and the anti-patterns to avoid, the natural phase structure is:

### Phase 1: Foundation + Pipeline Core
**Rationale:** The entire system's value depends on the pipeline working end-to-end. UI has zero value without a working pipeline. Build and validate the critical path first: schema → all 4 skills → orchestrator. This phase de-risks all technical unknowns (Apify actor response shape, Playwright on target sites, Claude output quality, Vercel CLI behavior) before any UI work begins.
**Delivers:** A working command-line pipeline that scrapes leads, qualifies them, generates HTML redesigns, deploys to Vercel, and persists everything to SQLite. Fully testable without a browser.
**Addresses:** All 8 pipeline-integrity must-have features from FEATURES.md
**Avoids:** Pitfalls 1, 2, 3, 4, 5 — all require upfront design decisions in the schema and pipeline code; retrofitting idempotency and cost controls is significantly harder
**Stack elements:** Node.js 20, better-sqlite3 + Drizzle (WAL mode on), Apify client, Playwright (single browser pattern), @anthropic-ai/sdk, Vercel CLI, node-cron via instrumentation.ts
**Research flag:** NEEDS VERIFICATION — verify Apify actor ID and output schema, verify Vercel CLI `--yes` flag behavior in v44, verify Vercel Hobby plan project limits, verify claude-sonnet-4-6 pricing before setting cost cap

### Phase 2: Dashboard + Live Status
**Rationale:** Once the pipeline is validated, build the operator-facing UI that makes it usable day-to-day. The SSE architecture must be built alongside the dashboard since it requires the in-process EventEmitter pattern established in Phase 1.
**Delivers:** The full Next.js dashboard: run history, lead cards with quality scores and Vercel URLs, agent graph view with live SSE-powered step status, linear workflow view, sidebar Agent Kit panel, one-click email copy.
**Addresses:** All 5 dashboard must-have features from FEATURES.md
**Avoids:** Pitfall 8 (dashboard state divergence) — SSE is built in this phase, not retrofitted; Pitfall 4 (polling anti-pattern) — SSE from day one
**Stack elements:** Next.js 14 App Router, Tailwind v3 + shadcn/ui, EventSource API, force-directed graph component
**Research flag:** Standard patterns — Next.js App Router + Tailwind + shadcn are well-documented; no research-phase needed

### Phase 3: Operational Hardening
**Rationale:** After the first real batch runs with real leads, operational gaps emerge — dirty lead distributions, cost spikes, Vercel project accumulation, HTML quality variance. This phase adds the guardrails, monitoring, and UX improvements that make the system trustworthy at daily volume.
**Delivers:** Lead validation blocklist, token cost logging and batch cost cap, Vercel project rotation/cleanup, Claude HTML output validation (automated + retry), post-deploy URL warm-up, run summary stats, filter/sort leads by status/quality/date.
**Addresses:** Should-have differentiators from FEATURES.md, remaining operational pitfalls
**Avoids:** Pitfalls 3 (dirty leads), 4 (cost explosion), 5 (Vercel project limit), 7 (HTML quality inconsistency)
**Research flag:** Standard patterns — all guards are straightforward TypeScript + regex + API calls; no research-phase needed

### Phase 4: Operator Workflow Polish (Post-Validation)
**Rationale:** Only after the operator has used the system through 5–10 real batch runs will the workflow friction points be clear. Configurable city/batch size via UI (vs .env), step-level retry, embedded redesign preview in dashboard — build these based on real usage, not speculation.
**Delivers:** Configurable run parameters via dashboard UI, per-lead step retry, embedded iframe redesign preview, "why this lead" reasoning display.
**Addresses:** Deferred-but-valuable differentiators from FEATURES.md
**Research flag:** Standard patterns — no research-phase needed; decisions driven by real operator feedback

### Phase Ordering Rationale

- The pipeline must work before the dashboard is built — this eliminates the temptation to build UI over a broken backend
- Idempotency and cost controls belong in Phase 1 because retrofitting them into a running pipeline requires redesigning the state machine and adding SQLite columns — much cheaper to build them in
- The SSE live-status architecture is built in Phase 2 alongside the dashboard; building it in Phase 1 would be premature (nothing to display yet) and deferring it to Phase 3 would require ripping out a polling implementation
- Phase 4 is deliberately held until after real usage — FEATURES.md is explicit that configurable parameters and retry logic are "acceptable as .env" and "acceptable to rerun full batch" in v1

### Research Flags

Needs verification before Phase 1 starts:
- **Apify actor slug and output schema** — verify `compass/google-maps-scraper` is still the recommended actor at `https://apify.com/compass/crawler-google-places`; confirm `title`, `website`, `email` field names in current actor output
- **Vercel Hobby plan project limit** — verify current limit at `https://vercel.com/pricing` (was 100 as of Aug 2025 training data)
- **Vercel CLI `--yes` flag** — run `vercel --help` in v44 to confirm flag name for non-interactive deploy
- **claude-sonnet-4-6 pricing** — confirm current token pricing at `https://anthropic.com/pricing` before setting batch cost cap threshold

Standard patterns (no research-phase needed):
- **Phase 2** — Next.js 14 App Router + Tailwind v3 + shadcn/ui + SSE are all well-documented with stable APIs
- **Phase 3** — cost tracking, validation, and cleanup are standard TypeScript patterns
- **Phase 4** — UI configuration panels are standard React/Next.js patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core choices (Next.js 14, Playwright, better-sqlite3, Drizzle, @anthropic-ai/sdk) are stable and well-documented as of Aug 2025. Version pins need registry verification before install. |
| Features | HIGH | Feature set derived directly from PROJECT.md constraints. Table stakes and anti-features are unambiguous given the single-operator, no-auth, no-email-sending scope. |
| Architecture | HIGH | Monorepo layout, in-process pipeline, SQLite + filesystem split, SSE pattern, and build order are all validated patterns for this stack combination. |
| Pitfalls | HIGH (patterns) / MEDIUM (limits) | Playwright lifecycle, Claude cost model, and SQLite WAL behavior are HIGH confidence. Vercel project limits and Apify actor schema are MEDIUM — must be verified before launch. |

**Overall confidence: HIGH** for build decisions. **MEDIUM** for operational limits (Vercel, Apify) that require live verification.

### Gaps to Address

- **Apify email extraction rate** — research suggests ~60–70% of scraped leads yield a contactable email. Confirm this distribution in the first real batch; tune filtering accordingly.
- **Claude HTML quality calibration** — the qualification score threshold (default: score < 4/10 = qualified) and HTML output prompt structure will need empirical tuning after the first 2–3 batch runs. Budget time for prompt iteration in Phase 1 testing.
- **Vercel project naming 52-char limit** — the `bwa-{lead_id}-{slug}` naming convention must be tested against Vercel's actual project name validation rules; UUID alone is 36 chars, leaving 16 for slug.
- **node-cron in instrumentation.ts** — the `if (process.env.NEXT_RUNTIME === 'nodejs')` guard must be verified against Next.js 14's actual runtime environment variable; if missing, cron registers twice in dev mode.

---

## Sources

### Primary (HIGH confidence)
- `/Users/daniloguerreiro/Desktop/Neuron-Forg/.planning/PROJECT.md` — authoritative project scope and constraints
- Next.js 14 App Router official documentation — route handlers, SSE streaming, instrumentation hook
- Playwright official documentation — browser lifecycle, `newPage()`, timeout semantics
- Anthropic SDK official README — vision API pattern, message structure
- SQLite WAL mode documentation — write-ahead logging, concurrency behavior

### Secondary (MEDIUM confidence)
- Apify Google Maps Scraper actor documentation (training knowledge Aug 2025) — output schema, filtering options
- Vercel CLI v44 documentation (training knowledge Aug 2025) — `--yes` flag, project naming, static deploy behavior
- Vercel pricing page (training knowledge Aug 2025) — Hobby plan project limit (verify before launch)
- Cold outreach / web design prospecting automation community patterns — email draft format, qualification thresholds

### Tertiary (LOW confidence — verify before use)
- Exact npm package versions — all from training data; run `npm show [package] version` before pinning
- Apify actor slug `compass/google-maps-scraper` — verify still recommended on Apify marketplace

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
