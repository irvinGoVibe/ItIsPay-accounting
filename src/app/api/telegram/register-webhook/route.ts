import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TELEGRAM_BOT_TOKEN } from "@/lib/telegram/api";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { webhookUrl } = await request.json();

  if (!webhookUrl) {
    return NextResponse.json({ error: "webhookUrl is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message"],
      }),
    }
  );

  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ error: data.description }, { status: 500 });
  }

  return NextResponse.json({ success: true, description: data.description });
}
