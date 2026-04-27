import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncGmail } from "@/lib/sync/gmail-sync";
import { seedAndSync } from "@/lib/push/sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGmail(session.user.id);

    // After Gmail pulls fresh emails, recompute the Push Scheduler queue:
    //   1. seed queues for any newly-created leads
    //   2. resync touches / replies / cold / priority across all queues
    // Failure here must not block Gmail sync result.
    let push: Awaited<ReturnType<typeof seedAndSync>> | null = null;
    try {
      push = await seedAndSync(session.user.id);
    } catch (e) {
      console.error("Push seed/sync after Gmail sync failed:", e);
    }

    return NextResponse.json({ ...result, push });
  } catch (error) {
    console.error("Gmail sync error:", error);
    return NextResponse.json(
      { error: "Gmail sync failed" },
      { status: 500 }
    );
  }
}
