import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/push/today
 * Returns active queue rows whose nextTouchDueAt <= end-of-today.
 * Optional ?priority=P1|STANDARD|COLD
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const priority = url.searchParams.get("priority");

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const rows = await prisma.pushQueue.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["ACTIVE", "REPLIED"] },
      nextTouchDueAt: { lte: endOfToday },
      ...(priority ? { priority } : {}),
    },
    include: {
      lead: {
        select: {
          id: true, name: true, email: true, company: true, role: true,
          status: true, stage: true, classification: true, isActiveDeal: true,
          lastContact: true,
        },
      },
    },
    orderBy: [
      { priority: "asc" },          // P1 < STANDARD < COLD lexicographically — good
      { nextTouchDueAt: "asc" },    // overdue first
    ],
  });

  return NextResponse.json({ leads: rows });
}
