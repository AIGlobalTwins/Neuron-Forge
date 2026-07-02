import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export const AVAILABLE_MODELS = [
  { id: "claude-opus-4-8", label: "Opus 4.8", desc: "Mais capaz — melhor qualidade" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "Equilibrado — rápido e capaz" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", desc: "Mais rápido e barato" },
] as const;

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface AppSettings {
  anthropicApiKey: string;
  claudeModel: string;
  instagramToken: string;
  instagramAccountId: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappVerifyToken: string;
  // Google OAuth — app credentials (one OAuth app for the platform; env fallback)
  googleClientId: string;
  googleClientSecret: string;
  // Google OAuth — per-user connection (filled after the consent flow)
  googleRefreshToken: string;
  googleScopes: string;       // space-separated list of granted scopes
  googleEmail: string;        // connected Google account email
}

const DEFAULTS: AppSettings = {
  anthropicApiKey: "",
  claudeModel: DEFAULT_MODEL,
  instagramToken: "",
  instagramAccountId: "",
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  whatsappVerifyToken: "",
  googleClientId: "",
  googleClientSecret: "",
  googleRefreshToken: "",
  googleScopes: "",
  googleEmail: "",
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

/**
 * When REQUIRE_OWN_KEYS=1 (set on a client-facing instance), the platform never
 * falls back to the owner's env keys for cost/account-sensitive services — the
 * user must enter their own in Settings. The owner's normal instance (flag unset)
 * keeps the env fallback, so nothing breaks there.
 */
export function requireOwnKeys(): boolean {
  return process.env.REQUIRE_OWN_KEYS === "1" || process.env.REQUIRE_OWN_KEYS === "true";
}

export function getAnthropicKey(userId?: string | null): string {
  const own = readSettings(userId).anthropicApiKey;
  if (own) return own;
  return requireOwnKeys() ? "" : process.env.ANTHROPIC_API_KEY || "";
}

export function getClaudeModel(userId?: string | null): string {
  const raw = readSettings(userId).claudeModel;
  // Migrate superseded / mis-suffixed ids to the current release (no silent downgrade).
  const model = raw === "claude-opus-4-7" ? "claude-opus-4-8"
    : raw === "claude-haiku-4-5-20251001" ? "claude-haiku-4-5"
    : raw;
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

// ── Google OAuth ───────────────────────────────────────────────────────────
// App credentials are global (one OAuth client for the platform): env first,
// then the global settings file. Tokens are stored per user.

export function getGoogleClientId(userId?: string | null): string {
  return process.env.GOOGLE_CLIENT_ID || readSettings(userId).googleClientId || readSettings(null).googleClientId || "";
}

export function getGoogleClientSecret(userId?: string | null): string {
  return process.env.GOOGLE_CLIENT_SECRET || readSettings(userId).googleClientSecret || readSettings(null).googleClientSecret || "";
}

export interface GoogleConnection {
  refreshToken: string;
  scopes: string[];
  email: string;
  connected: boolean;
}

export function getGoogleConnection(userId?: string | null): GoogleConnection {
  const s = readSettings(userId);
  return {
    refreshToken: s.googleRefreshToken || "",
    scopes: s.googleScopes ? s.googleScopes.split(" ").filter(Boolean) : [],
    email: s.googleEmail || "",
    connected: !!s.googleRefreshToken,
  };
}

export function saveGoogleConnection(
  conn: { refreshToken: string; scopes: string; email: string },
  userId?: string | null,
): void {
  writeSettings(
    { googleRefreshToken: conn.refreshToken, googleScopes: conn.scopes, googleEmail: conn.email },
    userId,
  );
}

export function clearGoogleConnection(userId?: string | null): void {
  writeSettings({ googleRefreshToken: "", googleScopes: "", googleEmail: "" }, userId);
}
