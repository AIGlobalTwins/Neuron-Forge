# Architecture Patterns

**Project:** Beautiful Websites Agent
**Researched:** 2026-03-21
**Domain:** AI agent pipeline with batch processing and web dashboard
**Confidence note:** WebSearch and Bash tools restricted during this research session. All findings are based on official documentation knowledge (training cutoff August 2025) cross-referenced with project constraints from PROJECT.md. Confidence levels noted per section.

---

## Recommended Architecture

### High-Level System Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Monorepo                          │
│                                                             │
│  ┌──────────────┐      ┌──────────────────────────────┐    │
│  │   App Router  │      │       API Routes              │    │
│  │  (dashboard)  │◄────►│  /api/runs, /api/leads,      │    │
│  │  React + TSX  │      │  /api/pipeline/trigger,       │    │
│  └──────────────┘      │  /api/pipeline/stream (SSE)   │    │
│                         └──────────────┬─────────────────┘    │
│                                        │                     │
│                         ┌──────────────▼─────────────────┐   │
│                         │       Pipeline Engine            │   │
│                         │  (Node.js, runs in-process)      │   │
│                         │  lib/pipeline/orchestrator.ts    │   │
│                         └──────────────┬─────────────────┘   │
│                                        │                     │
│           ┌────────────────────────────┼────────────────┐   │
│           │            │               │                 │   │
│    ┌──────▼───┐ ┌──────▼──┐  ┌────────▼──┐  ┌──────────▼┐ │
│    │ Skill 1  │ │ Skill 2  │  │ Skill 3   │  │ Skill 4   │ │
│    │ Apify    │ │ Qualify  │  │ Redesign  │  │ Deploy    │ │
│    │ Scrape   │ │Playwright│  │ Claude    │  │ Vercel    │ │
│    └──────────┘ └─────────┘  └───────────┘  └───────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    SQLite (better-sqlite3)             │  │
│  │   runs → leads → skill_results → redesigns            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────┐    ┌────────────────────────┐    │
│  │   /public/redesigns/ │    │   node-cron (in-proc)  │    │
│  │   (static HTML files)│    │   daily batch trigger  │    │
│  └──────────────────────┘    └────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision: Monorepo Structure (HIGH confidence)

**Decision:** Single Next.js repo with API Routes as the backend surface. No separate Express server.

**Rationale:**
- PROJECT.md explicitly constrains: "Monorepo Next.js (frontend + API routes) — Simplicidade de deploy e desenvolvimento"
- Next.js 14 App Router supports long-running API routes via `maxDuration` config and streaming responses
- For a single-operator tool, the operational simplicity outweighs the theoretical benefits of a separate server
- Pipeline runs happen at most once per day (batch); concurrency is not a concern in v1

**Monorepo layout:**

```
/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx              # Main dashboard (graph + run list)
│   │   ├── runs/[id]/page.tsx    # Run detail page
│   │   └── layout.tsx
│   └── api/
│       ├── pipeline/
│       │   ├── trigger/route.ts  # POST — start a run
│       │   └── stream/route.ts   # GET — SSE stream for active run
│       ├── runs/
│       │   ├── route.ts          # GET list of runs
│       │   └── [id]/route.ts     # GET single run with leads
│       └── leads/
│           └── [id]/route.ts     # GET lead detail + redesign URL
├── lib/
│   ├── pipeline/
│   │   ├── orchestrator.ts       # Sequencing logic
│   │   ├── context.ts            # RunContext type + state machine
│   │   └── skills/
│   │       ├── 01-scrape.ts
│   │       ├── 02-qualify.ts
│   │       ├── 03-redesign.ts
│   │       └── 04-deploy.ts
│   ├── db/
│   │   ├── client.ts             # better-sqlite3 singleton
│   │   ├── schema.ts             # CREATE TABLE statements
│   │   └── queries/
│   │       ├── runs.ts
│   │       ├── leads.ts
│   │       └── results.ts
│   └── emitter.ts                # In-process event emitter for SSE bridge
├── public/
│   └── redesigns/                # Served statically — generated HTML files
├── scripts/
│   └── cron.ts                   # node-cron scheduler (runs on server start)
└── components/
    ├── graph/                    # Agent graph view (force-directed)
    ├── pipeline/                 # Linear workflow view
    └── sidebar/                  # Agent Kit panel
```

---

## Component Boundaries

