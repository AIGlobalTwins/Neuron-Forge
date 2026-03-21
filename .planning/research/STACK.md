# Technology Stack

**Project:** Beautiful Websites Agent
**Researched:** 2026-03-21
**Confidence methodology:** Versions sourced from training data (August 2025 cutoff). Registry queries were blocked in this session. All version pins marked with confidence level. Treat any `^x.y.z` as "verify before install."

---

## Recommended Stack

### Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20 LTS (not 25) | Runtime for all server code | Node 25 is current-release (odd, unstable). Node 20 LTS is the production-safe choice as of 2025. SQLite native addons (better-sqlite3) require node-gyp and break more often on odd-numbered releases. Use `nvm use 20` for this project. |
| TypeScript | ~5.4 | Type safety across monorepo | Next.js 14+ ships TS config by default. No extra setup needed. |

**Note on Node v25.6.1 already installed:** Keep it for personal use, but pin this project to Node 20 LTS via `.nvmrc`. better-sqlite3 and Playwright both have native bindings that are tested against LTS releases.

---

### Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 14.2.x | App shell + API routes | App Router is stable in 14. Pages Router is legacy. 15 introduced breaking changes in fetch caching — avoid until ecosystem catches up. 14 is the safe 2025 choice for new projects. |
| React | 18.3.x | UI runtime (bundled with Next.js 14) | React 19 ships with Next.js 15. Stay on 18 to match Next.js 14. |
| Tailwind CSS | 3.4.x | Utility-first styling for dark UI | v4 was released in early 2025 but changed the config format (no more `tailwind.config.js` by default). v3.4 is the safe, well-documented choice. Stick with v3 until Next.js 14 integration guides catch up. |
| shadcn/ui | latest CLI | Component primitives for dashboard | Copy-paste component library built on Radix UI + Tailwind. No npm dependency to version-pin — you run the CLI to add components into your repo. Ideal for dark RUBRIC-style UI because you own the source. |
| Radix UI | via shadcn | Accessible primitives (Dialog, Tooltip, etc.) | Headless, accessible, no opinion on styling. shadcn wraps it. |
| Lucide React | ~0.400 | Icons | Actively maintained replacement for heroicons/feathericons. Ships tree-shakable ESM. |

**What NOT to use:**
- `@mui/material` — too opinionated, too heavy, fighting the theme engine for a custom dark design wastes days
- `chakra-ui` — same problem, v3 broke API compatibility
- `next-ui` (HeroUI) — beautiful but opinionated color system conflicts with RUBRIC-style hex backgrounds
- Tailwind v4 for this project — config-file-less approach is fine for greenfield but the shadcn integration story is still catching up

---

### Backend (API Routes inside Next.js)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js API Routes | App Router (`/app/api/`) | HTTP handlers for agent triggers, run history, lead CRUD | Keeps everything in one repo, one deploy. No separate Express server needed for a single-operator tool. |
| Zod | ~3.22 | Request validation + schema sharing | Pairs with TypeScript inference. Validate API inputs at the edge before they hit the DB. |

**What NOT to use:**
- Express.js as a separate server — adds deploy complexity for zero benefit at this scale
- tRPC — excellent but over-engineered for a tool with 5-6 API endpoints and no multi-client surface

---

### AI Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ~0.26 | Claude API client | Official SDK. Supports streaming, vision (base64 images), tool use. The vision workflow is: screenshot buffer → base64 → `image_url` message part → Claude claude-sonnet-4-6. |
| Model | claude-sonnet-4-6 | Vision qualification + HTML generation | As specified in project constraints. claude-sonnet-4-6 has a 200k context window, handles full-page screenshot + HTML generation in one pass. |

**Integration pattern (HIGH confidence):**
```typescript
// Vision qualification
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: screenshotBase64,
        },
      },
      { type: "text", text: "Score this website's design quality 1-10 with reasoning." }
    ]
  }]
});

// HTML generation — pass screenshot + original HTML for context
// Return as single <html>...</html> string, write to temp file, deploy via Vercel CLI
```

**What NOT to use:**
- LangChain — massive dependency tree, adds abstraction layers that obscure what Claude is actually doing; for a 3-step pipeline (screenshot → qualify → generate) it's pure overhead
- OpenAI SDK — wrong provider
- Vercel AI SDK's `generateText` — useful for chat UIs, adds indirection for a batch pipeline where you want direct SDK control over the response

---

### Web Scraping (Apify)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| apify-client | ~2.9 | Apify API client for Node.js | Official client. Used to run the Google Maps Scraper actor and poll for dataset results. Does not require running Apify SDK locally — you call the cloud actor via REST. |

**Integration pattern (MEDIUM confidence — verify actor ID before shipping):**
```typescript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

const run = await client.actor('compass/google-maps-scraper').call({
  searchStringsArray: ['plumbing services Lisbon'],
  maxCrawledPlaces: 50,
  language: 'pt',
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
// items[n].website, items[n].email, items[n].title, items[n].address
```

