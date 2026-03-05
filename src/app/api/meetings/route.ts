import { NextResponse } from "next/server";
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
