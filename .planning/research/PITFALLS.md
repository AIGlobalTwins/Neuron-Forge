# Domain Pitfalls

**Domain:** AI agent batch processing — web scraping + browser automation + LLM generation + PaaS deploy
**Project:** Beautiful Websites Agent (Apify + Playwright + Claude API + Vercel CLI + SQLite + Next.js)
**Researched:** 2026-03-21
**Confidence note:** WebSearch and WebFetch were unavailable. All findings are from training knowledge on these specific tools. Confidence levels reflect training depth per topic.

---

## Critical Pitfalls

These cause rewrites, data loss, runaway costs, or complete system failure.

---

### Pitfall 1: Playwright Browser Context Leak

**What goes wrong:** Each screenshot run creates a browser context (and sometimes a full browser instance). If pages are not explicitly closed after use, contexts accumulate across batch runs until the Node.js process runs out of memory or file descriptors and crashes — silently, mid-batch.

**Why it happens:** Playwright's `browser.newContext()` and `page.goto()` are easy to write. The `finally` block for `page.close()` and `context.close()` is easy to omit, especially in error paths. If a site throws an exception during navigation, the cleanup code is often skipped.

**Consequences:** Memory grows linearly with leads processed. In a batch of 50 leads, a 2 GB Node.js process limit is reachable. The process dies without completing the batch. SQLite may be left in an inconsistent state (leads marked "processing" but never resolved).

**Warning signs:**
- Memory usage visible in OS process monitor climbing throughout a run
- Batch completes fewer leads than expected with no explicit error
- Process dies with `SIGKILL` or out-of-memory rather than an application error
- Dashboard shows leads stuck in "processing" state after a run

**Prevention:**
```typescript
// Always use try/finally and explicit close
const context = await browser.newContext();
const page = await context.newPage();
try {
  await page.goto(url, { timeout: 15000 });
  // ... work
} finally {
  await page.close();
  await context.close(); // not browser.close() — reuse the browser instance
}
```
- Instantiate one browser per batch run (not per lead). Share it across all leads. Close it once at the very end.
- Use `page.setDefaultTimeout(10000)` globally to bound any stalled navigation.
- Add a health check that logs `process.memoryUsage().heapUsed` after each lead.

**Phase/component:** Backend agent runner — first day of implementation.

---

### Pitfall 2: Playwright Hanging on Anti-Bot and Heavy Sites

**What goes wrong:** Sites with Cloudflare, hCaptcha, or heavy JavaScript bundles cause `page.goto()` to hang indefinitely waiting for `networkidle`. The batch process stalls on a single lead, blocking the entire queue. In the worst case, a JavaScript-infinite-poll site means `networkidle` is never reached.

**Why it happens:** The default `waitUntil: 'networkidle'` option waits for zero network connections for 500ms. Sites with long-polling, websockets, or aggressive ad networks never reach this state. Anti-bot pages serve a waiting room that never completes without human interaction.

**Consequences:** One lead can stall the entire batch for the full timeout duration (default 30s, potentially much longer). If timeouts aren't set, the batch never completes. A 50-lead batch with 5 stalled sites at 60s each = 5 minutes wasted; at no timeout = infinite hang.

**Warning signs:**
- Batch runtime grows unexpectedly long
- Specific domains consistently time out
- Screenshots come back blank or as a Cloudflare challenge page
- Dashboard shows a lead stuck "processing" for minutes

**Prevention:**
- Use `waitUntil: 'domcontentloaded'` instead of `networkidle` — captures the DOM before JS finishes loading, sufficient for screenshots.
- Set `timeout: 15000` (15 seconds) hard limit on every `page.goto()` call.
- Wrap each screenshot attempt in a try/catch. A failed screenshot is a disqualification signal, not a crash condition — log it, mark the lead as `screenshot_failed`, continue.
- After `goto`, immediately call `page.screenshot({ fullPage: false })` — capturing the viewport only avoids triggering further lazy-loaded content.
- Consider launching Playwright with `args: ['--disable-extensions', '--disable-gpu', '--no-sandbox']` to reduce surface area for detection (though fingerprinting evasion is out of scope for v1).
- Block heavy resources to speed up loads: `page.route('**/*.{mp4,woff2,svg,png,jpg,jpeg,gif,webp}', r => r.abort())` — but keep CSS because visual rendering matters for the screenshot purpose.

