import Anthropic from "@anthropic-ai/sdk";
import { ToolCall, NPM_WHITELIST, type ProjectFile, type GenerateResponse } from "@builder/shared";

// Per-1M-token USD pricing (input, output).
const PRICING: Record<string, [number, number]> = {
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-4-6": [3, 15],
};

function costUsd(model: string, inTok: number, outTok: number): number {
  const [i, o] = PRICING[model] ?? [3, 15];
  return +((inTok / 1e6) * i + (outTok / 1e6) * o).toFixed(4);
}

// The generated stack is ALWAYS React + Vite + Tailwind, static. The model
// mutates the project only through tool calls — never free-text code.
const SYSTEM_PROMPT = `You are an elite product designer + front-end engineer that builds COMPLETE, runnable websites as a React + Vite + Tailwind project. You ONLY act through the provided tools (create_file / edit_file / delete_file / npm_install) — never reply with prose or code outside a tool call.

STACK (fixed):
- Vite + React 18 + TypeScript + Tailwind CSS. Static output. No backend, no env vars.
- Entry: index.html → src/main.tsx → src/App.tsx. Styles via src/index.css (Tailwind directives).
- Only import npm packages from this whitelist (declare via npm_install): ${NPM_WHITELIST.join(", ")}.

WHEN CREATING A NEW SITE, emit ALL files needed to run:
package.json, vite.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.js, index.html, src/main.tsx, src/index.css, src/App.tsx, and well-factored components under src/components/.

DESIGN BAR — Awwwards / Lovable-grade, NOT a generic template:
- Bespoke, modern, editorial. NO cliché hero (full-bleed photo + flat black overlay + centered white heading). Vary layout per business.
- Confident type scale (text-5xl→text-7xl display, tracking-tight, leading-tight), clear hierarchy, body ~text-slate-600 / leading-relaxed, max ~65ch.
- Asymmetric, bento-style sections; generous whitespace; alternate image-left/right; never center everything.
- Depth: soft layered shadows, hairline borders (border-black/5), rounded-2xl/3xl media, one tasteful accent or gradient focal block (no neon, no pure #000).
- Real components: polished buttons + cards with hover (lift/shadow), sticky blurred navbar, footer. Smooth in-view reveal + micro-interactions (framer-motion ok).
- Imagery: use Unsplash source URLs (https://images.unsplash.com/...?w=1600&q=80&auto=format&fit=crop) chosen to fit the business; place editorially.
- Realistic, specific copy in the business's language. No Lorem Ipsum, no "Acme", no AI clichés ("Elevate", "Seamless").
- Responsive (sm/md/lg), accessible (alt text, semantic tags, focus states).

STRUCTURE — one-page, multi-section (default):
- Build ONE page composed of clearly separated sections, in order: Hero → About/Services → Why us / Features → Gallery or Menu (if relevant) → Contact → Footer.
- A sticky navbar links to each section via anchors (href="#about", "#services", "#contact", ...) with smooth scroll (html { scroll-behavior: smooth }). This reads as "multi-page" to the visitor but stays one URL — best for SME local SEO.
- Only build true multi-page (separate routes via react-router-dom) if the user explicitly asks for separate URLs. Warn that a static SPA needs prerendering for SEO; default to one-page otherwise.
- ZERO dead links: every <a> resolves to a real "#section-id", "tel:", "mailto:", or "https://wa.me/..." — never href="#" alone. Every <button> has an action (form submit or scroll handler).

WHATSAPP (when a phone number is provided) — the highest-converting CTA for SMEs:
- It is just a deep link, no API: <a href="https://wa.me/<E164-digits>?text=<url-encoded message>" target="_blank" rel="noopener noreferrer">.
- target="_blank" is REQUIRED so it opens outside the preview iframe.
- Normalize the number to digits with country code (e.g. 351963406511); accept 9-digit PT numbers and prepend 351. Use the REAL number given — never invent or use a placeholder.
- Prefill a friendly message ("Olá! Vim pelo site e queria mais informações."). Place a green WhatsApp button (bg-[#25D366]) in the hero CTA group AND the contact section.
- The contact section also includes a working form (controlled inputs; on submit, either mailto: or a no-op handler with a success state — never a dead button).

WHEN EDITING an existing project, make the smallest set of tool calls that satisfy the request; reuse existing files; only create/edit what changes.

Output: only tool calls. Build the whole thing in this turn.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_file",
    description: "Create a new file with full content.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace the full content of an existing file.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "npm_install",
    description: `Declare npm packages to add (whitelist only: ${NPM_WHITELIST.join(", ")}).`,
    input_schema: {
      type: "object",
      properties: { packages: { type: "array", items: { type: "string" } } },
      required: ["packages"],
    },
  },
];

/** Apply tool calls to a file tree, returning the new tree. */
export function applyToolCalls(files: ProjectFile[], calls: ToolCall[]): ProjectFile[] {
  const map = new Map(files.map((f) => [f.path, f.content]));
  for (const c of calls) {
    if (c.type === "create_file" || c.type === "edit_file") map.set(c.path, c.content);
    else if (c.type === "delete_file") map.delete(c.path);
    // npm_install does not change the file tree here (handled by the preview installer)
  }
  return [...map].map(([path, content]) => ({ path, content }));
}

function serializeFiles(files: ProjectFile[]): string {
  if (!files.length) return "(empty project — create it from scratch)";
  return files
    .map((f) => `--- ${f.path} ---\n${f.content.length > 8000 ? f.content.slice(0, 8000) + "\n…(truncated)" : f.content}`)
    .join("\n\n");
}

export interface GenerateInput {
  anthropic: Anthropic;
  model: string;
  prompt: string;
  files: ProjectFile[];
}

/**
 * One generation/edit turn. Returns validated tool calls + the resulting tree.
 * Prompt caching is applied to the (stable) system prompt + tool definitions.
 */
export async function generate(input: GenerateInput): Promise<GenerateResponse> {
  const { anthropic, model, prompt, files } = input;
  const isEdit = files.length > 0;

  const res = await anthropic.messages.create({
    model,
    max_tokens: 32000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: TOOLS,
    messages: [
      {
        role: "user",
        content:
          `${isEdit ? "Edit this project." : "Create a new website."}\n\nREQUEST:\n${prompt}\n\n` +
          `CURRENT PROJECT FILES:\n${serializeFiles(files)}`,
      },
    ],
  });

  const calls: ToolCall[] = [];
  for (const block of res.content) {
    if (block.type !== "tool_use") continue;
    const parsed = ToolCall.safeParse({ type: block.name, ...(block.input as Record<string, unknown>) });
    if (parsed.success) calls.push(parsed.data);
  }

  if (!calls.length) {
    return { ok: false, toolCalls: [], files, error: "Model returned no file operations — try again." };
  }

  const nextFiles = applyToolCalls(files, calls);
  return {
    ok: true,
    toolCalls: calls,
    files: nextFiles,
    usage: {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      costUsd: costUsd(model, res.usage.input_tokens, res.usage.output_tokens),
    },
  };
}
