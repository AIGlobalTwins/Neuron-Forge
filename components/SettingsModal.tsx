"use client";

import { useEffect, useState } from "react";

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

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Equilibrado — rápido e capaz" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", desc: "Mais capaz — mais lento e caro" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", desc: "Mais rápido e barato" },
];

export function SettingsModal({ onClose }: Props) {
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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setHasAnthropicKey(data.hasAnthropicKey);
        setHasVercelToken(data.hasVercelToken);
        if (data.claudeModel) setClaudeModel(data.claudeModel);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = { claudeModel };
      if (anthropicKey) payload.anthropicApiKey = anthropicKey;
      if (vercelToken) payload.vercelToken = vercelToken;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      if (anthropicKey) setHasAnthropicKey(true);
      if (vercelToken) setHasVercelToken(true);
      setAnthropicKey("");
      setVercelToken("");
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
      <div className="relative z-10 w-full max-w-md bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl">

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
              <h2 className="text-white font-semibold text-sm">Configurações</h2>
              <p className="text-gray-600 text-xs">API Keys & Integrações</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">

          {/* Anthropic */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Anthropic API Key</label>
              {hasAnthropicKey && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <CheckIcon /> Configurado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Necessário para gerar websites com Claude. Obtém em{" "}
              <span className="text-[#E8622A]">console.anthropic.com</span>
            </p>
            <div className="relative">
              <input
                type={showAnthropic ? "text" : "password"}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={hasAnthropicKey ? "••••••••••••  (deixa em branco para manter)" : "sk-ant-api03-..."}
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
            <label className="text-sm font-medium text-gray-300 mb-2 block">Modelo Claude</label>
            <p className="text-xs text-gray-600 mb-3">
              O modelo usado por todos os agentes. Modelos mais capazes produzem melhores resultados mas são mais lentos.
            </p>
            <div className="space-y-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setClaudeModel(m.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                    claudeModel === m.id
                      ? "border-[#E8622A]/60 bg-[#E8622A]/10"
                      : "border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-colors ${
                      claudeModel === m.id ? "border-[#E8622A]" : "border-[#3a3a3a]"
                    }`}>
                      {claudeModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A]" />}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${claudeModel === m.id ? "text-white" : "text-gray-400"}`}>
                        {m.label}
                      </div>
                      <div className="text-xs text-gray-600">{m.desc}</div>
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
                  <CheckIcon /> Configurado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Opcional. Para deploy automático dos websites gerados. Obtém em{" "}
              <span className="text-[#E8622A]">vercel.com/account/tokens</span>
            </p>
            <div className="relative">
              <input
                type={showVercel ? "text" : "password"}
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                placeholder={hasVercelToken ? "••••••••••••  (deixa em branco para manter)" : "vck_..."}
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

          {/* Error */}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Info note */}
          <div className="flex items-start gap-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7v4M8 5.5v.5" />
            </svg>
            <p className="text-xs text-gray-600 leading-relaxed">
              As chaves são guardadas localmente no servidor e nunca saem da tua máquina. Servem apenas para autenticar os pedidos à API.
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
                A guardar...
              </>
            ) : saved ? (
              <>
                <CheckIcon /> Guardado!
              </>
            ) : (
              "Guardar Configurações"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
