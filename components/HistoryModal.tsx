"use client";

import { useState, useEffect } from "react";
import {
  loadHistory,
  removeFromHistory,
  clearHistory,
  historyTypeLabel,
  historyTypeColor,
  type HistoryEntry,
  type HistoryType,
} from "@/lib/history";
import { useLang, type Lang } from "@/lib/lang";

function getFilters(lang: Lang): { id: HistoryType | "all"; label: string }[] {
  const L = lang === "en"
    ? { all: "All", consulting: "Consulting", security: "Security", calendar: "Calendar" }
    : { all: "Tudo", consulting: "Consultoria", security: "Segurança", calendar: "Calendário" };
  return [
    { id: "all",        label: L.all },
    { id: "maps",       label: "Websites" },
    { id: "analyze",    label: "Redesigns" },
    { id: "seo",        label: "SEO" },
    { id: "instagram",  label: "Instagram" },
    { id: "consulting", label: L.consulting },
    { id: "security",   label: L.security },
    { id: "email",      label: "Email" },
    { id: "ads",        label: "Google Ads" },
    { id: "calendar",   label: L.calendar },
  ];
}

function timeAgo(iso: string, lang: Lang): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (lang === "en") {
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  if (diff < 60)    return "agora mesmo";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

interface Props {
  onClose: () => void;
}


// ── Type icons ─────────────────────────────────────────────
function MapPinIcon()   { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" /><circle cx="10" cy="7" r="1.8" /></svg>; }
function ScanIcon()     { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="5" /><path d="M19 19l-3.5-3.5" /><path d="M6 9h6M9 6v6" /></svg>; }
function SearchPlusIcon(){ return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6" /><path d="M20 20l-4-4" /><path d="M6 9h6M9 6v6" /></svg>; }
function IgIcon()       { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>; }
function ConsultingIcon(){ return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 7v6l8 5 8-5V7L10 2z" /><path d="M10 12v4M7 10l3 2 3-2" /></svg>; }
function ShieldSmIcon()  { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L3 5.5v5c0 4.17 2.92 8.08 7 9.17 4.08-1.09 7-5 7-9.17v-5L10 2z" /><path d="M7.5 10l2 2 3.5-3.5" /></svg>; }
function MailSmIcon()    { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="16" height="12" rx="2" /><path d="M18 5L10 11 2 5" /></svg>; }
function AdsSmIcon()     { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 6l8 4 8-4-8-4z" /><path d="M2 14l8 4 8-4" /><path d="M2 10l8 4 8-4" /></svg>; }
function CalSmIcon()     { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="14" rx="2" /><path d="M13 2v4M7 2v4M3 9h14" /></svg>; }

function typeIcon(type: HistoryType) {
  if (type === "maps")       return <MapPinIcon />;
  if (type === "analyze")    return <ScanIcon />;
  if (type === "seo")        return <SearchPlusIcon />;
  if (type === "instagram")  return <IgIcon />;
  if (type === "consulting") return <ConsultingIcon />;
  if (type === "security")   return <ShieldSmIcon />;
  if (type === "email")      return <MailSmIcon />;
  if (type === "ads")        return <AdsSmIcon />;
  if (type === "calendar")   return <CalSmIcon />;
}

// ── SEO content type labels ─────────────────────────────────
const SEO_TYPE_LABEL: Record<string, string> = {
  blog: "Artigo de Blog", landing: "Landing Page", meta: "Meta Tags", faq: "FAQs", service: "Serviços",
};

// ── Copy helper ─────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }
  return { copiedKey, copy };
}

export function HistoryModal({ onClose }: Props) {
  const lang = useLang();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<HistoryType | "all">("all");
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const { copiedKey, copy } = useCopy();
  const TYPE_FILTERS = getFilters(lang);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  function handleRemove(id: string) {
    removeFromHistory(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleClear() {
    clearHistory();
    setEntries([]);
    setSelected(null);
  }

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-400/10 border border-gray-700/50 flex items-center justify-center">
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h14M3 10h10M3 14h7" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{lang === "en" ? "History" : "Histórico"}</h2>
              <p className="text-gray-600 text-xs">
                {lang === "en"
                  ? `${entries.length} generation${entries.length !== 1 ? "s" : ""} saved`
                  : `${entries.length} geraç${entries.length === 1 ? "ão" : "ões"} guardadas`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
              >
                {lang === "en" ? "Clear all" : "Limpar tudo"}
              </button>
            )}
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-[#1e1e1e] shrink-0">
          {TYPE_FILTERS.map((f) => {
            const count = f.id === "all" ? entries.length : entries.filter((e) => e.type === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setSelected(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filter === f.id
                    ? "bg-[#1e1e1e] text-white border border-[#2a2a2a]"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.id ? "bg-[#E8622A]/20 text-[#E8622A]" : "bg-[#1a1a1a] text-gray-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* List */}
          <div className={`flex-shrink-0 overflow-y-auto border-r border-[#1e1e1e] ${selected ? "w-64" : "w-full"}`}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#1e1e1e] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 20 20" className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h14M3 10h10M3 14h7" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">{lang === "en" ? "No generations saved yet." : "Ainda não há gerações guardadas."}</p>
                <p className="text-gray-700 text-xs mt-1">{lang === "en" ? "Generations are saved automatically." : "As gerações são guardadas automaticamente."}</p>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {filtered.map((entry) => {
                  const c = historyTypeColor(entry.type);
                  const isActive = selected?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelected(isActive ? null : entry)}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center gap-3 group ${
                        isActive
                          ? "bg-[#111] border-[#2a2a2a]"
                          : "border-transparent hover:bg-[#111] hover:border-[#1e1e1e]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center ${c.text} flex-shrink-0`}>
                        {typeIcon(entry.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{entry.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium ${c.text}`}>{historyTypeLabel(entry.type)}</span>
                          {entry.seoType && <span className="text-[10px] text-gray-600">· {SEO_TYPE_LABEL[entry.seoType] ?? entry.seoType}</span>}
                          {entry.score !== undefined && <span className="text-[10px] text-gray-600">· score {entry.score}/10</span>}
                          {entry.consultingArea && <span className="text-[10px] text-gray-600">· {entry.consultingArea}</span>}
                          {entry.securityRating && <span className="text-[10px] text-gray-600">· {entry.securityRating}</span>}
                          {entry.emailSequenceType && <span className="text-[10px] text-gray-600">· {entry.emailSequenceType} · {entry.emailCount} emails</span>}
                          {entry.adsCampaignType && <span className="text-[10px] text-gray-600">· {entry.adsCampaignType} · {entry.adsHeadlineCount} headlines</span>}
                          {entry.calendarMonth && <span className="text-[10px] text-gray-600">· {entry.calendarMonth} · {entry.calendarDayCount} {lang === "en" ? "days" : "dias"}</span>}
                          <span className="text-[10px] text-gray-700 ml-auto">{timeAgo(entry.date, lang)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(entry.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                          <path d="M3 3l10 10M13 3L3 13" />
                        </svg>
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail */}
          {selected && (
            <div className="flex-1 overflow-y-auto">
              <DetailView entry={selected} copiedKey={copiedKey} onCopy={copy} lang={lang} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail views ────────────────────────────────────────────
function DetailView({ entry, copiedKey, onCopy, lang }: { entry: HistoryEntry; copiedKey: string | null; onCopy: (t: string, k: string) => void; lang: Lang }) {
  const c = historyTypeColor(entry.type);

  // Website (maps / analyze)
  if ((entry.type === "maps" || entry.type === "analyze") && entry.websiteId) {
    return (
      <div className="flex flex-col h-full">
        <div className={`px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between shrink-0 ${c.bg}`}>
          <div>
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>{historyTypeLabel(entry.type)}</span>
            <div className="text-white font-semibold text-sm">{entry.name}</div>
            {entry.score !== undefined && <div className="text-xs text-gray-500">Score original: {entry.score}/10</div>}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/preview/${entry.websiteId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#E8622A] hover:bg-[#d4561f] text-white text-xs font-medium rounded-lg transition-all"
            >
              {lang === "en" ? "Open ↗" : "Abrir ↗"}
            </a>
            <a
              href={`/api/preview/${entry.websiteId}`}
              download={`website-${entry.websiteId}.html`}
              className="px-3 py-1.5 border border-[#2a2a2a] hover:border-[#E8622A] text-gray-400 hover:text-[#E8622A] text-xs rounded-lg transition-all"
            >
              Download HTML
            </a>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`/api/preview/${entry.websiteId}`}
            className="w-full h-full border-0"
            title="Website preview"
          />
        </div>
      </div>
    );
  }

  // SEO
  if (entry.type === "seo" && entry.seoSections) {
    const allText = entry.seoSections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>{SEO_TYPE_LABEL[entry.seoType ?? ""] ?? "SEO"}</span>
            <div className="text-white font-semibold">{entry.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">{entry.seoWordCount} {lang === "en" ? "words" : "palavras"} · {entry.seoSections.length} {lang === "en" ? "sections" : "secções"}</div>
          </div>
          <button
            onClick={() => onCopy(allText, "seo-all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${copiedKey === "seo-all" ? `${c.bg} ${c.border} ${c.text}` : "border-[#2a2a2a] text-gray-500 hover:text-white"}`}
          >
            {copiedKey === "seo-all" ? "✓" : (lang === "en" ? "Copy all" : "Copiar tudo")}
          </button>
        </div>

        {entry.seoSections.map((s, i) => (
          <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden group">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
              <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">{s.title}</span>
              <button
                onClick={() => onCopy(s.content, `seo-s-${i}`)}
                className={`text-[10px] transition opacity-0 group-hover:opacity-100 ${copiedKey === `seo-s-${i}` ? c.text : "text-gray-600 hover:text-white"}`}
              >
                {copiedKey === `seo-s-${i}` ? "✓" : (lang === "en" ? "Copy" : "Copiar")}
              </button>
            </div>
            <p className="px-4 py-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{s.content}</p>
          </div>
        ))}

        {entry.seoKeywords && entry.seoKeywords.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-2">Keywords</div>
            <div className="flex flex-wrap gap-1.5">
              {entry.seoKeywords.map((kw, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full ${c.bg} border ${c.border} ${c.text}`}>{kw}</span>
              ))}
            </div>
          </div>
        )}

        {entry.seoTips && entry.seoTips.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-2">{lang === "en" ? "SEO Tips" : "Dicas SEO"}</div>
            <ul className="space-y-2">
              {entry.seoTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                  <span className={`${c.text} mt-0.5 flex-shrink-0`}>→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Consulting
  if (entry.type === "consulting" && entry.consultingPlan) {
    const plan = entry.consultingPlan;
    return (
      <div className="p-5 space-y-4">
        <div>
          <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>{lang === "en" ? "Consulting" : "Consultoria"} — {entry.consultingArea}</span>
          <div className="text-white font-semibold">{plan.title}</div>
        </div>

        <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">{lang === "en" ? "Executive Summary" : "Resumo Executivo"}</p>
          <p className="text-sm text-gray-300 leading-relaxed">{plan.executive}</p>
        </div>

        {plan.diagnosis.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Diagnóstico</p>
            <ul className="space-y-1.5">
              {plan.diagnosis.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400"><span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-orange-500`} />{d}</li>
              ))}
            </ul>
          </div>
        )}

        {plan.objectives.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Objectivos</p>
            <ul className="space-y-1.5">
              {plan.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400"><span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-orange-500`} />{o}</li>
              ))}
            </ul>
          </div>
        )}

        {plan.actions.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Plano de Acção</p>
            <div className="space-y-2">
              {plan.actions.map((a, i) => (
                <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2.5 flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-300">{a.task}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{a.phase} · {a.owner}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">{a.timing}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.kpis.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">KPIs</p>
            <div className="grid grid-cols-2 gap-2">
              {plan.kpis.map((k, i) => (
                <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-300">{k.metric}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{k.target}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.risks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Riscos</p>
            <div className="space-y-2">
              {plan.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5">RISCO</span>
                  <div>
                    <p className="text-xs text-gray-300">{r.risk}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">→ {r.mitigation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Security
  if (entry.type === "security" && entry.securityFindings) {
    const SEVERITY_DOTS: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-400", info: "bg-gray-500" };
    const SEVERITY_LABELS: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" };
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>Auditoria de Segurança</span>
            <div className="text-white font-semibold">{entry.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">{entry.securityUrl}</div>
          </div>
          {entry.securityRating && (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${c.bg} border ${c.border} ${c.text}`}>
              {entry.securityRating === "secure" ? "Seguro" : entry.securityRating === "moderate" ? "Moderado" : entry.securityRating === "vulnerable" ? "Vulnerável" : "Crítico"}
            </div>
          )}
        </div>

        {entry.securitySummary && (
          <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
            <p className="text-sm text-gray-300 leading-relaxed">{entry.securitySummary}</p>
          </div>
        )}

        {entry.securityFindings.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Findings ({entry.securityFindings.length})</p>
            <div className="space-y-1.5">
              {entry.securityFindings.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOTS[f.severity] ?? "bg-gray-500"}`} />
                  <span className="text-[10px] text-gray-600 uppercase font-semibold w-14 shrink-0">{SEVERITY_LABELS[f.severity] ?? f.severity}</span>
                  <span className="text-xs text-gray-300 flex-1">{f.title}</span>
                  <span className="text-[10px] text-gray-600 px-2 py-0.5 bg-[#0d0d0d] rounded-full border border-[#1e1e1e]">{f.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.securityTechDetected && entry.securityTechDetected.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Tecnologias Detectadas</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.securityTechDetected.map((t, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-[#111] border border-[#2a2a2a] rounded-full text-gray-500">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Instagram
  if (entry.type === "instagram" && entry.posts) {
    return (
      <div className="p-5 space-y-4">
        <div>
          <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>Instagram</span>
          <div className="text-white font-semibold">{entry.name}</div>
          <div className="text-xs text-gray-600 mt-0.5">{entry.posts.length} post{entry.posts.length > 1 ? "s" : ""} gerado{entry.posts.length > 1 ? "s" : ""}</div>
        </div>
        {entry.posts.map((post, i) => (
          <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
              <span className="text-xs font-medium text-gray-400">Post {i + 1}</span>
              <button
                onClick={() => onCopy(`${post.caption}\n\n${post.hashtags}`, `ig-${i}`)}
                className={`text-xs transition ${copiedKey === `ig-${i}` ? c.text : "text-gray-600 hover:text-white"}`}
              >
                {copiedKey === `ig-${i}` ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
              <p className={`text-xs ${c.text} opacity-70 leading-relaxed`}>{post.hashtags}</p>
              {post.imagePrompt && (
                <div className="bg-[#0d0d0d] rounded-lg px-3 py-2 mt-2">
                  <span className="text-[10px] text-gray-600 block mb-1">Sugestão de imagem</span>
                  <p className="text-xs text-gray-500 italic">{post.imagePrompt}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-gray-600 text-sm">
      Sem detalhe disponível.
    </div>
  );
}
