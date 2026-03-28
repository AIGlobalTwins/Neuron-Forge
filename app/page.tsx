"use client";

import { useState, useEffect } from "react";
import { AnalyzeModal } from "@/components/AnalyzeModal";
import { GoogleMapsModal } from "@/components/GoogleMapsModal";
import { SettingsModal } from "@/components/SettingsModal";
import { SocialPostsModal } from "@/components/SocialPostsModal";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { ConsultingModal } from "@/components/ConsultingModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { DocsModal } from "@/components/DocsModal";
import { DemoModal } from "@/components/DemoModal";
import { SeoModal } from "@/components/SeoModal";
import { HistoryModal } from "@/components/HistoryModal";

type DemoTool = "maps" | "analyze" | "instagram" | "consulting" | "whatsapp" | "seo";

function SearchIcon() {
  return (
    <svg viewBox="-10 -10 20 20" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="-1" cy="-2" r="6" />
      <line x1="3.5" y1="3.5" x2="8" y2="8" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="-10 -10 20 20" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0,-9 C-5,-9 -8,-5 -8,-1 C-8,5 0,9 0,9 C0,9 8,5 8,-1 C8,-5 5,-9 0,-9 Z" />
      <circle cx="0" cy="-1" r="3" />
    </svg>
  );
}

function SeoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11h6M11 8v6" />
    </svg>
  );
}

function ConsultingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 8v8l8 5 8-5V8L12 3z" />
      <path d="M12 12v4M9 10.5l3 1.5 3-1.5" />
    </svg>
  );
}

function WhatsAppCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function InstagramCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

interface OptionCardProps {
  tag: string;
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
  hasKey: boolean;
  onClick: () => void;
  onDemo: () => void;
}

