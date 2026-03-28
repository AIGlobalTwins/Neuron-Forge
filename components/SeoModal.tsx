"use client";

import { useState } from "react";
import type { SeoResult, ContentType } from "@/app/api/seo/route";
import { saveToHistory } from "@/lib/history";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const CONTENT_TYPES: { id: ContentType; label: string; desc: string }[] = [
  { id: "blog",    label: "Artigo de Blog",        desc: "H1, H2s, intro e conclusão" },
  { id: "landing", label: "Landing Page Copy",      desc: "Headline, benefícios e CTAs" },
  { id: "meta",    label: "Meta Tags",              desc: "Title, description e OG tags" },
  { id: "faq",     label: "FAQs",                  desc: "Q&A para featured snippets" },
  { id: "service", label: "Descrição de Serviços", desc: "Homepage, serviços e about" },
];

const TONES = [
  { id: "professional",  label: "Profissional" },
  { id: "friendly",      label: "Simpático" },
  { id: "inspirational", label: "Inspirador" },
  { id: "direct",        label: "Direto" },
];

const LANGUAGES = [
  { id: "pt", label: "Português" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

const LOADING_STEPS = [
  { label: "A analisar o teu negócio..." },
  { label: "A otimizar as keywords..." },
  { label: "A formatar o conteúdo SEO..." },
];

function SeoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8l4 4 8-8" />
    </svg>
  );
}

export function SeoModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [loadingStep, setLoadingStep] = useState(0);
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("pt");
  const [result, setResult] = useState<SeoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerate() {
    if (!businessName.trim()) { setError("Nome do negócio obrigatório."); return; }
    setStep("loading");
    setLoadingStep(0);
    setError(null);

    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < LOADING_STEPS.length) {
        setLoadingStep(idx);
        setTimeout(advance, 3000);
      }
    };
    setTimeout(advance, 2500);

    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, businessName, category, description, targetAudience, keywords, tone, language }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao gerar"); setStep("form"); return; }
      setResult(data);
      setStep("result");
      saveToHistory({ type: "seo", name: businessName, seoType: contentType, seoSections: data.sections, seoKeywords: data.keywords, seoTips: data.seoTips, seoWordCount: data.wordCount });
    } catch (err) {
      setError((err as Error).message);
      setStep("form");
    }
  }

  function copySection(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyAll() {
    if (!result) return;
    const text = result.sections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadTxt() {
    if (!result) return;
    const text = [
      `SEO Content — ${businessName}`,
      `Tipo: ${CONTENT_TYPES.find(c => c.id === contentType)?.label}`,
      `Gerado por Neuron Forge Agents\n`,
      "─".repeat(50),
      ...result.sections.map(s => `\n## ${s.title}\n\n${s.content}`),
      "\n" + "─".repeat(50),
      "\nKeywords: " + result.keywords.join(", "),
      "\nDicas SEO:\n" + result.seoTips.map(t => `• ${t}`).join("\n"),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-${businessName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col transition-all ${
          step === "result" ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <SeoIcon />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">SEO Content Agent</h2>
              <p className="text-gray-600 text-xs">
                {step === "form" && "Conteúdo otimizado para motores de pesquisa"}
                {step === "loading" && "A gerar..."}
                {step === "result" && result && `${result.sections.length} secções · ~${result.wordCount} palavras`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "result" && result && (
              <>
                <button
                  onClick={downloadTxt}
                  className="px-3 py-1.5 text-xs border border-[#2a2a2a] hover:border-emerald-500/40 text-gray-400 hover:text-emerald-400 rounded-lg transition-all"
                >
                  Download .txt
                </button>
                <button
                  onClick={copyAll}
                  className="px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all flex items-center gap-1.5"
                >
                  {copied === "all" ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar tudo</>}
                </button>
              </>
            )}
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* ── FORM ── */}
          {step === "form" && (
            <div className="px-6 py-6 space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-xs">{error}</div>
              )}

              {/* Content type — 2-column compact grid */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Tipo de conteúdo</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => setContentType(ct.id)}
                      className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        contentType === ct.id
                          ? "border-emerald-500/60 bg-emerald-500/8 text-white"
                          : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-400"
                      }`}
                      style={contentType === ct.id ? { backgroundColor: "rgba(16,185,129,0.06)" } : {}}
                    >
                      <span className="text-xs font-semibold leading-tight">{ct.label}</span>
                      <span className="text-[10px] text-gray-600 leading-tight">{ct.desc}</span>
                    </button>
                  ))}
                  {/* 5th item spans full width */}
                </div>
              </div>

              {/* Business info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do negócio <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="La Vecchia Roma"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Restaurante Italiano"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Sobre o negócio</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Restaurante italiano autêntico em Lisboa, especializado em pizzas artesanais e massas frescas..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Keywords alvo <span className="text-gray-600 font-normal">— opcional</span></label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="restaurante italiano lisboa, pizza artesanal, massa fresca"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Separa por vírgulas</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Público-alvo <span className="text-gray-600 font-normal">— opcional</span></label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Famílias e casais em Lisboa que procuram experiência italiana autêntica"
                  className={inputClass}
                />
              </div>

              {/* Tone + Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Tom</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TONES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTone(t.id)}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${
                          tone === t.id
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                            : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Idioma</label>
                  <div className="flex gap-1.5">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLanguage(l.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                          language === l.id
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                            : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LOADING ── */}
          {step === "loading" && (
            <div className="px-6 py-12 flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-16 h-16 animate-spin" style={{ animationDuration: "2s" }}>
                  <defs>
                    <linearGradient id="seo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="url(#seo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="200" strokeDashoffset="50" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                  <SeoIcon />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium text-sm">{LOADING_STEPS[loadingStep]?.label}</p>
                <p className="text-gray-600 text-xs">Claude está a otimizar o conteúdo para SEO...</p>
              </div>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "w-6 bg-emerald-500" : "w-2 bg-[#2a2a2a]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === "result" && result && (
            <div className="flex flex-col">
              {/* Stats bar */}
              <div className="px-6 py-2.5 border-b border-[#1e1e1e] bg-emerald-500/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="text-white font-medium">{CONTENT_TYPES.find(c => c.id === result.type)?.label}</span>
                  <span>~{result.wordCount} palavras</span>
                  <span>{result.sections.length} secções</span>
                </div>
                <button
                  onClick={() => { setStep("form"); setResult(null); }}
                  className="text-xs text-gray-600 hover:text-gray-400 transition"
                >
                  ← Novo conteúdo
                </button>
              </div>

              <div className="flex overflow-hidden" style={{ maxHeight: "calc(90vh - 130px)" }}>
                {/* Sections */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {result.sections.map((section, i) => (
                    <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden group">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
                        <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">{section.title}</span>
                        <button
                          onClick={() => copySection(section.content, `s-${i}`)}
                          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-emerald-400 transition opacity-0 group-hover:opacity-100"
                        >
                          {copied === `s-${i}` ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar</>}
                        </button>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sidebar */}
                <div className="w-52 flex-shrink-0 border-l border-[#1e1e1e] overflow-y-auto p-4 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">Keywords</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.map((kw, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">Dicas SEO</div>
                    <ul className="space-y-3">
                      {result.seoTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">→</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{result.wordCount}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">palavras geradas</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — sticky generate button */}
        {step === "form" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button
              onClick={handleGenerate}
              disabled={!businessName.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center justify-center gap-2"
            >
              <SeoIcon />
              Gerar {CONTENT_TYPES.find(c => c.id === contentType)?.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
