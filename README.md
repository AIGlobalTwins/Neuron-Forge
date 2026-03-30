# Neuron Forge

**Neuron Forge** is an AI-powered multi-agent platform for businesses. Each agent is an autonomous tool that solves a specific business problem — from generating professional websites to automating customer support on WhatsApp.

All agents are powered by **Claude** (Sonnet / Opus / Haiku — selectable per request) and built on **Next.js 14 App Router**.

---

## Agents

| Agent | Description |
|---|---|
| [Analyze & Redesign](docs/agents/analyze-redesign.md) | Screenshots an existing website, scores the design, and generates a modern redesign |
| [Create from Google Maps](docs/agents/create-from-maps.md) | Builds a full website from a Google Maps business profile |
| [Instagram Posts](docs/agents/instagram-posts.md) | Generates captions, hashtags and image prompts for Instagram, with direct publishing |
| [WhatsApp Agent](docs/agents/whatsapp-agent.md) | Creates a 24/7 AI customer support agent for WhatsApp Business |
| [Consulting Agent](docs/agents/consulting-agent.md) | Diagnoses business problems, builds action plans, and exports professional PDF reports |
| [SEO Content Agent](docs/agents/seo-agent.md) | Generates blog articles, meta tags, landing page copy and FAQs optimised for search engines |
| [Security Agent](docs/security-agent.md) | Passive security audit — analyses HTTP headers, inline JS, forms, comments and exposed paths, exports a PDF report |

More agents are continuously added. See [Adding a New Agent](docs/ADDING-AGENT.md).

---

## Stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **AI:** Anthropic Claude 4.6 — Sonnet, Opus, Haiku (Vision + Text, model selectable per request)
- **Auth:** Clerk (optional — gracefully skipped when keys are absent)
- **Photos:** Curated Unsplash catalog per business category (hero + content arrays); uploaded photos take priority for hero
- **Browser automation:** Playwright (screenshots, HTML/CSS extraction, PDF generation)
- **Storage:** Local filesystem (`data/`) — settings, bot configs, conversation history
- **Deploy:** Vercel

---

## Getting Started

```bash
npm install
npx playwright install chromium
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required

Set your Anthropic API key in **Settings** (top-right wrench icon) or in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional

```
VERCEL_TOKEN=...          # Auto-deploy generated websites to Vercel
INSTAGRAM_TOKEN=...       # Instagram Business access token
INSTAGRAM_ACCOUNT_ID=...  # Instagram Business account ID
WHATSAPP_PHONE_NUMBER_ID= # WhatsApp Business phone number ID
WHATSAPP_ACCESS_TOKEN=... # WhatsApp Business access token
WHATSAPP_VERIFY_TOKEN=... # Webhook verify token

# Clerk authentication (optional — app works without it)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

All credentials can also be set via the Settings modal in the UI — no `.env.local` required.

Clerk auth is entirely optional: the app runs without it. When valid Clerk keys are present, sign-in/sign-up pages are enabled and API routes are protected.

---

## Project Structure

```
app/
  page.tsx                      # Homepage — all agent cards
  sign-in/[[...sign-in]]/       # Clerk sign-in page (active when Clerk keys present)
  sign-up/[[...sign-up]]/       # Clerk sign-up page (active when Clerk keys present)
  api/
    analyze/                    # Analyze & Redesign agent
    create-from-maps/           # Google Maps → full website (two-pass, Lovable-quality)
    social-posts/               # Instagram Posts agent
    instagram-publish/          # Instagram direct publish
    whatsapp/
      webhook/                  # WhatsApp incoming messages + Claude reply
      configure/                # Bot config CRUD
      status/                   # Bot status + conversation log
    consulting/
      questions/                # Dynamic question generation
      plan/                     # Consulting plan generation
      pdf/                      # Playwright PDF export
    seo/                        # SEO Content Agent (blog, meta, landing, faq, service)
    security/                   # Security Agent (passive audit)
      pdf/                      # Playwright PDF export for security report
    settings/                   # App-wide settings CRUD
    preview/[id]/               # Serve generated HTML files

components/
  AnalyzeModal.tsx
  GoogleMapsModal.tsx
  SocialPostsModal.tsx
  WhatsAppModal.tsx
  ConsultingModal.tsx
  SeoModal.tsx
  SecurityModal.tsx
  SettingsModal.tsx
  HistoryModal.tsx              # Generation history (localStorage)
  DocsModal.tsx                 # In-app documentation
  OnboardingModal.tsx           # First-run API key setup
  DemoModal.tsx                 # Demo mode (no API key required)

lib/
  settings.ts                   # Read/write all credentials (getAnthropicKey, getClaudeModel)
  history.ts                    # Client-side generation history (localStorage)
  whatsapp-bot.ts               # Bot config, conversation history, system prompt builder
  vercel-deploy.ts              # Deploy HTML to Vercel

data/
  settings.json                 # Stored credentials (gitignored)
  forge-tools.md                # Forge agent registry — read by Consulting Agent
  whatsapp-bot.json             # WhatsApp bot configuration
  whatsapp-history/             # Per-number conversation history

outputs/
  redesigns/                    # Generated HTML files

docs/
  agents/                       # Per-agent documentation
  ADDING-AGENT.md               # Guide for adding new agents
  ARCHITECTURE.md               # Platform architecture overview
```

---

## Documentation

- [Platform Architecture](docs/ARCHITECTURE.md)
- [Adding a New Agent](docs/ADDING-AGENT.md)
- [Analyze & Redesign](docs/agents/analyze-redesign.md)
- [Create from Google Maps](docs/agents/create-from-maps.md)
- [Instagram Posts Agent](docs/agents/instagram-posts.md)
- [WhatsApp Agent](docs/agents/whatsapp-agent.md)
- [Consulting Agent](docs/agents/consulting-agent.md)
- [SEO Content Agent](docs/agents/seo-agent.md)
- [Security Agent](docs/security-agent.md)

---

## Repo

[github.com/AIGlobalTwins/Neuron-Forge](https://github.com/AIGlobalTwins/Neuron-Forge)
