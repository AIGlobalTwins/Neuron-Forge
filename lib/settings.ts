import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Equilibrado — rápido e capaz" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", desc: "Mais capaz — mais lento e caro" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", desc: "Mais rápido e barato" },
] as const;

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface AppSettings {
  anthropicApiKey: string;
  vercelToken: string;
  claudeModel: string;
  instagramToken: string;
  instagramAccountId: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappVerifyToken: string;
}

const DEFAULTS: AppSettings = {
  anthropicApiKey: "",
  vercelToken: "",
  claudeModel: DEFAULT_MODEL,
  instagramToken: "",
  instagramAccountId: "",
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  whatsappVerifyToken: "",
};

/**
 * Returns the settings file path for a given user.
 * - If userId provided → data/users/{userId}/settings.json  (multi-tenant)
 * - Fallback → data/settings.json  (legacy / single-tenant)
 */
function settingsFilePath(userId?: string | null): string {
  if (userId) return path.join(DATA_DIR, "users", userId, "settings.json");
  return path.join(DATA_DIR, "settings.json");
}

export function readSettings(userId?: string | null): AppSettings {
  try {
    const file = settingsFilePath(userId);
    if (!fs.existsSync(file)) {
      // For existing installs, fall back to the global settings file
      if (userId) return readSettings(null);
      return DEFAULTS;
    }
    const raw = fs.readFileSync(file, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function writeSettings(settings: Partial<AppSettings>, userId?: string | null): void {
  const file = settingsFilePath(userId);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = readSettings(userId);
  fs.writeFileSync(file, JSON.stringify({ ...current, ...settings }, null, 2), "utf-8");
}

// ── Convenience getters (accept optional userId) ───────────────────────────

export function getAnthropicKey(userId?: string | null): string {
  return readSettings(userId).anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
}

export function getVercelToken(userId?: string | null): string {
  return readSettings(userId).vercelToken || process.env.VERCEL_TOKEN || "";
}

export function getClaudeModel(userId?: string | null): string {
  const model = readSettings(userId).claudeModel;
  const valid = AVAILABLE_MODELS.some((m) => m.id === model);
  return valid ? model : DEFAULT_MODEL;
}

export function getInstagramToken(userId?: string | null): string {
  return readSettings(userId).instagramToken || process.env.INSTAGRAM_TOKEN || "";
}

export function getInstagramAccountId(userId?: string | null): string {
  return readSettings(userId).instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID || "";
}

export function getWhatsAppPhoneNumberId(userId?: string | null): string {
  return readSettings(userId).whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
}

export function getWhatsAppAccessToken(userId?: string | null): string {
  return readSettings(userId).whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
}

export function getWhatsAppVerifyToken(userId?: string | null): string {
  return readSettings(userId).whatsappVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN || "";
}
