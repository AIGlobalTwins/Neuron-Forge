import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import Anthropic from "@anthropic-ai/sdk";
import { GenerateRequest, MODELS } from "@builder/shared";
import { auth } from "./auth.js";
import { generate } from "./orchestrator.js";

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, service: "builder-api" }));

// POST /api/generate — create or edit a project via the AI orchestrator.
app.post("/api/generate", async (c) => {
  const who = await auth.resolve(c.req.raw.headers);
  if (!who) return c.json({ ok: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const parsed = GenerateRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return c.json({ ok: false, error: "ANTHROPIC_API_KEY not configured on the server." }, 500);

  const { prompt, files } = parsed.data;
  const model = files.length > 0 ? MODELS.edit : MODELS.generate;
  const anthropic = new Anthropic({ apiKey });

  const started = Date.now();
  try {
    const result = await generate({ anthropic, model, prompt, files });
    // TODO Fase 1/4: write usage_events + reserve/confirm credits using `who`.
    console.log(`[generate] ${who.tenantId} model=${model} files=${result.files.length} ${Date.now() - started}ms`);
    return c.json(result);
  } catch (err) {
    console.error("[generate] error:", err);
    return c.json({ ok: false, error: (err as Error).message || "Generation failed" }, 500);
  }
});

const port = Number(process.env.PORT) || 8787;
serve({ fetch: app.fetch, port });
console.log(`builder-api listening on :${port}`);