**Phase/component:** Screenshot skill — implement with hard timeouts and graceful degradation from day one.

---

### Pitfall 3: Batch Fails Mid-Run with No Recovery

**What goes wrong:** The batch process crashes or is interrupted (Node.js exception, OOM, manual stop, server restart) after processing 20 of 50 leads. On restart, it re-runs all 50 — re-spending Apify credits, re-burning Claude API calls, re-deploying already-live Vercel projects.

**Why it happens:** Batch logic that iterates a list without checking prior state before executing each step. The "happy path" is written first; idempotency is added later (or never).

**Consequences:**
- Apify credits spent twice per lead
- Claude API costs double for re-run leads
- Vercel may reject duplicate project names or create duplicates with suffixes
- Dashboard shows confusing duplicate entries

**Warning signs:**
- No "skip if already processed" check at the start of each lead's pipeline
- Lead status never written to SQLite before the expensive API calls begin
- Batch restart always starts from lead index 0

**Prevention:**
- Write lead status to SQLite as the first operation: `UPDATE leads SET status='processing', started_at=NOW()` before any API call.
- At batch start, query for `status='processing'` leads older than N minutes (timeout threshold) and reset them to `status='pending'` — handles crashed mid-leads.
- Never re-run a lead with `status='complete'` or `status='failed'` unless explicitly re-queued.
- Structure each lead's pipeline as idempotent: check if screenshot exists on disk before calling Playwright; check if Claude output is cached before calling the API; check if Vercel URL is stored before deploying.
- Implement a `run_id` per batch. Store it with each lead. Dashboard can filter by run.

**Phase/component:** Batch scheduler and SQLite schema — design idempotency into the data model before writing any pipeline code.

---

### Pitfall 4: Vercel Free Tier Project Limit

**What goes wrong:** Vercel's free Hobby plan has a limit on the number of projects (100 as of training knowledge). A daily batch that creates 30–50 new projects per day will hit this limit within days. Subsequent `vercel --prod` calls fail with an API error. The batch dies on every deploy step.

**Why it happens:** Each lead gets its own Vercel project to produce a unique URL. This is clean architecturally but accumulates fast. The limit isn't surfaced during development (only a few test projects exist).

**Consequences:** Entire deploy phase becomes inoperable. All leads processed that day produce no URL. The dashboard shows "deploy_failed" for the entire run. Revenue-generating output stops.

**Warning signs:**
- No project cleanup strategy defined
- No monitoring of project count against quota
- First production batch with real volume

**Prevention:**
- **Before launch:** Verify current Vercel project limits by checking the Vercel dashboard settings page. This limit may have changed since training data.
- Implement a project rotation strategy: after a project is X days old and the lead has been actioned (sent/archived), delete the project via `vercel rm --yes [project-name]`.
- Name projects with a predictable pattern (`bwa-[lead-id]-[timestamp]`) so they can be programmatically listed and pruned.
- Add a pre-deploy check: query Vercel API for current project count. If within 10 of the limit, pause batch and alert operator.
- Consider whether all redesigns need to stay live indefinitely, or whether a 7-day expiry is acceptable — most sales cycles close in under a week.
- Evaluate Vercel Pro if volume justifies it (higher project limits, no cold-start issues).

**Phase/component:** Vercel deploy skill — implement project naming, tracking, and cleanup in the same phase as deploy, not later.

---

### Pitfall 5: Claude API Cost Explosion in Large Batches

