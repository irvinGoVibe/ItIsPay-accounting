import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedPushQueues } from "@/lib/push/sync";

/** POST /api/push/seed — initialize PushQueue for leads that don't have one. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await seedPushQueues(session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("push seed error", e);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
