import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetings = await prisma.meeting.findMany({
    where: { userId: session.user.id },
    include: {
      lead: { select: { id: true, name: true, company: true } },
      briefings: { select: { id: true }, take: 1 },
    },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(meetings);
}

/**
 * POST /api/meetings — create a meeting manually (not from calendar sync).
 *
 * Required: title, startTime
 * Optional: endTime (defaults to start + 1h), location, description,
 *           leadId, participants (JSON string), status
 *
 * `calendarEventId` is auto-generated with a `manual_` prefix to avoid
 * collisions with synced events and to make manual entries identifiable.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.title || !body.startTime) {
    return NextResponse.json(
      { error: "title and startTime are required" },
      { status: 400 }
    );
  }

  const start = new Date(body.startTime);
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
  }
  const end = body.endTime ? new Date(body.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  if (isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid endTime" }, { status: 400 });
  }

  // If leadId provided, verify it belongs to this user
  if (body.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: body.leadId, userId: session.user.id },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      calendarEventId: `manual_${randomUUID()}`,
      title: body.title,
      description: body.description ?? null,
      startTime: start,
      endTime: end,
      location: body.location ?? null,
      participants: typeof body.participants === "string" ? body.participants : JSON.stringify(body.participants ?? []),
      status: body.status ?? "CONFIRMED",
      leadId: body.leadId ?? null,
      userId: session.user.id,
    },
    include: {
      lead: { select: { id: true, name: true, company: true } },
      briefings: { select: { id: true }, take: 1 },
    },
  });

  return NextResponse.json(meeting);
}
