"use client";

import { useEffect, useState } from "react";

interface Props {
  onClose: () => void;
}

type Step = "connect" | "configure" | "webhook" | "live";

interface Faq {
  question: string;
  answer: string;
}

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" />
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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle cx="10" cy="10" r="2.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l14 14M8.5 8.6A2.5 2.5 0 0012.4 12M6.3 5.3C4.2 6.6 2.5 8.7 1 10c2 3 5 6 9 6a9.2 9.2 0 004.7-1.3M10 4c4.5 0 7.5 3.5 9 6a16 16 0 01-2.3 3" />
    </svg>
  );
}

const stepLabels: Record<Step, string> = {
  connect: "Credenciais",
  configure: "Configurar Agente",
  webhook: "Ativar",
  live: "Agente Ativo",
};

const STEPS: Step[] = ["connect", "configure", "webhook", "live"];

export function WhatsAppModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("connect");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Connect
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  // Configure
  const [agentName, setAgentName] = useState("Assistente Virtual");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Negócio");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [services, setServices] = useState<string[]>([""]);
  const [faqs, setFaqs] = useState<Faq[]>([{ question: "", answer: "" }]);
  const [personality, setPersonality] = useState("simpático");
  const [language, setLanguage] = useState("pt");
  const [fallback, setFallback] = useState("Não tenho essa informação de momento, mas podes entrar em contacto diretamente connosco.");

  // Live
  const [status, setStatus] = useState<{ active: boolean; totalConversations: number; recentConversations: { phone: string; lastMessage: string; ts: number }[] } | null>(null);

  // Generate a verify token on mount
  useEffect(() => {
    // Use a simple random string for verify token
    setVerifyToken(`nfa-${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((data) => {
        setHasCredentials(data.hasCredentials);
        if (data.active) {
          setStatus(data);
          setStep("live");
        } else if (data.hasCredentials && data.isConfigured) {
          setStep("webhook");
        } else if (data.hasCredentials) {
          setStep("configure");
        }
        if (data.businessName) setBusinessName(data.businessName);
        if (data.agentName) setAgentName(data.agentName);
      })
      .catch(() => {});
  }, []);

  async function handleSaveCredentials() {
    if (!phoneNumberId.trim() || !accessToken.trim() || !verifyToken.trim()) {
      setError("Preenche todos os campos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappPhoneNumberId: phoneNumberId.trim(),
          whatsappAccessToken: accessToken.trim(),
          whatsappVerifyToken: verifyToken.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setHasCredentials(true);
      setStep("configure");
    } catch {
      setError("Erro ao guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveConfigure() {
    if (!businessName.trim() || !description.trim()) {
      setError("Nome e descrição são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const cleanServices = services.filter((s) => s.trim());
      const cleanFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());
      const res = await fetch("/api/whatsapp/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName, businessName, category, description, hours, services: cleanServices, faqs: cleanFaqs, personality, language, fallback }),
      });
      if (!res.ok) throw new Error();
      setStep("webhook");
    } catch {
      setError("Erro ao guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true, createdAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      const statusRes = await fetch("/api/whatsapp/status").then((r) => r.json());
      setStatus(statusRes);
      setStep("live");
    } catch {
      setError("Erro ao ativar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    await fetch("/api/whatsapp/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    setStatus((s) => s ? { ...s, active: false } : s);
  }

  function addService() { setServices((s) => [...s, ""]); }
  function updateService(i: number, v: string) { setServices((s) => s.map((x, idx) => idx === i ? v : x)); }
  function removeService(i: number) { setServices((s) => s.filter((_, idx) => idx !== i)); }

  function addFaq() { setFaqs((f) => [...f, { question: "", answer: "" }]); }
  function updateFaq(i: number, field: "question" | "answer", v: string) {
    setFaqs((f) => f.map((x, idx) => idx === i ? { ...x, [field]: v } : x));
  }
  function removeFaq(i: number) { setFaqs((f) => f.filter((_, idx) => idx !== i)); }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#25D366]/40 focus:ring-1 focus:ring-[#25D366]/20 transition-colors";
  const selectClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#25D366]/40 focus:ring-1 focus:ring-[#25D366]/20 transition-colors appearance-none";

  const currentStepIdx = STEPS.indexOf(step);

  // Detect if running on Vercel or locally
  const webhookBase = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${webhookBase}/api/whatsapp/webhook`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
              <WhatsAppIcon />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">WhatsApp Agent</h2>
              <p className="text-gray-600 text-xs">{stepLabels[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {step !== "live" && (
          <div className="flex items-center gap-0 shrink-0 px-6 py-3 border-b border-[#1a1a1a]">
            {STEPS.filter((s) => s !== "live").map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${i <= currentStepIdx ? "text-[#25D366]" : "text-gray-600"}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border transition-colors ${i < currentStepIdx ? "bg-[#25D366] border-[#25D366] text-black" : i === currentStepIdx ? "border-[#25D366] text-[#25D366]" : "border-[#2a2a2a] text-gray-600"}`}>
                    {i < currentStepIdx ? <CheckIcon /> : i + 1}
                  </div>
                  <span className="hidden sm:block">{stepLabels[s]}</span>
                </div>
                {i < STEPS.filter((s) => s !== "live").length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${i < currentStepIdx ? "bg-[#25D366]/40" : "bg-[#1e1e1e]"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP: CONNECT ── */}
          {step === "connect" && (
            <div className="px-6 py-6 space-y-5">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Como obter as credenciais</p>
                <ol className="space-y-2 text-xs text-gray-500 leading-relaxed">
                  {[
                    "Vai a developers.facebook.com e cria uma app do tipo \"Business\"",
                    "Adiciona o produto \"WhatsApp\" à tua app",
                    "Em WhatsApp → API Setup, encontras o Phone Number ID",
                    "Gera um Access Token temporário (ou configura um permanente em System Users)",
                    "O Verify Token és tu que defines — já geramos um para ti em baixo",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-[9px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone Number ID</label>
                  <input type="text" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="1234567890" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Access Token</label>
                  <div className="relative">
                    <input
                      type={showAccessToken ? "text" : "password"}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAAxxxxxx..."
                      className={inputClass}
                    />
                    <button type="button" onClick={() => setShowAccessToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      <EyeIcon open={showAccessToken} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Verify Token <span className="text-gray-600">(gerado automaticamente — podes alterar)</span>
                  </label>
                  <input type="text" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} className={inputClass} />
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: CONFIGURE ── */}
          {step === "configure" && (
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do agente</label>
                  <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Assistente Virtual" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do negócio</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Barbearia do João" className={inputClass} />
                </div>
              </div>

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
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Descrição do negócio</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Barbearia especializada em cortes clássicos e modernos, no centro de Lisboa. Atendimento com hora marcada." rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Horário de funcionamento</label>
                <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ex: Seg-Sáb 9h-19h, Dom fechado" className={inputClass} />
              </div>

              {/* Services */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400">Serviços / Produtos</label>
                  <button onClick={addService} className="flex items-center gap-1 text-[10px] text-[#25D366] hover:text-[#1db954] transition-colors">
                    <PlusIcon /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {services.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={s} onChange={(e) => updateService(i, e.target.value)} placeholder={`Serviço ${i + 1}`} className={inputClass} />
                      {services.length > 1 && (
                        <button onClick={() => removeService(i)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400">Perguntas Frequentes (FAQ)</label>
                  <button onClick={addFaq} className="flex items-center gap-1 text-[10px] text-[#25D366] hover:text-[#1db954] transition-colors">
                    <PlusIcon /> Adicionar
                  </button>
                </div>
                <div className="space-y-3">
                  {faqs.map((f, i) => (
                    <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest">FAQ {i + 1}</span>
                        {faqs.length > 1 && (
                          <button onClick={() => removeFaq(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                      <input type="text" value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="Pergunta do cliente..." className={`${inputClass} py-2 text-xs`} />
                      <textarea value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} placeholder="Resposta do agente..." rows={2} className={`${inputClass} py-2 text-xs resize-none`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Personalidade</label>
                  <div className="relative">
                    <select value={personality} onChange={(e) => setPersonality(e.target.value)} className={selectClass}>
                      <option value="simpático">Simpático</option>
                      <option value="profissional">Profissional</option>
                      <option value="direto">Direto</option>
                      <option value="descontraído">Descontraído</option>
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Língua</label>
                  <div className="relative">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
                      <option value="pt">Português</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mensagem quando não sabe responder</label>
                <textarea value={fallback} onChange={(e) => setFallback(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: WEBHOOK ── */}
          {step === "webhook" && (
            <div className="px-6 py-6 space-y-5">
              <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#25D366] mb-1">Quase lá! Cola estes valores no Meta Dashboard.</p>
                <p className="text-xs text-gray-500">Vai a developers.facebook.com → A tua app → WhatsApp → Configuration → Webhooks.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Callback URL (cola no Meta)</label>
                  <div className="flex gap-2">
                    <input readOnly value={webhookUrl} className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-gray-400 font-mono" />
                    <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-gray-300 text-xs transition-colors shrink-0">
                      Copiar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Verify Token (cola no Meta)</label>
                  <div className="flex gap-2">
                    <input readOnly value={verifyToken} className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-gray-400 font-mono" />
                    <button onClick={() => navigator.clipboard.writeText(verifyToken)} className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-gray-300 text-xs transition-colors shrink-0">
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Passos no Meta Dashboard</p>
                {[
                  "Cola a Callback URL e o Verify Token",
                  "Clica em \"Verify and Save\"",
                  "Em Webhook Fields, ativa o campo \"messages\"",
                  "Clica em \"Ativar Agente\" abaixo",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-gray-500">
                    <span className="w-4 h-4 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-[9px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>

              <div className="bg-[#111] border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2.5">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="6.5" /><path d="M8 7v4M8 5.5v.5" /></svg>
                <p className="text-xs text-gray-500 leading-relaxed">
                  O webhook precisa de estar acessível publicamente. Em produção usa o teu domínio Vercel. Em desenvolvimento usa <span className="text-yellow-500">ngrok</span> para expor o localhost.
                </p>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: LIVE ── */}
          {step === "live" && (
            <div className="px-6 py-6 space-y-5">
              {/* Status card */}
              <div className={`rounded-xl p-5 border ${status?.active ? "bg-[#25D366]/5 border-[#25D366]/20" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status?.active ? "bg-[#25D366] animate-pulse" : "bg-gray-600"}`} />
                    <span className="text-sm font-semibold text-white">{agentName || "Assistente Virtual"}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${status?.active ? "bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366]" : "bg-[#1e1e1e] border-[#2a2a2a] text-gray-500"}`}>
                    {status?.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{businessName || "—"} · {status?.totalConversations ?? 0} conversas</p>
              </div>

              {/* Toggle */}
              <div className="flex gap-3">
                {status?.active ? (
                  <button onClick={handleDeactivate} className="flex-1 py-2.5 rounded-xl text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200">
                    Desativar agente
                  </button>
                ) : (
                  <button onClick={() => setStep("webhook")} className="flex-1 py-2.5 rounded-xl text-sm border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-200">
                    Ativar agente
                  </button>
                )}
                <button onClick={() => setStep("configure")} className="flex-1 py-2.5 rounded-xl text-sm border border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] transition-all duration-200">
                  Editar configuração
                </button>
              </div>

              {/* Recent conversations */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Conversas recentes</p>
                {status?.recentConversations?.length ? (
                  <div className="space-y-2">
                    {status.recentConversations.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0">
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 font-mono">+{c.phone}</p>
                          <p className="text-xs text-gray-600 truncate">{c.lastMessage}</p>
                        </div>
                        <span className="text-[10px] text-gray-700 shrink-0">{new Date(c.ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600 text-xs">
                    Ainda sem conversas. Envia uma mensagem para o teu número WhatsApp Business.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "connect" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button
              onClick={handleSaveCredentials}
              disabled={saving || !phoneNumberId || !accessToken || !verifyToken}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#25D366] hover:bg-[#1db954] text-black flex items-center justify-center gap-2"
            >
              {saving ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> : <WhatsAppIcon />}
              {saving ? "A guardar..." : "Guardar e Continuar"}
            </button>
          </div>
        )}
        {step === "configure" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button
              onClick={handleSaveConfigure}
              disabled={saving || !businessName.trim() || !description.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#25D366] hover:bg-[#1db954] text-black flex items-center justify-center gap-2"
            >
              {saving ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> : null}
              {saving ? "A guardar..." : "Guardar Configuração →"}
            </button>
          </div>
        )}
        {step === "webhook" && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button
              onClick={handleActivate}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#25D366] hover:bg-[#1db954] text-black flex items-center justify-center gap-2"
            >
              {saving ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> : <WhatsAppIcon />}
              {saving ? "A ativar..." : "Ativar Agente"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
