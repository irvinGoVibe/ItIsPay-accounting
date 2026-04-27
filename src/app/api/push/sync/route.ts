import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncPushQueues } from "@/lib/push/sync";

/** POST /api/push/sync — recompute reply/cold/priority across all user queues. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncPushQueues(session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("push sync error", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
