"use client";

import { useState } from "react";

const SKILLS = [
  { id: "scrape", label: "Apify Scrape" },
  { id: "qualify", label: "Site Qualify" },
  { id: "redesign", label: "Site Redesign" },
  { id: "deploy", label: "Vercel Deploy" },
];

export function AgentKitSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-12 border-l border-[#1e1e1e] bg-[#0d0d0d] flex flex-col items-center pt-4">
        <button
          onClick={() => setCollapsed(false)}
          className="text-gray-500 hover:text-white transition-colors text-sm"
        >
          ‹
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-[#1e1e1e] bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Agent Kit</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
        >
          —
        </button>
      </div>

      {/* Kit card */}
      <div className="p-4 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex items-center justify-center text-lg">
            🌐
          </div>
          <div className="font-bold text-white text-base">Neuron Websites</div>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Find local businesses with outdated websites, qualify them, redesign their sites with AI,
          and deploy live proof-of-work to Vercel — ready for outreach.
        </p>
      </div>

      {/* Skills */}
      <div className="p-4">
        <div className="text-xs uppercase tracking-widest text-gray-600 mb-3">Skills included</div>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => (
            <span
              key={skill.id}
              className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-gray-400 hover:border-[#E8622A] hover:text-[#E8622A] transition-all cursor-default"
            >
              {skill.label}
            </span>
          ))}
        </div>
      </div>

      {/* Workflow status */}
      <div className="p-4 border-t border-[#1e1e1e]">
        <div className="text-xs uppercase tracking-widest text-gray-600 mb-3">Workflow included</div>
        <div className="text-xs text-gray-500 px-3 py-1 bg-[#1a1a1a] rounded border border-[#2a2a2a] inline-block">
          Neuron Websites v1
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-[#1e1e1e]">
        <p className="text-xs text-gray-700">
          © Built with Neuron Websites Agent
        </p>
      </div>
    </div>
  );
}
