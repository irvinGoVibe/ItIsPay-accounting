import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCallScript } from "@/lib/ai/call-script";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.leadId) {
    return NextResponse.json(
      { error: "leadId is required" },
      { status: 400 }
    );
  }

  try {
    const script = await generateCallScript(
      body.leadId,
      body.meetingId ?? null,
      session.user.id
    );
    return NextResponse.json({ script });
  } catch (error) {
    console.error("Script generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate script" },
      { status: 500 }
    );
  }
}