**What goes wrong:** Each lead requires: (1) a screenshot image sent to Claude Vision for qualification, (2) a full HTML generation prompt. Vision calls with large images are expensive. HTML generation with a long system prompt + site context can exceed 4,000 output tokens per lead. At 50 leads/day, costs compound quickly.

**Why it happens:** Development testing uses 5–10 leads. Costs look trivial. The jump to 50–100 leads/day is not modeled before going live. No per-run cost tracking exists, so overruns go unnoticed until the billing notification.

**Consequences:** A 100-lead batch can cost $5–$15+ depending on image sizes and output length — easily $150–$450/month. Without guardrails, a bug causing re-runs can multiply this.

**Warning signs:**
- No cost estimation before each batch
- No per-lead token tracking stored in SQLite
- Prompts that ask Claude to "be thorough" or "include all sections" without output length bounds
- Images sent at full resolution without downscaling

**Prevention:**
- **Image size:** Resize screenshots to maximum 1280px wide before sending to Claude Vision. A full-resolution 1920x1080 PNG can be 500 KB+; a resized JPEG at 1280px is typically under 150 KB. Cost is proportional to image tokens.
- **Output tokens:** Set `max_tokens` on every Claude API call. For HTML generation, 3000–4000 tokens is sufficient for a single-file redesign. Do not leave this unbounded.
- **Prompt efficiency:** The system prompt for HTML generation should be concise. Every token in the system prompt is charged on every call. A 2,000-token system prompt on 50 leads = 100,000 prompt tokens before any actual generation.
- **Token logging:** After every API call, store `prompt_tokens` and `completion_tokens` from the response metadata in SQLite. This enables per-run cost analysis.
- **Batch cost cap:** Before starting a batch, estimate cost: `leads_count × average_cost_per_lead`. Add a hard cap: if estimated cost exceeds operator-defined limit, pause and confirm.
- **Caching qualification results:** If a lead's screenshot was taken within 48 hours and qualification status is already stored, skip the Vision call.

**Phase/component:** Claude API skill + batch scheduler — cost controls must be in the first working batch, not added later.

---

### Pitfall 6: Apify Data Quality — Dirty Leads Poisoning the Pipeline

**What goes wrong:** Apify's Google Maps scraper returns results that include: businesses with no website at all, businesses whose "website" field is a Facebook page, Google Business profile, or aggregator listing (Yelp, TripAdvisor), national chains that are clearly out of scope, and listings with no valid email. These dirty leads waste Playwright time, Claude tokens, and Vercel deploys.

**Why it happens:** The Apify actor returns everything that matches the search query. Filtering is left to the caller. Developers running small test batches may not see the full distribution of junk results.

**Consequences:** 20–40% of a batch may be non-actionable. Each dirty lead still costs Playwright time and potentially Claude tokens if filtering happens too late in the pipeline.

**Warning signs:**
- No lead validation step between Apify response and Playwright screenshot
- Website field not validated as an actual URL (not just presence)
- No exclusion list for known aggregators
- No check for chain indicators in business name

**Prevention:**
- **Validate website URL immediately after Apify response, before any other processing:**
  - Must start with `http://` or `https://`
  - Must not match a blocklist: `facebook.com`, `instagram.com`, `yelp.com`, `tripadvisor.com`, `booking.com`, `google.com`, `linkedin.com`, `twitter.com`, `youtube.com`
  - Must be resolvable (optional DNS check, but adds latency)
- **Filter national chains:** Build a keyword exclusion list for the business name: `McDonald's`, `Starbucks`, `Ikea`, etc. Also flag businesses with >3 locations listed in the Apify result.
- **Email validation:** Check for presence AND basic format. `info@domain.com` is more actionable than scraped from a category listing with no email field.
- **Filter as early as possible** — before any Playwright call. Cheap string operations before expensive I/O.
- **Log discard reasons** in SQLite per lead. This builds a dataset to refine filters over time.

**Phase/component:** Lead qualification/filtering module — implement immediately after the Apify scraping skill, as a separate validation step.

---

### Pitfall 7: Claude HTML Output Quality Inconsistency

