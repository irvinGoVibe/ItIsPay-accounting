import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/push/[leadId] — full detail (queue, events, last email/meeting). */
export async function GET(_req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: session.user.id },
    include: {
      pushQueue: {
        include: {
          events: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [lastInbound, lastOutbound, lastMeeting, totalIn, totalOut] = await Promise.all([
    prisma.email.findFirst({
      where: { leadId, isInbound: true },
      orderBy: { date: "desc" },
      select: { id: true, subject: true, snippet: true, body: true, date: true, fromName: true, fromEmail: true },
    }),
    prisma.email.findFirst({
      where: { leadId, isInbound: false },
      orderBy: { date: "desc" },
      select: { id: true, subject: true, snippet: true, body: true, date: true, toEmail: true },
    }),
    prisma.meeting.findFirst({
      where: { leadId },
      orderBy: { startTime: "desc" },
      select: { id: true, title: true, startTime: true, status: true },
    }),
    prisma.email.count({ where: { leadId, isInbound: true } }),
    prisma.email.count({ where: { leadId, isInbound: false } }),
  ]);

  return NextResponse.json({
    lead,
    lastInbound,
    lastOutbound,
    lastMeeting,
    counts: { inbound: totalIn, outbound: totalOut },
  });
}
