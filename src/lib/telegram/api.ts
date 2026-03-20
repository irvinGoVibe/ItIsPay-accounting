const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function sendMessage(chatId: string, text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    }
  );
  return res.json();
}

export async function sendDocument(
  chatId: string,
  fileBuffer: Buffer,
  filename: string,
  caption?: string
) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append(
    "document",
    new Blob([fileBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
  if (caption) {
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
  }

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
    { method: "POST", body: formData }
  );
  return res.json();
}

export { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID };
