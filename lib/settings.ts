import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export interface AppSettings {
  anthropicApiKey: string;
  vercelToken: string;
}

const DEFAULTS: AppSettings = {
  anthropicApiKey: "",
  vercelToken: "",
};

export function readSettings(): AppSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return DEFAULTS;
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function writeSettings(settings: Partial<AppSettings>): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = readSettings();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...current, ...settings }, null, 2), "utf-8");
}

export function getAnthropicKey(): string {
  return readSettings().anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
}

export function getVercelToken(): string {
  return readSettings().vercelToken || process.env.VERCEL_TOKEN || "";
}
