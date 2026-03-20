import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessage, sendDocument, TELEGRAM_CHAT_ID } from "@/lib/telegram/api";
import { generateActiveDealsReport } from "@/lib/telegram/generate-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  if (WEBHOOK_SECRET) {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== WEBHOOK_SECRET) {
      console.warn("[Telegram Webhook] Invalid secret token");
      return NextResponse.json({ ok: true });
    }
  }

  try {
    const update = await request.json();
    const message = update?.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    // Only respond to configured chat
    const chatId = String(message.chat.id);
    if (chatId !== TELEGRAM_CHAT_ID) {
      console.warn(`[Telegram Webhook] Ignoring message from chat ${chatId}`);
      return NextResponse.json({ ok: true });
    }

    // Parse command (strip @botname suffix)
    const command = message.text.split("@")[0].trim().toLowerCase();

    if (command === "/report") {
      await handleReport(chatId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    return NextResponse.json({ ok: true });
  }
}

async function handleReport(chatId: string) {
  const leads = await prisma.lead.findMany({
    where: { isActiveDeal: true },
    orderBy: { createdAt: "desc" },
    include: {
      emails: { orderBy: { date: "desc" }, take: 20 },
      meetings: { orderBy: { startTime: "desc" }, take: 10 },
      callLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      tasks: true,
      flowOfFunds: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  console.log(`[Telegram Report] Found ${leads.length} active deals`);

  if (leads.length === 0) {
    await sendMessage(chatId, "📋 Нет активных сделок");
    return;
  }

  const buffer = await generateActiveDealsReport(leads);
  console.log(`[Telegram Report] Excel generated, size: ${buffer.length} bytes`);

  const today = new Date().toLocaleDateString("ru-RU");
  const filename = `active-deals-${today.replace(/\./g, "-")}.xlsx`;

  const newCount = leads.filter((l) => l.status === "NEW").length;
  const inWorkCount = leads.length - newCount;
  const caption = `📊 <b>Отчёт по активным сделкам</b>\n📅 ${today}\n\n📥 Новые: ${newCount}\n⚙️ В работе: ${inWorkCount}\n📋 Всего: ${leads.length}`;

  const result = await sendDocument(chatId, buffer, filename, caption);
  console.log(`[Telegram Report] sendDocument result:`, JSON.stringify(result));
}