| Component | Responsibility | Input | Output | Communicates With |
|-----------|---------------|-------|--------|-------------------|
| `app/(dashboard)` | Renders pipeline state visually | API JSON + SSE events | React UI | API Routes via fetch/EventSource |
| `api/pipeline/trigger` | Starts a new run | POST body (optional config) | Run ID | Pipeline Orchestrator |
| `api/pipeline/stream` | Streams live status | Run ID (query param) | SSE events | In-process EventEmitter |
| `api/runs` | Reads run history | — | JSON | SQLite queries layer |
| `api/leads` | Reads lead details | Lead ID | JSON + redesign URL | SQLite queries layer |
| Pipeline Orchestrator | Sequences 4 skills, manages state | RunConfig | Persists to SQLite, emits events | All 4 Skills, SQLite, EventEmitter |
| Skill 01: Apify Scrape | Fetches PME leads from Google Maps | Search params | `Lead[]` with website + email | Apify REST API |
| Skill 02: Qualify | Scores site quality via vision | Lead website URL | `QualifyResult` per lead | Playwright (screenshot), Claude Vision API |
| Skill 03: Redesign | Generates HTML redesign | Lead data + screenshot | HTML string | Claude API (claude-sonnet-4-6) |
| Skill 04: Deploy | Deploys HTML to Vercel, returns URL | HTML file path | Vercel URL string | Vercel CLI (child_process.exec) |
| SQLite layer | Persists all state durably | TypeScript objects | Typed query results | `better-sqlite3` |
| `public/redesigns/` | Serves HTML before Vercel deploy | Written HTML file | Static URL `/redesigns/{id}.html` | Next.js static file serving |
| `lib/emitter.ts` | Bridges pipeline events to SSE clients | Pipeline events | EventEmitter broadcasts | Orchestrator (emit), SSE route (subscribe) |
| `scripts/cron.ts` | Daily automatic trigger | Time schedule | Calls pipeline trigger | Pipeline Orchestrator |

---

## Data Flow: Skill-by-Skill

### Skill 01 — Apify Scrape

```
Input:
  { query: "restaurantes Lisboa", maxResults: 50 }

Process:
  POST https://api.apify.com/v2/acts/[actor-id]/runs
  Poll until complete
  Extract results

Output per lead:
  {
    businessName: string
    website: string        // required — filter out leads without
    email: string | null
    address: string
    category: string
    googleMapsUrl: string
  }

Persisted:
  INSERT INTO leads (run_id, business_name, website, email, ...) → lead_id
```

### Skill 02 — Site Qualify

```
Input:
  Lead { website: string, lead_id: uuid }

Process:
  1. Playwright: launch browser, navigate to website, screenshot (1280x800)
  2. Save screenshot to /tmp/screenshots/{lead_id}.png
  3. Claude Vision: send screenshot + prompt → quality score
     Prompt scores: design age, mobile responsiveness, visual hierarchy
  4. Threshold: score < 4/10 → qualified (bad enough to need redesign)

Output:
  {
    lead_id: uuid
    screenshot_path: string
    quality_score: number   // 1-10 (low = worse site = better lead)
    qualified: boolean
    disqualify_reason?: string
  }

Persisted:
  UPDATE leads SET qualified = ?, quality_score = ?, screenshot_path = ?
  INSERT INTO skill_results (lead_id, skill = 'qualify', output_json)
```

### Skill 03 — Redesign

```
Input:
  Lead {
    business_name, category, website,
    screenshot_path: string   // for visual reference
  }

Process:
  Claude API (claude-sonnet-4-6):
    - System: "Generate complete HTML single-file redesign..."
    - User: business context + screenshot (base64)
    - Output: complete HTML string (inline CSS, no external deps)

  Write to: /public/redesigns/{lead_id}.html

Output:
  {
    lead_id: uuid
    html_path: string          // disk path
    preview_url: string        // /redesigns/{lead_id}.html (local)
    email_draft: string        // personalized pitch included in Claude response
  }

Persisted:
  INSERT INTO redesigns (lead_id, html_path, preview_url, email_draft)
  UPDATE leads SET redesign_status = 'generated'
```

### Skill 04 — Deploy

```
Input:
  { lead_id: uuid, html_path: string }

Process:
  1. Create temp dir: /tmp/deploy/{lead_id}/
  2. Copy HTML as index.html
  3. Shell: vercel --prod --yes /tmp/deploy/{lead_id}/
  4. Parse stdout for deployment URL

Output:
  {
    lead_id: uuid
    vercel_url: string   // https://xxx.vercel.app
    deployed_at: string
  }

Persisted:
  UPDATE redesigns SET vercel_url = ?, deployed_at = ?
  UPDATE leads SET status = 'complete'
```