**What goes wrong:** Claude generates HTML that looks good 70% of the time and produces weak, generic, or structurally broken output 30% of the time. The inconsistency is hard to detect automatically. Operator sends a bad-looking demo to a prospect. Credibility lost.

**Why it happens:** LLM outputs are probabilistic. Without strict output constraints (structure, sections, CSS requirements), the model takes shortcuts. Context about the target business is vague (just a screenshot and a name), so Claude defaults to generic templates. Long system prompts with vague instructions ("make it beautiful") produce variable results.

**Consequences:** Operator must manually review every output to catch weak ones — defeats the automation value proposition. Or, weak outputs are sent and damage conversion rate.

**Warning signs:**
- System prompt contains subjective adjectives without structural requirements
- No output validation step (checking that HTML is parseable, has minimum content length, includes a hero section)
- No screenshot of the generated HTML taken before presenting to operator
- No quality score or operator review flag

**Prevention:**
- **Structured output prompt:** Don't ask for "a beautiful website." Specify exact required sections: hero, services, about, contact. Specify CSS requirements: custom color scheme based on business type, minimum 3 sections, mobile-responsive meta viewport.
- **Constrain format strictly:** "Return ONLY a single HTML file. No markdown. No explanation. Start with `<!DOCTYPE html>`. End with `</html>`."
- **Include reference structure:** Provide a minimal scaffold in the prompt that Claude completes/customizes rather than generating from scratch. This reduces structural variance.
- **Automated quality checks after generation:**
  - HTML is parseable (try `new DOMParser().parseFromString(html, 'text/html')` — no parse errors)
  - Minimum length (< 2000 chars suggests something went wrong)
  - Presence of required tags: `<title>`, `<meta name="viewport">`, `<body>`
  - Does not contain Claude's conversational text (check for "Here is" or "I've created")
- **If quality check fails:** Retry once with a stricter prompt. If second attempt also fails, mark lead as `generation_failed` and skip deploy. Don't send bad output downstream.
- **Take a Playwright screenshot of the generated HTML** before presenting to operator. Render locally and capture. This is the fastest QA signal.

**Phase/component:** Claude generation skill — output validation is part of the skill, not a separate later phase.

---

### Pitfall 8: Dashboard State Divergence from Backend Reality

**What goes wrong:** The Next.js dashboard shows lead status, run progress, and Vercel URLs. But the backend batch process writes state to SQLite directly. The dashboard reads SQLite via API routes. If the polling interval is too long, or if the backend writes to SQLite at the end of each step rather than the beginning, the dashboard lags badly — showing 0/50 complete while the batch is actually 40/50 done.

**Why it happens:** Dashboard is typically built after the pipeline is working. State-writing discipline is established in the backend but the frontend polling is configured hastily. The "live status" feature becomes a post-hoc retrofit.

**Consequences:** Operator cannot trust the dashboard. Loses confidence in the system. May restart batches thinking they have stalled when they haven't.

**Warning signs:**
- Backend writes status only at job completion, not at each step transition
- Dashboard polling interval is 30s or longer
- No WebSocket or SSE — polling is the only update mechanism
- Dashboard API route queries the entire leads table on each poll

**Prevention:**
- **Write status at transition, not at completion:** When a lead moves from `pending → processing → screenshot_done → generated → deployed → complete`, write each transition immediately to SQLite. The dashboard then reflects real mid-batch progress.
- **Use Server-Sent Events (SSE) or a short polling interval (3–5s)** for the active run status endpoint. SSE from a Next.js API route is straightforward and eliminates the polling delay entirely.
- **Separate the "current run" state from "historical" state.** A live `runs` table row with `processed_count`, `failed_count`, `current_lead_id` updated atomically gives the dashboard a single row to query rather than aggregating the entire leads table on each tick.
- **Test the dashboard during a real batch run** (with a small batch of 5–10 leads) before deploying to production. The integration failure is invisible in unit testing.

