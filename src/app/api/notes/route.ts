import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.content || !body.leadId) {
    return NextResponse.json(
      { error: "content and leadId are required" },
      { status: 400 }
    );
  }

  const note = await prisma.note.create({
    data: {
      content: body.content,
      leadId: body.leadId,
      userId: session.user.id,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
