import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export interface AppSettings {
  anthropicApiKey: string;
  vercelToken: string;
  instagramToken: string;
  instagramAccountId: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappVerifyToken: string;
}

const DEFAULTS: AppSettings = {
  anthropicApiKey: "",
  vercelToken: "",
  instagramToken: "",
  instagramAccountId: "",
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  whatsappVerifyToken: "",
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

export function getInstagramToken(): string {
  return readSettings().instagramToken || process.env.INSTAGRAM_TOKEN || "";
}

export function getInstagramAccountId(): string {
  return readSettings().instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID || "";
}

export function getWhatsAppPhoneNumberId(): string {
  return readSettings().whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
}

export function getWhatsAppAccessToken(): string {
  return readSettings().whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
}

export function getWhatsAppVerifyToken(): string {
  return readSettings().whatsappVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN || "";
}
