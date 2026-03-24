"use client";

import { useState } from "react";
import type { SkillStatus } from "@/lib/types";

const STEPS = [
  {
    id: "scrape" as const,
    label: "Apify Scrape",
    desc: "Scrape Google Maps for local business leads with both an email and website. Filters out national chains.",
    num: 1,
  },
  {
    id: "qualify" as const,
    label: "Site Qualify",
    desc: "Screenshot each business website with Playwright and visually assess whether it's worth redesigning.",
    num: 2,
  },
  {
    id: "redesign" as const,
    label: "Site Redesign",
    desc: "Generate premium single-file HTML/CSS/JS redesigns using a mix-and-match design system.",
    num: 3,
  },
  {
    id: "deploy" as const,
    label: "Vercel Deploy",
    desc: "Deploy all generated sites to Vercel using the CLI. Captures live URLs.",
    num: 4,
  },
];

const STATUS_BORDER: Record<string, string> = {
  idle: "border-[#2a2a2a]",
  running: "border-[#E8622A] shadow-lg shadow-[#E8622A]/20",
  complete: "border-[#22c55e]",
  failed: "border-[#ef4444]",
};

const STATUS_ICON: Record<string, string> = {
  idle: "text-[#444]",
  running: "text-[#E8622A]",
  complete: "text-[#22c55e]",
  failed: "text-[#ef4444]",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "",
  running: "Running...",
  complete: "Complete ✓",
  failed: "Failed ✗",
};

function StepIcon({ id, className }: { id: string; className?: string }) {
  return (
    <svg
      viewBox="-10 -10 20 20"
      className={className ?? "w-6 h-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {id === "scrape" && (<><circle cx="-1" cy="-2" r="6" /><line x1="3.5" y1="3.5" x2="8" y2="8" /></>)}
      {id === "qualify" && (<><path d="M-9,0 C-6,-6.5 -3,-8 0,-8 C3,-8 6,-6.5 9,0 C6,6.5 3,8 0,8 C-3,8 -6,6.5 -9,0 Z" /><circle cx="0" cy="0" r="3" /><circle cx="0" cy="0" r="1" fill="currentColor" stroke="none" /></>)}
      {id === "redesign" && (<><rect x="-8" y="-7" width="16" height="14" rx="2" /><line x1="-8" y1="-1.5" x2="8" y2="-1.5" /><line x1="-1.5" y1="-1.5" x2="-1.5" y2="7" /><line x1="2" y1="1.5" x2="6" y2="1.5" /><line x1="2" y1="4" x2="5" y2="4" /></>)}
      {id === "deploy" && (<><line x1="0" y1="8" x2="0" y2="-4" /><polyline points="-5.5,-0.5 0,-7 5.5,-0.5" /><line x1="-7" y1="8" x2="7" y2="8" /></>)}
    </svg>
  );
}

function AgentCircuitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-14 -14 28 28" className={className ?? "w-8 h-8"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" />
      <circle cx="0" cy="0" r="3" fill="currentColor" stroke="none" />
      <line x1="0" y1="-9" x2="0" y2="-3" />
      <line x1="7.8" y1="-4.5" x2="2.6" y2="-1.5" />
      <line x1="7.8" y1="4.5" x2="2.6" y2="1.5" />
    </svg>
  );
}

interface Props {
  skillStatus: SkillStatus;
  isRunning: boolean;
  onPlay: () => void;
}

export function WorkflowView({ skillStatus, isRunning, onPlay }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const statusMap: Record<string, string> = {
    scrape: skillStatus.scrape,
    qualify: skillStatus.qualify,
    redesign: skillStatus.redesign,
    deploy: skillStatus.deploy,
  };

  const hoveredStep = STEPS.find((s) => s.id === hovered);

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-8"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
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
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center bg-[#111] text-[#E8622A] transition-all ${
            isRunning ? "border-[#E8622A] node-active" : "border-[#E8622A]"
          }`}>
            <AgentCircuitIcon className="w-9 h-9" />
          </div>
          <span className="mt-3 text-xs text-gray-500">Agent</span>
        </div>

        {STEPS.map((step) => {
          const status = statusMap[step.id];
          const isHov = hovered === step.id;

          return (
            <div key={step.id} className="flex items-center">
              {/* Connector */}
              <div className="flex items-center w-16">
                <div className={`flex-1 h-px transition-colors duration-200 ${
                  isHov || status === "running" ? "bg-[#E8622A]" : status === "complete" ? "bg-[#22c55e]" : "bg-[#2a2a2a]"
                }`} />
                {status === "running" && <div className="w-2 h-2 rounded-full bg-[#E8622A] animate-bounce" />}
                <div className={`flex-1 h-px transition-colors duration-200 ${
                  isHov || status === "running" ? "bg-[#E8622A]" : status === "complete" ? "bg-[#22c55e]" : "bg-[#2a2a2a]"
                }`} />
              </div>

              {/* Step node */}
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-600 mb-2">Step {step.num}</div>
                {status === "running" && (
                  <div className="text-xs text-[#E8622A] mb-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E8622A] animate-pulse" />
                    Running...
                  </div>
                )}
                <button
                  onMouseEnter={() => setHovered(step.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center bg-[#111] transition-all duration-200 hover:scale-110 hover:border-[#E8622A] hover:text-[#E8622A] hover:bg-[#1a1a1a] hover:shadow-lg hover:shadow-[#E8622A]/20 ${
                    STATUS_BORDER[status]
                  } ${STATUS_ICON[status]}`}
                >
                  <StepIcon id={step.id} className="w-6 h-6" />
                </button>
                <span className={`mt-3 text-xs font-medium transition-colors duration-200 ${
                  isHov ? "text-[#E8622A]" : status === "running" ? "text-[#E8622A]" : status === "complete" ? "text-[#22c55e]" : "text-gray-500"
                }`}>
                  {status !== "idle" ? STATUS_LABEL[status] || step.label : step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating tooltip beside cursor */}
      {hoveredStep && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: mousePos.x + 20, top: mousePos.y - 10 }}
        >
          <div className="bg-[#1a1a1a] border border-[#E8622A]/30 rounded-lg px-4 py-3 max-w-[220px] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A]" />
              <span className="text-xs font-semibold text-[#E8622A] uppercase tracking-wide">{hoveredStep.label}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{hoveredStep.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
