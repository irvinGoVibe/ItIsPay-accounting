import { prisma } from "@/lib/prisma";
import { COLD_DAYS, TOTAL_TOUCHES, TOUCH_SCHEDULE } from "./cadence";
import { computePriority } from "./priority";

/**
 * Recompute one queue's state from the Email table — the Email log is the
 * source of truth, the queue is a derived view.
 *
 *   currentTouch   = number of outbound emails since startedAt (capped at TOTAL_TOUCHES)
 *   lastTouchAt    = max(date) of those outbounds
 *   nextTouchDueAt = startedAt + TOUCH_SCHEDULE[currentTouch].day  (null if sequence complete)
 *   status         = REPLIED  if any inbound after the last touch
 *                  | COLD     if sequence complete + COLD_DAYS silence
 *                  | ACTIVE   otherwise
 *   priority       = via computePriority (P1 / STANDARD / COLD)
 *
 * Terminal states (DISQUALIFIED, PAUSED, QUALIFIED) are NOT auto-changed —
 * sync only updates priority for those.
 */
async function recomputeQueueState(
  queue: { id: string; status: string; startedAt: Date; notes: string | null },
  lead: { id: string; isActiveDeal: boolean; stage: string; status: string }
) {
  const outbounds = await prisma.email.findMany({
    where: {
      leadId: lead.id,
      isInbound: false,
      date: { gte: queue.startedAt },
    },
    orderBy: { date: "asc" },
    select: { date: true },
  });

  const currentTouch = Math.min(outbounds.length, TOTAL_TOUCHES);
  const lastTouchAt = outbounds.length ? outbounds[outbounds.length - 1].date : null;

  let nextTouchDueAt: Date | null = null;
  if (currentTouch < TOTAL_TOUCHES) {
    const next = TOUCH_SCHEDULE[currentTouch]; // [0]=touch1, [1]=touch2, …
    nextTouchDueAt = new Date(queue.startedAt.getTime() + next.day * 86400000);
  }

  // Inbound that counts as a "reply" must be AFTER our last contact event
  // (last touch if we sent something; otherwise after the queue was started).
  const replyCutoff = lastTouchAt ?? queue.startedAt;
  const lastInbound = await prisma.email.findFirst({
    where: { leadId: lead.id, isInbound: true, date: { gt: replyCutoff } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  // Status (terminal states locked)
  const TERMINAL = new Set(["DISQUALIFIED", "PAUSED", "QUALIFIED"]);
  let nextStatus = queue.status;
  if (!TERMINAL.has(queue.status)) {
    if (lastInbound) {
      nextStatus = "REPLIED";
    } else if (
      currentTouch >= TOTAL_TOUCHES &&
      lastTouchAt &&
      Date.now() - lastTouchAt.getTime() > COLD_DAYS * 86400000
    ) {
      nextStatus = "COLD";
    } else {
      nextStatus = "ACTIVE";
    }
  }

  const priority = computePriority({
    lead,
    queue: { status: nextStatus, lastTouchAt },
    lastInboundAt: lastInbound?.date.getTime() ?? null,
  });

  return {
    currentTouch,
    lastTouchAt,
    nextTouchDueAt,
    status: nextStatus,
    priority,
    _hasNewReply: nextStatus === "REPLIED" && queue.status !== "REPLIED",
    _wentCold: nextStatus === "COLD" && queue.status !== "COLD",
  };
}

/**
 * Walk every PushQueue for a user and recompute state from Email.
 * Logs PushEvent for transitions to REPLIED or COLD.
 * Idempotent — safe to call after every Gmail sync.
 */
export async function syncPushQueues(userId: string) {
  const queues = await prisma.pushQueue.findMany({
    where: { userId },
    include: {
      lead: { select: { id: true, isActiveDeal: true, stage: true, status: true } },
    },
  });

  let recomputed = 0;
  let repliedFlipped = 0;
  let coldFlipped = 0;
  let priorityUpdated = 0;
  let touchesAdvanced = 0;

  for (const q of queues) {
    const next = await recomputeQueueState(
      { id: q.id, status: q.status, startedAt: q.startedAt, notes: q.notes },
      q.lead
    );

    const changedTouch = next.currentTouch !== q.currentTouch;
    const changedStatus = next.status !== q.status;
    const changedPriority = next.priority !== q.priority;
    const changedDue = (next.nextTouchDueAt?.getTime() ?? null) !== (q.nextTouchDueAt?.getTime() ?? null);
    const changedLast = (next.lastTouchAt?.getTime() ?? null) !== (q.lastTouchAt?.getTime() ?? null);

    if (changedTouch || changedStatus || changedPriority || changedDue || changedLast) {
      await prisma.pushQueue.update({
        where: { id: q.id },
        data: {
          currentTouch: next.currentTouch,
          lastTouchAt: next.lastTouchAt,
          nextTouchDueAt: next.nextTouchDueAt,
          status: next.status,
          priority: next.priority,
        },
      });
      recomputed++;
      if (changedTouch) touchesAdvanced += next.currentTouch - q.currentTouch;
      if (changedPriority) priorityUpdated++;

      // Audit log for state transitions (not for every priority twiddle)
      if (next._hasNewReply) {
        await prisma.pushEvent.create({
          data: {
            queueId: q.id,
            touchNumber: next.currentTouch,
            type: "LAST",
            action: "REPLIED",
            notes: "Inbound detected by sync",
          },
        });
        repliedFlipped++;
      }
      if (next._wentCold) {
        await prisma.pushEvent.create({
          data: {
            queueId: q.id,
            touchNumber: next.currentTouch,
            type: "LAST",
            action: "AUTO_COLD",
            notes: `${COLD_DAYS}+ days silent after last touch`,
          },
        });
        coldFlipped++;
      }
    }
  }

  return { processed: queues.length, recomputed, touchesAdvanced, repliedFlipped, coldFlipped, priorityUpdated };
}

/**
 * Initialize PushQueue for any Lead that doesn't have one.
 *
 *   startedAt    = first OUTBOUND email date (anchor of the cadence)
 *                  fallback: lead.lastContact ?? lead.createdAt
 *
 * After creation we immediately call recomputeQueueState so the new queue
 * lands in the correct state on the very first run.
 */
export async function seedPushQueues(userId: string) {
  const leadsWithoutQueue = await prisma.lead.findMany({
    where: { userId, pushQueue: null },
    include: {
      emails: {
        where: { isInbound: false },
        orderBy: { date: "asc" },
        take: 1,
        select: { date: true },
      },
    },
  });

  let created = 0;

  for (const lead of leadsWithoutQueue) {
    const firstOutbound = lead.emails[0]?.date;
    const startedAt = firstOutbound ?? lead.lastContact ?? lead.createdAt;

    // Create with placeholder values — we'll recompute right after
    const queue = await prisma.pushQueue.create({
      data: {
        leadId: lead.id,
        userId,
        startedAt,
        currentTouch: 0,
        status: "ACTIVE",
        priority: "STANDARD",
      },
    });

    const next = await recomputeQueueState(
      { id: queue.id, status: queue.status, startedAt, notes: null },
      lead
    );

    await prisma.pushQueue.update({
      where: { id: queue.id },
      data: {
        currentTouch: next.currentTouch,
        lastTouchAt: next.lastTouchAt,
        nextTouchDueAt: next.nextTouchDueAt,
        status: next.status,
        priority: next.priority,
      },
    });
    created++;
  }

  return { created, scanned: leadsWithoutQueue.length };
}

/**
 * One-shot: seed any new leads' queues, then resync all queues.
 * Useful as a post-Gmail-sync hook.
 */
export async function seedAndSync(userId: string) {
  const seed = await seedPushQueues(userId);
  const sync = await syncPushQueues(userId);
  return { seed, sync };
}
