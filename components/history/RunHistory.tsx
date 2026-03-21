"use client";

import { useState } from "react";
import type { RunSummary } from "@/app/page";
import { LeadCard } from "./LeadCard";

interface Props {
  runs: RunSummary[];
  onRefresh: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  running: "bg-[#E8622A]/20 text-[#E8622A]",
  complete: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  pending: "bg-yellow-500/20 text-yellow-400",
};

export function RunHistory({ runs, onRefresh }: Props) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Run History</span>
        <button onClick={onRefresh} className="text-gray-600 hover:text-gray-400 transition-colors text-xs">
          ↻ Refresh
        </button>
      </div>

      {runs.length === 0 && (
        <div className="text-center py-12 text-gray-600 text-sm">
          No runs yet. Press Play to start.
        </div>
      )}

      <div className="space-y-2">
        {runs.map((run) => (
          <div key={run.id} className="border border-[#1e1e1e] rounded-lg overflow-hidden bg-[#111]">
            {/* Run header */}
            <button
              className="w-full text-left p-3 hover:bg-[#161616] transition-colors"
              onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[run.status] ?? STATUS_BADGE.pending}`}>
                  {run.status}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(run.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
              <div className="text-sm text-gray-300 font-medium truncate mb-1">&ldquo;{run.query}&rdquo;</div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{run.totalLeads} leads</span>
                <span className="text-green-500">{run.qualifiedLeads} qualified</span>
                <span className="text-[#E8622A]">{run.deployedLeads} deployed</span>
              </div>
              {run.estimatedCostUsd > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  ~${run.estimatedCostUsd.toFixed(4)} cost
                </div>
              )}
            </button>

            {/* Expanded leads */}
            {expandedRunId === run.id && (
              <div className="border-t border-[#1e1e1e] bg-[#0d0d0d]">
                <LeadCard runId={run.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
