import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeCallLog, applyCallAnalysis } from "@/lib/ai/call-analysis";
import { prisma } from "@/lib/prisma";
import { generateFOF } from "@/lib/ai/fof-generator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.leadId || !body.text) {
    return NextResponse.json(
      { error: "leadId and text are required" },
      { status: 400 }
    );
  }

  try {
    // If skipAnalysis flag — just save the raw text without AI
    if (body.skipAnalysis) {
      const callLog = await prisma.callLog.create({
        data: {
          rawText: body.text,
          type: body.type ?? "SUMMARY",
          meetingId: body.meetingId ?? null,
          leadId: body.leadId,
          userId: session.user.id,
        },
      });

      // Update last contact
      await prisma.lead.update({
        where: { id: body.leadId },
        data: { lastContact: new Date() },
      });

      return NextResponse.json({ callLog, analysis: null });
    }

    const { callLog, analysis } = await analyzeCallLog(
      body.leadId,
      body.text,
      body.type ?? "SUMMARY",
      body.meetingId ?? null,
      session.user.id
    );

    return NextResponse.json({ callLog, analysis });
  } catch (error) {
    console.error("Call analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze call log" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.callLogId) {
    return NextResponse.json(
      { error: "callLogId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await applyCallAnalysis(body.callLogId, session.user.id);

    // Auto-trigger FOF regeneration (fire-and-forget)
    const callLogRecord = await prisma.callLog.findFirst({
      where: { id: body.callLogId },
      select: { leadId: true },
    });
    if (callLogRecord) {
      generateFOF(callLogRecord.leadId, session.user.id, "CALL_LOG").catch(
        (err) => console.error("Auto FOF after call log:", err)
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Apply analysis error:", error);
    return NextResponse.json(
      { error: "Failed to apply analysis" },
      { status: 500 }
    );
  }
}
