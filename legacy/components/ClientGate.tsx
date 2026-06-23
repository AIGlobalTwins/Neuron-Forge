"use client";

import { useState } from "react";
import { useClientWorkspace } from "@/lib/client-context";
import { ClientForm } from "@/components/ClientForm";
import { type Client } from "@/lib/clients";

// Client-first gate: with no active client we show the clients landing; once a
// client is picked (or "All Agents" in free mode) we show the agents (children).
// Add / Edit client open a dedicated full-page form (not a modal).
export function ClientGate({ children }: { children: React.ReactNode }) {
  const ws = useClientWorkspace();
  const [editing, setEditing] = useState<Client | null | undefined>(undefined); // undefined=not editing, null=new, Client=edit
  const [freeMode, setFreeMode] = useState(false); // agents without a client

  // Open mode (Supabase off) — just show the agents, no client layer.
  if (!ws) return <>{children}</>;

  const { clients, activeClient, setActiveClientId } = ws;

  // ── Add / Edit client → dedicated page ───────────────────────────────────
  if (editing !== undefined) {
    return <ClientForm client={editing} onDone={() => setEditing(undefined)} onCancel={() => setEditing(undefined)} />;
  }

  // ── Client active → context bar + the agents ─────────────────────────────
  if (activeClient) {
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
            <button onClick={() => setEditing(activeClient)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">Edit</button>
            <button onClick={() => setActiveClientId(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">← All clients</button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // ── Free mode → agents without a client ──────────────────────────────────
  if (freeMode) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-8 fade-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">All agents</h1>
          <p className="text-gray-500 text-sm mt-1">No client selected — outputs won&apos;t be grouped under a client.</p>
          <button onClick={() => setFreeMode(false)} className="mt-3 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">← Clients</button>
        </div>
        {children}
      </div>
    );
  }

  // ── No client → client-first landing ─────────────────────────────────────
  return (
    <div className="w-full max-w-3xl mx-auto fade-up">
      <div className="text-center mb-7">
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
          Welcome to <span className="text-[#E8622A]">Neuron Forge</span>
        </h1>
        <p className="text-gray-500 mt-4 text-base max-w-lg mx-auto">
          Pick a client to work on — every agent pre-fills from their business. Or jump straight into the agents.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-9">
        <button
          onClick={() => setEditing(null)}
          className="btn-glow inline-flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-xl"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add client
        </button>
        <button
          onClick={() => setFreeMode(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-white/[0.03] border border-white/10 hover:border-[#E8622A]/40 hover:bg-white/[0.06] text-gray-200 text-sm font-semibold rounded-xl transition hover:-translate-y-0.5"
        >
          All Agents
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>

      {clients.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-600 mb-3 text-center">Your clients</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveClientId(c.id)}
                className="group relative overflow-hidden text-left p-5 rounded-2xl border border-white/[0.07] hover:border-[#E8622A]/40 hover:-translate-y-0.5 transition-all"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), #0b0b0d" }}
              >
                <span className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-24 rounded-full blur-3xl bg-[#E8622A]/0 group-hover:bg-[#E8622A]/15 transition-colors duration-500" />
                <div className="relative w-10 h-10 rounded-xl bg-[#E8622A]/10 border border-[#E8622A]/30 flex items-center justify-center text-[#E8622A] font-semibold mb-3 transition-shadow group-hover:shadow-[0_0_14px_rgba(232,98,42,0.4)]">
                  {(c.name[0] || "C").toUpperCase()}
                </div>
                <div className="relative text-white font-semibold truncate">{c.name}</div>
                <div className="relative text-xs text-gray-600 truncate">{c.category || "Client"}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
