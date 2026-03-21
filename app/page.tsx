"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentGraph } from "@/components/graph/AgentGraph";
import { WorkflowView } from "@/components/workflow/WorkflowView";
import { RunHistory } from "@/components/history/RunHistory";
import { AgentKitSidebar } from "@/components/AgentKitSidebar";
import { RunModal } from "@/components/RunModal";

export type ViewMode = "graph" | "workflow";

export interface RunSummary {
  id: string;
  query: string;
  status: string;
  totalLeads: number;
  qualifiedLeads: number;
  deployedLeads: number;
  estimatedCostUsd: number;
  createdAt: string;
}

export interface SkillStatus {
  scrape: "idle" | "running" | "complete" | "failed";
  qualify: "idle" | "running" | "complete" | "failed";
  redesign: "idle" | "running" | "complete" | "failed";
  deploy: "idle" | "running" | "complete" | "failed";
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [skillStatus, setSkillStatus] = useState<SkillStatus>({
    scrape: "idle", qualify: "idle", redesign: "idle", deploy: "idle",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/runs");
    if (res.ok) setRuns(await res.json());
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // SSE subscription for active run
  useEffect(() => {
    if (!activeRunId) return;
    const es = new EventSource(`/api/runs/${activeRunId}/stream`);
    es.onmessage = (e) => {
      try { handlePipelineEvent(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, [activeRunId]); // eslint-disable-line

  function handlePipelineEvent(event: { type: string }) {
    switch (event.type) {
      case "run:started":
        setSkillStatus({ scrape: "running", qualify: "idle", redesign: "idle", deploy: "idle" });
        break;
      case "lead:qualifying":
        setSkillStatus((s) => ({ ...s, scrape: "complete", qualify: "running" }));
        break;
      case "lead:redesigning":
        setSkillStatus((s) => ({ ...s, qualify: "complete", redesign: "running" }));
        break;
      case "lead:deploying":
        setSkillStatus((s) => ({ ...s, redesign: "complete", deploy: "running" }));
        break;
      case "run:complete":
      case "run:failed":
        setSkillStatus({ scrape: "complete", qualify: "complete", redesign: "complete", deploy: "complete" });
        setIsRunning(false);
        setActiveRunId(null);
        loadRuns();
        break;
    }
  }

  async function startRun(query: string, maxLeads: number) {
    setShowRunModal(false);
    setIsRunning(true);
    setSkillStatus({ scrape: "idle", qualify: "idle", redesign: "idle", deploy: "idle" });

    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, maxLeads }),
    });

    await new Promise((r) => setTimeout(r, 600));
    const runsRes = await fetch("/api/runs");
    if (runsRes.ok) {
      const latest: RunSummary[] = await runsRes.json();
      if (latest[0]) { setActiveRunId(latest[0].id); setRuns(latest); }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden hex-bg">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] bg-[#0a0a0a]/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-[#E8622A] rounded-lg flex items-center justify-center bg-[#E8622A]/10">
              <svg viewBox="0 0 20 20" className="w-5 h-5 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2L2 6.5v7L10 18l8-4.5v-7L10 2z" />
                <path d="M10 8l-4 2.5v2L10 15l4-2.5v-2L10 8z" fill="currentColor" fillOpacity="0.5" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-white leading-tight">Beautiful Websites Agent</div>
              <div className="text-xs text-gray-500">The visual layer for AI agents</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "graph" ? "workflow" : "graph")}
              className="px-3 py-1.5 text-xs border border-[#2a2a2a] rounded text-gray-400 hover:text-white hover:border-[#444] transition-all"
            >
              {viewMode === "graph" ? "Visualize Workflow" : "Back to Graph"}
            </button>

            <button
              onClick={() => !isRunning && setShowRunModal(true)}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-all ${
                isRunning
                  ? "bg-[#1e1e1e] text-gray-500 cursor-not-allowed"
                  : "bg-[#E8622A] hover:bg-[#d4561f] text-white shadow-lg shadow-[#E8622A]/20"
              }`}
            >
              {isRunning ? (
                <><span className="w-2 h-2 rounded-full bg-[#E8622A] animate-pulse" />Running...</>
              ) : (
                <><svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor"><path d="M2 1l9 5-9 5V1z" /></svg>Play</>
              )}
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {viewMode === "graph"
              ? <AgentGraph skillStatus={skillStatus} isRunning={isRunning} />
              : <WorkflowView skillStatus={skillStatus} isRunning={isRunning} onPlay={() => setShowRunModal(true)} />
            }
          </div>
          <div className="w-80 border-l border-[#1e1e1e] overflow-y-auto bg-[#0d0d0d]">
            <RunHistory runs={runs} onRefresh={loadRuns} />
          </div>
        </div>
      </div>

      <AgentKitSidebar />

      {showRunModal && <RunModal onConfirm={startRun} onClose={() => setShowRunModal(false)} />}
    </div>
  );
}
