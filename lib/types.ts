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
