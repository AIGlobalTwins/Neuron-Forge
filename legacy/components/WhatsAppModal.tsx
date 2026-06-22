"use client";

import { useEffect, useState } from "react";
import { safeJson } from "@/lib/api";
import { useClientWorkspace } from "@/lib/client-context";

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
  connect: "Credentials",
  configure: "Configure Agent",
  webhook: "Activate",
  live: "Agent Live",
};

const STEPS: Step[] = ["connect", "configure", "webhook", "live"];

export function WhatsAppModal({ onClose }: Props) {
  const ws = useClientWorkspace();
  const activeClient = ws?.activeClient ?? null;

  const [step, setStep] = useState<Step>("connect");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Connect
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [, setHasCredentials] = useState(false);

  // Configure
  const [agentName, setAgentName] = useState("Virtual Assistant");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Business");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [services, setServices] = useState<string[]>([""]);
  const [faqs, setFaqs] = useState<Faq[]>([{ question: "", answer: "" }]);
  const [personality, setPersonality] = useState("friendly");
  const [language, setLanguage] = useState("pt");
  const [fallback, setFallback] = useState("I don't have that information right now, but you can contact us directly.");

  // Pre-fill from the active client (only fields that are still empty)
  useEffect(() => {
    if (!activeClient) return;
    if (activeClient.name) setBusinessName((v) => v || activeClient.name);
    if (activeClient.category) setCategory((v) => v || activeClient.category);
    if (activeClient.description) setDescription((v) => v || activeClient.description);
    if (activeClient.hours) setHours((v) => v || activeClient.hours);
    if (Array.isArray(activeClient.services) && activeClient.services.length) {
      setServices((cur) => (cur.filter((s) => s.trim()).length ? cur : activeClient.services));
    }
    if (Array.isArray(activeClient.faqs) && activeClient.faqs.length) {
      setFaqs((cur) => (cur.filter((f) => f.question.trim() || f.answer.trim()).length ? cur : activeClient.faqs));
    }
  }, [activeClient]);

  // Live
  const [status, setStatus] = useState<{ active: boolean; totalConversations: number; recentConversations: { phone: string; lastMessage: string; ts: number }[] } | null>(null);

  // Generate a verify token on mount
  useEffect(() => {
    // Use a simple random string for verify token
    setVerifyToken(`nfa-${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => safeJson(r))
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
      setError("Fill in all fields.");
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
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveConfigure() {
    if (!businessName.trim() || !description.trim()) {
      setError("Name and description are required.");
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
      setError("Failed to save. Please try again.");
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
      const statusRes = await fetch("/api/whatsapp/status").then((r) => safeJson(r));
      setStatus(statusRes);
      setStep("live");
    } catch {
      setError("Failed to activate. Please try again.");
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
    <div className="w-full max-w-4xl mx-auto fade-up">
      <div className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl flex flex-col">

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
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">How to get your credentials</p>
                <ol className="space-y-2 text-xs text-gray-500 leading-relaxed">
                  {[
                    "Go to developers.facebook.com and create a \"Business\" type app",
                    "Add the \"WhatsApp\" product to your app",
                    "Under WhatsApp → API Setup, you'll find the Phone Number ID",
                    "Generate a temporary Access Token (or set up a permanent one under System Users)",
                    "The Verify Token is up to you — we've already generated one for you below",
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
                    Verify Token <span className="text-gray-600">(generated automatically — you can change it)</span>
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
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Agent name</label>
                  <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Virtual Assistant" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Business name</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. John's Barbershop" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
                <div className="relative">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                    {["Restaurant / Café", "Barbershop / Salon", "Clinic / Healthcare", "Fitness / Gym", "Shop / Retail", "Services / Consulting", "Hospitality", "Construction / Renovation", "Other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Business description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Barbershop specializing in classic and modern cuts, in downtown Lisbon. By appointment only." rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Opening hours</label>
                <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon-Sat 9am-7pm, Sun closed" className={inputClass} />
              </div>

              {/* Services */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400">Services / Products</label>
                  <button onClick={addService} className="flex items-center gap-1 text-[10px] text-[#25D366] hover:text-[#1db954] transition-colors">
                    <PlusIcon /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {services.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={s} onChange={(e) => updateService(i, e.target.value)} placeholder={`Service ${i + 1}`} className={inputClass} />
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
                  <label className="text-xs font-medium text-gray-400">Frequently Asked Questions (FAQ)</label>
                  <button onClick={addFaq} className="flex items-center gap-1 text-[10px] text-[#25D366] hover:text-[#1db954] transition-colors">
                    <PlusIcon /> Add
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
                      <input type="text" value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="Customer question..." className={`${inputClass} py-2 text-xs`} />
                      <textarea value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} placeholder="Agent answer..." rows={2} className={`${inputClass} py-2 text-xs resize-none`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Personality</label>
                  <div className="relative">
                    <select value={personality} onChange={(e) => setPersonality(e.target.value)} className={selectClass}>
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="direct">Direct</option>
                      <option value="relaxed">Relaxed</option>
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label>
                  <div className="relative">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
                      <option value="pt">Portuguese</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Message when it can&apos;t answer</label>
                <textarea value={fallback} onChange={(e) => setFallback(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: WEBHOOK ── */}
          {step === "webhook" && (
            <div className="px-6 py-6 space-y-5">
              <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#25D366] mb-1">Almost there! Paste these values into the Meta Dashboard.</p>
                <p className="text-xs text-gray-500">Go to developers.facebook.com → Your app → WhatsApp → Configuration → Webhooks.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Callback URL (paste into Meta)</label>
                  <div className="flex gap-2">
                    <input readOnly value={webhookUrl} className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-gray-400 font-mono" />
                    <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-gray-300 text-xs transition-colors shrink-0">
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Verify Token (paste into Meta)</label>
                  <div className="flex gap-2">
                    <input readOnly value={verifyToken} className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-gray-400 font-mono" />
                    <button onClick={() => navigator.clipboard.writeText(verifyToken)} className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-gray-300 text-xs transition-colors shrink-0">
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Steps in the Meta Dashboard</p>
                {[
                  "Paste the Callback URL and the Verify Token",
                  "Click \"Verify and Save\"",
                  "Under Webhook Fields, enable the \"messages\" field",
                  "Click \"Activate Agent\" below",
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
                  The webhook must be publicly accessible. In production, use your Vercel domain. In development, use <span className="text-yellow-500">ngrok</span> to expose localhost.
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
                    <span className="text-sm font-semibold text-white">{agentName || "Virtual Assistant"}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${status?.active ? "bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366]" : "bg-[#1e1e1e] border-[#2a2a2a] text-gray-500"}`}>
                    {status?.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{businessName || "—"} · {status?.totalConversations ?? 0} conversations</p>
              </div>

              {/* Toggle */}
              <div className="flex gap-3">
                {status?.active ? (
                  <button onClick={handleDeactivate} className="flex-1 py-2.5 rounded-xl text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200">
                    Deactivate agent
                  </button>
                ) : (
                  <button onClick={() => setStep("webhook")} className="flex-1 py-2.5 rounded-xl text-sm border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-200">
                    Activate agent
                  </button>
                )}
                <button onClick={() => setStep("configure")} className="flex-1 py-2.5 rounded-xl text-sm border border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] transition-all duration-200">
                  Edit configuration
                </button>
              </div>

              {/* Recent conversations */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Recent conversations</p>
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
                        <span className="text-[10px] text-gray-700 shrink-0">{new Date(c.ts).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center py-4 text-gray-600 text-xs">
                      No conversations yet. The agent replies automatically as soon as it receives the first message.
                    </div>
                    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">How to test</p>
                      {[
                        { n: "1", text: "Open WhatsApp on your phone" },
                        { n: "2", text: `Send a message to the number linked to the Phone Number ID` },
                        { n: "3", text: "The agent should reply within seconds — check that the webhook is active" },
                      ].map((s) => (
                        <div key={s.n} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                          <span className="text-[10px] text-gray-600 leading-relaxed">{s.text}</span>
                        </div>
                      ))}
                    </div>
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
              {saving ? "Saving..." : "Save and Continue"}
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
              {saving ? "Saving..." : "Save Configuration →"}
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
              {saving ? "Activating..." : "Activate Agent"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
