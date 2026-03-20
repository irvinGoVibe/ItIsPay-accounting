import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getGoogleAuth } from "@/lib/google";

export async function syncCalendar(userId: string) {
  const auth = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth: auth as never });

  // Get user's email for lead matching
  const userAccount = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    include: { user: true },
  });
  const userEmail = userAccount?.user?.email?.toLowerCase() ?? "";

  // Time range: past 3 months to future 3 months
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 3);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 3);

  // Always do full sync to catch all events
  let events: Array<ReturnType<typeof parseEvent>> = [];
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
  } while (pageToken);

  let imported = 0;
  let deleted = 0;
  let skipped = 0;

  // Track which calendarEventIds we see from Google
  const seenEventIds = new Set<string>();

  for (const event of events) {
    if (!event || !event.calendarEventId) {
      skipped++;
      continue;
    }

    // Skip all-day events or events missing time data
    if (!event.startTime || !event.endTime) {
      skipped++;
      continue;
    }

    // Delete cancelled events from CRM
    if (event.status === "CANCELLED") {
      await prisma.meeting.deleteMany({
        where: { calendarEventId: event.calendarEventId },
      });
      deleted++;
      continue;
    }

    seenEventIds.add(event.calendarEventId);

    // All participants (including user — for display purposes)
    const allParticipants = event.participants;

    // External participants (not the user) — used for lead matching
    const externalParticipants = event.participants.filter(
      (p) => p.email.toLowerCase() !== userEmail
    );

    // Try to match a lead from external participants
    let leadId: string | null = null;
    for (const participant of externalParticipants) {
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

    const startTime = event.startTime!;
    const endTime = event.endTime!;

    // Upsert meeting — re-creates even if previously deleted from CRM
    await prisma.meeting.upsert({
      where: { calendarEventId: event.calendarEventId },
      update: {
        title: event.title,
        description: event.description,
        startTime,
        endTime,
        location: event.location,
        participants: JSON.stringify(allParticipants),
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
        participants: JSON.stringify(allParticipants),
        status: event.status,
        leadId,
        userId,
      },
    });
    imported++;
  }

  // Remove CRM meetings that no longer exist in Google Calendar
  const orphaned = await prisma.meeting.deleteMany({
    where: {
      userId,
      calendarEventId: { notIn: [...seenEventIds] },
      // Only delete within the sync time range
      startTime: { gte: timeMin, lte: timeMax },
    },
  });
  deleted += orphaned.count;

  // Update last sync time
  await prisma.syncState.upsert({
    where: { userId_provider: { userId, provider: "calendar" } },
    update: { lastSyncAt: new Date() },
    create: { userId, provider: "calendar", lastSyncAt: new Date() },
  });

  return { imported, deleted, skipped, totalEvents: events.length };
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
