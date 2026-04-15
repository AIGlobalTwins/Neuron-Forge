"use client";

import { useState } from "react";
import { saveToHistory } from "@/lib/history";
import type { AdGroup, CampaignType } from "@/app/api/google-ads/route";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const CAMPAIGNS: { id: CampaignType; label: string; desc: string }[] = [
  { id: "search",      label: "Search",          desc: "Anúncios de texto na pesquisa Google" },
  { id: "pmax",        label: "Performance Max",  desc: "Multi-plataforma automatizada" },
  { id: "display",     label: "Display",          desc: "Banners na rede de display" },
  { id: "remarketing", label: "Remarketing",      desc: "Recuperar visitantes do site" },
];

const LOADING_STEPS = [
  { label: "A analisar o teu negócio...", duration: 2500 },
  { label: "A criar headlines e descriptions...", duration: 4500 },
  { label: "A adicionar extensões...", duration: 0 },
];

function AdsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
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

export function GoogleAdsModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Negócio");
  const [description, setDescription] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("search");
  const [targetAudience, setTargetAudience] = useState("");
  const [location, setLocation] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [budgetSuggestion, setBudgetSuggestion] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState(0);

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
      const res = await fetch("/api/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, category, description, campaignType, targetAudience, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      setAdGroups(data.adGroups);
      setNegativeKeywords(data.negativeKeywords);
      setTips(data.tips);
      setBudgetSuggestion(data.budgetSuggestion);
      setStep("result");
      saveToHistory({
        type: "ads",
        name: businessName,
        adsCampaignType: campaignType,
        adsGroupCount: data.adGroups?.length ?? 0,
        adsHeadlineCount: (data.adGroups || []).reduce((acc: number, g: AdGroup) => acc + g.headlines.length, 0),
      });
    } catch (e) {
      setError((e as Error).message);
      setStep("form");
    }
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors";
  const selectClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AdsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Google Ads Agent</h2>
              <p className="text-gray-600 text-xs">
                {step === "form" && "Cria copy para campanhas Google Ads"}
                {step === "loading" && LOADING_STEPS[loadingStep]?.label}
                {step === "result" && `${adGroups.length} ad groups · ${adGroups.reduce((a, g) => a + g.headlines.length, 0)} headlines`}
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
                      {["Restaurante / Café", "Saúde / Clínica", "Fitness / Ginásio", "E-commerce / Loja", "Serviços / Consultoria", "SaaS / Tecnologia", "Educação", "Imobiliário", "Construção", "Outro"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Localização</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Lisboa, Portugal" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Sobre o negócio</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que fazem, serviços principais, diferenciadores..." rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Público-alvo</label>
                <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Ex: Adultos 25-45, zona de Lisboa, preocupados com saúde oral" className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-widest">Tipo de Campanha</label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPAIGNS.map((c) => (
                    <button key={c.id} onClick={() => setCampaignType(c.id)} className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${campaignType === c.id ? "border-amber-500/60 bg-amber-500/5 text-white" : "border-[#1e1e1e] text-gray-500 hover:border-[#2a2a2a] hover:text-gray-400"}`}>
                      <div className="text-sm font-medium mb-0.5">{c.label}</div>
                      <div className="text-xs text-gray-600">{c.desc}</div>
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
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="220" strokeDashoffset="60" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-amber-400">
                  <AdsIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium text-sm">{LOADING_STEPS[loadingStep]?.label}</p>
                <p className="text-gray-600 text-xs">Claude está a criar os teus anúncios...</p>
              </div>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "w-6 bg-amber-500" : "w-2 bg-[#2a2a2a]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* RESULT */}
          {step === "result" && (
            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-56 shrink-0 border-r border-[#1e1e1e] bg-[#080808]">
                <div className="p-4 space-y-1">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Ad Groups</p>
                  {adGroups.map((g, i) => (
                    <button key={i} onClick={() => setActiveGroup(i)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${activeGroup === i ? "bg-amber-500/10 border border-amber-500/30 text-amber-400" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"}`}>
                      <div className="font-medium truncate">{g.theme}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{g.headlines.length} headlines · {g.descriptions.length} desc</div>
                    </button>
                  ))}
                </div>

                {/* Budget */}
                {budgetSuggestion && (
                  <div className="px-4 py-3 border-t border-[#1e1e1e]">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Budget</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{budgetSuggestion}</p>
                  </div>
                )}

                {/* Restart */}
                <div className="mt-auto px-4 py-4 border-t border-[#1e1e1e]">
                  <button onClick={() => { setAdGroups([]); setStep("form"); }} className="w-full py-2 rounded-xl text-xs text-gray-600 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all">Nova campanha</button>
                </div>
              </div>

              {/* Ad group detail */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {adGroups[activeGroup] && (() => {
                  const g = adGroups[activeGroup];
                  return (
                    <>
                      {/* Headlines */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Headlines ({g.headlines.length})</p>
                          <button onClick={() => copy(g.headlines.join("\n"), `h-${activeGroup}`)} className={`text-[10px] ${copiedKey === `h-${activeGroup}` ? "text-amber-400" : "text-gray-600 hover:text-gray-400"}`}>{copiedKey === `h-${activeGroup}` ? "Copiado" : "Copiar todas"}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {g.headlines.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 group">
                              <span className="text-xs text-gray-300 flex-1 truncate">{h}</span>
                              <span className={`text-[10px] shrink-0 ${h.length > 30 ? "text-red-400" : "text-gray-600"}`}>{h.length}/30</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Descriptions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Descriptions ({g.descriptions.length})</p>
                          <button onClick={() => copy(g.descriptions.join("\n"), `d-${activeGroup}`)} className={`text-[10px] ${copiedKey === `d-${activeGroup}` ? "text-amber-400" : "text-gray-600 hover:text-gray-400"}`}>{copiedKey === `d-${activeGroup}` ? "Copiado" : "Copiar todas"}</button>
                        </div>
                        <div className="space-y-1.5">
                          {g.descriptions.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                              <span className="text-xs text-gray-300 flex-1">{d}</span>
                              <span className={`text-[10px] shrink-0 mt-0.5 ${d.length > 90 ? "text-red-400" : "text-gray-600"}`}>{d.length}/90</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sitelinks */}
                      {g.sitelinks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Sitelinks</p>
                          <div className="grid grid-cols-2 gap-2">
                            {g.sitelinks.map((s, i) => (
                              <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3">
                                <p className="text-xs text-amber-400 font-medium">{s.title}</p>
                                <p className="text-[10px] text-gray-600 mt-0.5">{s.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Callouts */}
                      {g.callouts.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Callouts</p>
                          <div className="flex flex-wrap gap-1.5">
                            {g.callouts.map((c, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Negative keywords */}
                      {negativeKeywords.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Keywords Negativas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {negativeKeywords.map((k, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">{k}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      {tips.length > 0 && (
                        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Dicas de Otimização</p>
                          <div className="space-y-2">
                            {tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                                <span className="text-amber-500 mt-0.5 shrink-0">→</span> {tip}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button onClick={handleGenerate} disabled={!businessName.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2">
              <AdsIcon className="w-4 h-4" />
              Gerar Campanha
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
