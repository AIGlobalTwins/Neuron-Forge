# Feature Landscape

**Domain:** AI-powered web design outreach / lead generation automation system
**Project:** Beautiful Websites Agent
**Researched:** 2026-03-21
**Confidence note:** WebSearch unavailable. Analysis based on training knowledge (cutoff Aug 2025) combined with detailed PROJECT.md context. Confidence flagged per section.

---

## Table Stakes

Features users expect from a system like this. Missing any of these = system fails its stated purpose.

| Feature | Why Expected | Complexity | Confidence |
|---------|--------------|------------|------------|
| **Lead discovery via Google Maps scraper** | The pipeline starts here — no leads, nothing works | Low (Apify handles it) | HIGH |
| **Website filter: has website + email** | Scraping without filtering generates unqualified noise | Low (Apify actor config) | HIGH |
| **Screenshot capture of target site** | Visual qualification requires a real screenshot, not a guess | Medium (Playwright + headless) | HIGH |
| **Visual quality scoring of existing site** | Operator needs to know "is this site actually bad enough to pitch?" | Medium (Claude Vision prompt) | HIGH |
| **HTML single-file redesign generation** | The core deliverable — the "wow" that makes the outreach work | High (Claude API, prompt engineering) | HIGH |
| **Redesign reflects the real business** (name, colors, copy) | Generic redesigns = spam. Personalization is the value | High (context extraction pipeline) | HIGH |
| **Vercel deploy + live URL capture** | Without a live URL, there's no proof, the pitch collapses | Medium (Vercel CLI, URL persistence) | HIGH |
| **Email draft per lead** | The output that connects the system to human action | Medium (Claude API, template logic) | HIGH |
| **Run history / lead history view** | Operator must be able to review past results, re-access URLs | Low-Medium (SQLite + UI) | HIGH |
| **Per-lead status tracking** | Know which leads have been pitched, are pending, were qualified | Low (state machine in DB) | HIGH |
| **Batch execution (not just single lead)** | System only has ROI when running at volume | Medium (queue + orchestration) | HIGH |
| **Daily cron scheduler** | Manual triggering defeats the "wake up to a list" value prop | Low (node-cron or cron API route) | HIGH |

---

## Differentiators

Features users don't expect but that create delight or competitive advantage for the operator. These are what turn this from a script into a product.

| Feature | Value Proposition | Complexity | Confidence |
|---------|-------------------|------------|------------|
| **Agent graph view (force-directed)** | Visual proof that the system "thinks" — trust-building, demo-worthy | High (force-directed graph lib + live state) | HIGH |
| **Live agent status during run** ("Qualifying lead 3/20") | Operator can watch the batch run — reduces anxiety, increases trust | Medium (SSE or polling + step state) | HIGH |
| **Before/after visual diff in email draft** | The email literally shows old site vs new site — conversion driver | Medium (screenshot embed + Vercel URL) | HIGH |
| **Quality score visible on lead card** | Operator can sort leads by "how bad is their site" = better pitch selection | Low (score from Vision step, persisted) | HIGH |
| **"Why this lead" reasoning visible** | Claude's reasoning for qualifying = operator confidence + debugging | Low (persist Claude's qualification response) | MEDIUM |
| **One-click copy of email draft** | Friction reducer — 30 second review-to-send workflow depends on this | Low (UI only) | HIGH |
| **Redesign preview embedded in dashboard** | Operator sees the redesign before opening Vercel link | Low-Medium (iframe or screenshot of deployed page) | MEDIUM |
| **Filter/sort leads by status, quality, date** | Operational efficiency at 30+ leads/day | Low (query params + UI) | HIGH |
| **Retry failed steps per lead** | Scraper/deploy flakiness is inevitable — manual retry without full rerun | Medium (step-level retry logic) | MEDIUM |
| **Skill detail modal (Agent Kit sidebar)** | Transparency into what each agent step does — reduces black box fear | Low (UI panel, docs-as-UI) | HIGH (from PROJECT.md spec) |
| **Configurable batch size / target city** | Operator wants to target "Lisboa" today, "Porto" tomorrow | Low (config panel or .env) | MEDIUM |
| **Run summary stats** (X qualified, Y deployed, Z emails generated) | Dashboarding the ROI of each day's batch | Low (aggregate query) | HIGH |

