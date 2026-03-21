import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Runs ────────────────────────────────────────────────────────────────────
export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),           // e.g. "run_2026-03-21_001"
  query: text("query").notNull(),        // Google Maps search query
  status: text("status", {
    enum: ["pending", "running", "complete", "failed"],
  }).notNull().default("pending"),
  totalLeads: integer("total_leads").default(0),
  qualifiedLeads: integer("qualified_leads").default(0),
  deployedLeads: integer("deployed_leads").default(0),
  totalTokens: integer("total_tokens").default(0),
  estimatedCostUsd: real("estimated_cost_usd").default(0),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  errorMessage: text("error_message"),
});

// ─── Leads ───────────────────────────────────────────────────────────────────
export type LeadStatus =
  | "scraped"
  | "qualifying"
  | "disqualified"
  | "redesigning"
  | "deploying"
  | "complete"
  | "failed";

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),           // uuid
  runId: text("run_id").notNull().references(() => runs.id),
  name: text("name").notNull(),
  website: text("website").notNull(),
  email: text("email"),
  address: text("address"),
  category: text("category"),
  phone: text("phone"),
  status: text("status").notNull().default("scraped"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  errorMessage: text("error_message"),
});

// ─── Qualify Results ─────────────────────────────────────────────────────────
export const qualifyResults = sqliteTable("qualify_results", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  screenshotPath: text("screenshot_path"),
  score: integer("score"),              // 1-10 (lower = worse site)
  decision: text("decision", {
    enum: ["pass", "fail"],
  }),
  reasoning: text("reasoning"),        // Claude's explanation
  tokensUsed: integer("tokens_used").default(0),
  createdAt: text("created_at").notNull(),
});

// ─── Redesigns ───────────────────────────────────────────────────────────────
export const redesigns = sqliteTable("redesigns", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  htmlPath: text("html_path"),         // local file path
  htmlSizeBytes: integer("html_size_bytes"),
  originalContent: text("original_content"), // scraped text from original site
  tokensUsed: integer("tokens_used").default(0),
  createdAt: text("created_at").notNull(),
});

// ─── Deployments ─────────────────────────────────────────────────────────────
export const deployments = sqliteTable("deployments", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  vercelProjectName: text("vercel_project_name"),
  vercelUrl: text("vercel_url"),       // live URL
  emailDraft: text("email_draft"),     // personalized cold email
  deployedAt: text("deployed_at"),
  createdAt: text("created_at").notNull(),
});

export type Run = typeof runs.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type QualifyResult = typeof qualifyResults.$inferSelect;
export type Redesign = typeof redesigns.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
