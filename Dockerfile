# Neuron Forge Agents — container image for Render/Railway/Fly.
# Node base + Playwright-installed chromium. This avoids depending on a specific
# mcr.microsoft.com/playwright image tag and keeps the image smaller; the browser
# is installed for the exact `playwright` version in package-lock.
FROM node:20-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# python3 is used at runtime by the ui-ux-pro-max skill (search.py); ca-certificates for HTTPS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install node deps (dev deps needed for `next build`).
COPY package.json package-lock.json ./
RUN npm ci

# Install chromium + its OS dependencies for the installed Playwright version.
RUN npx playwright install --with-deps chromium

# App source.
COPY . .

# NEXT_PUBLIC_* are inlined at BUILD time. Pass the Clerk key as a build arg to
# enable login; otherwise the app runs without auth (fine for demos).
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NODE_OPTIONS=--max-old-space-size=1024

RUN npm run build

ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000

# next start reads $PORT (Render injects it) and binds 0.0.0.0 by default.
CMD ["npm", "run", "start"]