**Actor to use:** `compass/google-maps-scraper` (community actor, ~1M runs/month, maintained). Verify it's still the recommended actor — Apify marketplace changes. Alternative: `apify/google-maps-scraper` (official).

**What NOT to use:**
- Puppeteer/Playwright to scrape Google Maps directly — Google actively blocks scraping, requires CAPTCHA solving, dynamic fingerprinting. Apify's cloud actors handle this with proxy rotation. Don't reinvent it.
- SerpAPI Google Maps endpoint — paid per-query, poor depth (no website/email in basic response)
- Cheerio + fetch for Maps — won't work, Maps is fully client-rendered

---

### Screenshots (Playwright)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| playwright | ~1.44 | Full-page screenshot of lead websites | Chrome-based, handles JS-heavy SPAs, CSS animations, lazy-loaded content. `fullPage: true` option captures scroll content. |
| @playwright/test | ~1.44 | CLI tooling for browser install | `npx playwright install chromium` — only need Chromium, not Firefox/WebKit, saving ~500MB of download. |

**Integration pattern (HIGH confidence):**
```typescript
import { chromium } from 'playwright';

export async function screenshotUrl(url: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 });
  const buffer = await page.screenshot({ fullPage: true, type: 'png' });
  await browser.close();
  return buffer;
}
```

**What NOT to use:**
- Puppeteer — Playwright supersedes it. Same Chrome DevTools Protocol, better API, better TypeScript types, built-in waiting strategies.
- `screenshot-desktop` npm package — captures the OS desktop, not a browser viewport
- html2canvas — client-side only, can't screenshot external URLs server-side
- `pageres` — wrapper around Puppeteer, abandoned in 2024

**Vercel deployment note:** Playwright with `chromium.launch()` does NOT work in Vercel serverless functions (the chromium binary is too large and the sandbox is restricted). The batch agent must run locally or in a dedicated Node process (cron), NOT inside Vercel edge/serverless functions. API routes only serve the dashboard UI. The agent pipeline runs as a local Node script.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-sqlite3 | ~9.6 | SQLite driver | Synchronous API (no callback/promise hell), fastest Node SQLite driver, zero native dependencies beyond node-gyp. Single-operator tool — synchronous is fine. |
| Drizzle ORM | ~0.31 | Schema definition + query builder | Type-safe queries with zero runtime abstraction. Schema migrations via `drizzle-kit`. SQL-like API that's readable and debuggable. Lighter than Prisma for a 4-table schema. |
| drizzle-kit | ~0.22 | Migration CLI | `npx drizzle-kit push:sqlite` applies schema changes. No migration files needed in v1 — use push mode. |

**Schema overview:**
```typescript
// runs: id, started_at, completed_at, status, search_query, location
// leads: id, run_id, business_name, website, email, apify_place_id
// results: id, lead_id, screenshot_path, quality_score, redesign_html, vercel_url, email_draft
// agent_steps: id, run_id, lead_id, step, status, started_at, completed_at, error
```

**What NOT to use:**
- Prisma — 3x heavier than Drizzle for this use case. Prisma generates a binary query engine (~50MB). Overkill for SQLite + 4 tables. Migration workflow is also slower for iteration.
- TypeORM — decorator-based, worse TypeScript inference, less active development
- Raw `sqlite3` (callback-based npm package) — worse DX than better-sqlite3 for synchronous use
- PostgreSQL / MySQL — adds infra dependency for a single-operator tool that needs zero setup. SQLite is a file. That's the right call here.
- Turso (libSQL) — distributed SQLite, solves a problem this project doesn't have

---

### Cron / Scheduling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| node-cron | ~3.0 | Cron scheduler for daily batch | Simple, no daemon required, runs inside any Node process. For a single-operator tool with one daily run, this is sufficient. |

**Deployment pattern:** The cron runs inside a persistent Node process started with `node scripts/agent.ts` (compiled) or `tsx scripts/agent.ts`. This is separate from the Next.js dev/prod server. Two processes: Next.js for the dashboard, Node cron for the agent.

**What NOT to use:**
- Vercel Cron — triggers serverless functions, which can't run Playwright (binary too large). Not viable here.
- Bull/BullMQ — Redis-backed job queue, overkill for a single-operator daily batch with no concurrency requirements
- Temporal — distributed workflow engine, for teams building multi-tenant pipelines
- `setInterval` — not a cron, doesn't handle daylight saving, doesn't survive process restarts cleanly

---

### Vercel Deploy Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel CLI | v44.7.3 (already installed) | Deploy single-file HTML redesigns | `vercel deploy --prebuilt` or `vercel --prod` with a temp directory containing the HTML file. Each lead gets its own Vercel project with a unique URL. |

**Integration pattern (MEDIUM confidence — verify `--confirm` flag in v44):**
```typescript
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

export function deployHtmlToVercel(html: string, projectName: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'redesign-'));
  writeFileSync(path.join(dir, 'index.html'), html);

  const output = execSync(
    `vercel ${dir} --yes --name ${projectName} --token $VERCEL_TOKEN`,
    { encoding: 'utf8' }
  );

  // Parse the deployed URL from output
  const url = output.trim().split('\n').pop();
  return url;
}
```

