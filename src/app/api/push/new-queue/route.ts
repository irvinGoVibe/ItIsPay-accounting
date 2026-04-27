import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/push/new-queue — leads created in last 48h, no outbound email. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 48 * 3600 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: since },
      emails: { none: { isInbound: false } },
    },
    include: {
      pushQueue: { select: { id: true, currentTouch: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ leads });
}