---

## Anti-Features

Things to deliberately NOT build in v1. Each item here has a reason — these are temptations that will kill momentum or introduce risk.

| Anti-Feature | Why Avoid | What to Do Instead | Risk if Built |
|--------------|-----------|-------------------|---------------|
| **Automatic email sending** | GDPR/CAN-SPAM risk; deliverability fragility; conversion is actually better with human send | Deliver a polished draft, operator sends manually | Legal exposure + spam flags |
| **Email sending queue + scheduling** | Complexity of SMTP, bounce handling, unsubscribes, warming — entire sub-product | Not in scope until v2 validates the model | Months of infra for uncertain gain |
| **CRM integration** (HubSpot, Pipedrive) | Premature abstraction — you don't know the workflow until you've done 100 manual sends | Export CSV for now, build integration when workflow is proven | Over-engineering before validation |
| **Multi-user / team auth** | Auth is a product unto itself; v1 is single-operator | Hardcode single-user, no login required | 2 weeks of work for zero additional value in v1 |
| **Mobile responsive dashboard** | This is an operator tool used at a desk | Desktop-first dark UI is sufficient | Design debt, doubled CSS complexity |
| **Lead deduplication across weeks** | Nice to have, not blocking — operator remembers pitched leads | Minimal: track by domain, block re-scraping same URL | Overkill in v1 |
| **Custom redesign style selector** (minimalist vs bold vs etc.) | The value comes from Claude's consistent $5k look — style variance dilutes the brand | One strong, opinionated design system | Feature creep, prompt instability |
| **n8n / external orchestrator** | Adds external dependency, deployment complexity, webhook surface area | Backend orchestration in TypeScript API routes | Operational friction |
| **Lead scoring model training / ML** | Over-engineering — Claude Vision + a good prompt is sufficient signal | Use Claude Vision qualitative score | 3 months of work for marginal improvement |
| **Real-time collaboration** | Not needed — single operator | N/A | Auth + WebSocket complexity for no audience |
| **Public-facing client portal** (where client sees their redesign) | Feature scope explosion, auth needed, UX is a different product | Direct Vercel link shared by operator in their own email | Months of UX work, premature |
| **A/B testing email variants** | Premature — volume too low in v1 to get signal | Operator writes their own follow-up variations | Analytics complexity before baseline established |

---

## Feature Dependencies

```
Google Maps Scraper (Apify)
  └── produces: lead list (name, domain, email)
        └── Website Screenshot (Playwright)
              └── produces: screenshot PNG
                    └── Visual Quality Scoring (Claude Vision)
                          └── produces: quality_score, qualification_reason
                                └── [GATE: if score passes threshold]
                                      └── HTML Redesign Generation (Claude API)
                                            └── produces: redesign.html
                                                  └── Vercel Deploy (CLI)
                                                        └── produces: live_url
                                                              └── Email Draft (Claude API)
                                                                    └── produces: email_subject, email_body
                                                                          └── Stored in SQLite (run record)
                                                                                └── Dashboard display
```

**Key dependency note:** The qualification gate (quality score threshold) is critical. Without it, the system deploys redesigns for sites that don't need one, wasting Vercel deploy slots and generating low-conversion emails. The gate must exist even in v1.

**Parallelization opportunity:** Multiple leads can run through the pipeline concurrently after scraping. Playwright screenshots and Claude API calls are the bottlenecks — both benefit from concurrency (recommend 3-5 workers max to avoid rate limits).

---

## MVP Recommendation

For v1 (as scoped in PROJECT.md), prioritize in this order:

