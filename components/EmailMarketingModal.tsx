"use client";

import { useState } from "react";
import { saveToHistory } from "@/lib/history";
import type { EmailEntry, SequenceType } from "@/app/api/email-marketing/route";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const SEQUENCES: { id: SequenceType; label: string; desc: string; icon: string }[] = [
  { id: "welcome",      label: "Boas-vindas",         desc: "Onboarding de novos subscritores",        icon: "👋" },
  { id: "nurture",      label: "Nurturing",           desc: "Nutrição de leads até à conversão",        icon: "🌱" },
  { id: "promotion",    label: "Promoção",            desc: "Campanha com urgência e escassez",          icon: "🔥" },
  { id: "reengagement", label: "Re-engagement",       desc: "Reativar contactos inativos",              icon: "💫" },
  { id: "abandoned",    label: "Carrinho abandonado",  desc: "Recuperar leads/carrinhos perdidos",       icon: "🛒" },
];

const TONES = [
  { id: "professional", label: "Profissional" },
  { id: "friendly",     label: "Simpático" },
  { id: "bold",         label: "Direto" },
];

const LOADING_STEPS = [
  { label: "A analisar o teu negócio...", duration: 2500 },
  { label: "A criar a sequência de emails...", duration: 5000 },
  { label: "A refinar o copywriting...", duration: 0 },
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
  const [category, setCategory] = useState("Negócio");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
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
                {step === "form" && "Cria sequências de email profissionais"}
                {step === "loading" && LOADING_STEPS[loadingStep]?.label}
                {step === "result" && `${emails.length} emails gerados`}
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
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do negócio *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Clínica Dental Lisboa" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoria</label>
                  <div className="relative">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                      {["Restaurante / Café", "Saúde / Clínica", "Fitness / Ginásio", "E-commerce / Loja", "Serviços / Consultoria", "SaaS / Tecnologia", "Educação", "Imobiliário", "Outro"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Tom</label>
                  <div className="flex gap-2">
                    {TONES.map((t) => (
                      <button key={t.id} onClick={() => setTone(t.id)} className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${tone === t.id ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-400" : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"}`}>{t.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Sobre o negócio</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que fazem, o que vos diferencia, público-alvo..." rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-widest">Tipo de Sequência</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SEQUENCES.map((s) => (
                    <button key={s.id} onClick={() => setSequenceType(s.id)} className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${sequenceType === s.id ? "border-cyan-500/60 bg-cyan-500/5 text-white" : "border-[#1e1e1e] text-gray-500 hover:border-[#2a2a2a] hover:text-gray-400"}`}>
                      <div className="text-sm font-medium mb-0.5">{s.icon} {s.label}</div>
                      <div className="text-xs text-gray-600">{s.desc}</div>
                    </button>
                  ))}
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
                <p className="text-gray-600 text-xs">Claude está a escrever os teus emails...</p>
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
                            <button onClick={() => copy(email.body, `body-${i}`)} className={`text-[10px] ${copiedKey === `body-${i}` ? "text-cyan-400" : "text-gray-600 hover:text-gray-400"}`}>{copiedKey === `body-${i}` ? "Copiado" : "Copiar"}</button>
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
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Envio</p>
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
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Variantes A/B de Subject Lines</p>
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
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Dicas de Implementação</p>
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
                Nova sequência
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button onClick={handleGenerate} disabled={!businessName.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2">
              <MailIcon className="w-4 h-4" />
              Gerar Sequência
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
