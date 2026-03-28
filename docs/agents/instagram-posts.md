# Instagram Posts Agent

**Type:** Generation + Publishing
**Status:** Active

## What it does

Generates professional Instagram captions, hashtags, and image prompts tailored to the business category and desired tone. Optionally publishes directly to a connected Instagram Business account via the Meta Graph API.

## User Flow

1. **Connect step** — if not yet connected, user provides Instagram Access Token + Business Account ID (saved to settings)
2. **Form step** — user fills in: business name, category, description, post type, tone, number of posts (1–3)
3. Claude generates the requested posts
4. **Result step** — user sees caption + hashtags + image prompt for each post; can copy or publish directly
5. To publish: user pastes an image URL → agent creates media container → publishes via Graph API

## API Routes

- `POST /api/social-posts` — Claude generates post captions and hashtags
- `POST /api/instagram-publish` — publishes to Instagram via Meta Graph API

## Inputs — Generation

| Field | Type | Required | Description |
|---|---|---|---|
| `businessName` | string | Yes | Name of the business |
| `category` | string | Yes | Business category |
| `description` | string | Yes | Brief description and differentiators |
| `postType` | string | Yes | `novidade`, `promocao`, `testemunho`, `dica`, `lancamento` |
| `tone` | string | Yes | `casual`, `profissional`, `criativo`, `inspiracional` |
| `count` | number | No | Number of posts to generate (1–3, default 1) |

## Inputs — Publishing

| Field | Type | Required | Description |
|---|---|---|---|
| `caption` | string | Yes | Full caption including hashtags |
| `imageUrl` | string | Yes | Publicly accessible image URL |

## Output — Generation

```json
{
  "posts": [
    {
      "caption": "Full post text...",
      "hashtags": "#tag1 #tag2 ...",
      "imagePrompt": "Photorealistic image description for Canva/AI"
    }
  ]
}
```

## Credentials Required

- `ANTHROPIC_API_KEY` — required for generation
- `INSTAGRAM_TOKEN` — Meta Graph API access token (scopes: `instagram_basic`, `instagram_content_publish`)
- `INSTAGRAM_ACCOUNT_ID` — Instagram Business Account ID

All credentials configurable via Settings modal or `.env.local`.

## Token Usage

**Strategy:** Single pass
**max_tokens:** 2 000

## Key Files

- `components/SocialPostsModal.tsx`
- `app/api/social-posts/route.ts`
- `app/api/instagram-publish/route.ts`

## Instagram API Notes

- Instagram Graph API **requires an image** for every feed post — text-only posts are not supported
- Account must be an **Instagram Business** or Creator account (not personal)
- Uses Graph API v19.0 two-step publish: `POST /{account-id}/media` → `POST /{account-id}/media_publish`
- Free tier: 1 000 API calls/day
