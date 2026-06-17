import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

// Reachable WITHOUT login. Everything else requires a signed-in user.
const PUBLIC = [
  /^\/login/,
  /^\/auth\//, // OAuth callback
  /^\/api\/whatsapp/, // Meta webhook + /api/whatsapp/status (Render health check)
  /^\/api\/google\/callback/, // Google OAuth redirect
  /^\/api\/preview/, // generated-site preview must be shareable
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icon")) {
    return NextResponse.next();
  }

  // Auth/memory layer is off until Supabase is configured → app stays fully open.
  if (!supabaseEnabled()) return NextResponse.next();

  const { response, user } = await updateSession(req);

  const isPublic = PUBLIC.some((re) => re.test(pathname));
  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
