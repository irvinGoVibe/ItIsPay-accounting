import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedAndSync } from "@/lib/push/sync";

/**
 * POST /api/push/sync — full refresh of the queue.
 *
 *   1. Seed: create PushQueue for any Lead that doesn't have one
 *   2. Sync: for every queue recompute currentTouch / lastTouchAt /
 *      nextTouchDueAt / status / priority from the Email table.
 *
 * Idempotent. Safe to call after every Gmail sync. The Gmail sync route
 * already chains this automatically — this endpoint exists for the
 * "Sync" button on /push and for manual debugging.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await seedAndSync(session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("push sync error", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
