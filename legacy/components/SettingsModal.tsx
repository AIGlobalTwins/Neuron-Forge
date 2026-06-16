"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";
import { safeJson } from "@/lib/api";

const S = {
  pt: {
    title: "Settings", subtitle: "API Keys & Integrations",
    configured: "Configured",
    anthropicDesc: "Required to generate websites with AI. Get it at",
    keepPlaceholder: "••••••••••••  (deixa em branco para manter)",
    modelTitle: "Modelo de IA",
    modelDesc: "O modelo usado por todos os agentes. Modelos mais capazes produzem melhores resultados mas são mais lentos.",
    modelDescs: ["Mais capaz — melhor qualidade", "Muito capaz — topo anterior", "Equilibrado — rápido e capaz", "Mais rápido e barato"],
    vercelDesc: "Opcional. Para deploy automático dos websites gerados. Obtém em",
    securityNote: "Keys are stored locally on the server and never leave your machine. They are only used to authenticate API requests.",
    saving: "Saving...", saved: "Saved!", save: "Save Settings",
  },
  en: {
    title: "Settings", subtitle: "API Keys & Integrations",
    configured: "Configured",
    anthropicDesc: "Required to generate websites with AI. Get it at",
    keepPlaceholder: "••••••••••••  (leave blank to keep)",
    modelTitle: "Model",
    modelDesc: "The model used by all agents. More capable models produce better results but are slower.",
    modelDescs: ["Most capable — best quality", "Very capable — previous flagship", "Balanced — fast and capable", "Fastest and cheapest"],
    vercelDesc: "Optional. For automatic deployment of generated websites. Get it at",
    securityNote: "Keys are stored locally on the server and never leave your machine. They are only used to authenticate API requests.",
    saving: "Saving...", saved: "Saved!", save: "Save Settings",
  },
} as const;

interface Props {
  onClose: () => void;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l14 14M8.5 8.6A2.5 2.5 0 0012.4 12M6.3 5.3C4.2 6.6 2.5 8.7 1 10c2 3 5 6 9 6a9.2 9.2 0 004.7-1.3M10 4c4.5 0 7.5 3.5 9 6a16 16 0 01-2.3 3" />
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

const MODEL_IDS = ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] as const;
const MODEL_LABELS = ["Opus 4.8", "Opus 4.7", "Sonnet 4.6", "Haiku 4.5"] as const;