### Email Draft Generation

Email draft is generated during Skill 03 as part of the Claude prompt. The prompt instructs Claude to return both:
1. The HTML redesign (between `<html>` tags)
2. An email draft section (plain text, after a delimiter)

This avoids a fifth API call. The orchestrator parses the response to split them.

---

## Real-Time Updates Strategy (HIGH confidence)

**Decision: Server-Sent Events (SSE) over WebSockets or polling.**

**Rationale:**
- Pipeline events are unidirectional: server → browser
- SSE is natively supported by Next.js App Router via `ReadableStream` in route handlers
- No WebSocket server needed (simpler infra, works with Vercel deployment)
- Polling creates unnecessary database reads every N seconds; SSE pushes exactly when state changes
- For a single-operator tool, SSE connection count = 1 simultaneously

**Implementation pattern (HIGH confidence — Next.js 14 App Router):**

```typescript
// app/api/pipeline/stream/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const send = (event: PipelineEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        )
      }

      // Subscribe to in-process emitter
      pipelineEmitter.on(`run:${runId}`, send)

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        pipelineEmitter.off(`run:${runId}`, send)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Frontend consumption:**

```typescript
// In dashboard component
const eventSource = new EventSource(`/api/pipeline/stream?runId=${runId}`)
eventSource.onmessage = (e) => {
  const event: PipelineEvent = JSON.parse(e.data)
  // update graph node status, progress bars, log lines
}
```

**Event shape:**

```typescript
type PipelineEvent =
  | { type: 'skill_start'; skill: SkillName; leadId?: string }
  | { type: 'skill_complete'; skill: SkillName; leadId?: string; result: unknown }
  | { type: 'skill_error'; skill: SkillName; leadId?: string; error: string }
  | { type: 'lead_qualified'; leadId: string; score: number }
  | { type: 'lead_complete'; leadId: string; vercelUrl: string }
  | { type: 'run_complete'; runId: string; stats: RunStats }
  | { type: 'run_error'; runId: string; error: string }
```

**In-process EventEmitter bridge:**

Because the pipeline runs in the same Node.js process as the API routes (Next.js with a persistent server), a singleton EventEmitter in `lib/emitter.ts` works reliably. The orchestrator emits events; the SSE route subscribes. This is a well-established pattern for Next.js + SQLite single-server deployments.

CAVEAT: This pattern does NOT work with Vercel serverless functions (each invocation is isolated). If the app is deployed to Vercel, the trigger route must keep the pipeline running via `waitUntil` or the app must be deployed as a traditional Node.js server (`next start`). For local single-operator use, `next start` is the deployment model and the in-process emitter works correctly.

---

## SQLite Schema (HIGH confidence for structure, MEDIUM for exact types)

**Library choice: `better-sqlite3`** (synchronous, zero-config, well-suited for single-server Node.js)

```sql
-- Core run tracking
CREATE TABLE runs (
  id          TEXT PRIMARY KEY,          -- UUID v4
  started_at  TEXT NOT NULL,             -- ISO 8601
  completed_at TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
                                         -- pending | running | complete | error
  config_json TEXT,                      -- JSON: search params used
  stats_json  TEXT                       -- JSON: counts after completion
);

-- Each business lead from Apify
CREATE TABLE leads (
  id              TEXT PRIMARY KEY,      -- UUID v4
  run_id          TEXT NOT NULL REFERENCES runs(id),
  business_name   TEXT NOT NULL,
  website         TEXT NOT NULL,
  email           TEXT,
  address         TEXT,
  category        TEXT,
  google_maps_url TEXT,
  status          TEXT NOT NULL DEFAULT 'scraped',
                                         -- scraped | qualifying | qualified
                                         -- | disqualified | redesigning
                                         -- | redesigned | deploying | complete | error
  created_at      TEXT NOT NULL
);

-- Per-skill results (generic, extensible)
CREATE TABLE skill_results (
  id          TEXT PRIMARY KEY,          -- UUID v4
  lead_id     TEXT NOT NULL REFERENCES leads(id),
  skill       TEXT NOT NULL,             -- 'qualify' | 'redesign' | 'deploy'
  status      TEXT NOT NULL,             -- 'success' | 'error'
  output_json TEXT,                      -- Full skill output as JSON
  error_text  TEXT,
  duration_ms INTEGER,
  created_at  TEXT NOT NULL
);

