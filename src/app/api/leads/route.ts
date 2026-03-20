import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status && status !== "ALL") {
    where.status = status;
  }

  const classification = searchParams.get("classification");
  if (classification && classification !== "ALL") {
    where.classification = classification;
  }

  const activeDeal = searchParams.get("activeDeal");
  if (activeDeal === "true") {
    where.isActiveDeal = true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
      _count: {
        select: {
          emails: true,
          meetings: true,
          callLogs: true,
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
  });

  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      email: body.email,
      company: body.company,
      phone: body.phone,
      role: body.role,
      status: body.status ?? "NEW",
      stage: body.stage ?? "QUALIFICATION",
      classification: body.classification ?? null,
      source: "MANUAL",
      userId: session.user.id,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
