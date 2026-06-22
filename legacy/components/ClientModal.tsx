"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Client, type ClientInput, EMPTY_CLIENT } from "@/lib/clients";
import { useClientWorkspace } from "@/lib/client-context";

interface Props {
  client?: Client | null; // edit when provided, otherwise create
  onClose: () => void;
}

const CATEGORIES = [
  "Restaurant / Food", "Café / Bakery", "Bar / Nightlife", "Beauty / Salon", "Barbershop",
  "Spa / Wellness", "Fitness / Gym", "Dental / Clinic", "Medical / Health", "Legal / Law",
  "Real Estate", "Construction / Architecture", "Accounting / Finance", "Hotel / Lodging",
  "Auto / Mechanic", "Retail / Shop", "Education / Academy", "Agency / Services", "Other",
];

export function ClientModal({ client, onClose }: Props) {
  const ws = useClientWorkspace();
  const [form, setForm] = useState<ClientInput>(
    client
      ? { name: client.name, category: client.category, description: client.description, website: client.website, phone: client.phone, hours: client.hours, services: [...client.services], faqs: client.faqs.map((f) => ({ ...f })) }
      : { ...EMPTY_CLIENT },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Render via portal to <body> so the header's backdrop-blur stacking context
  // can't trap this fixed overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function set<K extends keyof ClientInput>(k: K, v: ClientInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Business name is required.");
      return;
    }
    if (!ws) return;
    setSaving(true);
    setError(null);
    const cleaned: ClientInput = {
      ...form,
      services: form.services.map((s) => s.trim()).filter(Boolean),
      faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    };
    const res = client ? await ws.update(client.id, cleaned) : await ws.create(cleaned);
    setSaving(false);
    if (!res) {
      setError("Could not save. Try again.");
      return;
    }
    onClose();
  }

  const input = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/20 transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">{client ? "Edit client" : "New client"}</h2>
            <p className="text-gray-600 text-xs">Fill once — every agent pre-fills from this.</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Business name *</label>
              <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tasca do Zé" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={`${input} appearance-none`} value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${input} resize-none`} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the business does, who it serves, what's special." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Website</label>
              <input className={input} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+351…" />
            </div>
            <div>
              <label className={labelCls}>Opening hours</label>
              <input className={input} value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Mon-Sat 9-19" />
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-400">Services / Products</label>
              <button onClick={() => set("services", [...form.services, ""])} className="text-[11px] text-[#E8622A] hover:opacity-80">+ Add</button>
            </div>
            <div className="space-y-2">
              {form.services.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={input} value={s} onChange={(e) => set("services", form.services.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Service ${i + 1}`} />
                  <button onClick={() => set("services", form.services.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 px-2">✕</button>
                </div>
              ))}
              {form.services.length === 0 && <p className="text-[11px] text-gray-700">No services yet.</p>}
            </div>
          </div>

          {/* FAQs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-400">FAQs</label>
              <button onClick={() => set("faqs", [...form.faqs, { question: "", answer: "" }])} className="text-[11px] text-[#E8622A] hover:opacity-80">+ Add</button>
            </div>
            <div className="space-y-2">
              {form.faqs.map((f, i) => (
                <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-2.5 space-y-2">
                  <div className="flex gap-2">
                    <input className={`${input} py-2`} value={f.question} onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} placeholder="Question" />
                    <button onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 px-2">✕</button>
                  </div>
                  <textarea className={`${input} py-2 resize-none`} rows={2} value={f.answer} onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} placeholder="Answer" />
                </div>
              ))}
              {form.faqs.length === 0 && <p className="text-[11px] text-gray-700">No FAQs yet.</p>}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1e1e1e] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-[#E8622A] hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all">
            {saving ? "Saving…" : client ? "Save changes" : "Create client"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
