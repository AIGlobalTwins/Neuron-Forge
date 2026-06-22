"use client";

import { useState, useEffect, useRef } from "react";
import type { SecurityFinding, SecurityResult, SecurityRating } from "@/app/api/security/route";
import { saveToHistory } from "@/lib/history";
import { safeJson } from "@/lib/api";
import { useClientWorkspace } from "@/lib/client-context";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const SEVERITY_CONFIG = {
  critical: { label: "Critical", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "bg-red-500/20 text-red-400 border-red-500/30", dot: "bg-red-500" },
  high:     { label: "High",     bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medium",   bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Low",      bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
  info:     { label: "Info",     bg: "bg-gray-500/10", border: "border-gray-500/20", text: "text-gray-400", badge: "bg-gray-500/20 text-gray-400 border-gray-500/20", dot: "bg-gray-500" },
};

const SEVERITY_ORDER: (keyof typeof SEVERITY_CONFIG)[] = ["critical", "high", "medium", "low", "info"];

const LOADING_STEPS = [
  { label: "Connecting to the website...", duration: 2000 },
  { label: "Analyzing security headers...", duration: 3000 },
  { label: "Checking for exposed paths...", duration: 3000 },
  { label: "Analyzing code and forms...", duration: 0 },
];

const RATING_CONFIG: Record<SecurityRating, { text: string; border: string; bg: string; label: string; dot: string }> = {
  secure:     { text: "text-green-400",  border: "border-green-500",  bg: "bg-green-500/10",  label: "Secure",     dot: "bg-green-500" },
  moderate:   { text: "text-yellow-400", border: "border-yellow-500", bg: "bg-yellow-500/10", label: "Moderate",   dot: "bg-yellow-500" },
  vulnerable: { text: "text-orange-400", border: "border-orange-500", bg: "bg-orange-500/10", label: "Vulnerable", dot: "bg-orange-500" },
  critical:   { text: "text-red-400",    border: "border-red-500",    bg: "bg-red-500/10",    label: "Critical",   dot: "bg-red-500" },
};

function ShieldIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6L12 2z" />
      <path d="M9 12l2 2 4-4" />
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

export function SecurityModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [url, setUrl] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<SecurityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const ws = useClientWorkspace();
  const activeClient = ws?.activeClient ?? null;
  const prefilledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeClient) return;
    if (prefilledRef.current === activeClient.id) return; // fill once per client; don't clobber edits
    prefilledRef.current = activeClient.id;
    // set EVERY form field that maps to a client property, OVERRIDING defaults:
    if (typeof activeClient.website === "string" && activeClient.website.trim()) setUrl(activeClient.website);
  }, [activeClient]);

  async function handleDownloadPdf() {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/security/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const hostname = new URL(result.url).hostname.replace(/^www\./, "");
      a.download = `security-audit-${hostname}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSubmit() {
    if (!url.trim()) return;
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
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setError(data.error ?? "Unexpected error");
        setStep("form");
        return;
      }
      setResult(data);
      setStep("result");
      const hostname = (() => { try { return new URL(data.url).hostname.replace(/^www\./, ""); } catch { return url.trim(); } })();
      saveToHistory({
        type: "security",
        name: hostname,
        securityUrl: data.url,
        securityScore: data.score,
        securityRating: data.rating,
        securitySummary: data.summary,
        securityFindings: data.findings.map((f: SecurityFinding) => ({ severity: f.severity, title: f.title, category: f.category })),
        securityTechDetected: data.techDetected,
      }, activeClient?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
      setStep("form");
    }
  }

  function copyReport() {
    if (!result) return;
    const lines = [
      `Security Audit — ${result.url}`,
      `Rating: ${result.rating.toUpperCase()}`,
      ``,
      result.summary,
      ``,
      ...result.findings.map((f) =>
        `[${f.severity.toUpperCase()}] ${f.title}\n${f.description}\n→ ${f.recommendation}${f.evidence ? `\nEvidence: ${f.evidence}` : ""}`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const colors = result ? RATING_CONFIG[result.rating] : null;
  const grouped = result
    ? SEVERITY_ORDER.reduce((acc, sev) => {
        acc[sev] = result.findings.filter((f) => f.severity === sev);
        return acc;
      }, {} as Record<string, SecurityFinding[]>)
    : {};

  const filteredFindings = result
    ? filterSeverity === "all"
      ? result.findings
      : result.findings.filter((f) => f.severity === filterSeverity)
    : [];

  return (
    <div className="w-full max-w-4xl mx-auto fade-up">
      <div className={`w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Security Agent</h2>
              <p className="text-gray-600 text-xs">
                {step === "form" && "Passive security audit — public code"}
                {step === "loading" && LOADING_STEPS[loadingStep]?.label}
                {step === "result" && result && `${result.findings.length} findings · ${result.url}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "result" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                  ) : (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v8M5 7l3 3 3-3M2 12h12" /></svg>
                  )}
                  {downloadingPdf ? "Generating..." : "Download PDF"}
                </button>
                <button
                  onClick={copyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a] text-xs transition-all"
                >
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
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
            <div className="px-6 py-8 space-y-6 max-w-xl mx-auto">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="text-center space-y-2 pb-2">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                  <ShieldIcon className="w-7 h-7" />
                </div>
                <h3 className="text-white font-semibold">Audit Website</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Analyzes headers, JS code, forms, comments, and exposed paths. Passive audit — no payloads are sent.
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Website URL *</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>

              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">What gets analyzed</p>
                {[
                  "HTTP security headers (CSP, HSTS, X-Frame-Options…)",
                  "Inline scripts — API keys, tokens, sensitive data",
                  "Forms — unprotected fields, insecure autocomplete",
                  "HTML comments with exposed information",
                  "Libraries running outdated versions",
                  "Common accessible paths (/.env, /.git/config…)",
                  "Technologies and versions exposed in headers",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-1 h-1 rounded-full bg-red-500/60 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!url.trim()}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2"
              >
                <ShieldIcon className="w-4 h-4" />
                Start Audit
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {step === "loading" && (
            <div className="px-6 py-16 flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border border-red-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
                <div className="absolute inset-0 rounded-full border border-red-500/20" />
                <div className="absolute inset-2.5 rounded-full bg-[#111] border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldIcon className="w-7 h-7" />
                </div>
              </div>
              <div className="space-y-3 w-full max-w-xs">
                {LOADING_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i === loadingStep ? "text-white" : i < loadingStep ? "text-gray-600" : "text-gray-700"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < loadingStep ? "bg-green-500" : i === loadingStep ? "bg-red-500 animate-pulse" : "bg-[#1a1a1a] border border-[#2a2a2a]"
                    }`}>
                      {i < loadingStep && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="white"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" fill="none" /></svg>}
                    </div>
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === "result" && result && colors && (
            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-64 shrink-0 border-r border-[#1e1e1e] bg-[#080808] flex flex-col">
                {/* Rating */}
                <div className={`px-5 py-5 border-b border-[#1e1e1e] ${colors.bg}`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                    <p className={`text-base font-bold ${colors.text}`}>{colors.label}</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{result.summary}</p>
                </div>

                {/* Severity counts */}
                <div className="px-5 py-4 border-b border-[#1e1e1e] space-y-2">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Findings</p>
                  {SEVERITY_ORDER.map((sev) => {
                    const count = grouped[sev]?.length ?? 0;
                    if (count === 0) return null;
                    const cfg = SEVERITY_CONFIG[sev];
                    return (
                      <button
                        key={sev}
                        onClick={() => setFilterSeverity(filterSeverity === sev ? "all" : sev)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs ${
                          filterSeverity === sev ? `${cfg.bg} ${cfg.border} ${cfg.text}` : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#111]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </div>
                        <span className="font-semibold">{count}</span>
                      </button>
                    );
                  })}
                  {filterSeverity !== "all" && (
                    <button
                      onClick={() => setFilterSeverity("all")}
                      className="w-full text-[10px] text-gray-600 hover:text-gray-400 py-1 transition-colors"
                    >
                      View all ({result.findings.length})
                    </button>
                  )}
                </div>

                {/* Tech detected */}
                {result.techDetected.length > 0 && (
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Technologies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.techDetected.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-[#111] border border-[#2a2a2a] rounded-full text-gray-500">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Passed checks */}
                {result.passedChecks && result.passedChecks.length > 0 && (
                  <div className="px-5 py-4 border-t border-[#1e1e1e]">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Passed checks ({result.passedChecks.length})</p>
                    <div className="space-y-1.5">
                      {result.passedChecks.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px]">
                          <svg viewBox="0 0 16 16" className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>
                          <span className="text-gray-500">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Restart */}
                <div className="mt-auto px-5 py-4 border-t border-[#1e1e1e]">
                  <button
                    onClick={() => { setResult(null); setStep("form"); setFilterSeverity("all"); setExpandedIdx(null); }}
                    className="w-full py-2 rounded-xl text-xs text-gray-600 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all"
                  >
                    ← New audit
                  </button>
                </div>
              </div>

              {/* Findings list */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
                {filteredFindings.length === 0 ? (
                  <div className="text-center py-12 text-gray-600 text-sm">Nenhum finding para este filtro.</div>
                ) : (
                  filteredFindings.map((f, i) => {
                    const cfg = SEVERITY_CONFIG[f.severity];
                    const isOpen = expandedIdx === i;
                    return (
                      <div key={i} className={`border rounded-xl overflow-hidden transition-all ${cfg.border} ${isOpen ? cfg.bg : "bg-[#111] hover:bg-[#131313]"}`}>
                        <button
                          onClick={() => setExpandedIdx(isOpen ? null : i)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                              <span className="text-[10px] text-gray-600 px-2 py-0.5 bg-[#1a1a1a] rounded-full border border-[#2a2a2a]">{f.category}</span>
                            </div>
                            <p className="text-sm text-gray-300 font-medium mt-1.5">{f.title}</p>
                          </div>
                          <svg viewBox="0 0 16 16" className={`w-3.5 h-3.5 text-gray-600 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 space-y-3 border-t border-[#1e1e1e]">
                            <div className="pt-3">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Problema</p>
                              <p className="text-xs text-gray-400 leading-relaxed">{f.description}</p>
                            </div>
                            {f.evidence && (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Evidence</p>
                                <pre className="text-[10px] text-gray-500 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{f.evidence}</pre>
                              </div>
                            )}
                            <div className={`rounded-lg p-3 ${cfg.bg} border ${cfg.border}`}>
                              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 ${cfg.text}">Recommendation</p>
                              <p className={`text-xs leading-relaxed ${cfg.text}`}>{f.recommendation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