function OptionCard({ tag, title, desc, cta, icon, hasKey, onClick, onDemo }: OptionCardProps) {
  return (
    <div className="group relative text-left bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-7 hover:border-[#E8622A]/60 hover:bg-[#111] transition-all duration-300 hover:shadow-2xl hover:shadow-[#E8622A]/10">
      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-gray-500 group-hover:text-[#E8622A] group-hover:border-[#E8622A]/40 group-hover:bg-[#E8622A]/5 transition-all duration-300">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-widest text-gray-600 group-hover:text-[#E8622A]/70 transition-colors px-2 py-1 bg-[#1a1a1a] rounded-full border border-[#2a2a2a]">
          {tag}
        </span>
      </div>

      {/* Content */}
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{desc}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClick}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 group-hover:text-[#E8622A] transition-colors duration-300"
        >
          {cta}
          <svg viewBox="0 0 16 16" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
        {!hasKey && (
          <button
            onClick={(e) => { e.stopPropagation(); onDemo(); }}
            className="ml-auto text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#2a2a2a] text-gray-600 hover:border-[#E8622A]/40 hover:text-[#E8622A] transition-all"
          >
            Ver demo
          </button>
        )}
      </div>

      {/* Hover glow line at bottom */}
      <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#E8622A] to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
    </div>
  );
}

export default function Home() {
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSocialPosts, setShowSocialPosts] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showConsulting, setShowConsulting] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [demoTool, setDemoTool] = useState<DemoTool | null>(null);
  const [hasKey, setHasKey] = useState(true); // optimistic — avoids flash

  // Check API key + onboarding on mount
  useEffect(() => {
    const alreadyOnboarded = localStorage.getItem("forge_onboarded") === "1";
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const keySet = !!data.hasAnthropicKey;
        setHasKey(keySet);
        if (!keySet && !alreadyOnboarded) setShowOnboarding(true);
      })
      .catch(() => setHasKey(false));
  }, []);

  function openTool(toolId: string) {
    if (toolId === "analyze") setShowAnalyzeModal(true);
    else if (toolId === "maps") setShowMapsModal(true);
    else if (toolId === "instagram") setShowSocialPosts(true);
    else if (toolId === "whatsapp") setShowWhatsApp(true);
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    // Re-check key after onboarding
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setHasKey(!!data.hasAnthropicKey))
      .catch(() => {});
  }

  function openDemo(tool: DemoTool) {
    setDemoTool(tool);
  }

  function handleDemoSetupKey() {
    setDemoTool(null);
    setShowOnboarding(true);
  }

  return (
    <div className="min-h-screen flex flex-col hex-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-[#E8622A] rounded-lg flex items-center justify-center bg-[#E8622A]/10">
            <svg viewBox="0 0 20 20" className="w-5 h-5 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2L2 6.5v7L10 18l8-4.5v-7L10 2z" />
              <path d="M10 8l-4 2.5v2L10 15l4-2.5v-2L10 8z" fill="currentColor" fillOpacity="0.5" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-white leading-tight">Neuron Forge Agents</div>
            <div className="text-xs text-gray-500">The visual layer for AI agents</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* API Key status */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className={`w-1.5 h-1.5 rounded-full ${hasKey ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
            {hasKey ? "Ready" : "No API Key"}
          </div>

          {/* History button */}
          <button
            onClick={() => setShowHistory(true)}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A]/40 hover:bg-[#E8622A]/5 transition-all duration-200"
            title="Histórico"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h14M3 10h10M3 14h7" />
            </svg>
          </button>

          {/* Docs button */}
          <button
            onClick={() => setShowDocs(true)}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A]/40 hover:bg-[#E8622A]/5 transition-all duration-200"
            title="Documentação"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h12v12H4z" />
              <path d="M7 8h6M7 11h4" />
            </svg>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A]/40 hover:bg-[#E8622A]/5 transition-all duration-200"
            title="Configurações"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 2.5a3 3 0 0 1 0 4.2L5 15.2 2 18l2.8-3 8.5-8.5a3 3 0 0 1 .2-4z" />
              <path d="M11.5 4.5l3 3" />
              <circle cx="4.5" cy="15.5" r="1.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* No-key banner */}
      {!hasKey && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#E8622A]/10 border-b border-[#E8622A]/20 text-sm">
          <div className="flex items-center gap-2 text-[#E8622A]">
            <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1l7 13H1L8 1z"/><path d="M8 6v4M8 11.5v.5"/></svg>
            Sem API Key — os agentes estão em modo demo.
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-xs font-medium text-[#E8622A] hover:text-white border border-[#E8622A]/40 hover:bg-[#E8622A] px-3 py-1 rounded-full transition-all"
          >
            Configurar →
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Tagline */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8622A]/10 border border-[#E8622A]/20 rounded-full text-[#E8622A] text-xs font-medium mb-5">
            <span className="w-1 h-1 rounded-full bg-[#E8622A]" />
            AI agents, zero code
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Your AI team, ready in minutes
          </h1>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Websites, social media, customer support, and strategic consulting — all powered by Claude.
          </p>
        </div>

        {/* Option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">
          <OptionCard
            tag="Has website"
            title="Analyze & Redesign"
            desc="Paste any website URL. We'll screenshot it, score the design with AI, and generate a fully modern redesign."
            cta="Analyze website"
            icon={<SearchIcon />}
            hasKey={hasKey}
            onClick={() => setShowAnalyzeModal(true)}
            onDemo={() => openDemo("analyze")}
          />
          <OptionCard
            tag="No website"
            title="Create from Google Maps"
            desc="Paste a Google Maps business URL and add your photos. We'll extract the info and build a professional site from scratch."
            cta="Create website"
            icon={<MapPinIcon />}
            hasKey={hasKey}
            onClick={() => setShowMapsModal(true)}
            onDemo={() => openDemo("maps")}
          />
          <OptionCard
            tag="Social Media"
            title="Posts para Instagram"
            desc="Gera captions, hashtags e sugestões de imagem para o Instagram. Liga a tua conta e publica diretamente."
            cta="Criar post"
            icon={<InstagramCardIcon />}
            hasKey={hasKey}
            onClick={() => setShowSocialPosts(true)}
            onDemo={() => openDemo("instagram")}
          />
          <OptionCard
            tag="WhatsApp Agent"
            title="Agente WhatsApp"
            desc="Cria um agente de IA para o teu WhatsApp Business. Responde automaticamente a clientes 24/7."
            cta="Criar agente"
            icon={<WhatsAppCardIcon />}
            hasKey={hasKey}
            onClick={() => setShowWhatsApp(true)}
            onDemo={() => openDemo("whatsapp")}
          />
          <OptionCard
            tag="Consultoria"
            title="Consulting Agent"
            desc="Diagnóstico inteligente do teu negócio. Responde a perguntas específicas e recebe um plano de acção profissional em PDF."
            cta="Iniciar análise"
            icon={<ConsultingIcon />}
            hasKey={hasKey}
            onClick={() => setShowConsulting(true)}
            onDemo={() => openDemo("consulting")}
          />
          <OptionCard
            tag="SEO"
            title="SEO Content Agent"
            desc="Gera artigos de blog, meta tags, landing page copy e FAQs otimizados para motores de pesquisa — prontos a publicar."
            cta="Criar conteúdo SEO"
            icon={<SeoIcon />}
            hasKey={hasKey}
            onClick={() => setShowSeo(true)}
            onDemo={() => openDemo("seo")}
          />
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs text-gray-700">
          Powered by Claude Sonnet · Playwright · Neuron Forge Agents
        </p>
      </main>

      {/* Modals */}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
      {demoTool && <DemoModal tool={demoTool} onClose={() => setDemoTool(null)} onSetupKey={handleDemoSetupKey} />}
      {showAnalyzeModal && <AnalyzeModal onClose={() => setShowAnalyzeModal(false)} />}
      {showMapsModal && <GoogleMapsModal onClose={() => setShowMapsModal(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showSocialPosts && <SocialPostsModal onClose={() => setShowSocialPosts(false)} />}
      {showWhatsApp && <WhatsAppModal onClose={() => setShowWhatsApp(false)} />}
      {showConsulting && <ConsultingModal onClose={() => setShowConsulting(false)} onOpenTool={openTool} />}
      {showSeo && <SeoModal onClose={() => setShowSeo(false)} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