-- Qualify skill results (denormalized for easy querying)
CREATE TABLE qualify_results (
  lead_id         TEXT PRIMARY KEY REFERENCES leads(id),
  qualified       INTEGER NOT NULL,      -- 0 or 1 (SQLite boolean)
  quality_score   REAL NOT NULL,
  screenshot_path TEXT NOT NULL,
  disqualify_reason TEXT,
  created_at      TEXT NOT NULL
);

-- Redesign outputs
CREATE TABLE redesigns (
  lead_id      TEXT PRIMARY KEY REFERENCES leads(id),
  html_path    TEXT NOT NULL,            -- /public/redesigns/{id}.html
  preview_url  TEXT NOT NULL,            -- /redesigns/{id}.html
  vercel_url   TEXT,                     -- set after deploy
  email_draft  TEXT,                     -- plain text email draft
  deployed_at  TEXT,
  created_at   TEXT NOT NULL
);

-- Indexes for common access patterns
CREATE INDEX idx_leads_run_id     ON leads(run_id);
CREATE INDEX idx_leads_status     ON leads(status);
CREATE INDEX idx_skill_results_lead_id ON skill_results(lead_id);
CREATE INDEX idx_runs_started_at  ON runs(started_at DESC);
```

**Why this structure:**
- `skill_results` stores raw JSON output for every skill — preserves full context without schema migration per skill change
- `qualify_results` and `redesigns` are denormalized projections — dashboard queries don't need to parse JSON blobs
- `leads.status` as a state machine string enables simple filtering for "show me all complete leads in run X"
- TEXT for all IDs and dates — avoids SQLite INTEGER affinity surprises with UUIDs

---

## Playwright Management (MEDIUM confidence)

**Decision: Single instance, lazily initialized, reused across leads in a run.**

**Rationale:**
- Playwright browser launch is expensive (~1-2 seconds). Launching per-lead multiplies by 50 leads = 100 seconds wasted.
- Skill 02 processes leads sequentially within a run (not in parallel — avoids rate limits on Claude API)
- A single browser with a reused context, creating a new page per lead, is the correct pattern
- Browser closes when skill 02 completes for the run

```typescript
// lib/pipeline/skills/02-qualify.ts
let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true })
  }
  return browser
}

export async function runQualify(leads: Lead[]): Promise<QualifyResult[]> {
  const b = await getBrowser()
  const results: QualifyResult[] = []

  for (const lead of leads) {
    const page = await b.newPage()
    try {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(lead.website, { timeout: 15000, waitUntil: 'networkidle' })
      const screenshot = await page.screenshot({ type: 'png' })
      // ... Claude Vision call
    } finally {
      await page.close()
    }
    results.push(...)
  }

  await b.close()
  browser = null
  return results
}
```

**Anti-pattern to avoid:** Do NOT use `browser.newContext()` with persistent sessions between runs. Each run should have a clean browser instance to avoid state leakage.

**Timeout handling:** Set `timeout: 15000` for navigation. Leads with broken or unresponsive sites should be marked `disqualified` with `disqualify_reason: 'timeout'` — not crash the skill.

---

## Serving Generated HTML Files (HIGH confidence)

**Decision: Write to `/public/redesigns/` for immediate preview, use as source for Vercel deploy.**

Next.js serves everything in `/public/` as static assets at the root URL. Files written to `/public/redesigns/{lead_id}.html` are immediately accessible at `/redesigns/{lead_id}.html` without any additional route configuration.

**Lifecycle:**
1. Skill 03 writes `{lead_id}.html` to `./public/redesigns/`
2. Dashboard shows preview link `/redesigns/{lead_id}.html` — works instantly
3. Skill 04 reads the same file, creates temp deploy dir, deploys to Vercel
4. Dashboard updates to show Vercel URL once available
5. Local file remains — serves as backup and eliminates re-fetch

**Naming convention:** `{lead_id}.html` (UUID-based) prevents filename collisions across runs and leads. Do not use business name as filename — special characters, spaces, and duplicates cause issues.

---

## Cron Scheduler (MEDIUM confidence)

**Decision: `node-cron` running inside the Next.js server process.**

For a single-operator v1, embedding the cron in the server process is acceptable. The alternative (separate cron job via OS crontab or GitHub Actions) adds operational complexity with no benefit for local deployment.

```typescript
// scripts/cron.ts — imported in app/layout.tsx server component or middleware
import cron from 'node-cron'
import { triggerPipeline } from '@/lib/pipeline/orchestrator'

