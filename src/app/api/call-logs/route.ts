import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeCallLog, applyCallAnalysis } from "@/lib/ai/call-analysis";

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
    return NextResponse.json(result);
  } catch (error) {
    console.error("Apply analysis error:", error);
    return NextResponse.json(
      { error: "Failed to apply analysis" },
      { status: 500 }
    );
  }
}
