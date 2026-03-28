import { NextRequest, NextResponse } from "next/server";
import { readBotConfig, writeBotConfig } from "@/lib/whatsapp-bot";
import { writeSettings } from "@/lib/settings";

export async function GET() {
  const config = readBotConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Save WhatsApp credentials to settings
  if (body.whatsappPhoneNumberId !== undefined) {
    writeSettings({
      whatsappPhoneNumberId: body.whatsappPhoneNumberId,
      whatsappAccessToken: body.whatsappAccessToken,
      whatsappVerifyToken: body.whatsappVerifyToken,
    });
  }

  // Save bot config
  const { whatsappPhoneNumberId, whatsappAccessToken, whatsappVerifyToken, ...botFields } = body;
  if (Object.keys(botFields).length > 0) {
    writeBotConfig({ ...botFields, createdAt: botFields.createdAt || new Date().toISOString() });
  }

  return NextResponse.json({ ok: true });
}
