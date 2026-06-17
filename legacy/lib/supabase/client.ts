"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./config";

// Browser Supabase client (singleton). Used by client components for auth
// (signInWithOAuth / signOut) and direct user-scoped reads (RLS-protected).
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!cached) cached = createBrowserClient(supabaseUrl(), supabaseAnonKey());
  return cached;
}
