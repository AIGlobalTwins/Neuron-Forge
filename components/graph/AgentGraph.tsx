"use client";

import { useState } from "react";
import type { SkillStatus } from "@/lib/types";

const SKILLS = [
  { id: "scrape", label: "Apify Scrape", desc: "Scrape Google Maps for local business leads with both an email and website. Filters out national chains.", angle: -90 },
  { id: "qualify", label: "Site Qualify", desc: "Screenshot each business website with Playwright and visually assess whether it's worth redesigning.", angle: 0 },
  { id: "redesign", label: "Site Redesign", desc: "Generate premium single-file HTML/CSS/JS redesigns using a mix-and-match design system with unique palette, font, and layout combos.", angle: 90 },
  { id: "deploy", label: "Vercel Deploy", desc: "Deploy all generated sites to Vercel using the CLI. Captures live URLs and logs them to the build log.", angle: 180 },
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

function SkillIcon({ id, color }: { id: string; color: string }) {
  const s = { stroke: color, fill: "none", strokeWidth: "1.7", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (id === "scrape") return (
    <g {...s}>
      <circle cx="-1" cy="-2" r="6" />
      <line x1="3.5" y1="3.5" x2="8" y2="8" />
    </g>
  );
  if (id === "qualify") return (
    <g {...s}>
      <path d="M-9,0 C-6,-6.5 -3,-8 0,-8 C3,-8 6,-6.5 9,0 C6,6.5 3,8 0,8 C-3,8 -6,6.5 -9,0 Z" />
      <circle cx="0" cy="0" r="3" />
      <circle cx="0" cy="0" r="1" fill={color} stroke="none" />
    </g>
  );
  if (id === "redesign") return (
    <g {...s}>
      <rect x="-8" y="-7" width="16" height="14" rx="2" />
      <line x1="-8" y1="-1.5" x2="8" y2="-1.5" />
      <line x1="-1.5" y1="-1.5" x2="-1.5" y2="7" />
      <line x1="2" y1="1.5" x2="6" y2="1.5" />
      <line x1="2" y1="4" x2="5" y2="4" />
    </g>
  );
  if (id === "deploy") return (
    <g {...s}>
      <line x1="0" y1="8" x2="0" y2="-4" />
      <polyline points="-5.5,-0.5 0,-7 5.5,-0.5" />
      <line x1="-7" y1="8" x2="7" y2="8" />
    </g>
  );
  return null;
}

function AgentIcon({ color, size = 12 }: { color: string; size?: number }) {
  const s = size;
  const h = s * 0.866;
  const pts = `0,${-s} ${h},${-s / 2} ${h},${s / 2} 0,${s} ${-h},${s / 2} ${-h},${-s / 2}`;
  return (
    <g fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round">
      <polygon points={pts} />
      <circle cx="0" cy="0" r="2.8" fill={color} stroke="none" />
      <line x1="0" y1={-s + 2} x2="0" y2="-2.8" />
      <line x1={h - 2} y1={-s / 2 + 1.2} x2="2.4" y2="-1.4" />
      <line x1={h - 2} y1={s / 2 - 1.2} x2="2.4" y2="1.4" />
    </g>
  );
}

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

interface Props {
  skillStatus: SkillStatus;
  isRunning: boolean;
}

export function AgentGraph({ skillStatus, isRunning }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const cx = 380, cy = 300, radius = 180;

  const statusMap: Record<string, string> = {
    scrape: skillStatus.scrape,
    qualify: skillStatus.qualify,
    redesign: skillStatus.redesign,
    deploy: skillStatus.deploy,
  };

  const hoveredSkill = SKILLS.find((s) => s.id === hovered);

  // Smart tooltip offset based on node angle
  function tooltipStyle(angle: number) {
    const offset = 20;
    if (angle === -90) return { left: mousePos.x + offset, top: mousePos.y - offset }; // top
    if (angle === 0)   return { left: mousePos.x + offset, top: mousePos.y - offset }; // right
    if (angle === 90)  return { left: mousePos.x + offset, top: mousePos.y - offset }; // bottom
    return { left: mousePos.x - offset, top: mousePos.y - offset, transform: "translateX(-100%)" }; // left
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
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
          const isHov = hovered === skill.id;
          return (
            <line
              key={`edge-${skill.id}`}
              x1={cx} y1={cy}
              x2={pos.x} y2={pos.y}
              stroke={isHov ? "#E8622A" : isActive ? STATUS_COLORS[status] : "#2a2a2a"}
              strokeWidth={isHov || isActive ? "2" : "1"}
              strokeDasharray={status === "running" ? "6 4" : "none"}
              className={status === "running" ? "edge-active" : ""}
              opacity={isHov || isActive ? 1 : 0.5}
              style={{ transition: "stroke 0.2s, opacity 0.2s" }}
            />
          );
        })}

        {/* Skill nodes */}
        {SKILLS.map((skill) => {
          const pos = polarToXY(skill.angle, radius, cx, cy);
          const status = statusMap[skill.id];
          const baseColor = STATUS_COLORS[status];
          const isRunningNode = status === "running";
          const isHov = hovered === skill.id;

          // Orange on hover, else status color
          const borderColor = isHov ? "#E8622A" : baseColor;
          const iconColor = isHov ? "#E8622A" : status === "idle" ? "#555" : baseColor;

          return (
            <g
              key={skill.id}
              onMouseEnter={() => setHovered(skill.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
              style={{ transition: "all 0.2s" }}
            >
              {/* Glow ring on hover or running */}
              {(isRunningNode || isHov) && (
                <circle
                  cx={pos.x} cy={pos.y} r="36"
                  fill="#E8622A"
                  opacity={isHov ? 0.15 : 0.1}
                  className={isRunningNode ? "animate-pulse-slow" : ""}
                />
              )}
              {/* Node background */}
              <circle
                cx={pos.x} cy={pos.y} r="28"
                fill={isHov ? "#1a1a1a" : "#111"}
                stroke={borderColor}
                strokeWidth={isHov ? "2.5" : "2"}
                style={{ transition: "stroke 0.2s, fill 0.2s" }}
              />
              {/* Icon */}
              <g transform={`translate(${pos.x}, ${pos.y})`}>
                <SkillIcon id={skill.id} color={iconColor} />
              </g>
              {/* Label */}
              <text
                x={pos.x} y={pos.y + 50}
                textAnchor="middle"
                fontSize="11"
                fill={isHov ? "#E8622A" : STATUS_TEXT[status]}
                fontFamily="Inter, sans-serif"
                fontWeight="500"
                style={{ transition: "fill 0.2s" }}
              >
                {skill.label}
              </text>
              {/* Status dot */}
              {status !== "idle" && (
                <circle
                  cx={pos.x + 20} cy={pos.y - 20}
                  r="5"
                  fill={baseColor}
                  className={isRunningNode ? "animate-pulse" : ""}
                />
              )}
            </g>
          );
        })}

        {/* Central agent node */}
        <g>
          {isRunning && (
            <circle cx={cx} cy={cy} r="52" fill="#E8622A" opacity="0.08" className="node-active" />
          )}
          <circle cx={cx} cy={cy} r="40" fill="#111" stroke="#E8622A" strokeWidth="2.5" />
          <g transform={`translate(${cx}, ${cy})`}>
            <AgentIcon color="#E8622A" size={12} />
          </g>
          <text x={cx} y={cy + 62} textAnchor="middle" fontSize="12" fill="#888" fontFamily="Inter, sans-serif">
            Agent
          </text>
        </g>
      </svg>

      {/* Tooltip — follows cursor, beside the node */}
      {hoveredSkill && (
        <div
          className="fixed z-50 pointer-events-none"
          style={tooltipStyle(hoveredSkill.angle)}
        >
          <div className="bg-[#1a1a1a] border border-[#E8622A]/30 rounded-lg px-4 py-3 max-w-[240px] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A]" />
              <span className="text-xs font-semibold text-[#E8622A] uppercase tracking-wide">{hoveredSkill.label}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{hoveredSkill.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
