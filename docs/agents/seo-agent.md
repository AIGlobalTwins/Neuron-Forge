# SEO Content Agent

**Type:** Generation
**Status:** Active

## What it does

Generates SEO-optimized content for businesses in 5 formats. Takes business info, target keywords, tone, and language as input and produces structured content with keyword analysis, SEO tips, and word count — ready to publish or hand off to a client.

## User Flow

1. **Form step** — user selects content type, fills business info, optional keywords and audience, tone, language
2. Claude generates structured content based on type
3. **Result step** — sections displayed with individual copy buttons + keyword sidebar + SEO tips
4. User copies sections or downloads full content as `.txt`

## Content Types

| Type | Output | Tokens |
|---|---|---|
| **Artigo de Blog** | Meta title/desc, intro, 3× H2 sections, conclusion, slug, alt text | 3 000 |
| **Landing Page Copy** | H1, subheadline, value prop, 3 benefits, social proof, CTA, meta tags | 2 500 |
| **Meta Tags** | Title tag, meta desc, OG tags, keyword list, long-tail keywords, schema type, alt text template | 2 000 |
| **FAQs** | 7 Q&A pairs optimized for featured snippets + JSON-LD schema ready to paste | 2 000 |
| **Descrição de Serviços** | Homepage copy, 3 service descriptions, About Us, tagline | 2 000 |

## API Route

- `POST /api/seo` — generates content for selected type

### Request body

```json
{
  "contentType": "blog | landing | meta | faq | service",
  "businessName": "string (required)",
  "category": "string",
  "description": "string",
  "targetAudience": "string",
  "keywords": "comma-separated string",
  "tone": "professional | friendly | inspirational | direct",
  "language": "pt | en | es"
}
```

### Response

```json
{
  "type": "blog",
  "sections": [{ "title": "Meta Title", "content": "..." }],
  "seoTips": ["tip 1", "tip 2"],
  "keywords": ["kw1", "kw2"],
  "wordCount": 350
}
```

## Credentials Required

- `ANTHROPIC_API_KEY` — required

## Key Files

- `components/SeoModal.tsx`
- `app/api/seo/route.ts`
- `lib/demo-data.ts` — `DEMO_SEO` export for demo mode
