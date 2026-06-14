import { z } from "zod";

// ── Models ──────────────────────────────────────────────────────────────────
// Initial generation uses the most capable model; edits use the balanced one.
export const MODELS = {
  generate: "claude-opus-4-8",
  edit: "claude-sonnet-4-6",
} as const;

// npm packages the AI orchestrator is allowed to "install" into generated sites.
// Generated stack is React + Vite + Tailwind, static — keep this tight.
export const NPM_WHITELIST = [
  "react",
  "react-dom",
  "react-router-dom",
  "clsx",
  "lucide-react",
  "framer-motion",
  "@tailwindcss/typography",
] as const;

// ── Multi-tenant entities (tenants → members → projects → sites) ─────────────
export const Tenant = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  branding: z
    .object({
      logoUrl: z.string().url().nullable().optional(),
      primaryColor: z.string().nullable().optional(),
      appDomain: z.string().nullable().optional(),
    })
    .default({}),
  createdAt: z.string(),
});
export type Tenant = z.infer<typeof Tenant>;

export const Member = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["member", "tenant_admin"]).default("member"),
  createdAt: z.string(),
});
export type Member = z.infer<typeof Member>;

export const Project = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  memberId: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof Project>;

export const Site = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  tenantId: z.string().uuid(),
  status: z.enum(["draft", "published"]).default("draft"),
  deployUrl: z.string().url().nullable().optional(),
  createdAt: z.string(),
});
export type Site = z.infer<typeof Site>;

// ── Project file tree (state serialized into the model context) ───────────────
export const ProjectFile = z.object({
  path: z.string().min(1), // e.g. "src/App.tsx"
  content: z.string(),
});
export type ProjectFile = z.infer<typeof ProjectFile>;

// ── Tool calls — the ONLY way the model mutates a project ─────────────────────
export const CreateFile = z.object({
  type: z.literal("create_file"),
  path: z.string().min(1),
  content: z.string(),
});
export const EditFile = z.object({
  type: z.literal("edit_file"),
  path: z.string().min(1),
  // full new content (MVP) — diffs come later
  content: z.string(),
});
export const DeleteFile = z.object({
  type: z.literal("delete_file"),
  path: z.string().min(1),
});
export const NpmInstall = z.object({
  type: z.literal("npm_install"),
  packages: z.array(z.enum(NPM_WHITELIST)).min(1),
});
export const ToolCall = z.discriminatedUnion("type", [CreateFile, EditFile, DeleteFile, NpmInstall]);
export type ToolCall = z.infer<typeof ToolCall>;

// ── Generation request/response (web ↔ api) ──────────────────────────────────
export const GenerateRequest = z.object({
  projectId: z.string().uuid().optional(), // omit to create a new project
  prompt: z.string().min(1),
  files: z.array(ProjectFile).default([]), // current project state ([] = fresh)
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;

export const GenerateResponse = z.object({
  ok: z.boolean(),
  toolCalls: z.array(ToolCall),
  files: z.array(ProjectFile), // resulting tree after applying toolCalls
  usage: z
    .object({ inputTokens: z.number(), outputTokens: z.number(), costUsd: z.number() })
    .optional(),
  error: z.string().optional(),
});
export type GenerateResponse = z.infer<typeof GenerateResponse>;

// ── Telemetry + credit ledger ────────────────────────────────────────────────
export const UsageEvent = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  memberId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  operation: z.enum(["generate", "edit", "fix"]),
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type UsageEvent = z.infer<typeof UsageEvent>;

// Append-only credit ledger: reserve → confirm | refund. Never a mutable balance.
export const CreditTransaction = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  memberId: z.string().uuid(),
  kind: z.enum(["grant", "reserve", "confirm", "refund"]),
  amount: z.number().int(), // signed: grants/refunds +, reserves/confirms −
  ref: z.string().nullable(), // links reserve↔confirm/refund + usage_event
  createdAt: z.string(),
});
export type CreditTransaction = z.infer<typeof CreditTransaction>;