**Must ship (pipeline integrity):**
1. Apify scraper → lead list with domain + email
2. Playwright screenshot capture
3. Claude Vision quality scoring with gate
4. Claude API HTML single-file redesign
5. Vercel CLI deploy + URL capture
6. Claude API email draft generation
7. SQLite persistence of run + lead records
8. Batch orchestration with cron trigger

**Must ship (dashboard):**
9. Run history view with lead cards (status, quality score, Vercel URL, email draft)
10. Agent graph view with live step status during run
11. Linear workflow view (4-step indicator)
12. Sidebar Agent Kit panel with skill details
13. One-click copy for email draft

**Defer to post-v1:**
- Retry individual failed steps (acceptable to rerun full batch in v1)
- Configurable city/batch size via UI (acceptable as .env in v1)
- Redesign preview embedded in dashboard (Vercel URL is sufficient)
- Filter/sort leads beyond basic status (acceptable with small volumes in v1)

---

## Domain-Specific Notes

These are observations specific to web design outreach automation that don't fit cleanly in the table above.

**On visual quality scoring thresholds:**
The qualification gate needs a calibrated threshold. Too strict = very few leads, system underperforms. Too loose = too many low-quality pitches go out. In practice, operators using systems like this report that ~30-40% of scraped sites pass qualification — design the prompt and threshold with this in mind. This is best tuned empirically after the first 2-3 batch runs. Confidence: MEDIUM (based on analogous scraping + outreach systems).

**On HTML single-file redesign quality:**
The redesign must genuinely look like a $5k project. This is non-negotiable for conversion. Tricks that reliably work: embed a Google Font via CDN link in the HTML, use a dark or premium color palette extracted from the original brand, include real business copy (not lorem ipsum), and add micro-animations via inline CSS keyframes. The HTML file must be entirely self-contained (no external JS dependencies that could break). Confidence: HIGH (this is the core Claude API use case, well-documented in community examples through mid-2025).

**On Vercel CLI single-file deploy:**
Vercel CLI can deploy a single static HTML file via `vercel --prod`. Each deploy gets a unique URL (e.g., `redesign-abc123.vercel.app`). Important: without a `vercel.json` or project configuration, each deploy creates a new project — this is the desired behavior (one project per lead redesign). The URL is permanent as long as the Vercel account is active. Confidence: HIGH (Vercel CLI behavior is stable and well-documented).

**On email draft personalization:**
The highest-converting email format in this domain includes: (1) a compliment on something specific about the business, (2) a direct "I noticed your website..." observation, (3) a link to the live redesign with zero friction ("click here to see how it could look"), (4) a soft CTA ("happy to chat for 15 min"). The before/after framing is the killer feature — it's concrete proof, not a promise. Confidence: MEDIUM (based on community discussions and analogous cold outreach patterns through training cutoff).

**On Google Maps scraping via Apify:**
The Apify Google Maps Scraper actor supports filtering by business category, location, and presence of website. The email extraction is not always reliable — many Google Maps listings don't surface emails directly, requiring the scraper to visit the listed website and extract contact info from there. This two-step extraction (Maps → website contact page) is a known friction point and should be expected: ~60-70% of leads with a listed website will yield a contactable email. Design the pipeline to handle missing-email leads gracefully (store them, skip email draft). Confidence: MEDIUM (Apify actor behavior as of training cutoff; verify against current Apify docs).

---

## Sources

- PROJECT.md (authoritative scope document for this project)
- Training knowledge: Apify Google Maps Scraper actor behavior (through Aug 2025) — MEDIUM confidence
- Training knowledge: Vercel CLI single-file deploy patterns — HIGH confidence
- Training knowledge: Cold outreach / web design prospecting automation patterns (community, YouTube, GitHub through Aug 2025) — MEDIUM confidence
- Training knowledge: Claude Vision API for visual scoring use cases — HIGH confidence
- WebSearch: unavailable during this research session — no live sources consulted
