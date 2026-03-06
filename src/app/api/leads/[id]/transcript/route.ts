import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateFullTranscript } from "@/lib/ai/lead-summary";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const content = await generateFullTranscript(id, session.user.id);

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Transcript generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate transcript" },
      { status: 500 }
    );
  }
}
