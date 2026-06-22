"use client";

import { useState } from "react";
import { useClientWorkspace } from "@/lib/client-context";
import { ClientModal } from "@/components/ClientModal";
import { type Client } from "@/lib/clients";

export function ClientSelector() {
  const ws = useClientWorkspace();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null | undefined>(undefined); // undefined=closed, null=new, Client=edit

  if (!ws) return null;
  const { clients, activeClient, setActiveClientId } = ws;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-8 px-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center gap-2 text-xs text-gray-300 hover:border-[#E8622A]/40 hover:text-white transition-all"
          title="Active client"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeClient ? "bg-[#E8622A]" : "bg-gray-600"}`} />
          <span className="max-w-[140px] truncate">{activeClient ? activeClient.name : "No client"}</span>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#141414] border border-white/10 rounded-xl shadow-xl p-1.5 z-50">
              <div className="max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setActiveClientId(null); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!activeClient ? "text-white bg-white/5" : "text-gray-400 hover:bg-white/5"}`}
                >
                  No client <span className="text-gray-600">(free mode)</span>
                </button>
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center group">
                    <button
                      onClick={() => { setActiveClientId(c.id); setOpen(false); }}
                      className={`flex-1 min-w-0 text-left px-3 py-2 rounded-lg text-sm truncate ${activeClient?.id === c.id ? "text-[#E8622A] bg-[#E8622A]/10" : "text-gray-300 hover:bg-white/5"}`}
                    >
                      {c.name}
                    </button>
                    <button onClick={() => { setEditing(c); setOpen(false); }} className="px-2 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition" title="Edit">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    </button>
                  </div>
                ))}
                {clients.length === 0 && <p className="px-3 py-2 text-[11px] text-gray-700">No clients yet.</p>}
              </div>
              <div className="border-t border-white/5 mt-1 pt-1">
                <button onClick={() => { setEditing(null); setOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#E8622A] hover:bg-[#E8622A]/10">
                  + New client
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editing !== undefined && <ClientModal client={editing} onClose={() => setEditing(undefined)} />}
    </>
  );
}
