import { prisma } from "@/lib/prisma";
import { COLD_DAYS, TOTAL_TOUCHES } from "./cadence";
import { computePriority } from "./priority";

/**
 * Walk all ACTIVE PushQueues for a user and:
 *   1. Detect REPLIED — any inbound Email after lastTouchAt
 *   2. Detect AUTO_COLD — sequence exhausted (touch 6 done) AND >COLD_DAYS without reply
 *   3. Recompute priority (P1 / STANDARD / COLD)
 *
 * Idempotent. Logs PushEvent for each transition.
 */
export async function syncPushQueues(userId: string) {
  const queues = await prisma.pushQueue.findMany({
    where: { userId, status: { in: ["ACTIVE", "REPLIED"] } },
    include: { lead: true },
  });

  const now = new Date();
  let repliedFlipped = 0;
  let coldFlipped = 0;
  let priorityUpdated = 0;

  for (const q of queues) {
    const lastInbound = await prisma.email.findFirst({
      where: {
        leadId: q.leadId,
        isInbound: true,
        ...(q.lastTouchAt ? { date: { gt: q.lastTouchAt } } : {}),
      },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    let nextStatus = q.status;

    // Reply detection
    if (q.status === "ACTIVE" && lastInbound) {
      nextStatus = "REPLIED";
      await prisma.pushEvent.create({
        data: {
          queueId: q.id,
          touchNumber: q.currentTouch,
          type: "REPLIED" as never,
          action: "REPLIED",
          notes: `Inbound at ${lastInbound.date.toISOString()}`,
        },
      });
      repliedFlipped++;
    }

    // Cold detection — sequence exhausted, no reply
    if (
      nextStatus === "ACTIVE" &&
      q.currentTouch >= TOTAL_TOUCHES &&
      q.lastTouchAt &&
      now.getTime() - q.lastTouchAt.getTime() > COLD_DAYS * 86400000
    ) {
      nextStatus = "COLD";
      await prisma.pushEvent.create({
        data: {
          queueId: q.id,
          touchNumber: q.currentTouch,
          type: "LAST",
          action: "AUTO_COLD",
          notes: `${COLD_DAYS}+ days since last touch, no reply`,
        },
      });
      coldFlipped++;
    }

    // Priority recompute
    const newPriority = computePriority({
      lead: q.lead,
      queue: { ...q, status: nextStatus },
      lastInboundAt: lastInbound?.date.getTime() ?? null,
      now,
    });

    if (nextStatus !== q.status || newPriority !== q.priority) {
      await prisma.pushQueue.update({
        where: { id: q.id },
        data: { status: nextStatus, priority: newPriority },
      });
      if (newPriority !== q.priority) priorityUpdated++;
    }
  }

  return { processed: queues.length, repliedFlipped, coldFlipped, priorityUpdated };
}

/**
 * Initialize a PushQueue for every Lead the user has that doesn't have one.
 * Sets startedAt = lead.lastContact ?? lead.createdAt, so cadence is "rooted"
 * on the existing first contact instead of restarting from today.
 *
 * currentTouch = number of OUTBOUND emails to this lead since startedAt
 *   (capped at TOTAL_TOUCHES). lastTouchAt = max date of those outbounds.
 */
export async function seedPushQueues(userId: string) {
  const leadsWithoutQueue = await prisma.lead.findMany({
    where: { userId, pushQueue: null },
    include: {
      emails: {
        where: { isInbound: false },
        orderBy: { date: "asc" },
        select: { date: true },
      },
    },
  });

  let created = 0;
  const { TOUCH_SCHEDULE } = await import("./cadence");

  for (const lead of leadsWithoutQueue) {
    const startedAt = lead.lastContact ?? lead.createdAt;
    const outbounds = lead.emails;
    const currentTouch = Math.min(outbounds.length, TOTAL_TOUCHES);
    const lastTouchAt = outbounds.length ? outbounds[outbounds.length - 1].date : null;

    let nextTouchDueAt: Date | null = null;
    if (currentTouch < TOTAL_TOUCHES) {
      const next = TOUCH_SCHEDULE[currentTouch]; // index = next touch (1-indexed → array)
      nextTouchDueAt = new Date(startedAt.getTime() + next.day * 86400000);
    }

    // Initial priority
    const lastInbound = await prisma.email.findFirst({
      where: { leadId: lead.id, isInbound: true },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const status =
      currentTouch >= TOTAL_TOUCHES &&
      lastTouchAt &&
      Date.now() - lastTouchAt.getTime() > COLD_DAYS * 86400000
        ? "COLD"
        : "ACTIVE";
    const priority = computePriority({
      lead,
      queue: { status, lastTouchAt },
      lastInboundAt: lastInbound?.date.getTime() ?? null,
    });

    await prisma.pushQueue.create({
      data: {
        leadId: lead.id,
        userId,
        startedAt,
        currentTouch,
        lastTouchAt,
        nextTouchDueAt,
        status,
        priority,
      },
    });
    created++;
  }

  return { created, scanned: leadsWithoutQueue.length };
}
