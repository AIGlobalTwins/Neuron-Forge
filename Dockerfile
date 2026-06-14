# Neuron Forge Agents — container image for Render/Railway/Fly.
# Uses the official Playwright image so chromium + system deps are preinstalled
# and version-matched to the `playwright` npm dependency (^1.58).
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Install dependencies (dev deps needed for the build).
COPY package.json package-lock.json ./
RUN npm ci

# App source.
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time. Pass them
# as build args if you want Clerk login enabled; otherwise the app runs fine
# without auth (single-tenant). Other secrets are read at runtime only.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

RUN npm run build

ENV NODE_ENV=production
# Render/most PaaS inject PORT; Next's `start` reads it. 3000 is the local default.
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
