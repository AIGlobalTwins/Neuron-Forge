"use client";

import { useState } from "react";
import type { Question } from "@/app/api/consulting/questions/route";
import type { ConsultingPlan } from "@/app/api/consulting/plan/route";

interface Props {
  onClose: () => void;
  onOpenTool?: (toolId: string) => void;
}

type Step = "topic" | "questions" | "generating" | "plan";

const AREAS = [
  { id: "Estratégia", icon: "◈", desc: "Visão, posicionamento, crescimento" },
  { id: "Marketing", icon: "◉", desc: "Aquisição, marca, canais digitais" },
  { id: "Operações", icon: "◎", desc: "Processos, eficiência, produtividade" },
  { id: "Finanças", icon: "◇", desc: "Cash flow, rentabilidade, custos" },
  { id: "Recursos Humanos", icon: "◈", desc: "Equipa, cultura, retenção" },
  { id: "Tecnologia", icon: "◉", desc: "Sistemas, automação, digital" },
  { id: "Produto", icon: "◎", desc: "Desenvolvimento, roadmap, mercado" },
  { id: "Vendas", icon: "◇", desc: "Pipeline, conversão, clientes" },
];

const LOADING_STEPS = [
  { label: "A analisar as tuas respostas...", duration: 3000 },
  { label: "A construir o plano de acção...", duration: 5000 },
  { label: "A formatar o relatório...", duration: 0 },
];

const FORGE_TOOL_LABELS: Record<string, string> = {
  analyze: "Analyze & Redesign",
  maps: "Create from Google Maps",
  instagram: "Instagram Posts Agent",
  whatsapp: "WhatsApp Agent",
};

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M5 7l3 3 3-3M2 12h12" />
    </svg>
  );
}

function ForgeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2L2 6.5v7L10 18l8-4.5v-7L10 2z" />
      <path d="M10 8l-4 2.5v2L10 15l4-2.5v-2L10 8z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

