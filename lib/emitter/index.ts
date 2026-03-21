import { EventEmitter } from "events";

// Singleton EventEmitter — bridges pipeline → API → SSE clients
class PipelineEmitter extends EventEmitter {}
export const pipelineEmitter = new PipelineEmitter();
pipelineEmitter.setMaxListeners(50);

export type PipelineEvent =
  | { type: "run:started"; runId: string; query: string }
  | { type: "run:complete"; runId: string; stats: RunStats }
  | { type: "run:failed"; runId: string; error: string }
  | { type: "lead:scraped"; runId: string; leadId: string; name: string }
  | { type: "lead:qualifying"; runId: string; leadId: string; name: string }
  | { type: "lead:qualified"; runId: string; leadId: string; name: string; score: number; decision: string }
  | { type: "lead:redesigning"; runId: string; leadId: string; name: string }
  | { type: "lead:redesigned"; runId: string; leadId: string; name: string }
  | { type: "lead:deploying"; runId: string; leadId: string; name: string }
  | { type: "lead:deployed"; runId: string; leadId: string; name: string; url: string }
  | { type: "lead:failed"; runId: string; leadId: string; name: string; error: string };

export interface RunStats {
  totalLeads: number;
  qualifiedLeads: number;
  deployedLeads: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export function emit(event: PipelineEvent) {
  pipelineEmitter.emit("event", event);
  pipelineEmitter.emit(`run:${event.runId}`, event);
}
