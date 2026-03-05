import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emails: { orderBy: { date: "desc" } },
      meetings: {
        orderBy: { startTime: "desc" },
        include: { briefings: true },
      },
      callLogs: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Verify ownership
  const existing = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      email: body.email ?? undefined,
      company: body.company ?? undefined,
      phone: body.phone ?? undefined,
      role: body.role ?? undefined,
      status: body.status ?? undefined,
      stage: body.stage ?? undefined,
      lastContact: body.lastContact ? new Date(body.lastContact) : undefined,
    },
  });

  return NextResponse.json(lead);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.lead.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
