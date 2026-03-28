import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const clerkKey = process.env.CLERK_SECRET_KEY ?? "";
const clerkEnabled = clerkKey.startsWith("sk_live_") || clerkKey.startsWith("sk_test_A");

// When Clerk is configured, use full auth middleware; otherwise passthrough
export default async function middleware(req: NextRequest) {
  if (!clerkEnabled) return NextResponse.next();

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

  const isProtected = createRouteMatcher([
    "/api/analyze(.*)",
    "/api/create-from-maps(.*)",
    "/api/social-posts(.*)",
    "/api/instagram-publish(.*)",
    "/api/consulting(.*)",
    "/api/whatsapp/configure(.*)",
    "/api/whatsapp/status(.*)",
  ]);

  return clerkMiddleware(async (auth, request) => {
    if (isProtected(request)) await auth.protect();
  })(req, { waitUntil: () => {} } as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
