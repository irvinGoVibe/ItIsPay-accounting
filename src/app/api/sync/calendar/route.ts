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
    return NextResponse.json(result);
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Calendar sync failed" },
      { status: 500 }
    );
  }
}
