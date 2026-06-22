"use client";

import { useEffect, useState } from "react";
import { AuthButton } from "@/components/AuthButton";
import { useClientWorkspace } from "@/lib/client-context";

interface Props {
  lang: "pt" | "en";
  toggleLang: () => void;
  hasKey: boolean;
  onHistory: () => void;
  onDocs: () => void;
  onSettings: () => void;
  onHome: () => void;
  t: { history: string; docs: string; settings: string };
}

export function Sidebar({ lang, toggleLang, hasKey, onHistory, onDocs, onSettings, onHome, t }: Props) {
  const ws = useClientWorkspace();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("forge_sidebar_collapsed") === "1") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      const n = !c;
      localStorage.setItem("forge_sidebar_collapsed", n ? "1" : "0");
      return n;
    });
  }

  const goClients = () => {
    onHome();
    ws?.setActiveClientId(null);
  };

  return (
    <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-[#1e1e1e] bg-[#0a0a0a]/95 backdrop-blur-sm flex flex-col h-screen sticky top-0 transition-[width] duration-200`}>
      {/* Brand — click to collapse / expand */}
      <button onClick={toggleCollapse} className="flex items-center gap-3 px-4 h-16 border-b border-[#1e1e1e] hover:bg-white/[0.02] transition-colors shrink-0" title={collapsed ? "Expand" : "Collapse"}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-[#E8622A]/50"
          style={{ background: "linear-gradient(135deg, rgba(232,98,42,0.28), rgba(232,98,42,0.04))", boxShadow: "0 0 18px rgba(232,98,42,0.45)" }}
        >
          <svg viewBox="0 0 20 20" className="w-5 h-5 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 2L2 6.5v7L10 18l8-4.5v-7L10 2z" />
            <path d="M10 8l-4 2.5v2L10 15l4-2.5v-2L10 8z" fill="currentColor" fillOpacity="0.5" />
          </svg>
        </div>
        {!collapsed && (
          <div className="text-left min-w-0">
            <div className="font-semibold text-white text-sm leading-tight truncate">Neuron Forge</div>
            <div className="text-[10px] text-gray-600 truncate">AI agents toolkit</div>
          </div>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItem collapsed={collapsed} onClick={goClients} label="Clients" icon={
          <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="6" r="2.5" /><path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M13.5 5.5a2.2 2.2 0 0 1 0 4.3M14 16c0-2-1-3.4-2.6-3.9" /></svg>
        } />
        <NavItem collapsed={collapsed} onClick={onHistory} label={t.history} icon={
          <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h14M3 10h10M3 14h7" /></svg>
        } />
        <NavItem collapsed={collapsed} onClick={onSettings} label={t.settings} icon={
          <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 2.5a3 3 0 0 1 0 4.2L5 15.2 2 18l2.8-3 8.5-8.5a3 3 0 0 1 .2-4z" /><path d="M11.5 4.5l3 3" /><circle cx="4.5" cy="15.5" r="1.5" /></svg>
        } />
        <NavItem collapsed={collapsed} onClick={onDocs} label={t.docs} icon={
          <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h12v12H4z" /><path d="M7 8h6M7 11h4" /></svg>
        } />
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#1e1e1e] space-y-2 shrink-0">
        <AuthButton />
        <div className={`flex items-center gap-2 px-2 text-[11px] text-gray-600 ${collapsed ? "justify-center px-0" : ""}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasKey ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
          {!collapsed && <span>{hasKey ? (lang === "pt" ? "Pronto" : "Ready") : (lang === "pt" ? "Sem API Key" : "No API Key")}</span>}
        </div>

        {!collapsed && (
          <button
            onClick={toggleLang}
            className="h-8 w-full px-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center gap-1 text-[10px] font-semibold tracking-widest text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A]/40 transition-all"
          >
            <span style={{ color: lang === "pt" ? "#E8622A" : undefined }}>PT</span>
            <span className="text-gray-700">|</span>
            <span style={{ color: lang === "en" ? "#E8622A" : undefined }}>EN</span>
          </button>
        )}
      </div>
    </aside>
  );
}

// Sidebar nav item with the platform's cinematic glow: a warm gradient sweep + a
// soft orange light pool that bloom on hover; the icon lights up to the accent.
function NavItem({ icon, label, onClick, collapsed }: { icon: React.ReactNode; label: string; onClick: () => void; collapsed: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-400 hover:text-white transition-all overflow-hidden ${collapsed ? "justify-center px-0" : ""}`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(90deg, rgba(232,98,42,0.16), rgba(232,98,42,0.02) 60%, transparent)" }} />
      <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full blur-2xl bg-[#E8622A]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative text-gray-500 group-hover:text-[#E8622A] transition-colors shrink-0">{icon}</span>
      {!collapsed && <span className="relative text-sm">{label}</span>}
    </button>
  );
}