**Phase/component:** Dashboard + SQLite schema — status transitions must be designed before the backend pipeline is written.

---

## Moderate Pitfalls

These cause technical debt, silent errors, or degraded output quality.

---

### Pitfall 9: Vercel CLI Auth Token Exposure

**What goes wrong:** The `VERCEL_TOKEN` used by `vercel --prod --token $VERCEL_TOKEN` is stored in a `.env` file, accidentally committed to git, or leaked in CI logs.

**Prevention:**
- Add `.env` and `.env.local` to `.gitignore` before the first commit.
- Use `dotenv` or Next.js environment variable loading — never hardcode the token.
- Rotate the token immediately if it appears in any log output.
- The Vercel CLI reads `VERCEL_TOKEN` from environment. In development, source it from `.env.local` (not `.env`) — Next.js does not expose `.env.local` to the browser build.

**Phase/component:** Project setup — day one, before any API credentials are added.

---

### Pitfall 10: SQLite Write Contention Under Concurrent Writes

**What goes wrong:** If the batch process ever becomes concurrent (multiple leads processing in parallel), SQLite's default journal mode causes `SQLITE_BUSY` errors when two processes attempt to write simultaneously. Even with a single process, if the Next.js API route reads the database while the batch is writing, SQLite may lock and the API route returns a 500.

**Why it happens:** SQLite is chosen for simplicity. Concurrency is added later as an optimization. The locking behavior is only discovered under load.

**Prevention:**
- Enable WAL (Write-Ahead Logging) mode on database initialization: `PRAGMA journal_mode=WAL`. This allows concurrent readers with a single writer, eliminating most contention.
- If parallelizing the batch: use a queue with controlled concurrency (e.g., `p-limit` with concurrency=3) rather than `Promise.all` on all 50 leads.
- Add retry logic with exponential backoff for `SQLITE_BUSY` errors in the batch runner.

**Phase/component:** Database initialization code — apply WAL mode on first connection.

---

### Pitfall 11: Vercel Cold Starts on Generated Sites

**What goes wrong:** The generated HTML files are deployed as static sites on Vercel. Static sites on Vercel's free tier may have cold starts on the first visit after inactivity. The prospect clicks the demo link and sees a slow load.

**Why it happens:** Free tier Vercel functions cold-start. However, for purely static HTML files (no serverless functions), Vercel CDN should serve them without cold starts. The issue arises if the deploy is configured with serverless routes unintentionally.

**Prevention:**
- Deploy the generated HTML as a static file only — no `vercel.json` that adds function routes.
- Verify the first load time after deploy programmatically: after deploy completes, make an HTTP GET to the URL and assert response time < 2s. Log it.
- Consider "warming" the URL immediately post-deploy with a programmatic fetch from the backend.

**Phase/component:** Vercel deploy skill — post-deploy verification step.

---

### Pitfall 12: Apify Actor Version Drift

**What goes wrong:** Apify actors (including the Google Maps scraper) are versioned. The actor used during development may not be the same version running months later if pinned to `latest`. Breaking changes in the actor's output schema (field renames, new required parameters) cause silent failures — the scraper returns data, but the `website` or `email` fields are in different locations.

**Prevention:**
- Pin the Apify actor to a specific version ID in the API call, not `latest`.
- After each Apify run, validate the response schema: assert that expected fields (`title`, `website`, `email`, `address`) are present in at least 80% of results. If the validation rate drops, alert and halt batch.
- Log the actor version used in each run's metadata in SQLite.

**Phase/component:** Apify scraping skill — pin version on first use.

---

## Minor Pitfalls

Annoyances that are fixable but slow down development.

---

### Pitfall 13: Vercel Project Naming Collisions

**What goes wrong:** `vercel --prod` requires a project name. If two leads produce the same project name (e.g., both have a business named "Café Central"), the second deploy overwrites the first or fails with a naming conflict.

