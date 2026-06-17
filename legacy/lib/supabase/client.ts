"use client";

import { createBrowserClient } from "@supabase/ssr";

// The browser client reads the (public) URL + anon key from <html data-sb-*>,
// which the server layout writes at RUNTIME. We do NOT use process.env here:
// NEXT_PUBLIC_* is inlined at BUILD time and is empty on Docker/Render (env is
// injected at run). The anon key is safe to embed — RLS protects the data.
function fromDom(): { url: string; anon: string } {
  if (typeof document === "undefined") return { url: "", anon: "" };
  const d = document.documentElement.dataset;
  return { url: d.sbUrl || "", anon: d.sbAnon || "" };
}

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!cached) {
    const { url, anon } = fromDom();
    cached = createBrowserClient(url, anon);
  }
  return cached;
}

export function clientSupabaseEnabled(): boolean {
  const { url, anon } = fromDom();
  return Boolean(url && anon);
}
