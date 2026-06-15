import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const clerkKey = process.env.CLERK_SECRET_KEY ?? "";
const clerkEnabled = clerkKey.startsWith("sk_live_") || clerkKey.startsWith("sk_test_");

// When Clerk is configured, every non-public route requires a signed-in user, so
// each tester is isolated under their own userId (own API keys, settings, history).
// When Clerk is NOT configured, the app stays fully open (no auth).
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // Never touch static assets — prevents CSS/JS 404s
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (!clerkEnabled) return NextResponse.next();

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

  // Public — reachable WITHOUT login. Everything else (the app UI + the generation
  // APIs) is protected, forcing sign-in so requests carry a real userId.
  const isPublic = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/whatsapp(.*)", // Meta webhook + /api/whatsapp/status (Render health check)
    "/api/google/callback(.*)", // OAuth redirect
    "/api/preview(.*)", // generated-site preview must be shareable
  ]);

  // Pass the REAL NextFetchEvent through — Clerk's handshake (dev-browser cookie
  // exchange) needs it; a stub event made the handshake return 500.
  return clerkMiddleware(async (auth, request) => {
    if (!isPublic(request)) await auth.protect();
  })(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
