import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "whatsapp-bot.json");
const HISTORY_DIR = path.join(process.cwd(), "data", "whatsapp-history");

export interface BotFaq {
  question: string;
  answer: string;
}

export interface BotConfig {
  agentName: string;
  businessName: string;
  category: string;
  description: string;
  hours: string;
  services: string[];
  faqs: BotFaq[];
  personality: string;
  language: string;
  fallback: string;
  active: boolean;
  createdAt: string;
}

const DEFAULT_CONFIG: BotConfig = {
  agentName: "",
  businessName: "",
  category: "",
  description: "",
  hours: "",
  services: [],
  faqs: [],
  personality: "simpático",
  language: "pt",
  fallback: "Não tenho essa informação de momento, mas podes entrar em contacto diretamente connosco.",
  active: false,
  createdAt: "",
};

export function readBotConfig(): BotConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function writeBotConfig(config: Partial<BotConfig>): void {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = readBotConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2), "utf-8");
}

// ── Conversation history per phone number ─────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export function readHistory(phoneNumber: string): Message[] {
  try {
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
    const file = path.join(HISTORY_DIR, `${phoneNumber.replace(/\D/g, "")}.json`);
    if (!fs.existsSync(file)) return [];
    const msgs: Message[] = JSON.parse(fs.readFileSync(file, "utf-8"));
    // Keep last 20 messages for context
    return msgs.slice(-20);
  } catch {
    return [];
  }
}

export function appendHistory(phoneNumber: string, message: Message): void {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const file = path.join(HISTORY_DIR, `${phoneNumber.replace(/\D/g, "")}.json`);
  const msgs = readHistory(phoneNumber);
  msgs.push(message);
  fs.writeFileSync(file, JSON.stringify(msgs.slice(-40), null, 2), "utf-8");
}

// ── Build system prompt from config ──────────────────────────────────────

export function buildSystemPrompt(config: BotConfig): string {
  const personalityMap: Record<string, string> = {
    simpático: "simpático, caloroso e prestável",
    profissional: "profissional, formal e preciso",
    direto: "direto, conciso e eficiente — respostas curtas",
    descontraído: "descontraído, informal e amigável — podes usar emojis com moderação",
  };
  const tone = personalityMap[config.personality] || personalityMap["simpático"];

  const faqSection = config.faqs.length > 0
    ? `\nPerguntas frequentes:\n${config.faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n")}`
    : "";

  const servicesSection = config.services.length > 0
    ? `\nServiços/produtos: ${config.services.join(", ")}`
    : "";

  return `És ${config.agentName || "o assistente virtual"} de ${config.businessName}.
Categoria: ${config.category}
${config.description ? `Sobre o negócio: ${config.description}` : ""}
${config.hours ? `Horário: ${config.hours}` : ""}${servicesSection}${faqSection}

Tom: ${tone}
Língua: responde sempre em ${config.language === "pt" ? "Português de Portugal" : config.language === "en" ? "English" : "Español"}.
Sê conciso — respostas curtas e diretas, adequadas para WhatsApp.
Quando não souberes responder: "${config.fallback}"
Nunca inventes informação que não tens.`;
}
