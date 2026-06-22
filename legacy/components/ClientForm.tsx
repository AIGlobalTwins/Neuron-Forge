"use client";

import { useState } from "react";
import { type Client, type ClientInput, type ClientFaq, EMPTY_CLIENT } from "@/lib/clients";
import { useClientWorkspace } from "@/lib/client-context";

const CATEGORIES = [
  "Restaurant / Food", "Café / Bakery", "Bar / Nightlife", "Beauty / Salon", "Barbershop",
  "Spa / Wellness", "Fitness / Gym", "Dental / Clinic", "Medical / Health", "Legal / Law",
  "Real Estate", "Construction / Architecture", "Accounting / Finance", "Hotel / Lodging",
  "Auto / Mechanic", "Retail / Shop", "Education / Academy", "Agency / Services", "Other",
];

// Full-page client form (used as a dedicated "Add / Edit client" page, not a modal).
export function ClientForm({ client, onDone, onCancel }: { client?: Client | null; onDone: () => void; onCancel: () => void }) {
  const ws = useClientWorkspace();
  const [form, setForm] = useState<ClientInput>(
    client
      ? { name: client.name, category: client.category, description: client.description, website: client.website, phone: client.phone, hours: client.hours, services: [...client.services], faqs: client.faqs.map((f) => ({ ...f })) }
      : { ...EMPTY_CLIENT },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);
  const [researchMsg, setResearchMsg] = useState<string | null>(null);

  function set<K extends keyof ClientInput>(k: K, v: ClientInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Auto-fill the form from the business's own website (grounded AI extraction).
  async function autofill() {
    const url = form.website.trim();
    if (!url) {
      setError("Add a website first, then Auto-fill.");
      return;
    }
    setResearching(true);
    setError(null);
    setResearchMsg(null);
    try {
      const res = await fetch("/api/client-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.profile) {
        setError(data?.error || "Auto-fill failed. Try again.");
        return;
      }
      const p = data.profile as Partial<ClientInput> & { services?: string[]; faqs?: ClientFaq[] };
      setForm((f) => ({
        ...f,
        name: f.name.trim() || p.name || f.name,
        category: p.category || f.category,
        description: p.description || f.description,
        website: p.website || f.website,
        phone: p.phone || f.phone,
        hours: p.hours || f.hours,
        services: p.services && p.services.length ? p.services : f.services,
        faqs: p.faqs && p.faqs.length ? p.faqs : f.faqs,
      }));
      const rich = !!(p.phone || p.hours || (p.services && p.services.length) || (p.faqs && p.faqs.length) || (p.description && p.description.length > 20));
      if (rich) {
        setResearchMsg("Filled from the website with AI — review and edit before saving.");
      } else {
        setError("Read very little from that site (it may be JavaScript-heavy or thin). Filled what I could — add the rest manually.");
      }
    } catch {
      setError("Auto-fill failed. Try again.");
    } finally {
      setResearching(false);
    }
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
    onDone();
  }

  const input = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/20 transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="w-full max-w-2xl mx-auto fade-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="w-8 h-8 rounded-lg border border-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#E8622A]/40 transition" title="Back">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white">{client ? "Edit client" : "New client"}</h1>
          <p className="text-gray-600 text-xs">Fill once — every agent pre-fills from this.</p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
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
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <label className="text-xs font-medium text-gray-400">Website</label>
              <button
                type="button"
                onClick={autofill}
                disabled={researching || !form.website.trim()}
                title="Fill the whole form from this website, with AI"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white bg-gradient-to-r from-[#E8622A] to-[#a855f7] hover:opacity-90 shadow-[0_0_10px_rgba(168,85,247,0.45)] disabled:opacity-40 disabled:shadow-none transition-all shrink-0"
              >
                {researching ? (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 2l1.5 5L19 8.5 13.5 10 12 15l-1.5-5L5 8.5 10.5 7z" /><path d="M18.3 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></svg>
                )}
                {researching ? "Researching…" : "Auto-fill"}
              </button>
            </div>
            <input className={input} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://… then Auto-fill" />
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

        {researchMsg && (
          <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" fill="currentColor"><path d="M12 2l1.5 5L19 8.5 13.5 10 12 15l-1.5-5L5 8.5 10.5 7z" /></svg>
            {researchMsg}
          </p>
        )}

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

      <div className="flex items-center justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={save} disabled={saving} className="px-5 py-2 bg-[#E8622A] hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all">
          {saving ? "Saving…" : client ? "Save changes" : "Create client"}
        </button>
      </div>
    </div>
  );
}
