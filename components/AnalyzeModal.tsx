"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

interface AnalyzeResult {
  id: string;
  score: number;
  reasoning: string;
  screenshotBase64: string;
  palette: string;
}

const SCORE_LABEL: Record<number, string> = {
  1: "Critical", 2: "Critical", 3: "Critical",
  4: "Outdated", 5: "Outdated",
  6: "Mediocre", 7: "Mediocre",
  8: "Solid", 9: "Solid", 10: "Solid",
};

function scoreColor(score: number) {
  if (score <= 3) return { border: "border-red-500", text: "text-red-400", bg: "bg-red-500/10" };
  if (score <= 5) return { border: "border-[#E8622A]", text: "text-[#E8622A]", bg: "bg-[#E8622A]/10" };
  if (score <= 7) return { border: "border-yellow-500", text: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { border: "border-green-500", text: "text-green-400", bg: "bg-green-500/10" };
}

const LOADING_STEPS = [
  { label: "Loading website...", duration: 4000 },
  { label: "Taking screenshot...", duration: 3000 },
  { label: "Analysing design with Claude Vision...", duration: 6000 },
  { label: "Generating redesign...", duration: 0 },
];

export function AnalyzeModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Business");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"before" | "after">("after");

  async function handleSubmit() {
    if (!url.trim()) return;
    setStep("loading");
    setLoadingStep(0);
    setError(null);

    // Progress through loading steps visually
    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < LOADING_STEPS.length) {
        setLoadingStep(idx);
        if (LOADING_STEPS[idx].duration > 0) {
          setTimeout(advance, LOADING_STEPS[idx].duration);
        }
      }
    };
    if (LOADING_STEPS[0].duration > 0) {
      setTimeout(advance, LOADING_STEPS[0].duration);
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), name: name.trim() || url, category }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStep("form");
        return;
      }

      setResult(data);
      setStep("result");
    } catch (err) {
      setError((err as Error).message);
      setStep("form");
    }
  }

  const colors = result ? scoreColor(result.score) : null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden transition-all ${
          step === "result" ? "max-w-5xl w-full" : "max-w-md w-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <div className="font-bold text-white">Analyze Website</div>
            <div className="text-xs text-gray-500">Screenshot → AI assessment → redesign</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* ── Form ── */}
        {step === "form" && (
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Website URL *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                placeholder="https://example.com"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                placeholder="Optional — helps generate better content"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors"
              >
                <option>Business</option>
                <option>Restaurant</option>
                <option>Beauty / Salon</option>
                <option>Fitness / Gym</option>
                <option>Legal / Law</option>
                <option>Healthcare</option>
                <option>Real Estate</option>
                <option>Technology</option>
                <option>Retail / Shop</option>
              </select>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <div className="text-gray-400 font-medium mb-1.5">What happens:</div>
              <div>① Playwright screenshots your site at 1280×800</div>
              <div>② Claude Vision scores design quality 1–10</div>
              <div>③ Claude generates a full modern redesign</div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[#2a2a2a] rounded-lg text-gray-400 text-sm hover:border-[#444] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!url.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#E8622A] hover:bg-[#d4561f] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor"><path d="M2 1l9 5-9 5V1z" /></svg>
                Analyse
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {step === "loading" && (
          <div className="p-10 flex flex-col items-center justify-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#E8622A]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#E8622A] animate-spin" />
              <div className="absolute inset-3 rounded-full bg-[#E8622A]/10 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
            </div>
            <div className="space-y-3 w-full max-w-xs">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i === loadingStep ? "text-white" : i < loadingStep ? "text-gray-600" : "text-gray-700"}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i < loadingStep ? "bg-green-500" : i === loadingStep ? "bg-[#E8622A] animate-pulse" : "bg-[#1a1a1a] border border-[#2a2a2a]"
                  }`}>
                    {i < loadingStep && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="white"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" fill="none" /></svg>}
                  </div>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {step === "result" && result && colors && (
          <div className="flex flex-col">
            {/* Score bar */}
            <div className={`px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between ${colors.bg}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl border-2 ${colors.border} flex flex-col items-center justify-center`}>
                  <span className={`text-2xl font-bold ${colors.text}`}>{result.score}</span>
                  <span className="text-xs text-gray-500">/10</span>
                </div>
                <div>
                  <div className={`font-semibold ${colors.text}`}>{SCORE_LABEL[result.score] ?? "—"} Design</div>
                  <div className="text-sm text-gray-400 max-w-lg">{result.reasoning}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Palette: {result.palette}</span>
                <a
                  href={`/api/preview/${result.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#E8622A] hover:bg-[#d4561f] text-white text-xs font-medium rounded-lg transition-all"
                >
                  Open Full Page ↗
                </a>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex border-b border-[#1e1e1e]">
              <button
                onClick={() => setPreviewMode("before")}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${previewMode === "before" ? "text-white border-b-2 border-[#E8622A]" : "text-gray-500 hover:text-gray-300"}`}
              >
                Before
              </button>
              <button
                onClick={() => setPreviewMode("after")}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${previewMode === "after" ? "text-white border-b-2 border-[#E8622A]" : "text-gray-500 hover:text-gray-300"}`}
              >
                After (Redesign)
              </button>
            </div>

            {/* Preview */}
            <div className="h-[60vh] overflow-hidden">
              {previewMode === "before" ? (
                <img
                  src={`data:image/png;base64,${result.screenshotBase64}`}
                  alt="Original website screenshot"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <iframe
                  src={`/api/preview/${result.id}`}
                  className="w-full h-full border-0"
                  title="Redesigned website preview"
                />
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-3 border-t border-[#1e1e1e] flex items-center justify-between bg-[#0d0d0d]">
              <button
                onClick={() => { setStep("form"); setResult(null); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                ← Analyse another
              </button>
              <a
                href={`/api/preview/${result.id}`}
                download={`redesign-${result.id}.html`}
                className="px-4 py-1.5 border border-[#2a2a2a] hover:border-[#E8622A] text-gray-400 hover:text-[#E8622A] text-xs rounded-lg transition-all"
              >
                Download HTML
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
