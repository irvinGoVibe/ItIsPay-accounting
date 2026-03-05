import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getGoogleAuth } from "@/lib/google";

export async function syncCalendar(userId: string) {
  const auth = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth: auth as never });

  // Get user's email to filter out internal meetings
  const userAccount = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    include: { user: true },
  });
  const userEmail = userAccount?.user?.email?.toLowerCase() ?? "";

  // Time range: past 30 days to future 30 days
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const syncState = await prisma.syncState.findUnique({
    where: { userId_provider: { userId, provider: "calendar" } },
  });

  let events: Array<ReturnType<typeof parseEvent>> = [];
  let nextSyncToken: string | undefined;

  try {
    if (syncState?.syncToken) {
      // Incremental sync
      const response = await calendar.events.list({
        calendarId: "primary",
        syncToken: syncState.syncToken,
      });
      events = (response.data.items ?? []).map(parseEvent);
      nextSyncToken = response.data.nextSyncToken ?? undefined;
    } else {
      // Full sync
      let pageToken: string | undefined;
      do {
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
          pageToken,
        });
        events.push(...(response.data.items ?? []).map(parseEvent));
        pageToken = response.data.nextPageToken ?? undefined;
        if (!pageToken) {
          nextSyncToken = response.data.nextSyncToken ?? undefined;
        }
      } while (pageToken);
    }
  } catch {
    // If syncToken is invalid, do full sync
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
    events = (response.data.items ?? []).map(parseEvent);
    nextSyncToken = response.data.nextSyncToken ?? undefined;
  }

  let imported = 0;

  for (const event of events) {
    if (!event || !event.calendarEventId) continue;

    // Skip all-day events or events missing time data
    if (!event.startTime || !event.endTime) continue;

    // Skip cancelled events
    if (event.status === "CANCELLED") {
      await prisma.meeting.deleteMany({
        where: { calendarEventId: event.calendarEventId },
      });
      continue;
    }

    // Find external participants (not the user)
    const participants = event.participants.filter(
      (p) => p.email.toLowerCase() !== userEmail
    );

    // Skip internal-only meetings (no external participants)
    if (participants.length === 0) continue;

    // Try to match a lead
    let leadId: string | null = null;
    for (const participant of participants) {
      const lead = await prisma.lead.findUnique({
        where: {
          email_userId: { email: participant.email.toLowerCase(), userId },
        },
      });
      if (lead) {
        leadId = lead.id;
        break;
      }
    }

    // At this point startTime and endTime are guaranteed non-null
    const startTime = event.startTime!;
    const endTime = event.endTime!;

    // Upsert meeting
    await prisma.meeting.upsert({
      where: { calendarEventId: event.calendarEventId },
      update: {
        title: event.title,
        description: event.description,
        startTime,
        endTime,
        location: event.location,
        participants: JSON.stringify(participants),
        status: event.status,
        leadId,
      },
      create: {
        calendarEventId: event.calendarEventId,
        title: event.title,
        description: event.description,
        startTime,
        endTime,
        location: event.location,
        participants: JSON.stringify(participants),
        status: event.status,
        leadId,
        userId,
      },
    });
    imported++;
  }

  // Save sync token
  await prisma.syncState.upsert({
    where: { userId_provider: { userId, provider: "calendar" } },
    update: {
      syncToken: nextSyncToken,
      lastSyncAt: new Date(),
    },
    create: {
      userId,
      provider: "calendar",
      syncToken: nextSyncToken,
      lastSyncAt: new Date(),
    },
  });

  return { imported };
}

interface ParsedEvent {
  calendarEventId: string;
  title: string;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  location: string | null;
  participants: Array<{ email: string; name: string; status: string }>;
  status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEvent(event: any): ParsedEvent {
  const start = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : null;
  const end = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : null;

  const attendees = (event.attendees ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => ({
      email: a.email ?? "",
      name: a.displayName ?? a.email ?? "",
      status: a.responseStatus ?? "needsAction",
    })
  );

  // Determine meeting status
  let status = "CONFIRMED";
  if (event.status === "cancelled") status = "CANCELLED";
  else if (event.status === "tentative") status = "TENTATIVE";

  return {
    calendarEventId: event.id ?? "",
    title: event.summary ?? "Untitled",
    description: event.description ?? null,
    startTime: start,
    endTime: end,
    location:
      event.hangoutLink ?? event.location ?? null,
    participants: attendees,
    status,
  };
}
