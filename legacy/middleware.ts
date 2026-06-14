import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const clerkKey = process.env.CLERK_SECRET_KEY ?? "";
const clerkEnabled = clerkKey.startsWith("sk_live_") || clerkKey.startsWith("sk_test_");

// When Clerk is configured, use Clerk middleware for session handling.
// API routes are NOT protected here — each route handler checks auth individually
// via `try { auth() } catch {}` and falls back gracefully when unauthenticated.
export default async function middleware(req: NextRequest) {
  // Never touch static assets — prevents CSS/JS 404s
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (!clerkEnabled) return NextResponse.next();

  const { clerkMiddleware } = await import("@clerk/nextjs/server");

  return clerkMiddleware()(req, { waitUntil: () => {} } as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
