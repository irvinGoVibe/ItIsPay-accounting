import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";

  const where: Record<string, unknown> = { userId: session.user.id };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  switch (filter) {
    case "today":
      where.completed = false;
      where.dueDate = { gte: todayStart, lt: todayEnd };
      break;
    case "week":
      where.completed = false;
      where.dueDate = { gte: todayStart, lt: weekEnd };
      break;
    case "overdue":
      where.completed = false;
      where.dueDate = { lt: todayStart };
      break;
    case "completed":
      where.completed = true;
      break;
    default:
      where.completed = false;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, company: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const task = await prisma.task.create({
    data: {
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      priority: body.priority ?? "MEDIUM",
      owner: body.owner ?? "us",
      source: body.source ?? "MANUAL",
      leadId: body.leadId ?? null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...data } = body;

  const existing = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: data.title ?? undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority ?? undefined,
      completed: data.completed ?? undefined,
      completedAt: data.completed ? new Date() : data.completed === false ? null : undefined,
    },
  });

  return NextResponse.json(task);
}
