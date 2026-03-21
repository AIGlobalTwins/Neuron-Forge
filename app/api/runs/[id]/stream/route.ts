import { NextRequest } from "next/server";
import { pipelineEmitter } from "@/lib/emitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const runId = params.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Send heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15_000);

      // Listen for events on this specific run
      function onEvent(event: object) {
        send(event);
        // Close stream when run finishes
        const e = event as { type: string };
        if (e.type === "run:complete" || e.type === "run:failed") {
          clearInterval(heartbeat);
          controller.close();
          pipelineEmitter.off(`run:${runId}`, onEvent);
        }
      }

      pipelineEmitter.on(`run:${runId}`, onEvent);

      // Cleanup on client disconnect
      _req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        pipelineEmitter.off(`run:${runId}`, onEvent);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
