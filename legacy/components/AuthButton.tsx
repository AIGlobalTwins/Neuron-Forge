"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase, clientSupabaseEnabled } from "@/lib/supabase/client";

// Account chip + sign-out. Only renders when Supabase is configured AND a user is
// signed in (the app routes are login-gated, so that's the normal case).
export function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!clientSupabaseEnabled()) return;
    (async () => {
      try {
        const { data } = await getBrowserSupabase().auth.getUser();
        setEmail(data.user?.email ?? null);
      } catch {
        /* not signed in / supabase unreachable */
      }
    })();
  }, []);

  if (!email) return null;

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    window.location.href = "/login";
  }

  const initial = email[0]?.toUpperCase() || "U";

  return (
    <div className="relative pl-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-[#E8622A]/15 border border-[#E8622A]/30 text-[#E8622A] text-xs font-semibold flex items-center justify-center hover:bg-[#E8622A]/25 transition"
        title={email}
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-[#141414] border border-white/10 rounded-xl shadow-xl p-1.5 z-50">
            <div className="px-3 py-2 text-xs text-gray-500 truncate border-b border-white/5 mb-1">{email}</div>
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