export function SettingsModal({ onClose }: Props) {
  const lang = useLang();
  const t = S[lang];
  const [anthropicKey, setAnthropicKey] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [claudeModel, setClaudeModel] = useState("claude-sonnet-4-6");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showVercel, setShowVercel] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [hasVercelToken, setHasVercelToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Google OAuth
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [hasGoogleClientId, setHasGoogleClientId] = useState(false);
  const [hasGoogleClientSecret, setHasGoogleClientSecret] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleProducts, setGoogleProducts] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(["business"]);
  const [googleMsg, setGoogleMsg] = useState("");

  function loadSettings() {
    fetch("/api/settings")
      .then((r) => safeJson(r))
      .then((data) => {
        setHasAnthropicKey(data.hasAnthropicKey);
        setHasVercelToken(data.hasVercelToken);
        if (data.claudeModel) setClaudeModel(data.claudeModel);
        setHasGoogleClientId(data.hasGoogleClientId);
        setHasGoogleClientSecret(data.hasGoogleClientSecret);
        setGoogleConnected(data.googleConnected);
        setGoogleEmail(data.googleEmail || "");
        setGoogleProducts(data.googleProducts || []);
      });
  }

  useEffect(() => {
    loadSettings();
    // Surface the OAuth redirect result (?google=connected|error&reason=...)
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (g === "connected") setGoogleMsg("Google account connected.");
    else if (g === "error") setGoogleMsg(`Google connection failed: ${params.get("reason") || "unknown"}.`);
    if (g) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const GOOGLE_PRODUCTS: { id: string; label: string }[] = [
    { id: "business", label: "Business Profile" },
    { id: "ads", label: "Google Ads" },
    { id: "analytics", label: "Analytics" },
    { id: "searchconsole", label: "Search Console" },
  ];

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function connectGoogle() {
    // Persist any freshly typed credentials before leaving for Google.
    if (googleClientId || googleClientSecret) {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleClientId, googleClientSecret }),
      });
    }
    const products = selectedProducts.length ? selectedProducts.join(",") : "login";
    window.location.href = `/api/google/connect?products=${products}`;
  }

  async function disconnectGoogle() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleDisconnect: true }),
    });
    loadSettings();
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = { claudeModel };
      if (anthropicKey) payload.anthropicApiKey = anthropicKey;
      if (vercelToken) payload.vercelToken = vercelToken;
      if (googleClientId) payload.googleClientId = googleClientId;
      if (googleClientSecret) payload.googleClientSecret = googleClientSecret;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      if (anthropicKey) setHasAnthropicKey(true);
      if (vercelToken) setHasVercelToken(true);
      if (googleClientId) setHasGoogleClientId(true);
      if (googleClientSecret) setHasGoogleClientSecret(true);
      setAnthropicKey("");
      setVercelToken("");
      setGoogleClientId("");
      setGoogleClientSecret("");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="2.5" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{t.title}</h2>
              <p className="text-gray-600 text-xs">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">

          {/* Anthropic */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Anthropic API Key</label>
              {hasAnthropicKey && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <CheckIcon /> {t.configured}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              {t.anthropicDesc}{" "}
              <span className="text-[#E8622A]">console.anthropic.com</span>
            </p>
            <div className="relative">
              <input
                type={showAnthropic ? "text" : "password"}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={hasAnthropicKey ? t.keepPlaceholder : "sk-ant-api03-..."}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowAnthropic((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                <EyeIcon open={showAnthropic} />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#1a1a1a]" />

          {/* Model selector */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">{t.modelTitle}</label>
            <p className="text-xs text-gray-600 mb-3">{t.modelDesc}</p>
            <div className="space-y-2">
              {MODEL_IDS.map((id, i) => (
                <button
                  key={id}
                  onClick={() => setClaudeModel(id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                    claudeModel === id
                      ? "border-[#E8622A]/60 bg-[#E8622A]/10"
                      : "border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-colors ${
                      claudeModel === id ? "border-[#E8622A]" : "border-[#3a3a3a]"
                    }`}>
                      {claudeModel === id && <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A]" />}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${claudeModel === id ? "text-white" : "text-gray-400"}`}>
                        {MODEL_LABELS[i]}
                      </div>
                      <div className="text-xs text-gray-600">{t.modelDescs[i]}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#1a1a1a]" />

          {/* Vercel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Vercel Token</label>
              {hasVercelToken && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <CheckIcon /> {t.configured}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              {t.vercelDesc}{" "}
              <span className="text-[#E8622A]">vercel.com/account/tokens</span>
            </p>
            <div className="relative">
              <input
                type={showVercel ? "text" : "password"}
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                placeholder={hasVercelToken ? t.keepPlaceholder : "vck_..."}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowVercel((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                <EyeIcon open={showVercel} />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#1a1a1a]" />

          {/* Google */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Google accounts</label>
              {googleConnected && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <CheckIcon /> Connected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Connect Business Profile, Google Ads and Analytics / Search Console via OAuth. Create an OAuth client at{" "}
              <span className="text-[#E8622A]">console.cloud.google.com</span> and paste the credentials below.
            </p>

            {googleMsg && (
              <p className={`text-xs mb-3 ${googleMsg.includes("failed") ? "text-red-400" : "text-green-500"}`}>{googleMsg}</p>
            )}

            {/* App credentials */}
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder={hasGoogleClientId ? "•••••••• (Client ID saved)" : "Client ID (xxxx.apps.googleusercontent.com)"}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 transition-colors"
              />
              <div className="relative">
                <input
                  type={showGoogleSecret ? "text" : "password"}
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder={hasGoogleClientSecret ? "•••••••• (Client Secret saved)" : "Client Secret (GOCSPX-...)"}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8622A]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowGoogleSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                  <EyeIcon open={showGoogleSecret} />
                </button>
              </div>
              <p className="text-[10px] text-gray-600">
                Authorized redirect URI: <span className="text-gray-400">{`${typeof window !== "undefined" ? window.location.origin : ""}/api/google/callback`}</span>
              </p>
            </div>

            {googleConnected ? (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 space-y-2">
                <div className="text-xs text-gray-300">{googleEmail || "Connected"}</div>
                <div className="flex flex-wrap gap-1.5">
                  {googleProducts.length === 0 && <span className="text-[10px] text-gray-600">No product scopes granted</span>}
                  {googleProducts.map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400">{p}</span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={connectGoogle} className="flex-1 py-2 rounded-lg text-xs font-medium border border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white transition-all">
                    Add / reconnect
                  </button>
                  <button onClick={disconnectGoogle} className="flex-1 py-2 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {GOOGLE_PRODUCTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                        selectedProducts.includes(p.id) ? "border-[#E8622A]/60 bg-[#E8622A]/10 text-white" : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={connectGoogle}
                  disabled={(!hasGoogleClientId && !googleClientId) || (!hasGoogleClientSecret && !googleClientSecret)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium border border-[#2a2a2a] text-gray-300 hover:border-[#E8622A]/50 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 18 18" className="w-4 h-4"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
                  Connect Google
                </button>
              </>
            )}

            <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
              Login with Google: enable Google under Social Connections in your{" "}
              <span className="text-gray-400">Clerk dashboard</span> — no extra setup here. See GOOGLE_SETUP.md for the full guide.
            </p>
          </div>

          {/* Error */}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Info note */}
          <div className="flex items-start gap-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7v4M8 5.5v.5" />
            </svg>
            <p className="text-xs text-gray-600 leading-relaxed">
              {t.securityNote}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#E8622A] hover:bg-[#d4571f] text-white flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                {t.saving}
              </>
            ) : saved ? (
              <>
                <CheckIcon /> {t.saved}
              </>
            ) : (
              t.save
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
