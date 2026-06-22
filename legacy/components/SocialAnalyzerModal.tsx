"use client";

import { useState } from "react";
import type { SocialAnalysis } from "@/app/api/social-analyzer/route";
import { useClientWorkspace } from "@/lib/client-context";
import { saveToHistory } from "@/lib/history";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const RATING: Record<SocialAnalysis["rating"], { label: string; color: string; ring: string }> = {
  weak: { label: "Weak", color: "text-red-400", ring: "#ef4444" },
  average: { label: "Average", color: "text-amber-400", ring: "#f59e0b" },
  good: { label: "Good", color: "text-emerald-400", ring: "#10b981" },
  strong: { label: "Strong", color: "text-emerald-400", ring: "#22c55e" },
};

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export function SocialAnalyzerModal({ onClose }: Props) {
  const ws = useClientWorkspace();
  const activeClient = ws?.activeClient ?? null;

  const [handle, setHandle] = useState("");
  const [screenshot, setScreenshot] = useState<string>("");
  const [step, setStep] = useState<Step>("form");
  const [result, setResult] = useState<SocialAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function analyze() {
    if (!handle.trim() && !screenshot) {
      setError("Enter an Instagram handle or drop a screenshot.");
      return;
    }
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/social-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim(), screenshot, clientProfile: activeClient ?? null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        setError(data?.error || "Analysis failed. Try again.");
        setStep("form");
        return;
      }
      const r = data as SocialAnalysis;
      setResult(r);
      setStep("result");
      saveToHistory(
        { type: "social", name: r.handle ? `@${r.handle}` : "Instagram", socialHandle: r.handle, socialScore: r.score, socialRating: r.rating, socialSummary: r.summary, socialResult: r },
        activeClient?.id ?? null,
      );
    } catch {
      setError("Analysis failed. Try again.");
      setStep("form");
    }
  }

  const input = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ec4899]/50 focus:ring-1 focus:ring-[#ec4899]/20 transition-colors";

  return (
    <div className="w-full max-w-4xl mx-auto fade-up">
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ec4899]/20 to-[#a855f7]/10 border border-[#ec4899]/30 flex items-center justify-center text-[#ec4899]">
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="14" height="14" rx="4" /><circle cx="10" cy="10" r="3.2" /><circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" /></svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Social Analyzer</h2>
              <p className="text-gray-600 text-xs">Audit any Instagram profile — yours, a client's or a competitor's.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors" title="Back">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        {/* Form */}
        {step === "form" && (
          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Instagram handle or URL</label>
              <input className={input} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@business or instagram.com/business" onKeyDown={(e) => e.key === "Enter" && analyze()} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Profile screenshot <span className="text-gray-600">(optional — gives a real visual content audit)</span></label>
              <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-[#2a2a2a] rounded-xl cursor-pointer hover:border-[#ec4899]/40 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="9.5" r="1.5" /></svg>
                <span className="text-xs text-gray-500 truncate">{screenshot ? "Screenshot added — click to replace" : "Drop / choose a screenshot of the profile + feed"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
              {screenshot && <img src={screenshot} alt="preview" className="mt-2 max-h-40 rounded-lg border border-[#1e1e1e]" />}
            </div>

            <p className="text-[11px] text-gray-600">Tip: with no APIFY_TOKEN set, add a screenshot for the best content analysis. With it set, the handle alone pulls posts automatically.</p>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button onClick={analyze} className="w-full py-3 bg-gradient-to-r from-[#ec4899] to-[#a855f7] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-all">
              Analyze profile
            </button>
          </div>
        )}

        {/* Loading */}
        {step === "loading" && (
          <div className="px-6 py-16 flex flex-col items-center justify-center gap-4">
            <svg className="w-8 h-8 animate-spin text-[#ec4899]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            <p className="text-sm text-gray-400">Auditing @{normalize(handle)}…</p>
            <p className="text-[11px] text-gray-600">Pulling data + analysing content. This can take up to a minute.</p>
          </div>
        )}

        {/* Result */}
        {step === "result" && result && <Result result={result} onReset={() => { setResult(null); setStep("form"); }} />}
      </div>
    </div>
  );
}

function normalize(s: string): string {
  return s.replace(/.*instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "").trim() || "profile";
}

function Result({ result: r, onReset }: { result: SocialAnalysis; onReset: () => void }) {
  const rate = RATING[r.rating];
  const pct = Math.max(0, Math.min(100, r.score));
  return (
    <div className="px-6 py-6 space-y-6">
      {/* Top: score + stats */}
      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1e1e1e" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={rate.ring} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 264} 264`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white">{r.score}</span>
            <span className={`text-[10px] font-semibold ${rate.color}`}>{rate.label}</span>
          </div>
        </div>
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{r.displayName || `@${r.handle}`}</h3>
            {r.verified && <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="currentColor"><path d="M12 2l2.2 2.2 3.1-.4.9 3 2.8 1.3-1.3 2.8.4 3.1-3 .9-1.3 2.8L12 19l-2.8 1.5-2.2-2.2-3.1.4-.9-3L.2 14.4l1.3-2.8-.4-3.1 3-.9L5.4 4.8 8.2 6z" /><path d="M9.5 12.5l1.8 1.8 3.5-3.8" stroke="#0d0d0d" strokeWidth="1.6" fill="none" /></svg>}
          </div>
          <div className="flex gap-5 mt-2">
            {[["Followers", r.followers], ["Following", r.following], ["Posts", r.posts]].map(([k, v]) => (
              <div key={k as string}><div className="text-base font-semibold text-white">{fmt(v as number | null)}</div><div className="text-[10px] text-gray-600 uppercase tracking-wide">{k as string}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-gray-500">
            <span className="px-2 py-0.5 bg-[#111] border border-[#2a2a2a] rounded-full">Engagement: {r.engagementRate}</span>
            <span className="px-2 py-0.5 bg-[#111] border border-[#2a2a2a] rounded-full">{r.postingCadence}</span>
            <span className="px-2 py-0.5 bg-[#111] border border-[#2a2a2a] rounded-full">Source: {r.dataSource}</span>
          </div>
        </div>
      </div>

      {r.summary && <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-[#ec4899]/40 pl-3">{r.summary}</p>}

      <Grid>
        {r.contentPillars.length > 0 && <Section title="Content pillars"><div className="flex flex-wrap gap-1.5">{r.contentPillars.map((p, i) => <span key={i} className="text-[11px] px-2 py-0.5 bg-[#ec4899]/10 border border-[#ec4899]/20 rounded-full text-[#ec4899]">{p}</span>)}</div></Section>}
        {r.bioAssessment && <Section title="Bio"><p className="text-xs text-gray-400 leading-relaxed">{r.bioAssessment}</p></Section>}
      </Grid>

      {r.hashtagStrategy && <Section title="Hashtag strategy"><p className="text-xs text-gray-400 leading-relaxed">{r.hashtagStrategy}</p></Section>}

      {r.strengths.length > 0 && (
        <Section title="Strengths">
          <ul className="space-y-1.5">{r.strengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-xs text-gray-400"><span className="text-emerald-400 mt-0.5">✓</span>{s}</li>)}</ul>
        </Section>
      )}

      {r.issues.length > 0 && (
        <Section title="Issues">
          <div className="space-y-2">{r.issues.map((it, i) => <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3"><div className="text-xs font-semibold text-amber-400">{it.title}</div><div className="text-[11px] text-gray-500 mt-0.5">{it.detail}</div></div>)}</div>
        </Section>
      )}

      {r.recommendations.length > 0 && (
        <Section title="Recommendations">
          <div className="space-y-2">{r.recommendations.map((rec, i) => <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3"><div className="text-xs font-semibold text-white">{i + 1}. {rec.title}</div><div className="text-[11px] text-gray-500 mt-0.5">{rec.detail}</div></div>)}</div>
        </Section>
      )}

      {r.contentPlan.length > 0 && (
        <Section title="7-day content plan">
          <div className="space-y-1.5">{r.contentPlan.map((d, i) => (
            <div key={i} className="flex gap-3 bg-[#111] border border-[#1e1e1e] rounded-lg p-2.5">
              <span className="text-[10px] font-semibold text-[#ec4899] w-10 shrink-0 pt-0.5">{d.day}</span>
              <div className="flex-1"><span className="text-xs text-gray-300">{d.idea}</span> <span className="text-[10px] text-gray-600">· {d.format}</span></div>
            </div>
          ))}</div>
        </Section>
      )}

      <button onClick={onReset} className="w-full py-2 rounded-xl text-xs text-gray-600 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all">← New analysis</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>;
}
