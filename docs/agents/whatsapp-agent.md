# WhatsApp Agent

**Type:** Automation
**Status:** Active

## What it does

Creates a 24/7 AI customer service agent for a WhatsApp Business number. The agent responds automatically to incoming messages using Claude, with a fully configurable knowledge base: business info, services, opening hours, FAQs, personality, and language. Conversation history is maintained per phone number for contextual replies.

## User Flow

1. **Connect step** — user provides Phone Number ID, Access Token, and Verify Token (auto-generated)
2. **Configure step** — user sets agent name, business info, services list, FAQ builder (Q&A pairs), personality, language, and fallback message
3. **Webhook step** — user copies the Callback URL and Verify Token into Meta Dashboard; activates the `messages` webhook field
4. **Live step** — agent is active; dashboard shows status, toggle on/off, and recent conversations

## API Routes

- `GET /api/whatsapp/webhook` — Meta webhook verification (hub.challenge response)
- `POST /api/whatsapp/webhook` — receives incoming messages, calls Claude, sends reply
- `GET /api/whatsapp/configure` — returns current bot config
- `POST /api/whatsapp/configure` — saves credentials and/or bot config
- `GET /api/whatsapp/status` — returns active status + recent conversation log

## Webhook Flow

```
WhatsApp customer sends message
        ↓
Meta → POST /api/whatsapp/webhook
        ↓
Load bot config + conversation history (last 20 messages)
        ↓
Claude Sonnet (system prompt built from config)
        ↓
POST /{phone-number-id}/messages → reply sent
        ↓
Append to conversation history file
```

## Bot Configuration

| Field | Type | Description |
|---|---|---|
| `agentName` | string | Display name of the agent |
| `businessName` | string | Business name |
| `category` | string | Business category |
| `description` | string | Business description |
| `hours` | string | Opening hours |
| `services` | string[] | List of services/products |
| `faqs` | `{question, answer}[]` | FAQ pairs (unlimited) |
| `personality` | string | `simpático`, `profissional`, `direto`, `descontraído` |
| `language` | string | `pt`, `en`, `es` |
| `fallback` | string | Message when Claude doesn't know the answer |
| `active` | boolean | Whether the agent is responding |

## Credentials Required

- `ANTHROPIC_API_KEY` — required
- `WHATSAPP_PHONE_NUMBER_ID` — from Meta Business Manager → WhatsApp → API Setup
- `WHATSAPP_ACCESS_TOKEN` — long-lived token from Meta Developer Console
- `WHATSAPP_VERIFY_TOKEN` — any string; must match what's set in Meta Dashboard

## Token Usage

**Strategy:** Single pass with conversation history
**max_tokens:** 400 (keeps replies concise for WhatsApp)
**History:** Last 20 messages per phone number, stored in `data/whatsapp-history/{number}.json`

## Key Files

- `components/WhatsAppModal.tsx`
- `app/api/whatsapp/webhook/route.ts`
- `app/api/whatsapp/configure/route.ts`
- `app/api/whatsapp/status/route.ts`
- `lib/whatsapp-bot.ts` — config I/O, history I/O, system prompt builder

## Deployment Note

The webhook endpoint must be **publicly accessible**. Options:
- **Production:** Deploy to Vercel — webhook URL is `https://your-domain.vercel.app/api/whatsapp/webhook`
- **Development:** Use [ngrok](https://ngrok.com) to tunnel localhost — `ngrok http 3000`

## Data Storage

```
data/
  whatsapp-bot.json           # Bot configuration
  whatsapp-history/
    {phone-number}.json       # Per-number conversation history (last 40 messages kept)
```
