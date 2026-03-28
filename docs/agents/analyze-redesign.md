# Analyze & Redesign

**Type:** Generation
**Status:** Active

## What it does

Takes any existing business website URL, screenshots it with Playwright, extracts the HTML/CSS source, analyses the design with Claude Vision, scores it 1–10, and generates a complete modern redesign as a standalone HTML file using Tailwind CDN.

## User Flow

1. User pastes a website URL + optional business name, category, and custom instructions
2. Agent screenshots the page, crawls up to 5 sub-pages, and extracts HTML/CSS source
3. Claude Vision analyses the screenshot + source code to extract: colours, fonts, services, CTAs, contact info, brand personality
4. Claude generates a full redesign (8 000 tokens, single pass)
5. User sees the before/after side-by-side with design score
6. Optional: deploy to Vercel with one click

## API Routes

- `POST /api/analyze` — full pipeline: screenshot → crawl → vision analysis → redesign generation → save → optional Vercel deploy

## Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Full URL of the website to analyse |
| `name` | string | No | Business name override |
| `category` | string | No | Business category (e.g. "Dental Clinic") |
| `instructions` | string | No | Free-text instructions for the redesign |
| `address` | string | No | Override for physical address |
| `phone` | string | No | Override for phone number |
| `email` | string | No | Override for email |

## Output

```json
{
  "id": "uuid",
  "score": 6,
  "reasoning": "Two sentences on current design quality",
  "screenshotBase64": "...",
  "palette": "#hex / #hex",
  "analysis": { "businessName": "", "tagline": "", "services": [], "pagesFound": [], "colors": {} },
  "htmlSize": 42000,
  "deployUrl": "https://xxx.vercel.app"
}
```

Generated HTML is saved to `outputs/redesigns/analyze_{id}.html` and served via `/api/preview/{id}`.

## Credentials Required

- `ANTHROPIC_API_KEY` — required
- `VERCEL_TOKEN` — optional, enables one-click deploy

## Token Usage

**Strategy:** Single pass
**max_tokens:** 8 000
**Vision call:** 1 024 tokens (analysis only)

HTML generation is single-pass because the Analyze flow has less dynamic content than Maps. Uses Tailwind CDN — never `<style>` blocks.

## Key Files

- `components/AnalyzeModal.tsx`
- `app/api/analyze/route.ts`

## Source Extraction

Beyond screenshot, the agent extracts from the live DOM:
- Meta description
- Google Fonts / font-face hints
- CSS custom properties from `:root`
- Inline `<style>` tag contents (truncated to 1 200 chars)
- Body HTML structure (first 2 000 chars)

This gives Claude precise colour and typography data rather than guessing from the screenshot alone.
