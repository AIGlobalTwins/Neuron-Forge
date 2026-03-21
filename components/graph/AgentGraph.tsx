"use client";

import { useState } from "react";
import type { SkillStatus } from "@/app/page";

const SKILLS = [
  { id: "scrape", label: "Apify Scrape", desc: "Scrape Google Maps for local business leads with both an email and website. Filters out national chains.", angle: -90, icon: "🔍" },
  { id: "qualify", label: "Site Qualify", desc: "Screenshot each business website with Playwright and visually assess whether it's worth redesigning.", angle: 0, icon: "◈" },
  { id: "redesign", label: "Site Redesign", desc: "Generate premium single-file HTML/CSS/JS redesigns using a mix-and-match design system with unique palette, font, and layout combos.", angle: 90, icon: "</>" },
  { id: "deploy", label: "Vercel Deploy", desc: "Deploy all generated sites to Vercel using the CLI. Captures live URLs and logs them to the build log.", angle: 180, icon: "⚡" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  idle: "#2a2a2a",
  running: "#E8622A",
  complete: "#22c55e",
  failed: "#ef4444",
};

const STATUS_TEXT: Record<string, string> = {
  idle: "#666",
  running: "#E8622A",
  complete: "#22c55e",
  failed: "#ef4444",
};

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

interface Props {
  skillStatus: SkillStatus;
  isRunning: boolean;
}

export function AgentGraph({ skillStatus, isRunning }: Props) {
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null);

  const cx = 380, cy = 300, radius = 180;

  const statusMap: Record<string, string> = {
    scrape: skillStatus.scrape,
    qualify: skillStatus.qualify,
    redesign: skillStatus.redesign,
    deploy: skillStatus.deploy,
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 760 600"
        className="w-full h-full max-w-3xl"
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        {/* Edges */}
        {SKILLS.map((skill) => {
          const pos = polarToXY(skill.angle, radius, cx, cy);
          const status = statusMap[skill.id];
          const isActive = status === "running" || status === "complete";
          return (
            <line
              key={`edge-${skill.id}`}
              x1={cx} y1={cy}
              x2={pos.x} y2={pos.y}
              stroke={isActive ? STATUS_COLORS[status] : "#2a2a2a"}
              strokeWidth={isActive ? "2" : "1"}
              strokeDasharray={status === "running" ? "6 4" : "none"}
              className={status === "running" ? "edge-active" : ""}
              opacity={isActive ? 1 : 0.5}
            />
          );
        })}

        {/* Skill nodes */}
        {SKILLS.map((skill) => {
          const pos = polarToXY(skill.angle, radius, cx, cy);
          const status = statusMap[skill.id];
          const color = STATUS_COLORS[status];
          const isActive = status === "running";

          return (
            <g
              key={skill.id}
              onMouseEnter={() => setTooltip({ id: skill.id, x: pos.x, y: pos.y })}
              onMouseLeave={() => setTooltip(null)}
              className="cursor-pointer"
            >
              {/* Glow ring when running */}
              {isActive && (
                <circle cx={pos.x} cy={pos.y} r="34" fill={color} opacity="0.15" className="animate-pulse-slow" />
              )}
              {/* Node background */}
              <circle cx={pos.x} cy={pos.y} r="28" fill="#111" stroke={color} strokeWidth="2" />
              {/* Icon */}
              <text
                x={pos.x} y={pos.y + 5}
                textAnchor="middle"
                fontSize="14"
                fill={status === "idle" ? "#555" : color}
                fontFamily="monospace"
              >
                {skill.icon}
              </text>
              {/* Label */}
              <text
                x={pos.x} y={pos.y + 50}
                textAnchor="middle"
                fontSize="11"
                fill={STATUS_TEXT[status]}
                fontFamily="Inter, sans-serif"
                fontWeight="500"
              >
                {skill.label}
              </text>
              {/* Status dot */}
              {status !== "idle" && (
                <circle
                  cx={pos.x + 20} cy={pos.y - 20}
                  r="5"
                  fill={color}
                  className={isActive ? "animate-pulse" : ""}
                />
              )}
            </g>
          );
        })}

        {/* Central agent node */}
        <g>
          {isRunning && (
            <circle cx={cx} cy={cy} r="50" fill="#E8622A" opacity="0.1" className="node-active" />
          )}
          <circle cx={cx} cy={cy} r="40" fill="#111" stroke="#E8622A" strokeWidth="2.5" />
          {/* Robot icon */}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fill="#E8622A">🤖</text>
          <text x={cx} y={cy + 60} textAnchor="middle" fontSize="12" fill="#888" fontFamily="Inter, sans-serif">
            Agent
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const skill = SKILLS.find((s) => s.id === tooltip.id);
        if (!skill) return null;
        return (
          <div
            className="absolute z-20 bg-[#1a1a1a] border border-[#333] rounded-lg p-4 max-w-xs shadow-2xl pointer-events-none"
            style={{ left: "50%", bottom: "80px", transform: "translateX(-50%)" }}
          >
            <div className="font-semibold text-white mb-1">{skill.label}</div>
            <div className="text-sm text-gray-400">{skill.desc}</div>
          </div>
        );
      })()}
    </div>
  );
}
