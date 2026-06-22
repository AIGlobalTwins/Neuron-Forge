import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "./config";

// Server Supabase client bound to the request cookies. Routes/Server Components
// use this; RLS enforces that a user only ever reads/writes their own rows.
// Next 14: cookies() is sync. setAll throws in a Server Component (read-only) —
// swallowed; the middleware refreshes the session cookie instead.
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* called from a Server Component — ignore; middleware handles refresh */
        }
      },
    },
  });
}

/** Returns the signed-in user's id (or null). Convenience for route handlers. */
export async function getSupabaseUserId(): Promise<string | null> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist a generation to history SERVER-SIDE (RLS-scoped to the user). Used by the
 * heavy website flows (analyze/maps) where the client navigates to the generated
 * site before a fire-and-forget client save can complete. No-op if not signed in
 * or Supabase is off; never throws (must not break the generation response).
 */
export async function saveGenerationServer(
  userId: string | null,
  type: string,
  name: string,
  payload: Record<string, unknown>,
  clientId?: string | null,
): Promise<void> {
  if (!userId) return;
  try {
    const supabase = createServerSupabase();
    await supabase.from("generations").insert({ user_id: userId, type, name, payload, client_id: clientId ?? null });
  } catch {
    /* don't block the generation */
  }
}
