import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncCalendar } from "@/lib/sync/calendar-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncCalendar(session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Calendar sync error:", error);
    const message =
      error instanceof Error ? error.message : "Calendar sync failed";
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
