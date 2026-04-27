import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/push/stats
 * Returns week-window counters: sent / replied / reply rate.
 * "Sent" = PushEvent.action=SENT in last 7 days.
 * "Replied" = unique queues that flipped to REPLIED in last 7 days.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 7 * 86400000);

  const [sentEvents, repliedEvents, totalActive, totalCold, totalReplied] = await Promise.all([
    prisma.pushEvent.count({
      where: {
        action: "SENT",
        createdAt: { gte: since },
        queue: { userId: session.user.id },
      },
    }),
    prisma.pushEvent.count({
      where: {
        action: "REPLIED",
        createdAt: { gte: since },
        queue: { userId: session.user.id },
      },
    }),
    prisma.pushQueue.count({ where: { userId: session.user.id, status: "ACTIVE" } }),
    prisma.pushQueue.count({ where: { userId: session.user.id, status: "COLD" } }),
    prisma.pushQueue.count({ where: { userId: session.user.id, status: "REPLIED" } }),
  ]);

  const replyRate = sentEvents > 0 ? Math.round((repliedEvents / sentEvents) * 100) : 0;

  return NextResponse.json({
    week: { sent: sentEvents, replied: repliedEvents, replyRate },
    queues: { active: totalActive, cold: totalCold, replied: totalReplied },
  });
}
