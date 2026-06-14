# Deploy (Render)

This app uses **Playwright/chromium** (screenshots + Google Maps scraping), so it
needs a real container — not Vercel serverless. Render (or Railway/Fly) is the fit.
The generated *websites* still auto-deploy to Vercel separately (`lib/vercel-deploy`).

## One-time deploy

1. Push the repo to GitHub (already done).
2. [render.com](https://render.com) → **New → Blueprint** → select this repo.
   Render reads `render.yaml` and creates the Docker web service + a 1GB disk
   mounted at `/app/data`.
3. In the service **Environment**, set the secret vars (marked `sync:false`):
   - `ANTHROPIC_API_KEY` (required — or leave empty and set it per user in Settings)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional — Google connections)
   - `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (optional — login)
   - `VERCEL_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN` (optional)
   - `UNSPLASH_ACCESS_KEY` (recommended — modern, relevant website images; free at
     unsplash.com/developers). `PEXELS_API_KEY` optional fallback. Without either,
     image sourcing falls back to slower browser scraping with lower relevance.
4. Deploy. First build is slow (~3–5 min: image + chromium + `next build`).

## After it's live

- URL: `https://<service>.onrender.com`.
- **Google OAuth**: in Google Cloud → Credentials → add the redirect URI
  `https://<service>.onrender.com/api/google/callback`. (The app derives the URI
  from the request headers, so no `APP_URL` env is needed behind Render's proxy.)
- **Clerk login (optional)**: `NEXT_PUBLIC_*` vars are baked at **build** time. To
  enable login, add the publishable key as a Docker **build arg**
  (Render: service → Settings → Docker Build Args:
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`). Without it the app runs
  single-tenant (no login) — fine for demos.

## Persistence

The disk at `/app/data` keeps `settings.json`, Google refresh tokens and WhatsApp
history across deploys. `outputs/` (generated HTML) and `public/uploads/` are
**ephemeral** — generated sites are pushed to Vercel anyway, and uploads are only
needed during a single generation. If you need those persisted too, store them
under `/app/data` or move to object storage.

## Notes

- Free plan (512MB) can OOM launching chromium → use **Starter**. Free also sleeps
  (~30s cold start).
- `.claude/skills/ui-ux-pro-max` (708KB, used at runtime via `search.py`) ships in
  the image; `huashu-design` (62MB, unused at runtime) is excluded via
  `.dockerignore`. If `python3` is missing the design engine falls back to its
  curated baseline gracefully.

## Local production test (mirror Render)

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null   # stop dev first
docker build -t neuron-forge .
docker run -p 3000:3000 --env-file .env.local neuron-forge
```
Never run `npm run build` while `npm run dev` is running — it corrupts `.next`.
