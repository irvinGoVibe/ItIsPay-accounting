import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/push/week — next 7 days (excluding today). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const endOfWeek = new Date(startOfTomorrow);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const rows = await prisma.pushQueue.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      nextTouchDueAt: { gte: startOfTomorrow, lt: endOfWeek },
    },
    include: {
      lead: { select: { id: true, name: true, email: true, company: true } },
    },
    orderBy: { nextTouchDueAt: "asc" },
  });

  return NextResponse.json({ leads: rows });
}
