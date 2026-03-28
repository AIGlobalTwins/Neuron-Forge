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

export function SettingsModal({ onClose }: Props) {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showVercel, setShowVercel] = useState(false);
  const [showIgToken, setShowIgToken] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [hasVercelToken, setHasVercelToken] = useState(false);
  const [hasInstagramToken, setHasInstagramToken] = useState(false);
  const [hasInstagramAccountId, setHasInstagramAccountId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setHasAnthropicKey(data.hasAnthropicKey);
        setHasVercelToken(data.hasVercelToken);
        setHasInstagramToken(data.hasInstagramToken);
        setHasInstagramAccountId(data.hasInstagramAccountId);
      });
  }, []);

  async function handleSave() {
    if (!anthropicKey && !vercelToken && !instagramToken && !instagramAccountId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: anthropicKey, vercelToken, instagramToken, instagramAccountId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      if (anthropicKey) setHasAnthropicKey(true);
      if (vercelToken) setHasVercelToken(true);
      if (instagramToken) setHasInstagramToken(true);
      if (instagramAccountId) setHasInstagramAccountId(true);
      setAnthropicKey("");
      setVercelToken("");
      setInstagramToken("");
      setInstagramAccountId("");
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

          {/* Divider */}
          <div className="border-t border-[#1a1a1a]" />

          {/* Instagram */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-pink-400" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <label className="text-sm font-medium text-gray-300">Instagram Business</label>
              {hasInstagramToken && hasInstagramAccountId && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-auto">
                  <CheckIcon /> Conectado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Necessário para publicar posts no Instagram. Obtém o token em{" "}
              <span className="text-[#E8622A]">developers.facebook.com/tools/explorer</span>
              {" "}com os scopes{" "}
              <span className="text-gray-500">instagram_basic, instagram_content_publish</span>.
            </p>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showIgToken ? "text" : "password"}
                  value={instagramToken}
                  onChange={(e) => setInstagramToken(e.target.value)}
                  placeholder={hasInstagramToken ? "••••••••••••  (manter)" : "EAAxxxxxx... (Access Token)"}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowIgToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <EyeIcon open={showIgToken} />
                </button>
              </div>
              <input
                type="text"
                value={instagramAccountId}
                onChange={(e) => setInstagramAccountId(e.target.value)}
                placeholder={hasInstagramAccountId ? "••••••••••••  (manter)" : "Instagram Business Account ID (ex: 17841400...)"}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-colors"
              />
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
            disabled={saving || (!anthropicKey && !vercelToken && !instagramToken && !instagramAccountId)}
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
