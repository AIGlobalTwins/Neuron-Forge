import { NextResponse } from "next/server";
import { readBotConfig } from "@/lib/whatsapp-bot";
import { getWhatsAppPhoneNumberId, getWhatsAppAccessToken, getWhatsAppVerifyToken } from "@/lib/settings";
import fs from "fs";
import path from "path";

export async function GET() {
  const config = readBotConfig();
  const hasCredentials = !!(getWhatsAppPhoneNumberId() && getWhatsAppAccessToken() && getWhatsAppVerifyToken());
  const isConfigured = !!(config.businessName && config.description);

  // Read recent conversations
  const historyDir = path.join(process.cwd(), "data", "whatsapp-history");
  let recentConversations: { phone: string; lastMessage: string; ts: number }[] = [];
  try {
    if (fs.existsSync(historyDir)) {
      const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".json"));
      recentConversations = files
        .map((f) => {
          try {
            const msgs = JSON.parse(fs.readFileSync(path.join(historyDir, f), "utf-8"));
            const last = msgs[msgs.length - 1];
            return { phone: f.replace(".json", ""), lastMessage: last?.content?.slice(0, 60) ?? "", ts: last?.ts ?? 0 };
          } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => (b?.ts ?? 0) - (a?.ts ?? 0))
        .slice(0, 10) as { phone: string; lastMessage: string; ts: number }[];
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    hasCredentials,
    isConfigured,
    active: config.active,
    agentName: config.agentName,
    businessName: config.businessName,
    recentConversations,
    totalConversations: recentConversations.length,
  });
}
