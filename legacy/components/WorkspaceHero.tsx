"use client";

import { useState } from "react";
import { useClientWorkspace } from "@/lib/client-context";
import { ClientModal } from "@/components/ClientModal";
import { type Client } from "@/lib/clients";

export function WorkspaceHero() {
  const ws = useClientWorkspace();
  const [modal, setModal] = useState<Client | null | undefined>(undefined); // undefined=closed, null=new, Client=edit

  // Open mode (no Supabase) — keep a simple welcome.
  if (!ws) {
    return (
      <div className="text-center mb-12 fade-up">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Neuron Forge</h1>
        <p className="text-gray-500 mt-3">Your AI toolkit — pick an agent below.</p>
      </div>
    );
  }

  const { clients, activeClient, setActiveClientId } = ws;

  if (activeClient) {
    return (
      <div className="text-center mb-10 fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8622A]/10 border border-[#E8622A]/20 rounded-full text-[#E8622A] text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8622A] animate-pulse" />
          Working on
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{activeClient.name}</h1>
        <p className="text-gray-500 mt-2">{activeClient.category || "Client"} — pick an agent below; it pre-fills from this client.</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setModal(activeClient)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">Edit client</button>
          <button onClick={() => setActiveClientId(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">Switch client</button>
        </div>
        {modal !== undefined && <ClientModal client={modal} onClose={() => setModal(undefined)} />}
      </div>
    );
  }

  return (
    <div className="text-center mb-12 max-w-2xl mx-auto fade-up">
      <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
        Welcome to <span className="text-[#E8622A]">Neuron Forge</span>
      </h1>
      <p className="text-gray-500 mt-4 mb-7 text-base max-w-lg mx-auto">
        Add a client and every agent works on their business — websites, SEO, ads, social, WhatsApp and more.
      </p>
      <button
        onClick={() => setModal(null)}
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#E8622A] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-[#E8622A]/20 hover:-translate-y-0.5"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Add a client
      </button>

      {clients.length > 0 && (
        <div className="mt-10">
          <p className="text-[11px] uppercase tracking-widest text-gray-600 mb-3">Your clients</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveClientId(c.id)}
                className="group flex flex-col items-start text-left px-4 py-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-[#E8622A]/40 hover:bg-white/[0.04] hover:-translate-y-0.5 transition min-w-[140px]"
              >
                <span className="text-sm text-white font-medium truncate max-w-[200px]">{c.name}</span>
                <span className="text-[11px] text-gray-600 truncate max-w-[200px]">{c.category || "Client"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {modal !== undefined && <ClientModal client={modal} onClose={() => setModal(undefined)} />}
    </div>
  );
}
