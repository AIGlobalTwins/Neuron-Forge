# Consulting Agent

**Type:** Analysis + Generation
**Status:** Active

## What it does

An intelligent business consulting agent that diagnoses problems through adaptive questioning and produces a structured, actionable consulting plan. The plan can be exported as a professional PDF. When relevant, the agent recommends other Neuron Forge tools as part of the solution.

## User Flow

1. **Topic step** — user selects consulting area (8 options) and describes the problem in free text
2. Claude generates 7 targeted diagnostic questions specific to the area + problem described
3. **Questions step** — user answers via text, 1–10 scale, or multiple choice depending on question type
4. Claude builds a full structured plan from the answers
5. **Plan step** — plan displayed with 5 sections; Forge tools recommended inline when relevant
6. User downloads a professional PDF report (Playwright renders HTML → PDF)

## Consulting Areas

Strategy · Marketing · Operations · Finance · Human Resources · Technology · Product · Sales

## API Routes

- `POST /api/consulting/questions` — generates 7 adaptive diagnostic questions
- `POST /api/consulting/plan` — generates full consulting plan from answers
- `POST /api/consulting/pdf` — renders plan as PDF via Playwright

## Plan Structure

| Section | Content |
|---|---|
| **Executive Summary** | 2–3 sentence overview of problem and solution direction |
| **Diagnosis** | Root causes identified from the answers |
| **Objectives** | 3–5 SMART objectives |
| **Action Plan** | Tasks grouped by phase, with owner and timing |
| **KPIs** | Metrics and targets (minimum 4) |
| **Risks & Mitigations** | Top 3 risks with mitigation strategies |
| **Forge Tools** | Relevant Neuron Forge agents recommended (0–2 max) |

## Forge Tools Integration

The plan API reads `data/forge-tools.md` at runtime and injects it into the Claude prompt. Claude decides which tools (if any) are genuinely relevant to the diagnosed problem.

**To add a new Forge tool to the Consulting Agent's awareness:** add an entry to `data/forge-tools.md` — no code changes needed.

Each recommended tool appears with:
- Tool name
- Specific reason tied to the diagnosed problem
- "Abrir →" button that closes Consulting and opens the relevant tool directly

## Question Types

| Type | UI | When used |
|---|---|---|
| `text` | Textarea | Open-ended qualitative answers |
| `scale` | Range slider 1–10 | Quantitative assessments |
| `choice` | 2×2 button grid | Multiple choice with 4 options |

## PDF Export

Playwright renders a styled HTML report to A4 PDF:
- Dark cover page with area, title, and date
- Executive summary in a branded call-out box
- All 5 plan sections with tables, grids, and lists
- Forge Tools section with dark background (when applicable)
- Forge branding in footer

## Credentials Required

- `ANTHROPIC_API_KEY` — required

## Token Usage

| Call | max_tokens | Notes |
|---|---|---|
| Questions generation | 1 500 | 7 questions with type metadata |
| Plan generation | 3 000 | Full structured plan as JSON |
| PDF | — | Playwright render, no Claude call |

## Key Files

- `components/ConsultingModal.tsx`
- `app/api/consulting/questions/route.ts`
- `app/api/consulting/plan/route.ts`
- `app/api/consulting/pdf/route.ts`
- `data/forge-tools.md` — agent registry (update this to add tools)