export function ConsultingModal({ onClose, onOpenTool }: Props) {
  const [step, setStep] = useState<Step>("topic");
  const [area, setArea] = useState("");
  const [problem, setProblem] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<ConsultingPlan | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleGetQuestions() {
    if (!area || !problem.trim()) return;
    setLoadingQuestions(true);
    setError("");
    try {
      const res = await fetch("/api/consulting/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, problem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setStep("questions");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleBuildPlan() {
    setStep("generating");
    setLoadingStep(0);
    setError("");

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
      const res = await fetch("/api/consulting/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, problem, questions, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlan(data.plan);
      setStep("plan");
    } catch (e) {
      setError((e as Error).message);
      setStep("questions");
    }
  }

  async function handleDownloadPdf() {
    if (!plan) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/consulting/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, area }),
      });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plano-consultoria.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/20 transition-colors";
  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E8622A]/10 border border-[#E8622A]/30 flex items-center justify-center text-[#E8622A]">
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2L2 7v6l8 5 8-5V7L10 2z" />
                <path d="M10 12v4M7 10l3 2 3-2" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Consulting Agent</h2>
              <p className="text-gray-600 text-xs">
                {step === "topic" && "Selecciona a área e descreve o problema"}
                {step === "questions" && `${answeredCount}/${questions.length} perguntas respondidas`}
                {step === "generating" && "A construir o teu plano..."}
                {step === "plan" && plan?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "plan" && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8622A] hover:bg-[#d4571f] text-white text-xs font-semibold transition-all duration-200 disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                ) : <DownloadIcon />}
                {downloadingPdf ? "A gerar..." : "Download PDF"}
              </button>
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

          {/* ── STEP: TOPIC ── */}
          {step === "topic" && (
            <div className="px-6 py-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-widest">Área de Consultoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {AREAS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setArea(a.id)}
                      className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${area === a.id ? "border-[#E8622A]/60 bg-[#E8622A]/5 text-white" : "border-[#1e1e1e] text-gray-500 hover:border-[#2a2a2a] hover:text-gray-400"}`}
                    >
                      <div className="text-sm font-medium mb-0.5">{a.id}</div>
                      <div className="text-xs text-gray-600">{a.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-widest">Descreve o problema</label>
                <p className="text-xs text-gray-600 mb-3">Sê específico — quanto mais contexto deres, melhores serão as perguntas e o plano.</p>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Ex: A nossa taxa de conversão de leads caiu 40% nos últimos 3 meses. Temos mais tráfego no site mas menos pedidos de orçamento. A equipa de vendas está a fazer o mesmo trabalho mas os resultados pioraram."
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: QUESTIONS ── */}
          {step === "questions" && (
            <div className="px-6 py-6 space-y-5">
              <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A]" />
                <span className="text-xs text-gray-400">{area}</span>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-600 truncate">{problem.slice(0, 80)}{problem.length > 80 ? "..." : ""}</span>
              </div>

              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-2">
                    <label className="flex items-start gap-2.5 text-sm text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-[#E8622A]/10 border border-[#E8622A]/30 text-[#E8622A] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {q.text}
                    </label>

                    {q.type === "text" && (
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        rows={2}
                        placeholder="A tua resposta..."
                        className={`${inputClass} resize-none ml-7`}
                      />
                    )}

                    {q.type === "scale" && (
                      <div className="ml-7">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={answers[q.id] ?? "5"}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          className="w-full accent-[#E8622A]"
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>{q.scaleMin ?? "1"}</span>
                          <span className="text-[#E8622A] font-semibold">{answers[q.id] ?? "5"}/10</span>
                          <span>{q.scaleMax ?? "10"}</span>
                        </div>
                      </div>
                    )}

                    {q.type === "choice" && (
                      <div className="ml-7 grid grid-cols-2 gap-2">
                        {q.options?.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                            className={`text-left px-3 py-2 rounded-lg border text-xs transition-all duration-200 ${answers[q.id] === opt ? "border-[#E8622A]/60 bg-[#E8622A]/5 text-white" : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-400"}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === "generating" && (
            <div className="px-6 py-16 flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-16 h-16 animate-spin" style={{ animationDuration: "3s" }}>
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="#E8622A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="220" strokeDashoffset="60" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[#E8622A]">
                  <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 2L2 7v6l8 5 8-5V7L10 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium text-sm">{LOADING_STEPS[loadingStep]?.label}</p>
                <p className="text-gray-600 text-xs">Claude está a analisar os dados...</p>
              </div>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "w-6 bg-[#E8622A]" : "w-2 bg-[#2a2a2a]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: PLAN ── */}
          {step === "plan" && plan && (
            <div className="px-6 py-6 space-y-6">

              {/* Executive summary */}
              <div className="bg-[#E8622A]/5 border border-[#E8622A]/20 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-[#E8622A] uppercase tracking-widest mb-2">Resumo Executivo</p>
                <p className="text-sm text-gray-300 leading-relaxed">{plan.executive}</p>
              </div>

              {/* Diagnosis */}
              <PlanSection number="1" title="Diagnóstico — Problemas Identificados">
                <ul className="space-y-2">
                  {plan.diagnosis.map((d, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8622A] mt-2 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </PlanSection>

              {/* Objectives */}
              <PlanSection number="2" title="Objectivos">
                <ul className="space-y-2">
                  {plan.objectives.map((o, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8622A] mt-2 shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </PlanSection>

              {/* Actions */}
              <PlanSection number="3" title="Plano de Acção">
                {(() => {
                  const phases: Record<string, typeof plan.actions> = {};
                  plan.actions.forEach((a) => {
                    if (!phases[a.phase]) phases[a.phase] = [];
                    phases[a.phase].push(a);
                  });
                  return Object.entries(phases).map(([phase, items]) => (
                    <div key={phase} className="mb-4">
                      <p className="text-[10px] font-semibold text-[#E8622A] uppercase tracking-widest mb-2">{phase}</p>
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2.5">
                            <div className="flex-1">
                              <p className="text-xs text-gray-300">{item.task}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5">{item.owner}</p>
                            </div>
                            <span className="text-[10px] text-gray-600 whitespace-nowrap">{item.timing}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </PlanSection>

              {/* KPIs */}
              <PlanSection number="4" title="KPIs — Métricas de Sucesso">
                <div className="grid grid-cols-2 gap-2">
                  {plan.kpis.map((k, i) => (
                    <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-300">{k.metric}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{k.target}</p>
                    </div>
                  ))}
                </div>
              </PlanSection>

              {/* Risks */}
              <PlanSection number="5" title="Riscos & Mitigações">
                <div className="space-y-3">
                  {plan.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-[9px] font-bold text-[#E8622A] bg-[#E8622A]/10 border border-[#E8622A]/20 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5">RISCO</span>
                      <div>
                        <p className="text-xs text-gray-300">{r.risk}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">→ {r.mitigation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PlanSection>

              {/* Forge Tools */}
              {plan.forgeTools?.length > 0 && (
                <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 text-[#E8622A]"><ForgeIcon /></div>
                    <p className="text-xs font-semibold text-white uppercase tracking-widest">Ferramentas Neuron Forge</p>
                    <p className="text-[10px] text-gray-600 ml-1">— disponíveis para acelerar a execução</p>
                  </div>
                  {plan.forgeTools.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">{t.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{t.reason}</p>
                      </div>
                      {onOpenTool && (
                        <button
                          onClick={() => { onClose(); onOpenTool(t.id); }}
                          className="text-[10px] text-[#E8622A] hover:text-[#d4571f] font-semibold whitespace-nowrap transition-colors"
                        >
                          Abrir →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setPlan(null); setAnswers({}); setQuestions([]); setStep("topic"); }}
                className="w-full py-2.5 rounded-xl text-sm text-gray-600 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all"
              >
                Nova análise
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "topic" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button
              onClick={handleGetQuestions}
              disabled={loadingQuestions || !area || !problem.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#E8622A] hover:bg-[#d4571f] text-white flex items-center justify-center gap-2"
            >
              {loadingQuestions ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> A gerar perguntas...</>
              ) : (
                <>Gerar Diagnóstico <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></>
              )}
            </button>
          </div>
        )}
        {step === "questions" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600">{answeredCount}/{questions.length} respondidas</p>
              <div className="flex-1 mx-4 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full bg-[#E8622A] rounded-full transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
              </div>
            </div>
            <button
              onClick={handleBuildPlan}
              disabled={answeredCount === 0}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#E8622A] hover:bg-[#d4571f] text-white flex items-center justify-center gap-2"
            >
              Construir Plano <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-5 h-5 rounded bg-[#E8622A]/10 border border-[#E8622A]/20 flex items-center justify-center text-[#E8622A] text-[10px] font-bold shrink-0">{number}</div>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}
