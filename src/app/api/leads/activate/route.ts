import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFOF } from "@/lib/ai/fof-generator";
import { generateStructuredRecommendations } from "@/lib/ai/recommendations";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Find lead by exact email match
  const lead = await prisma.lead.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      userId: session.user.id,
    },
    include: {
      _count: {
        select: {
          emails: true,
          meetings: true,
          callLogs: true,
        },
      },
    },
  });

  if (!lead) {
    // Try case-insensitive search
    const leadCaseInsensitive = await prisma.lead.findFirst({
      where: {
        email: { contains: email.trim(), mode: "insensitive" as never },
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            emails: true,
            meetings: true,
            callLogs: true,
          },
        },
      },
    });

    if (!leadCaseInsensitive) {
      return NextResponse.json(
        { error: "Lead not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Use the case-insensitive match
    return await activateLead(leadCaseInsensitive, session.user.id);
  }

  return await activateLead(lead, session.user.id);
}

async function activateLead(
  lead: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    status: string;
    stage: string;
    classification: string | null;
    isActiveDeal: boolean;
    _count: { emails: number; meetings: number; callLogs: number };
  },
  userId: string
) {
  // Set isActiveDeal = true
  await prisma.lead.update({
    where: { id: lead.id },
    data: { isActiveDeal: true },
  });

  // Run FOF generation and structured recommendations in parallel
  const [fofResult, recsResult] = await Promise.allSettled([
    generateFOF(lead.id, userId, "MANUAL", "ru"),
    generateStructuredRecommendations(lead.id, userId, "ru"),
  ]);

  const errors: { fof?: string; recommendations?: string } = {};

  let fof = null;
  if (fofResult.status === "fulfilled") {
    fof = fofResult.value;
  } else {
    errors.fof = fofResult.reason?.message || "FOF generation failed";
    console.error("FOF generation error:", fofResult.reason);
  }

  let recommendations = null;
  if (recsResult.status === "fulfilled") {
    recommendations = recsResult.value;
  } else {
    errors.recommendations =
      recsResult.reason?.message || "Recommendations generation failed";
    console.error("Recommendations error:", recsResult.reason);
  }

  return NextResponse.json({
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      status: lead.status,
      stage: lead.stage,
      classification: lead.classification,
      isActiveDeal: true,
      _count: lead._count,
    },
    fof: fof
      ? {
          data: fof.data,
          version: fof.fof.version,
          skipped: fof.skipped,
        }
      : null,
    recommendations,
    errors: Object.keys(errors).length > 0 ? errors : null,
  });
}
