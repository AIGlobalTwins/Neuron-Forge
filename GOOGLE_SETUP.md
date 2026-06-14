# Connecting Google accounts

The platform connects Google accounts through one OAuth 2.0 app. A user grants
scopes for the products they want; the refresh token is stored per user
(`data/users/{id}/settings.json`, gitignored) and access tokens are minted on
demand.

There are two independent things:

1. **Login with Google** — handled by Clerk, no code here.
2. **Connecting Google APIs** (Business Profile, Ads, Analytics, Search Console)
   — handled by the OAuth flow in this repo.

---

## 1. Login with Google (Clerk)

Clerk is already wired (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`).

1. Clerk dashboard → **User & Authentication → Social Connections**.
2. Enable **Google**. For production, add your own Google OAuth credentials there
   (dev uses Clerk's shared credentials automatically).
3. Done — the sign-in/up pages (`/sign-in`, `/sign-up`) show "Continue with Google".

No code change needed.

---

## 2. Connect Google APIs (OAuth)

### A. Create the OAuth app (once)

1. [console.cloud.google.com](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → OAuth consent screen**:
   - User type: External. Fill app name, support email, developer email.
   - Add the scopes you need (see table below). While in "Testing", add your
     Google account under **Test users**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URI**: `https://YOUR_DOMAIN/api/google/callback`
     (local dev: `http://localhost:3000/api/google/callback`).
   - Copy the **Client ID** and **Client Secret**.
4. **APIs & Services → Library**: enable the APIs you'll use:
   - Business Profile: "My Business Account Management API" (+ Business Information API)
   - Ads: "Google Ads API"
   - Analytics: "Google Analytics Data API" (GA4)
   - Search Console: "Google Search Console API"

### B. Add credentials to the platform

Either:
- **Settings modal → Google accounts** → paste Client ID + Client Secret, or
- env (`.env.local`): `GOOGLE_CLIENT_ID=...`, `GOOGLE_CLIENT_SECRET=...`
  (env takes precedence). Optionally `APP_URL=https://yourdomain` so the redirect
  URI is correct behind a proxy.

### C. Connect

Settings modal → pick products → **Connect Google** → consent → redirected back
with `?google=connected`. The connection (email + granted scopes) shows in
Settings; **Disconnect** clears the tokens.

### Scopes per product

| Product         | Scope                                                    | Extra approval |
|-----------------|----------------------------------------------------------|----------------|
| Login           | `openid email profile`                                   | none           |
| Business Profile| `.../auth/business.manage`                               | Google quota request (Business Profile APIs are allowlisted) |
| Google Ads      | `.../auth/adwords`                                        | **Developer token** + Basic Access approval in the Ads API Center |
| Analytics (GA4) | `.../auth/analytics.readonly`                            | none (just enable API) |
| Search Console  | `.../auth/webmasters.readonly`                          | none (just enable API) |

> Analytics and Search Console work as soon as the API is enabled and the user
> consents. **Business Profile** and **Google Ads** additionally require Google
> to approve quota / a developer token before live calls succeed — request these
> in the Cloud Console / Ads API Center.

---

## Architecture (where things live)

- `lib/google.ts` — scopes, auth URL, code exchange, token refresh, `getGoogleAccessToken(userId)`.
- `app/api/google/connect/route.ts` — starts consent (CSRF nonce cookie).
- `app/api/google/callback/route.ts` — exchanges the code, stores the refresh token.
- `lib/settings.ts` — `getGoogleConnection` / `saveGoogleConnection` / `clearGoogleConnection`, app-cred getters.
- `components/SettingsModal.tsx` — the Google accounts UI.

To consume a connected account from an agent:

```ts
import { getGoogleAccessToken } from "@/lib/google";
const token = await getGoogleAccessToken(userId);
const res = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
  headers: { Authorization: `Bearer ${token}` },
});
```

Tokens are never sent to the client; the client secret stays on the server.
