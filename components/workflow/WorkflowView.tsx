"use client";

import { useState } from "react";
import type { SkillStatus } from "@/app/page";

const STEPS = [
  {
    id: "scrape" as const,
    label: "Apify Scrape",
    desc: "Scrape Google Maps for local business leads with both an email and website. Filters out national chains.",
    icon: "🔍",
    num: 1,
  },
  {
    id: "qualify" as const,
    label: "Site Qualify",
    desc: "Screenshot each business website with Playwright and visually assess whether it's worth redesigning.",
    icon: "◈",
    num: 2,
  },
  {
    id: "redesign" as const,
    label: "Site Redesign",
    desc: "Generate premium single-file HTML/CSS/JS redesigns using a mix-and-match design system.",
    icon: "</>",
    num: 3,
  },
  {
    id: "deploy" as const,
    label: "Vercel Deploy",
    desc: "Deploy all generated sites to Vercel using the CLI. Captures live URLs.",
    icon: "⚡",
    num: 4,
  },
];

const STATUS_COLORS: Record<string, string> = {
  idle: "border-[#2a2a2a] text-[#444]",
  running: "border-[#E8622A] text-[#E8622A] shadow-lg shadow-[#E8622A]/20",
  complete: "border-[#22c55e] text-[#22c55e]",
  failed: "border-[#ef4444] text-[#ef4444]",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "",
  running: "Running...",
  complete: "Complete ✓",
  failed: "Failed ✗",
};

interface Props {
  skillStatus: SkillStatus;
  isRunning: boolean;
  onPlay: () => void;
}

export function WorkflowView({ skillStatus, isRunning, onPlay }: Props) {
  const [modal, setModal] = useState<typeof STEPS[number] | null>(null);

  const statusMap: Record<string, string> = {
    scrape: skillStatus.scrape,
    qualify: skillStatus.qualify,
    redesign: skillStatus.redesign,
    deploy: skillStatus.deploy,
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-16">
        <button
          onClick={onPlay}
          disabled={isRunning}
          className={`flex items-center gap-2 px-5 py-2 rounded text-sm font-medium border transition-all ${
            isRunning
              ? "border-[#2a2a2a] text-gray-500 cursor-not-allowed"
              : "border-[#E8622A] text-[#E8622A] hover:bg-[#E8622A] hover:text-white"
          }`}
        >
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor"><path d="M2 1l9 5-9 5V1z" /></svg>
          Play
        </button>
      </div>

      {/* Workflow steps */}
      <div className="flex items-center gap-0">
        {/* Agent node */}
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl bg-[#111] ${
            isRunning ? "border-[#E8622A] node-active" : "border-[#E8622A]"
          }`}>
            🤖
          </div>
          <span className="mt-3 text-xs text-gray-500">Agent</span>
        </div>

        {STEPS.map((step) => {
          const status = statusMap[step.id];
          return (
            <div key={step.id} className="flex items-center">
              {/* Connector */}
              <div className="flex items-center w-16">
                <div className={`flex-1 h-px ${status === "running" ? "bg-[#E8622A]" : status === "complete" ? "bg-[#22c55e]" : "bg-[#2a2a2a]"}`} />
                {status === "running" && (
                  <div className="w-2 h-2 rounded-full bg-[#E8622A] animate-bounce" />
                )}
                <div className={`flex-1 h-px ${status === "running" ? "bg-[#E8622A]" : status === "complete" ? "bg-[#22c55e]" : "bg-[#2a2a2a]"}`} />
              </div>

              {/* Step node */}
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-600 mb-2">Step {step.num}</div>
                {status === "running" && (
                  <div className="text-xs text-[#E8622A] mb-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E8622A] animate-pulse" />
                    Waiting for user...
                  </div>
                )}
                <button
                  onClick={() => setModal(step)}
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg bg-[#111] transition-all hover:scale-105 ${STATUS_COLORS[status]}`}
                >
                  {step.icon}
                </button>
                <span className={`mt-3 text-xs font-medium ${
                  status === "running" ? "text-[#E8622A]" : status === "complete" ? "text-[#22c55e]" : "text-gray-500"
                }`}>
                  {status !== "idle" ? STATUS_LABEL[status] || step.label : step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step detail modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Skill</div>
                <div className="text-xl font-bold text-white">{modal.label}</div>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{modal.desc}</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#2a2a2a] text-gray-300 text-sm rounded hover:bg-[#333] transition-all">
                View SKILL.md
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