**Prevention:** Generate project names from lead ID + a short slug of the business name + timestamp suffix: `bwa-{lead_id}-{slug}-{timestamp}`. Truncate to Vercel's 52-character project name limit. Store the exact name used in SQLite.

**Phase/component:** Vercel deploy skill.

---

### Pitfall 14: Playwright Screenshot on Redirect Chains

**What goes wrong:** Many business websites redirect through multiple hops (HTTP → HTTPS → www → non-www → CDN). Playwright follows redirects but the final URL may be different from what was scraped. If the final destination is a 404 or a parking page, the screenshot is useless.

**Prevention:** After `page.goto()`, check `page.url()` and `response.status()`. If status >= 400 or if the final URL domain differs significantly from the input URL (suggesting a parked domain), mark as `screenshot_failed` and skip.

**Phase/component:** Screenshot skill.

---

### Pitfall 15: Generated HTML Contains Hardcoded Placeholder Text

**What goes wrong:** Claude occasionally leaves template placeholders in generated HTML (`[Business Name]`, `[Phone Number]`, `[Your Address]`) if context about the business was incomplete. These placeholders appear in the live demo and look unprofessional.

**Prevention:**
- After generation, run a regex scan on the HTML for patterns like `\[.*?\]` or `{{.*?}}`. If found, either retry with more context or flag for operator review before deploy.
- Include business name, address, and any available details in the generation prompt, even if scraped from the Google Maps result.

**Phase/component:** Claude generation skill — post-generation validation.

---

## Phase-Specific Warnings

| Phase / Component | Likely Pitfall | Mitigation |
|-------------------|---------------|------------|
| Apify scraping skill | Dirty leads wasting all downstream resources | Validate lead data immediately post-scrape (Pitfall 6) |
| Screenshot skill | Hanging on anti-bot sites; memory leak | Hard timeouts + try/finally browser cleanup (Pitfalls 1, 2) |
| Claude qualification | Cost explosion from oversized images | Resize to 1280px before Vision call (Pitfall 5) |
| Claude HTML generation | Inconsistent output quality | Structured prompt + automated HTML validation (Pitfall 7) |
| Vercel deploy skill | Project limit hit; naming collision | Project counting + rotation + predictable naming (Pitfalls 4, 13) |
| Batch scheduler | Mid-run crash with no recovery | Idempotent pipeline with SQLite status gates (Pitfall 3) |
| SQLite schema | Write contention when concurrency added | WAL mode from day one (Pitfall 10) |
| Dashboard live view | State lag misleads operator | Write status at each transition, use SSE (Pitfall 8) |
| Project setup | Credential leak | .gitignore + .env.local before first commit (Pitfall 9) |
| Apify actor | Schema drift from version update | Pin actor version, validate response schema (Pitfall 12) |

---

## Sources

**Confidence level: HIGH** for Playwright behavior (memory management, timeout behavior, anti-bot patterns, `waitUntil` semantics) — these are core API behaviors well-documented in Playwright's official docs and stable across versions.

**Confidence level: HIGH** for Claude API token/cost structure and `max_tokens` behavior — Anthropic's billing model is straightforward and well-documented.

**Confidence level: MEDIUM** for Vercel free tier project limits — the 100-project limit was accurate as of training data (August 2025) but **must be verified against current Vercel pricing/limits page before launch**. Vercel changes pricing tiers regularly.

**Confidence level: MEDIUM** for Apify Google Maps scraper field schema — field names (`title`, `website`, `email`) reflect common Apify actor conventions but the exact schema depends on the specific actor version used. Verify against the actor's documentation page before building the validation layer.

**Confidence level: HIGH** for SQLite WAL mode behavior and write contention patterns — this is fundamental SQLite behavior unchanged for years.

**Verification action required before Phase 1:**
- Check current Vercel Hobby plan project limits at https://vercel.com/pricing
- Check current Apify Google Maps actor output schema at https://apify.com/compass/crawler-google-places
- Verify current Claude claude-sonnet-4-6 pricing per 1M tokens at https://www.anthropic.com/pricing
