# Create from Google Maps

**Type:** Generation
**Status:** Active

## What it does

Builds a complete professional website from scratch using only a Google Maps business URL and optional photos. The agent extracts business info from the Maps profile, analyses uploaded photos with Claude Vision to derive brand colours and personality, then generates a full single-page website.

## User Flow

1. User pastes a Google Maps business URL
2. User uploads 1–5 photos of the business (optional but recommended)
3. Agent extracts: business name, address, phone, category, rating, opening hours from Maps
4. Claude Vision analyses each photo to extract colour palette and visual personality
5. Claude generates the website in two passes (Part 1: HEAD + NAV + HERO + SERVICES; Part 2: WHY US + TESTIMONIALS + CONTACT + FOOTER)
6. Result is displayed in an iframe preview
7. Optional: deploy to Vercel

## API Routes

- `POST /api/create-from-maps` — full pipeline: Maps extraction → photo analysis → two-pass generation → save → optional deploy

## Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `mapsUrl` | string | Yes | Google Maps business URL |
| `photos` | string[] | No | Base64-encoded photos (max 5) |
| `instructions` | string | No | Free-text instructions for the design |

## Output

```json
{
  "id": "uuid",
  "businessName": "...",
  "deployUrl": "https://xxx.vercel.app",
  "htmlSize": 38000
}
```

Generated HTML saved to `outputs/redesigns/maps_{id}.html`.

## Credentials Required

- `ANTHROPIC_API_KEY` — required
- `VERCEL_TOKEN` — optional

## Token Usage

**Strategy:** Two-pass generation
**Part 1 max_tokens:** 4 000 — `<!DOCTYPE html>` through SERVICES section
**Part 2 max_tokens:** 4 000 — WHY US through `</html>`
**Combined:** `part1 + "\n" + part2` → `fixHtml()`

Two-pass is necessary because the Maps flow carries more context (extracted Maps data + photo analysis results) leaving less room for HTML generation in a single call.

## Key Files

- `components/GoogleMapsModal.tsx`
- `app/api/create-from-maps/route.ts`

## Photo Analysis

Uploaded photos are analysed by Claude Vision to extract:
- Dominant and accent colours (as hex)
- Visual mood / personality (warm, clinical, rustic, modern, etc.)
- Suggested design direction

Photos are **not embedded** in the generated HTML — Unsplash stock images are used for visual placeholders. The photo analysis only informs the colour palette and tone.

## Category-Aware CTAs

CTAs adapt to business category via `getCategoryMeta(category)`:

| Category | Primary CTA | Secondary CTA |
|---|---|---|
| Restaurant / Café | Reservar Mesa | Ver Menu |
| Beauty / Barber | Marcar Serviço | Ver Serviços |
| Health / Dental | Marcar Consulta | Ver Tratamentos |
| Fitness | Experimentar Grátis | Ver Planos |
| Hotel | Reservar Quarto | Ver Quartos |
| Legal | Consulta Gratuita | Ver Áreas |
| Default | Contactar-nos | Ver Serviços |
