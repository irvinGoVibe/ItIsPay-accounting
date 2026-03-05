import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateBriefing } from "@/lib/ai/briefing";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.meetingId) {
    return NextResponse.json(
      { error: "meetingId is required" },
      { status: 400 }
    );
  }

  try {
    const content = await generateBriefing(body.meetingId, session.user.id);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Briefing generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
