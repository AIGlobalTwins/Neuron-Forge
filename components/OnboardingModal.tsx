"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
}

const AGENTS = [
  { icon: "🔍", title: "Analyze & Redesign", desc: "Cola o URL de qualquer site — o Forge analisa o design e gera uma versão moderna." },
  { icon: "📍", title: "Create from Maps", desc: "Cola um Google Maps URL — extrai os dados do negócio e cria o site do zero." },
  { icon: "📸", title: "Posts Instagram", desc: "Descreve o teu negócio — o Forge gera captions, hashtags e ideias de imagem prontas a publicar." },
  { icon: "💬", title: "Agente WhatsApp", desc: "Configura um assistente de IA para o teu WhatsApp Business que responde 24/7." },
  { icon: "📊", title: "Consulting Agent", desc: "Responde a perguntas sobre o teu negócio e recebe um plano de ação em PDF." },
];

export function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0); // 0=welcome 1=apikey 2=tour 3=done
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  async function saveKey() {
    if (!apiKey.trim().startsWith("sk-ant-")) {
      setError("A chave deve começar com sk-ant-");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicKey: apiKey.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao guardar");
      setStep(2);
    } catch {
      setError("Não foi possível guardar a chave. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    if (typeof window !== "undefined") {
      localStorage.setItem("forge_onboarded", "1");
    }
    onComplete();
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Progress bar */}
        <div className="h-0.5 bg-[#1e1e1e]">
          <div
            className="h-full bg-[#E8622A] transition-all duration-500"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 border-2 border-[#E8622A] rounded-2xl flex items-center justify-center bg-[#E8622A]/10 mx-auto mb-6">
              <svg viewBox="0 0 20 20" className="w-8 h-8 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2L2 6.5v7L10 18l8-4.5v-7L10 2z" />
                <path d="M10 8l-4 2.5v2L10 15l4-2.5v-2L10 8z" fill="currentColor" fillOpacity="0.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Bem-vindo ao Neuron Forge</h1>
            <p className="text-gray-400 leading-relaxed mb-8 max-w-sm mx-auto">
              A tua equipa de agentes de IA para criar websites, gerir redes sociais, automatizar o WhatsApp e muito mais — tudo sem código.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8 text-center">
              {[
                { n: "5", label: "Agentes de IA" },
                { n: "~2min", label: "Por website" },
                { n: "€0", label: "Sem subscrição" },
              ].map(({ n, label }) => (
                <div key={label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3">
                  <div className="text-xl font-bold text-[#E8622A]">{n}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-[#E8622A] hover:bg-[#d4561f] text-white font-semibold rounded-xl transition"
            >
              Começar configuração →
            </button>
            <button
              onClick={finish}
              className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Já tenho tudo configurado — entrar
            </button>
          </div>
        )}

        {/* ── Step 1: API Key ── */}
        {step === 1 && (
          <div className="p-8">
            <div className="mb-6">
              <div className="text-xs text-[#E8622A] font-medium uppercase tracking-widest mb-2">Passo 1 de 3</div>
              <h2 className="text-xl font-bold text-white mb-2">Conecta o Claude</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                O Forge usa o Claude da Anthropic para gerar conteúdo. Precisas de uma API key gratuita para começar.
              </p>
            </div>

            {/* How to get key */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-5 text-sm space-y-2">
              <div className="text-gray-300 font-medium mb-3">Como obter a tua API Key:</div>
              {[
                { n: "1", text: "Vai a console.anthropic.com" },
                { n: "2", text: "Cria uma conta gratuita" },
                { n: "3", text: "Clica em \"API Keys\" → \"Create Key\"" },
                { n: "4", text: "Cola aqui em baixo" },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-center gap-3 text-gray-400">
                  <span className="w-5 h-5 rounded-full bg-[#E8622A]/20 text-[#E8622A] text-xs flex items-center justify-center flex-shrink-0 font-bold">{n}</span>
                  {text}
                </div>
              ))}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[#E8622A] hover:text-[#ff7a3d] text-xs font-medium mt-2 transition"
              >
                Abrir Console da Anthropic ↗
              </a>
            </div>

            {/* Key input */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Anthropic API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setError(""); }}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-[#E8622A] transition placeholder-gray-600"
                  autoFocus
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showKey
                    ? <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l14 14M8.5 8.6a3 3 0 004 3.9M6.3 6.4A8 8 0 002 10s3 5 8 5c1.5 0 2.9-.4 4.1-1.1M9 4.1C9.3 4 9.6 4 10 4c5 0 8 6 8 6a14 14 0 01-1.8 2.5"/></svg>
                    : <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>
                  }
                </button>
              </div>
              {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
              <p className="text-gray-600 text-xs mt-1.5">A chave é guardada localmente e nunca partilhada.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-2.5 border border-[#2a2a2a] rounded-xl text-gray-400 text-sm hover:border-[#444] transition"
              >
                ← Voltar
              </button>
              <button
                onClick={saveKey}
                disabled={!apiKey.trim() || saving}
                className="flex-1 py-2.5 bg-[#E8622A] hover:bg-[#d4561f] text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {saving ? "A guardar..." : "Guardar e continuar →"}
              </button>
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-3 w-full text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Configurar mais tarde — ver agentes primeiro
            </button>
          </div>
        )}

        {/* ── Step 2: Tour ── */}
        {step === 2 && (
          <div className="p-8">
            <div className="mb-6">
              <div className="text-xs text-[#E8622A] font-medium uppercase tracking-widest mb-2">Passo 2 de 3</div>
              <h2 className="text-xl font-bold text-white mb-2">Os teus 5 agentes</h2>
              <p className="text-gray-400 text-sm">Cada agente resolve um problema real do teu negócio.</p>
            </div>
            <div className="space-y-3 mb-6">
              {AGENTS.map((a) => (
                <div key={a.title} className="flex items-start gap-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
                  <span className="text-2xl flex-shrink-0">{a.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{a.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-[#2a2a2a] rounded-xl text-gray-400 text-sm hover:border-[#444] transition"
              >
                ← Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 bg-[#E8622A] hover:bg-[#d4561f] text-white font-semibold rounded-xl transition"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Estás pronto!</h2>
            <p className="text-gray-400 leading-relaxed mb-8 max-w-sm mx-auto">
              O Forge está configurado. Escolhe um agente e cria o teu primeiro website, post ou plano de negócio em minutos.
            </p>
            <div className="bg-[#0d0d0d] border border-[#E8622A]/20 rounded-xl p-4 mb-6 text-left">
              <div className="text-xs text-[#E8622A] font-medium mb-2">Dica para começar</div>
              <div className="text-sm text-gray-400">
                Experimenta o <span className="text-white font-medium">Create from Google Maps</span> — cola o URL de qualquer negócio e vê um website profissional gerado em ~90 segundos.
              </div>
            </div>
            <button
              onClick={finish}
              className="w-full py-3 bg-[#E8622A] hover:bg-[#d4561f] text-white font-semibold rounded-xl transition"
            >
              Explorar o Forge →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
