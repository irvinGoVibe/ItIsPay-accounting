import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ error: data.description }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