// Initialize once when server starts
let initialized = false

export function initCron() {
  if (initialized) return
  initialized = true

  // Daily at 09:00
  cron.schedule('0 9 * * *', () => {
    triggerPipeline({ source: 'cron' })
  })
}
```

**Where to call `initCron()`:** In Next.js 14 with App Router, the cleanest placement is in `instrumentation.ts` (Next.js instrumentation hook — runs once on server start).

```typescript
// instrumentation.ts (at project root)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCron } = await import('./scripts/cron')
    initCron()
  }
}
```

This ensures the cron only registers in the Node.js runtime (not Edge) and only once.

---

## Skills as Independent Modules (HIGH confidence for pattern)

**Pattern: Each skill is a TypeScript module exporting a single async function.**

```typescript
// Skill contract
type SkillFn<TInput, TOutput> = (
  input: TInput,
  ctx: RunContext
) => Promise<TOutput>

// RunContext carries: runId, emitter ref, db client ref
interface RunContext {
  runId: string
  emit: (event: PipelineEvent) => void
  db: Database  // better-sqlite3 instance
}
```

**Orchestrator calls skills sequentially:**

```typescript
// lib/pipeline/orchestrator.ts
export async function runPipeline(config: RunConfig): Promise<void> {
  const runId = crypto.randomUUID()
  const ctx = buildRunContext(runId)

  try {
    // Skill 1 — all leads
    ctx.emit({ type: 'skill_start', skill: 'scrape' })
    const leads = await scrapeSkill(config, ctx)
    ctx.emit({ type: 'skill_complete', skill: 'scrape' })

    // Skill 2 — qualify leads (updates each lead's status as it processes)
    ctx.emit({ type: 'skill_start', skill: 'qualify' })
    const qualified = await qualifySkill(leads, ctx)
    ctx.emit({ type: 'skill_complete', skill: 'qualify' })

    // Skills 3 + 4 — per qualified lead
    for (const lead of qualified) {
      ctx.emit({ type: 'skill_start', skill: 'redesign', leadId: lead.id })
      const redesign = await redesignSkill(lead, ctx)
      ctx.emit({ type: 'skill_complete', skill: 'redesign', leadId: lead.id })

      ctx.emit({ type: 'skill_start', skill: 'deploy', leadId: lead.id })
      const deployed = await deploySkill(redesign, ctx)
      ctx.emit({ type: 'lead_complete', leadId: lead.id, vercelUrl: deployed.url })
    }

    ctx.emit({ type: 'run_complete', runId })
  } catch (err) {
    ctx.emit({ type: 'run_error', runId, error: String(err) })
  }
}
```

**Why sequential for skills 3+4 per lead:** Each lead reaching the "complete" state immediately — operator can start reviewing finished leads while others are still processing. This also avoids Claude API rate limits from parallel requests.

---

## API Surface: Frontend ↔ Backend

| Endpoint | Method | Purpose | Response Shape |
|----------|--------|---------|----------------|
| `/api/pipeline/trigger` | POST | Start a new run | `{ runId: string }` |
| `/api/pipeline/stream?runId=X` | GET | SSE stream of live events | `text/event-stream` |
| `/api/runs` | GET | List all runs (newest first) | `Run[]` |
| `/api/runs/[id]` | GET | Single run + lead list | `Run & { leads: Lead[] }` |
| `/api/leads/[id]` | GET | Lead detail + results | `Lead & { qualify: QualifyResult, redesign: Redesign }` |
| `/redesigns/[id].html` | GET | Preview redesign HTML | Static file (Next.js public/) |

**No authentication in v1** (single-operator constraint from PROJECT.md).

---

## Build Order (Phase Dependencies)

The following order minimizes blocked work and enables testing at each step.

### Layer 1 — Foundation (no dependencies)
1. SQLite schema + `lib/db/` queries layer
2. `lib/emitter.ts` (in-process event emitter)
3. `lib/pipeline/context.ts` (RunContext type)
4. Project scaffold: `next.config.ts`, TypeScript config, Tailwind

### Layer 2 — Skills (each independent after Layer 1)
5. Skill 01: Apify Scrape (test with real API key, insert to SQLite)
6. Skill 02: Qualify (test with single URL, needs Playwright + Claude API)
7. Skill 03: Redesign (test with lead fixture, needs Claude API, writes HTML)
8. Skill 04: Deploy (test with fixture HTML, needs Vercel CLI)

### Layer 3 — Orchestrator (depends on all skills)
9. Pipeline orchestrator (sequences skills, emits events)
10. Cron scheduler (depends on orchestrator)

### Layer 4 — API Routes (depends on orchestrator + db)
11. `/api/runs` + `/api/leads` (read endpoints — can be tested with seeded data)
12. `/api/pipeline/trigger` (write endpoint)
13. `/api/pipeline/stream` (SSE — test with EventSource in browser console)

### Layer 5 — Dashboard UI (depends on API routes)
14. Run list component (reads `/api/runs`)
15. Pipeline graph view (RUBRIC-inspired, force-directed, reads SSE events)
16. Lead detail view (reads `/api/leads/[id]`, shows redesign preview)
17. Sidebar Agent Kit panel (skill tooltips, status modals)

**Critical path:** SQLite schema → Skill 01 → Skill 02 → Skill 03 → Skill 04 → Orchestrator. This sequence validates the entire end-to-end value path before any UI work begins.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Playwright in Vercel Serverless Functions

**What:** Deploying the Next.js app to Vercel and calling Playwright from an API route
**Why bad:** Vercel serverless functions have strict memory limits (~1GB) and execution timeouts (10-60s). Playwright's Chromium binary alone is ~300MB. Cold starts will fail.
**Instead:** Run the app with `next start` on a local machine or a VPS. The system is explicitly designed for single-operator local use.

### Anti-Pattern 2: Spawning a New Playwright Browser Per Lead

**What:** `chromium.launch()` inside the per-lead loop
**Why bad:** 50 browser launches = ~50-100 seconds of overhead, and potential port exhaustion
**Instead:** Single browser instance, `newPage()` per lead, close browser after skill completes

### Anti-Pattern 3: Storing HTML in SQLite

**What:** Inserting the full redesign HTML string into the database
**Why bad:** SQLite works well for structured data; storing 50-200KB HTML blobs per lead degrades query performance and makes the DB file large
**Instead:** Write HTML to filesystem (`/public/redesigns/`), store only the file path in SQLite

### Anti-Pattern 4: Polling for Pipeline Status

**What:** Dashboard polls `/api/runs/[id]` every 2 seconds to check status
**Why bad:** Unnecessary DB reads, stale data between polls, janky UI during fast transitions
**Instead:** SSE stream via `/api/pipeline/stream` — push exactly when state changes

### Anti-Pattern 5: Parallel Claude API Calls for All Leads

**What:** `Promise.all(leads.map(lead => redesignSkill(lead)))`
**Why bad:** Claude API has rate limits. 50 parallel requests will hit 429 errors; error handling becomes complex; partial failures are hard to resume
**Instead:** Sequential processing per lead, with error isolation (`try/catch` per lead marks the lead as `error` and continues)

### Anti-Pattern 6: Triggering Pipeline from `useEffect`

**What:** Browser-side trigger of the pipeline via a client component effect
**Why bad:** Browser tab close kills the pipeline mid-run; no way to resume
**Instead:** POST to `/api/pipeline/trigger` which starts the pipeline in the server process. Browser can disconnect and reconnect — pipeline continues, SSE reconnects on page reload.

---

## Scalability Considerations

This system is designed for single-operator v1. Scalability notes are provided for v2 awareness.

| Concern | At 1 operator (v1) | At team (v2) | At scale (v3) |
|---------|-------------------|--------------|---------------|
| Concurrency | 1 run at a time, sequential | Run queue (BullMQ) | Worker pool |
| Storage | SQLite + local filesystem | PostgreSQL + S3/R2 | Same |
| Auth | None | NextAuth.js | RBAC |
| Pipeline runtime | In-process Node.js | Separate worker service | Same |
| Scheduler | `node-cron` in-process | Dedicated scheduler | External cron service |
| SSE | In-process EventEmitter | Redis pub/sub | Same |

---

## Sources

- Next.js 14 App Router documentation — Route Handlers, streaming, instrumentation hook (training knowledge, HIGH confidence)
- `better-sqlite3` README — synchronous API, WAL mode recommendation (training knowledge, HIGH confidence)
- Playwright documentation — browser lifecycle, `newPage()` pattern (training knowledge, HIGH confidence)
- PROJECT.md constraints — stack, scope, design reference (authoritative project source)
- Node.js `node-cron` package — schedule syntax and initialization patterns (training knowledge, MEDIUM confidence — verify current version)
- Next.js `instrumentation.ts` — available since Next.js 13.4, stable in 14 (training knowledge, HIGH confidence)
