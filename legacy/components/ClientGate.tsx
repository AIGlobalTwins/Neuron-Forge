"use client";

import { useState } from "react";
import { useClientWorkspace } from "@/lib/client-context";
import { ClientModal } from "@/components/ClientModal";
import { type Client } from "@/lib/clients";

// Client-first gate: with no active client we show the clients landing; once a
// client is picked we show the agents (children) under a "Working on X" bar.
export function ClientGate({ children }: { children: React.ReactNode }) {
  const ws = useClientWorkspace();
  const [modal, setModal] = useState<Client | null | undefined>(undefined); // undefined=closed, null=new, Client=edit

  // Open mode (Supabase off) — just show the agents, no client layer.
  if (!ws) return <>{children}</>;

  const { clients, activeClient, setActiveClientId } = ws;

  // ── No client selected → client-first landing ────────────────────────────
  if (!activeClient) {
    return (
      <div className="w-full max-w-3xl mx-auto fade-up">
        <div className="text-center mb-9">
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Welcome to <span className="text-[#E8622A]">Neuron Forge</span>
          </h1>
          <p className="text-gray-500 mt-4 text-base max-w-lg mx-auto">
            Pick a client to work on — every agent pre-fills from their business. Or add a new one.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveClientId(c.id)}
              className="group text-left p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-[#E8622A]/40 hover:bg-white/[0.04] hover:-translate-y-0.5 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E8622A]/10 border border-[#E8622A]/20 flex items-center justify-center text-[#E8622A] font-semibold mb-3">
                {(c.name[0] || "C").toUpperCase()}
              </div>
              <div className="text-white font-semibold truncate">{c.name}</div>
              <div className="text-xs text-gray-600 truncate">{c.category || "Client"}</div>
            </button>
          ))}

          <button
            onClick={() => setModal(null)}
            className="flex flex-col items-center justify-center gap-2 p-5 border border-dashed border-[#2a2a2a] rounded-2xl text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A]/40 transition min-h-[124px]"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span className="text-sm font-medium">Add client</span>
          </button>
        </div>

        {modal !== undefined && <ClientModal client={modal} onClose={() => setModal(undefined)} />}
      </div>
    );
  }

  // ── Client active → context bar + the agents ─────────────────────────────
  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-8 fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8622A]/10 border border-[#E8622A]/20 rounded-full text-[#E8622A] text-xs font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8622A] animate-pulse" />
          Working on
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{activeClient.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{activeClient.category || "Client"} — pick an agent; it pre-fills from this client.</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setModal(activeClient)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">Edit</button>
          <button onClick={() => setActiveClientId(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">← All clients</button>
        </div>
      </div>

      {children}

      {modal !== undefined && <ClientModal client={modal} onClose={() => setModal(undefined)} />}
    </div>
  );
}
