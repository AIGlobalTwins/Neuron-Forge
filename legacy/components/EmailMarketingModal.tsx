"use client";

import { useState } from "react";
import { safeJson } from "@/lib/api";
import { saveToHistory } from "@/lib/history";
import type { EmailEntry, SequenceType } from "@/app/api/email-marketing/route";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const SEQUENCES: { id: SequenceType; label: string; desc: string }[] = [
  { id: "welcome",      label: "Welcome",       desc: "Onboarding for new subscribers" },
  { id: "nurture",      label: "Nurturing",     desc: "Nurture leads toward conversion" },
  { id: "promotion",    label: "Promotion",     desc: "Campaign with urgency and scarcity" },
  { id: "reengagement", label: "Re-engagement", desc: "Reactivate inactive contacts" },
  { id: "abandoned",    label: "Abandoned cart", desc: "Recover lost leads/carts" },
];

// Professional line icons (Lucide-style) per sequence — replaces emojis.
const SEQ_ICONS: Record<SequenceType, JSX.Element> = {
  welcome: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  nurture: (
    <>
      <path d="M12 20V9" />
      <path d="M12 9C12 5.7 9.3 3 6 3c0 3.3 2.7 6 6 6z" />
      <path d="M12 11c0-2.8 2.2-5 5-5 0 2.8-2.2 5-5 5z" />
      <path d="M8 20h8" />
    </>
  ),
  promotion: (
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.3" />
    </>
  ),
  reengagement: (
    <>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </>
  ),
  abandoned: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
};

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "friendly",     label: "Friendly" },
  { id: "bold",         label: "Bold" },
];

const LOADING_STEPS = [
  { label: "Analyzing your business...", duration: 2500 },
  { label: "Creating the email sequence...", duration: 5000 },
  { label: "Refining the copywriting...", duration: 0 },
];

function MailIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6L12 13 2 6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2H3.5A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
    </svg>
  );
}

