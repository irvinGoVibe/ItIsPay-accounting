import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncGmail } from "@/lib/sync/gmail-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGmail(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Gmail sync error:", error);
    return NextResponse.json(
      { error: "Gmail sync failed" },
      { status: 500 }
    );
  }
}
