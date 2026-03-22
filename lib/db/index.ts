import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_URL ?? "./data/bwa.db";

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const client = createClient({
  url: `file:${DB_PATH}`,
});

export const db = drizzle(client, { schema });

// Initialize schema
export async function initDb() {
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_leads INTEGER DEFAULT 0,
      qualified_leads INTEGER DEFAULT 0,
      deployed_leads INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id),
      name TEXT NOT NULL,
      website TEXT NOT NULL,
      email TEXT,
      address TEXT,
      category TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'scraped',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS qualify_results (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      screenshot_path TEXT,
      score INTEGER,
      decision TEXT,
      reasoning TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS redesigns (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      html_path TEXT,
      html_size_bytes INTEGER,
      original_content TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      vercel_project_name TEXT,
      vercel_url TEXT,
      email_draft TEXT,
      deployed_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
}
