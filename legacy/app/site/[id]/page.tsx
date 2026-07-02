"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SiteConfig } from "@/lib/integrations";
import { PublishButton } from "@/components/PublishButton";

type Tab = "design" | "integrations" | "publish";

export default function SitePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [name, setName] = useState("Site");
  const [tab, setTab] = useState<Tab>("design");
  const [cfg, setCfg] = useState<SiteConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("name");
    if (n) setName(n);
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/site/${id}`)
      .then((r) => r.json())
      .then((d) => setCfg(d?.config ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function setWa<K extends "number" | "message">(k: K, v: string) {
    setCfg((c) => ({ ...c, whatsapp: { ...c.whatsapp, [k]: v } }));
  }

  async function saveIntegrations() {
    setSaving(true);
    setErr(null);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/site/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErr(d?.error || "Save failed.");
        return;
      }
      setSavedMsg("Saved. Re-publish (Publish tab) to push it live.");
      setPreviewKey((k) => k + 1);
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function runAi(instruction: string) {
    if (!instruction.trim() || aiBusy) return;
    setAiBusy(true);
    setAiErr(null);
    setAiMsg(null);
    try {
      const res = await fetch(`/api/site/${id}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setAiErr(d?.error || "Edit failed.");
        return;
      }
      setAiPrompt("");
      setCanUndo(true);
      setAiMsg("Done — preview updated. Re-publish to push it live.");
      setPreviewKey((k) => k + 1);
    } catch {
      setAiErr("Edit failed.");
    } finally {
      setAiBusy(false);
    }
  }

  async function addBooking() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiErr(null);
    setAiMsg(null);
    try {
      const res = await fetch(`/api/site/${id}/booking`, { method: "POST" });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setAiErr(d?.error || "Could not add the booking calendar.");
        return;
      }
      setCanUndo(true);
      setAiMsg(d.already ? "Booking calendar already present." : "Booking calendar added — preview updated. Re-publish to push it live.");
      setPreviewKey((k) => k + 1);
    } catch {
      setAiErr("Could not add the booking calendar.");
    } finally {
      setAiBusy(false);
    }
  }

  async function undoAi() {
    setAiBusy(true);
    setAiErr(null);
    try {
      const res = await fetch(`/api/site/${id}/ai-edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ undo: true }) });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setAiErr(d?.error || "Undo failed.");
        return;
      }
      setCanUndo(false);
      setAiMsg("Reverted to the previous version.");
      setPreviewKey((k) => k + 1);
    } catch {
      setAiErr("Undo failed.");
    } finally {
      setAiBusy(false);
    }
  }

  const SUGGESTIONS = ["Modernize the design", "Make the hero more striking", "Stronger call-to-action", "More whitespace & cleaner spacing", "Improve it on mobile", "Add a testimonials section", "Add an FAQ section"];

  const input = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/20 transition-colors";
  const label = "block text-xs font-medium text-gray-400 mb-1.5";

  const TABS: { id: Tab; label: string }[] = [
    { id: "design", label: "Design" },
    { id: "integrations", label: "Integrations" },
    { id: "publish", label: "Publish" },
  ];

  return (
    <div className="min-h-screen hex-bg text-white flex flex-col" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-[#1e1e1e] bg-[#0a0a0a]/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors shrink-0">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
            Forge
          </a>
          <div className="w-px h-4 bg-[#2a2a2a] shrink-0" />
          <span className="text-sm font-semibold truncate">{name}</span>
        </div>
        <a href={`/api/preview/${id}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-lg transition">
          Preview ↗
        </a>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 h-12 border-b border-[#1e1e1e] shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white/[0.06] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        {tab === "design" && (
          <div className="max-w-6xl mx-auto fade-up grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
            {/* AI panel */}
            <div className="space-y-4">
              <div className="glow-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#E8622A]" fill="currentColor"><path d="M12 2l1.5 5L19 8.5 13.5 10 12 15l-1.5-5L5 8.5 10.5 7z" /><path d="M18.3 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></svg>
                  <h3 className="text-sm font-semibold text-white">Edit with AI</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Describe a change in plain language — the site updates.</p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runAi(aiPrompt); } }}
                  rows={3}
                  disabled={aiBusy}
                  placeholder="e.g. make the hero more modern, change the palette to blue, add a testimonials section…"
                  className={`${input} resize-none`}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => runAi(aiPrompt)} disabled={aiBusy || !aiPrompt.trim()} className="btn-glow flex-1 py-2.5 text-white text-sm font-semibold rounded-xl">
                    {aiBusy ? "Applying…" : "Apply change"}
                  </button>
                  <button onClick={undoAi} disabled={!canUndo || aiBusy} className="px-3 py-2.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#E8622A]/40 rounded-xl transition disabled:opacity-40">Undo</button>
                </div>
                {aiErr && <p className="text-xs text-red-400 mt-2">{aiErr}</p>}
                {aiMsg && <p className="text-xs text-emerald-400 mt-2">{aiMsg}</p>}
              </div>

              <div className="glow-card rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">Quick improvements</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => runAi(s)} disabled={aiBusy} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-gray-300 hover:border-[#E8622A]/40 hover:text-white transition disabled:opacity-50">{s}</button>
                  ))}
                </div>
                <button onClick={addBooking} disabled={aiBusy} className="mt-3 w-full inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg bg-[#E8622A]/10 border border-[#E8622A]/30 text-[#E8622A] hover:bg-[#E8622A]/15 transition disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
                  Add online booking (calendar)
                </button>
              </div>

              <a href={`/editor/${id}`} className="block text-center px-4 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#E8622A]/40 text-sm transition">
                Fine-tune manually (visual editor) →
              </a>
            </div>

            {/* Preview */}
            <div>
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-white">
                {aiBusy && (
                  <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                      <span className="text-xs">Applying your change…</span>
                    </div>
                  </div>
                )}
                <iframe key={previewKey} src={`/api/preview/${id}`} className="w-full h-[72vh] border-0" title="Site preview" />
              </div>
            </div>
          </div>
        )}

        {tab === "integrations" && (
          <div className="max-w-2xl mx-auto fade-up space-y-5">
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <>
                {/* WhatsApp */}
                <div className="glow-card rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366]" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.9.9-2.8-.2-.3A8 8 0 1 1 12 20z" /></svg>
                    <h3 className="text-sm font-semibold text-white">WhatsApp button</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">A floating WhatsApp button on the site. Leave the number empty to remove it.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Number (with country code)</label>
                      <input className={input} value={cfg.whatsapp?.number ?? ""} onChange={(e) => setWa("number", e.target.value)} placeholder="351912345678" />
                    </div>
                    <div>
                      <label className={label}>Pre-filled message</label>
                      <input className={input} value={cfg.whatsapp?.message ?? ""} onChange={(e) => setWa("message", e.target.value)} placeholder="Olá! Vim pelo vosso site." />
                    </div>
                  </div>
                </div>

                {/* Google Analytics */}
                <div className="glow-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-1">Google Analytics (GA4)</h3>
                  <p className="text-xs text-gray-500 mb-3">Tracks visits. Paste the Measurement ID (starts with G-).</p>
                  <input className={input} value={cfg.gaId ?? ""} onChange={(e) => setCfg((c) => ({ ...c, gaId: e.target.value }))} placeholder="G-XXXXXXXXXX" />
                </div>

                {/* Custom code */}
                <div className="glow-card rounded-2xl p-5 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Custom code — head</h3>
                    <p className="text-xs text-gray-500 mb-2">Advanced: any tags to inject in &lt;head&gt; (pixels, fonts, verification…).</p>
                    <textarea className={`${input} font-mono resize-none`} rows={3} value={cfg.customHead ?? ""} onChange={(e) => setCfg((c) => ({ ...c, customHead: e.target.value }))} placeholder="<!-- e.g. Meta Pixel, verification meta tags -->" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Custom code — body</h3>
                    <p className="text-xs text-gray-500 mb-2">Injected before &lt;/body&gt; (chat widgets, embeds…).</p>
                    <textarea className={`${input} font-mono resize-none`} rows={3} value={cfg.customBody ?? ""} onChange={(e) => setCfg((c) => ({ ...c, customBody: e.target.value }))} placeholder="<!-- e.g. a chat widget script -->" />
                  </div>
                </div>

                {err && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
                {savedMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{savedMsg}</p>}

                <button onClick={saveIntegrations} disabled={saving} className="btn-glow w-full py-3 text-white text-sm font-semibold rounded-xl">
                  {saving ? "Saving…" : "Save integrations"}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "publish" && (
          <div className="max-w-xl mx-auto fade-up">
            <div className="glow-card rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-lg font-semibold text-white">Publish this site</h3>
              <p className="text-sm text-gray-500">Push the latest version (with your edits and integrations) to a live URL you can hand to the client. Publishing again updates the same URL.</p>
              <div className="flex justify-center">
                <PublishButton websiteId={id} name={name} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