export function EmailMarketingModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Business");
  const [description, setDescription] = useState("");
  const [sequenceType, setSequenceType] = useState<SequenceType>("welcome");
  const [tone, setTone] = useState("professional");
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [subjectVariants, setSubjectVariants] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleGenerate() {
    if (!businessName.trim()) return;
    setStep("loading");
    setLoadingStep(0);
    setError(null);

    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < LOADING_STEPS.length) {
        setLoadingStep(idx);
        if (LOADING_STEPS[idx].duration > 0) setTimeout(advance, LOADING_STEPS[idx].duration);
      }
    };
    if (LOADING_STEPS[0].duration > 0) setTimeout(advance, LOADING_STEPS[0].duration);

    try {
      const res = await fetch("/api/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, category, description, sequenceType, tone }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setEmails(data.emails);
      setTips(data.tips);
      setSubjectVariants(data.subjectLineVariants);
      setStep("result");
      saveToHistory({
        type: "email",
        name: businessName,
        emailSequenceType: sequenceType,
        emailCount: data.emails?.length ?? 0,
        emailSubjects: (data.emails || []).map((e: EmailEntry) => e.subject),
      });
    } catch (e) {
      setError((e as Error).message);
      setStep("form");
    }
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors";
  const selectClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MailIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Email Marketing Agent</h2>
              <p className="text-gray-600 text-xs">
                {step === "form" && "Create professional email sequences"}
                {step === "loading" && LOADING_STEPS[loadingStep]?.label}
                {step === "result" && `${emails.length} emails generated`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* FORM */}
          {step === "form" && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Business name *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="E.g. Lisbon Dental Clinic" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
                  <div className="relative">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                      {["Restaurant / Café", "Health / Clinic", "Fitness / Gym", "E-commerce / Store", "Services / Consulting", "SaaS / Technology", "Education", "Real Estate", "Other"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Tone</label>
                  <div className="flex gap-2">
                    {TONES.map((t) => (
                      <button key={t.id} onClick={() => setTone(t.id)} className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${tone === t.id ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-400" : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"}`}>{t.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">About the business</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you do, what sets you apart, target audience..." rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-widest">Sequence Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SEQUENCES.map((s) => {
                    const sel = sequenceType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSequenceType(s.id)}
                        aria-pressed={sel}
                        className={`group relative text-left rounded-xl border p-3.5 transition-all duration-200 ease-out hover:-translate-y-0.5 ${
                          sel
                            ? "border-[#E8622A] bg-[#E8622A]/[0.07] shadow-[0_0_0_1px_rgba(232,98,42,0.55),0_10px_30px_-10px_rgba(232,98,42,0.5)]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              sel
                                ? "bg-[#E8622A]/15 ring-1 ring-[#E8622A]/30 text-[#E8622A]"
                                : "bg-white/[0.04] ring-1 ring-white/10 text-gray-400 group-hover:bg-white/[0.06] group-hover:text-gray-300"
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              {SEQ_ICONS[s.id]}
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <div className={`text-sm font-semibold tracking-tight ${sel ? "text-white" : "text-gray-200"}`}>{s.label}</div>
                            <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{s.desc}</div>
                          </div>
                        </div>
                        {sel && (
                          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#E8622A] flex items-center justify-center shadow-md shadow-[#E8622A]/40">
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M5 12l5 5L20 6" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* LOADING */}
          {step === "loading" && (
            <div className="px-6 py-16 flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-16 h-16 animate-spin" style={{ animationDuration: "3s" }}>
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="220" strokeDashoffset="60" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
                  <MailIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium text-sm">{LOADING_STEPS[loadingStep]?.label}</p>
                <p className="text-gray-600 text-xs">AI is writing your emails...</p>
              </div>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "w-6 bg-cyan-500" : "w-2 bg-[#2a2a2a]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* RESULT */}
          {step === "result" && (
            <div className="px-6 py-6 space-y-5">
              {/* Emails accordion */}
              {emails.map((email, i) => {
                const isOpen = expandedIdx === i;
                return (
                  <div key={i} className={`border rounded-xl overflow-hidden transition-all ${isOpen ? "border-cyan-500/30 bg-cyan-500/5" : "border-[#1e1e1e] bg-[#111]"}`}>
                    <button onClick={() => setExpandedIdx(isOpen ? null : i)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{email.subject}</p>
                        <p className="text-[10px] text-gray-600">{email.sendDay} · {email.preheader}</p>
                      </div>
                      <svg viewBox="0 0 16 16" className={`w-3.5 h-3.5 text-gray-600 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-[#1e1e1e]">
                        <div className="pt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Subject</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-cyan-400 font-medium">{email.subject}</p>
                              <button onClick={() => copy(email.subject, `sub-${i}`)} className="text-gray-600 hover:text-gray-400"><CopyIcon /></button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Preheader</p>
                            <p className="text-xs text-gray-400">{email.preheader}</p>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Body</p>
                            <button onClick={() => copy(email.body, `body-${i}`)} className={`text-[10px] ${copiedKey === `body-${i}` ? "text-cyan-400" : "text-gray-600 hover:text-gray-400"}`}>{copiedKey === `body-${i}` ? "Copied" : "Copy"}</button>
                          </div>
                          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-3">
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{email.body}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">CTA</p>
                            <span className="inline-block px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs text-cyan-400 font-semibold">{email.cta}</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Send</p>
                            <span className="text-xs text-gray-400">{email.sendDay}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Subject variants */}
              {subjectVariants.length > 0 && (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">A/B Subject Line Variants</p>
                  <div className="space-y-2">
                    {subjectVariants.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="text-cyan-500/60">→</span> {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {tips.length > 0 && (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Implementation Tips</p>
                  <div className="space-y-2">
                    {tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                        <span className="text-cyan-500 mt-0.5 shrink-0">→</span> {tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { setEmails([]); setTips([]); setSubjectVariants([]); setStep("form"); }} className="w-full py-2.5 rounded-xl text-sm text-gray-500 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all">
                New sequence
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button onClick={handleGenerate} disabled={!businessName.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2">
              <MailIcon className="w-4 h-4" />
              Generate Sequence
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
