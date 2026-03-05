import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getGoogleAuth } from "@/lib/google";
import { createLeadsFromEmails } from "./lead-creator";

const BATCH_SIZE = 100;
const MAX_RESULTS = 500;

export async function syncGmail(userId: string) {
  const auth = await getGoogleAuth(userId);
  const gmail = google.gmail({ version: "v1", auth: auth as never });

  // Get sync state
  const syncState = await prisma.syncState.findUnique({
    where: { userId_provider: { userId, provider: "gmail" } },
  });

  let messages: Array<{ id: string; threadId: string }> = [];

  if (syncState?.historyId) {
    // Incremental sync using history
    messages = await fetchHistoryMessages(gmail, syncState.historyId);
  } else {
    // Full sync - last 90 days
    messages = await fetchRecentMessages(gmail);
  }

  if (messages.length === 0) {
    return { imported: 0, leads: 0 };
  }

  // Fetch full message details in batches
  let imported = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const details = await Promise.all(
      batch.map((msg) => fetchMessageDetail(gmail, msg.id))
    );

    for (const detail of details) {
      if (!detail) continue;

      // Upsert email
      await prisma.email.upsert({
        where: { gmailId: detail.gmailId },
        update: {},
        create: {
          gmailId: detail.gmailId,
          threadId: detail.threadId,
          fromEmail: detail.fromEmail,
          fromName: detail.fromName,
          toEmail: detail.toEmail,
          subject: detail.subject,
          snippet: detail.snippet,
          date: detail.date,
          isInbound: detail.isInbound,
          userId,
        },
      });
      imported++;
    }
  }

  // Update sync state with latest historyId
  const profile = await gmail.users.getProfile({ userId: "me" });
  const newHistoryId = profile.data.historyId;

  await prisma.syncState.upsert({
    where: { userId_provider: { userId, provider: "gmail" } },
    update: {
      historyId: newHistoryId ?? undefined,
      lastSyncAt: new Date(),
    },
    create: {
      userId,
      provider: "gmail",
      historyId: newHistoryId ?? undefined,
      lastSyncAt: new Date(),
    },
  });

  // Auto-create leads from new emails
  const leadsCreated = await createLeadsFromEmails(userId);

  return { imported, leads: leadsCreated };
}

async function fetchRecentMessages(
  gmail: ReturnType<typeof google.gmail>
) {
  const after = new Date();
  after.setDate(after.getDate() - 90);
  const query = `after:${Math.floor(after.getTime() / 1000)}`;

  const allMessages: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: MAX_RESULTS,
      pageToken,
    });

    const msgs = response.data.messages ?? [];
    allMessages.push(
      ...msgs.map((m) => ({ id: m.id!, threadId: m.threadId! }))
    );
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken && allMessages.length < 2000); // Cap at 2000 for initial sync

  return allMessages;
}

async function fetchHistoryMessages(
  gmail: ReturnType<typeof google.gmail>,
  historyId: string
) {
  try {
    const response = await gmail.users.history.list({
      userId: "me",
      startHistoryId: historyId,
      historyTypes: ["messageAdded"],
    });

    const messages: Array<{ id: string; threadId: string }> = [];
    for (const history of response.data.history ?? []) {
      for (const added of history.messagesAdded ?? []) {
        if (added.message?.id && added.message?.threadId) {
          messages.push({
            id: added.message.id,
            threadId: added.message.threadId,
          });
        }
      }
    }
    return messages;
  } catch {
    // If historyId is too old, fall back to full sync
    return fetchRecentMessages(gmail);
  }
}

interface ParsedEmail {
  gmailId: string;
  threadId: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string | null;
  snippet: string | null;
  date: Date;
  isInbound: boolean;
}

async function fetchMessageDetail(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
): Promise<ParsedEmail | null> {
  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject", "Date"],
    });

    const headers = response.data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? null;

    const fromRaw = getHeader("From") ?? "";
    const toRaw = getHeader("To") ?? "";
    const { email: fromEmail, name: fromName } = parseEmailAddress(fromRaw);
    const { email: toEmail } = parseEmailAddress(toRaw);

    // Get user's email to determine direction
    const profile = await gmail.users.getProfile({ userId: "me" });
    const userEmail = profile.data.emailAddress?.toLowerCase() ?? "";
    const isInbound = fromEmail.toLowerCase() !== userEmail;

    return {
      gmailId: response.data.id!,
      threadId: response.data.threadId ?? "",
      fromEmail,
      fromName,
      toEmail,
      subject: getHeader("Subject"),
      snippet: response.data.snippet ?? null,
      date: new Date(parseInt(response.data.internalDate ?? "0")),
      isInbound,
    };
  } catch {
    return null;
  }
}

function parseEmailAddress(raw: string): { email: string; name: string | null } {
  // Format: "John Doe <john@example.com>" or just "john@example.com"
  const match = raw.match(/^"?(.+?)"?\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}
