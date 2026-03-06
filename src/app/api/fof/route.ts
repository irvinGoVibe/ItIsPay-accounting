import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFOF } from "@/lib/ai/fof-generator";

export const maxDuration = 60;

// GET /api/fof?leadId=X&history=true
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const history = searchParams.get("history") === "true";

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    if (history) {
      const versions = await prisma.flowOfFunds.findMany({
        where: { leadId, userId: session.user.id },
        orderBy: { version: "desc" },
      });
      return NextResponse.json({ versions });
    }

    // Latest version
    const latest = await prisma.flowOfFunds.findFirst({
      where: { leadId, userId: session.user.id },
      orderBy: { version: "desc" },
    });

    return NextResponse.json({ fof: latest });
  } catch (error) {
    console.error("FOF fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch FOF" },
      { status: 500 }
    );
  }
}

// POST /api/fof — generate FOF via AI
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, trigger, lang } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    const result = await generateFOF(
      leadId,
      session.user.id,
      trigger || "MANUAL",
      lang || "en"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("FOF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate FOF" },
      { status: 500 }
    );
  }
}

// PATCH /api/fof — manual edit (creates new version)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, ...fields } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    // Get next version number
    const latestVersion = await prisma.flowOfFunds.findFirst({
      where: { leadId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Serialize array fields if they're arrays
    const data: Record<string, unknown> = { ...fields };
    for (const key of ["paymentMethods", "currencies", "geographicScope"]) {
      if (Array.isArray(data[key])) {
        data[key] = JSON.stringify(data[key]);
      }
    }

    const fof = await prisma.flowOfFunds.create({
      data: {
        ...data,
        version: nextVersion,
        trigger: "MANUAL",
        leadId,
        userId: session.user.id,
      } as Parameters<typeof prisma.flowOfFunds.create>[0]["data"],
    });

    return NextResponse.json({ fof });
  } catch (error) {
    console.error("FOF update error:", error);
    return NextResponse.json(
      { error: "Failed to update FOF" },
      { status: 500 }
    );
  }
}
