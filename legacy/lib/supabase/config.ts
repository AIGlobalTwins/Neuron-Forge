// Supabase config — read at RUNTIME (bracket notation, never inlined at build, so
// it works on Docker/Render where env is injected at run, not build).
// supabaseEnabled() gates the whole auth/memory layer: when the env vars are
// absent the app behaves exactly as before (open, localStorage history).

export function supabaseUrl(): string {
  return process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
}

export function supabaseAnonKey(): string {
  return process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
}

export function supabaseEnabled(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
