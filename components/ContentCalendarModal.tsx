"use client";

import { useState } from "react";
import { saveToHistory } from "@/lib/history";
import type { CalendarDay } from "@/app/api/content-calendar/route";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  post:       { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20" },
  story:      { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20" },
  reel:       { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20" },
  blog:       { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  newsletter: { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20" },
  rest:       { bg: "bg-gray-500/5",     text: "text-gray-600",    border: "border-gray-700/20" },
};

const LOADING_STEPS = [
  { label: "A analisar o teu negócio...", duration: 2000 },
  { label: "A planear os temas semanais...", duration: 4000 },
  { label: "A criar 30 dias de conteúdo...", duration: 6000 },
  { label: "A refinar o calendário...", duration: 0 },
];

function CalIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <rect x="7" y="14" width="3" height="3" rx="0.5" />
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

export function ContentCalendarModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Negócio");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState("");
  const [strategy, setStrategy] = useState("");
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [weeklyThemes, setWeeklyThemes] = useState<string[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

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
      const res = await fetch("/api/content-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, category, description, frequency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      setMonth(data.month);
      setStrategy(data.strategy);
      setDays(data.days);
      setWeeklyThemes(data.weeklyThemes);
      setTips(data.tips);
      setStep("result");
      const contentDays = (data.days || []).filter((d: CalendarDay) => d.type !== "rest");
      saveToHistory({
        type: "calendar",
        name: businessName,
        calendarMonth: data.month,
        calendarDayCount: contentDays.length,
      });
    } catch (e) {
      setError((e as Error).message);
      setStep("form");
    }
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors";
  const selectClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors appearance-none";

  const filteredDays = filterType === "all" ? days : days.filter((d) => d.type === filterType);
  const typeCounts = days.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <CalIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Content Calendar Agent</h2>
              <p className="text-gray-600 text-xs">
                {step === "form" && "Calendário editorial mensal com IA"}
                {step === "loading" && LOADING_STEPS[loadingStep]?.label}
                {step === "result" && `${month} · ${days.filter((d) => d.type !== "rest").length} conteúdos`}
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
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Barbearia do João" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoria</label>
                  <div className="relative">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                      {["Restaurante / Café", "Barbearia / Salão", "Clínica / Saúde", "Fitness / Ginásio", "Loja / Comércio", "Serviços / Consultoria", "Hotelaria", "Construção / Remodelação", "Outro"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Frequência</label>
                  <div className="flex gap-2">
                    {[
                      { id: "daily",    label: "Diário" },
                      { id: "weekdays", label: "Dias úteis" },
                      { id: "3x",       label: "3x/semana" },
                    ].map((f) => (
                      <button key={f.id} onClick={() => setFrequency(f.id)} className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${frequency === f.id ? "border-violet-500/60 bg-violet-500/10 text-violet-400" : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"}`}>{f.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Sobre o negócio</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que fazem, público-alvo, tom de comunicação..." rows={3} className={`${inputClass} resize-none`} />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* LOADING */}
          {step === "loading" && (
            <div className="px-6 py-16 flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-16 h-16 animate-spin" style={{ animationDuration: "3s" }}>
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="220" strokeDashoffset="60" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-violet-400">
                  <CalIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium text-sm">{LOADING_STEPS[loadingStep]?.label}</p>
                <p className="text-gray-600 text-xs">Claude está a planear o teu mês...</p>
              </div>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "w-6 bg-violet-500" : "w-2 bg-[#2a2a2a]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* RESULT */}
          {step === "result" && (
            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-60 shrink-0 border-r border-[#1e1e1e] bg-[#080808] flex flex-col">
                {/* Strategy */}
                <div className="px-5 py-4 border-b border-[#1e1e1e]">
                  <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-2">{month}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{strategy}</p>
                </div>

                {/* Weekly themes */}
                {weeklyThemes.length > 0 && (
                  <div className="px-5 py-4 border-b border-[#1e1e1e] space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Pilares</p>
                    {weeklyThemes.map((t, i) => (
                      <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/60" /> {t}
                      </div>
                    ))}
                  </div>
                )}

                {/* Type filters */}
                <div className="px-5 py-4 border-b border-[#1e1e1e] space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Filtrar</p>
                  <button onClick={() => setFilterType("all")} className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${filterType === "all" ? "bg-violet-500/10 text-violet-400" : "text-gray-500 hover:text-gray-300"}`}>
                    Todos ({days.length})
                  </button>
                  {Object.entries(typeCounts).filter(([t]) => t !== "rest").map(([type, count]) => {
                    const c = TYPE_COLORS[type] ?? TYPE_COLORS.post;
                    return (
                      <button key={type} onClick={() => setFilterType(type)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${filterType === type ? `${c.bg} ${c.text}` : "text-gray-500 hover:text-gray-300"}`}>
                        <span className="capitalize">{type}</span>
                        <span>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tips */}
                {tips.length > 0 && (
                  <div className="px-5 py-4 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Dicas</p>
                    {tips.map((tip, i) => (
                      <p key={i} className="text-[10px] text-gray-600 leading-relaxed">→ {tip}</p>
                    ))}
                  </div>
                )}

                {/* Restart */}
                <div className="mt-auto px-5 py-4 border-t border-[#1e1e1e]">
                  <button onClick={() => { setDays([]); setStep("form"); setSelectedDay(null); }} className="w-full py-2 rounded-xl text-xs text-gray-600 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all">Novo calendário</button>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                    <div key={d} className="text-center text-[10px] text-gray-600 font-medium py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar days */}
                {(() => {
                  const weekdayMap: Record<string, number> = { "Segunda": 0, "Terça": 1, "Quarta": 2, "Quinta": 3, "Sexta": 4, "Sábado": 5, "Domingo": 6, "Seg": 0, "Ter": 1, "Qua": 2, "Qui": 3, "Sex": 4, "Sáb": 5, "Dom": 6 };
                  const first = filteredDays[0];
                  const offset = first ? (weekdayMap[first.weekday] ?? 0) : 0;
                  const cells = [...Array(offset).fill(null), ...filteredDays];

                  return (
                    <div className="grid grid-cols-7 gap-1.5">
                      {cells.map((day: CalendarDay | null, i) => {
                        if (!day) return <div key={`empty-${i}`} />;
                        const c = TYPE_COLORS[day.type] ?? TYPE_COLORS.post;
                        const isSelected = selectedDay?.day === day.day;
                        return (
                          <button key={day.day} onClick={() => setSelectedDay(isSelected ? null : day)} className={`text-left p-2 rounded-lg border transition-all min-h-[70px] ${isSelected ? `${c.bg} ${c.border}` : day.type === "rest" ? "border-[#1a1a1a] bg-[#0a0a0a]" : "border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a]"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500 font-medium">{day.day}</span>
                              {day.type !== "rest" && <span className={`text-[8px] uppercase font-semibold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{day.type}</span>}
                            </div>
                            {day.type !== "rest" && <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">{day.theme}</p>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Selected day detail */}
                {selectedDay && selectedDay.type !== "rest" && (
                  <div className="mt-5 bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[selectedDay.type]?.bg} ${TYPE_COLORS[selectedDay.type]?.text}`}>{selectedDay.type}</span>
                        <span className="text-xs text-gray-400">Dia {selectedDay.day} · {selectedDay.weekday} · {selectedDay.bestTime}</span>
                      </div>
                      <button onClick={() => copy(`${selectedDay.caption}\n\n${selectedDay.hashtags}`, `day-${selectedDay.day}`)} className={`flex items-center gap-1 text-[10px] ${copiedKey === `day-${selectedDay.day}` ? "text-violet-400" : "text-gray-600 hover:text-gray-400"}`}>
                        <CopyIcon /> {copiedKey === `day-${selectedDay.day}` ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Tema</p>
                        <p className="text-sm text-white font-medium">{selectedDay.theme}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Caption</p>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedDay.caption}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Hashtags</p>
                        <p className="text-xs text-violet-400/70">{selectedDay.hashtags}</p>
                      </div>
                      {selectedDay.imageIdea && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Ideia de Imagem</p>
                          <p className="text-xs text-gray-500 italic">{selectedDay.imageIdea}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button onClick={handleGenerate} disabled={!businessName.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-2">
              <CalIcon className="w-4 h-4" />
              Gerar Calendário
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
