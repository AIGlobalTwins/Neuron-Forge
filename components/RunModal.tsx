"use client";

import { useState } from "react";

interface Props {
  onConfirm: (query: string, maxLeads: number) => void;
  onClose: () => void;
}

export function RunModal({ onConfirm, onClose }: Props) {
  const [query, setQuery] = useState("restaurantes Lisboa");
  const [maxLeads, setMaxLeads] = useState(20);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-bold text-white text-lg">New Run</div>
            <div className="text-sm text-gray-500">Configure and start the pipeline</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Google Maps Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors"
              placeholder="restaurantes Lisboa"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Max Leads</label>
            <input
              type="number"
              value={maxLeads}
              onChange={(e) => setMaxLeads(parseInt(e.target.value) || 10)}
              min={5}
              max={100}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors"
            />
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <div className="text-gray-400 font-medium mb-2">Pipeline steps:</div>
            <div>① Apify scrapes {maxLeads * 2}+ leads → filters to ~{maxLeads} with website + email</div>
            <div>② Playwright screenshots each → Claude Vision scores 1-10</div>
            <div>③ Qualified sites get HTML redesign via Claude API</div>
            <div>④ Each redesign deployed to Vercel → live URL + email draft</div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[#2a2a2a] rounded-lg text-gray-400 text-sm hover:border-[#444] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(query, maxLeads)}
            disabled={!query.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#E8622A] hover:bg-[#d4561f] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor"><path d="M2 1l9 5-9 5V1z" /></svg>
            Start Run
          </button>
        </div>
      </div>
    </div>
  );
}
