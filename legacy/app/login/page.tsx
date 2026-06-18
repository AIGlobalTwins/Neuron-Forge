"use client";

import { useState } from "react";
import { getBrowserSupabase, clientSupabaseEnabled } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    if (!clientSupabaseEnabled()) return;
    setLoading(true);
    const supabase = getBrowserSupabase();
    // No query string on redirectTo so it matches a plain allow-listed Redirect URL
    // exactly (…/auth/callback). The callback route lands on "/" by default.
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#E8622A]/40 flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 2L4 6.5v11L12 22l8-4.5v-11L12 2z" />
              <path d="M12 8l-4 2.5v3L12 16l4-2.5v-3L12 8z" fill="currentColor" fillOpacity="0.5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Neuron Forge Agents</h1>
          <p className="text-sm text-gray-500 mt-1.5 mb-8">Sign in to continue to your workspace.</p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#1a1a1a] font-medium text-sm rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          <p className="text-[11px] text-gray-600 mt-6 leading-relaxed">
            Your generations, settings and history stay private to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
