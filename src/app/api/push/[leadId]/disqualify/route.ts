import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/push/[leadId]/disqualify — terminal state, removes from queue. */
export async function POST(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { leadId } = await params;
  const { notes } = (await req.json().catch(() => ({}))) as { notes?: string };

  const queue = await prisma.pushQueue.findFirst({
    where: { leadId, userId: session.user.id },
  });
  if (!queue) return NextResponse.json({ error: "Queue not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const q = await tx.pushQueue.update({
      where: { id: queue.id },
      data: { status: "DISQUALIFIED", priority: "COLD", nextTouchDueAt: null, notes: notes || queue.notes },
    });
    await tx.pushEvent.create({
      data: {
        queueId: queue.id,
        touchNumber: queue.currentTouch,
        type: "LAST",
        action: "DISQUALIFIED",
        notes: notes || null,
      },
    });
    return q;
  });

  return NextResponse.json({ queue: updated });
}
