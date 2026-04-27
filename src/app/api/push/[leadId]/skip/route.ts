import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTouchByNumber, nextDueDate, TOTAL_TOUCHES } from "@/lib/push/cadence";

/**
 * POST /api/push/[leadId]/skip
 * Body: { notes?: string }
 * Advances the schedule WITHOUT logging a sent message. Useful when you decide
 * to skip a touch (busy day, irrelevant moment, etc).
 */
export async function POST(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { leadId } = await params;
  const { notes } = (await req.json().catch(() => ({}))) as { notes?: string };

  const queue = await prisma.pushQueue.findFirst({
    where: { leadId, userId: session.user.id },
  });
  if (!queue) return NextResponse.json({ error: "Queue not found" }, { status: 404 });
  if (queue.currentTouch >= TOTAL_TOUCHES) {
    return NextResponse.json({ error: "Sequence already complete" }, { status: 400 });
  }

  const nextTouchNumber = queue.currentTouch + 1;
  const touch = getTouchByNumber(nextTouchNumber);
  if (!touch) return NextResponse.json({ error: "Invalid touch" }, { status: 400 });
  const newNextDue = nextDueDate(nextTouchNumber, queue.startedAt);

  const updated = await prisma.$transaction(async (tx) => {
    const q = await tx.pushQueue.update({
      where: { id: queue.id },
      data: {
        currentTouch: nextTouchNumber,
        nextTouchDueAt: newNextDue,
      },
    });
    await tx.pushEvent.create({
      data: {
        queueId: queue.id,
        touchNumber: nextTouchNumber,
        type: touch.type,
        action: "SKIPPED",
        notes: notes || null,
      },
    });
    return q;
  });

  return NextResponse.json({ queue: updated });
}
