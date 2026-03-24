"use client";

import { useState } from "react";
import { AnalyzeModal } from "@/components/AnalyzeModal";
import { GoogleMapsModal } from "@/components/GoogleMapsModal";

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

interface OptionCardProps {
  tag: string;
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function OptionCard({ tag, title, desc, cta, icon, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-7 hover:border-[#E8622A]/60 hover:bg-[#111] transition-all duration-300 hover:shadow-2xl hover:shadow-[#E8622A]/10"
    >
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
      <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-white">{title}</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-7">{desc}</p>

      {/* CTA */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 group-hover:text-[#E8622A] transition-colors duration-300">
        {cta}
        <svg viewBox="0 0 16 16" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </div>

      {/* Hover glow line at bottom */}
      <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#E8622A] to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
    </button>
  );
}

export default function Home() {
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);

  return (
    <div className="h-screen flex flex-col hex-bg overflow-hidden">
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
            <div className="font-semibold text-white leading-tight">Neuron Websites Agent</div>
            <div className="text-xs text-gray-500">The visual layer for AI agents</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Ready
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Tagline */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8622A]/10 border border-[#E8622A]/20 rounded-full text-[#E8622A] text-xs font-medium mb-5">
            <span className="w-1 h-1 rounded-full bg-[#E8622A]" />
            AI-powered web design
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Generate beautiful websites in seconds
          </h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            Analyse and redesign an existing site, or create a new one from a Google Maps listing.
          </p>
        </div>

        {/* Option cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
          <OptionCard
            tag="Has website"
            title="Analyze & Redesign"
            desc="Paste any website URL. We'll screenshot it, score the design with AI, and generate a fully modern redesign."
            cta="Analyze website"
            icon={<SearchIcon />}
            onClick={() => setShowAnalyzeModal(true)}
          />
          <OptionCard
            tag="No website"
            title="Create from Google Maps"
            desc="Paste a Google Maps business URL and add your photos. We'll extract the info and build a professional site from scratch."
            cta="Create website"
            icon={<MapPinIcon />}
            onClick={() => setShowMapsModal(true)}
          />
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs text-gray-700">
          Powered by Claude Sonnet · Playwright · Neuron Websites Agent
        </p>
      </main>

      {showAnalyzeModal && <AnalyzeModal onClose={() => setShowAnalyzeModal(false)} />}
      {showMapsModal && <GoogleMapsModal onClose={() => setShowMapsModal(false)} />}
    </div>
  );
}
