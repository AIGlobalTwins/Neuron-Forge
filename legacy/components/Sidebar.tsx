"use client";

import { AuthButton } from "@/components/AuthButton";
import { useClientWorkspace } from "@/lib/client-context";

interface Props {
  lang: "pt" | "en";
  toggleLang: () => void;
  hasKey: boolean;
  onHistory: () => void;
  onDocs: () => void;
  onSettings: () => void;
  t: { history: string; docs: string; settings: string };
}

export function Sidebar({ lang, toggleLang, hasKey, onHistory, onDocs, onSettings, t }: Props) {
  const ws = useClientWorkspace();
  const goClients = () => ws?.setActiveClientId(null);

  const item =
    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors text-sm";

  return (
    <aside className="w-16 lg:w-60 shrink-0 border-r border-[#1e1e1e] bg-[#0a0a0a]/95 backdrop-blur-sm flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <button onClick={goClients} className="flex items-center gap-3 px-4 h-16 border-b border-[#1e1e1e] hover:bg-white/[0.02] transition-colors shrink-0">
        <div className="w-9 h-9 border-2 border-[#E8622A] rounded-lg flex items-center justify-center bg-[#E8622A]/10 shrink-0">
          <svg viewBox="0 0 20 20" className="w-5 h-5 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 2L2 6.5v7L10 18l8-4.5v-7L10 2z" />
            <path d="M10 8l-4 2.5v2L10 15l4-2.5v-2L10 8z" fill="currentColor" fillOpacity="0.5" />
          </svg>
        </div>
        <div className="hidden lg:block text-left">
          <div className="font-semibold text-white text-sm leading-tight">Neuron Forge</div>
          <div className="text-[10px] text-gray-600">AI agents toolkit</div>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <button onClick={goClients} className={item} title="Clients">
          <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="6" r="2.5" /><path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M13.5 5.5a2.2 2.2 0 0 1 0 4.3M14 16c0-2-1-3.4-2.6-3.9" />
          </svg>
          <span className="hidden lg:inline">Clients</span>
        </button>

        <button onClick={onHistory} className={item} title={t.history}>
          <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h14M3 10h10M3 14h7" />
          </svg>
          <span className="hidden lg:inline">{t.history}</span>
        </button>

        <button onClick={onSettings} className={item} title={t.settings}>
          <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.5 2.5a3 3 0 0 1 0 4.2L5 15.2 2 18l2.8-3 8.5-8.5a3 3 0 0 1 .2-4z" /><path d="M11.5 4.5l3 3" /><circle cx="4.5" cy="15.5" r="1.5" />
          </svg>
          <span className="hidden lg:inline">{t.settings}</span>
        </button>

        <button onClick={onDocs} className={item} title={t.docs}>
          <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12v12H4z" /><path d="M7 8h6M7 11h4" />
          </svg>
          <span className="hidden lg:inline">{t.docs}</span>
        </button>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#1e1e1e] space-y-2 shrink-0">
        <div className="flex items-center gap-2 px-2 text-[11px] text-gray-600">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasKey ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
          <span className="hidden lg:inline">{hasKey ? (lang === "pt" ? "Pronto" : "Ready") : (lang === "pt" ? "Sem API Key" : "No API Key")}</span>
        </div>

        <button
          onClick={toggleLang}
          className="h-8 w-full px-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center gap-1 text-[10px] font-semibold tracking-widest text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A]/40 transition-all"
        >
          <span style={{ color: lang === "pt" ? "#E8622A" : undefined }}>PT</span>
          <span className="text-gray-700">|</span>
          <span style={{ color: lang === "en" ? "#E8622A" : undefined }}>EN</span>
        </button>

        <AuthButton />
      </div>
    </aside>
  );
}