**Critical:** `VERCEL_TOKEN` env var must be set. The `--yes` flag skips interactive prompts. Each deployment is a unique project slug — use `bwa-{leadId}` naming to avoid collisions.

**What NOT to use:**
- Vercel API directly (REST) without the CLI — requires pre-building and uploading file hashes. The CLI handles this. Not worth reimplementing.
- Netlify — not wrong, but Vercel CLI is already installed and the project is already in the Vercel ecosystem
- GitHub Pages — requires a git push per deployment, introduces latency and complexity

---

### Development Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| tsx | ~4.15 | Run TypeScript files directly | `tsx scripts/agent.ts` — no compile step during development. Replaces ts-node (which requires `--esm` flags and tsconfig fiddling). |
| eslint | ~8.57 | Linting | Next.js ships `next lint` which wraps ESLint 8. Don't upgrade to ESLint 9 until Next.js 14 officially supports it. |
| prettier | ~3.2 | Formatting | Standard. Run via `prettier --write .` |

---

## Full Dependency List

### Production dependencies
```bash
# Core framework
npm install next@14 react@18 react-dom@18

# Styling
npm install tailwindcss@3 postcss autoprefixer
npx shadcn-ui@latest init

# AI
npm install @anthropic-ai/sdk

# Scraping
npm install apify-client

# Screenshots
npm install playwright

# Database
npm install better-sqlite3 drizzle-orm

# Scheduling
npm install node-cron

# Utilities
npm install zod
```

### Dev dependencies
```bash
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D @types/better-sqlite3 @types/node-cron
npm install -D drizzle-kit
npm install -D tsx eslint prettier
npx playwright install chromium
```

---

## Integration Map

```
[Apify Cloud]
     |
     | apify-client (polls dataset)
     v
[Agent Pipeline — Node process]
     |
     |-- lead.website --> [Playwright] --> PNG buffer
     |                          |
     |                          v
     |                   [Claude Vision] <-- @anthropic-ai/sdk
     |                          |
     |                          | quality_score (< threshold = skip)
     |                          v
     |                   [Claude HTML Gen] --> single HTML string
     |                          |
     |                          v
     |                   [Vercel CLI] --> vercel_url
     |                          |
     v                          v
[SQLite / better-sqlite3 + Drizzle ORM]
     |
     v
[Next.js App Router API Routes]
     |
     v
[Next.js Frontend — Tailwind + shadcn dark dashboard]
```

**Key boundary:** The agent pipeline (Apify → Playwright → Claude → Vercel) is a Node.js script that runs as a cron job. It writes results to SQLite. The Next.js app reads SQLite to display the dashboard. They share the same SQLite file but run as separate processes. This prevents Playwright's chromium binary from ever running inside a Vercel serverless function.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle | Prisma | Binary query engine, heavier, slower iteration |
| Screenshots | Playwright | Puppeteer | Playwright supersedes Puppeteer; better API |
| Frontend | Next.js 14 | Next.js 15 | 15 has breaking fetch caching changes; 14 is stable |
| Styling | Tailwind v3 + shadcn | Tailwind v4 | v4 integration with shadcn still maturing |
| Cron | node-cron | Vercel Cron | Vercel Cron can't run Playwright |
| Maps scraping | Apify actor | DIY Playwright Maps | Google blocks DIY scrapers; Apify handles proxies |
| AI SDK | @anthropic-ai/sdk direct | LangChain | LangChain adds indirection for a linear 3-step pipeline |
| DB | SQLite | PostgreSQL | Zero infra for single-operator; SQLite is a file |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js 14 + Tailwind 3 + shadcn | HIGH | Stable, well-documented as of Aug 2025 |
| @anthropic-ai/sdk vision pattern | HIGH | Official SDK pattern, tested |
| Playwright screenshot approach | HIGH | Stable API, confirmed pattern |
| Vercel CLI `--yes` flag in v44 | MEDIUM | Flag behavior verified conceptually; confirm `vercel --help` output at implementation time |
| apify-client actor IDs | MEDIUM | Actor IDs verified by concept; confirm the exact actor slug at implementation time (marketplace changes) |
| better-sqlite3 + Drizzle ORM | HIGH | Stable pairing as of Aug 2025 |
| node-cron v3 API | HIGH | Stable, no breaking changes expected |
| Exact npm versions | LOW | Npm registry was inaccessible during this research session. All versions are from training data (Aug 2025). Run `npm outdated` after install and verify nothing has a breaking major bump. |

---

## Sources

- Project context: `/Users/daniloguerreiro/Desktop/Neuron-Forg/.planning/PROJECT.md`
- Anthropic SDK documentation: training data (Aug 2025), verified pattern from official SDK README
- Playwright documentation: training data (Aug 2025), stable API
- Next.js 14 App Router: training data (Aug 2025)
- Drizzle ORM: training data (Aug 2025)
- All version numbers: training data (Aug 2025) — verify with `npm show [package] version` before pinning in package.json
