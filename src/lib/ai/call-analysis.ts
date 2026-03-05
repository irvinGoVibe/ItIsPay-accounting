import { prisma } from "@/lib/prisma";
import { generateStructuredAIResponse } from "./client";
import { formatDate } from "@/lib/utils";

interface CallAnalysisResult {
  keyPoints: string[];
  agreements: string[];
  openQuestions: string[];
  nextSteps: Array<{ action: string; owner: string; deadline: string }>;
  outcome: string;
  recommendedStatus: string;
  engagementLevel: string;
  summary: string;
}

export async function analyzeCallLog(
  leadId: string,
  callLogText: string,
  type: string,
  meetingId: string | null,
  userId: string
): Promise<{ callLog: { id: string }; analysis: CallAnalysisResult }> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      callLogs: { orderBy: { createdAt: "desc" }, take: 3 },
      emails: { orderBy: { date: "desc" }, take: 5 },
    },
  });

  if (!lead) throw new Error("Lead not found");

  const previousInteractions = lead.callLogs
    .map((c) => `- ${formatDate(c.createdAt)}: ${c.aiSummary ?? c.rawText.slice(0, 200)}`)
    .join("\n") || "No previous calls";

  const systemPrompt = `You are a sales analyst for ItIsPay, a payment solutions company.
Analyze the call transcript/summary and extract structured information.
Be specific and actionable. Deadlines should be realistic dates.
Respond ONLY with valid JSON matching the requested format.`;

  const userPrompt = `Analyze this call log with a lead.

LEAD CONTEXT:
- Name: ${lead.name}
- Company: ${lead.company ?? "Unknown"}
- Current Status: ${lead.status}
- Previous Interactions:
${previousInteractions}

CALL LOG (${type}):
${callLogText}

Extract the following information as JSON:
{
  "keyPoints": ["main topics discussed, 3-5 points"],
  "agreements": ["specific agreements made"],
  "openQuestions": ["unresolved questions"],
  "nextSteps": [
    {"action": "specific action", "owner": "us|client", "deadline": "YYYY-MM-DD or 'TBD'"}
  ],
  "outcome": "SUCCESSFUL|RESCHEDULED|NOT_INTERESTED|NO_ANSWER",
  "recommendedStatus": "NEW|CONTACTED|QUALIFIED|PROPOSAL|NEGOTIATION|CLOSED_WON|CLOSED_LOST",
  "engagementLevel": "LOW|MEDIUM|HIGH",
  "summary": "2-3 sentence summary of the call"
}`;

  const analysis = await generateStructuredAIResponse<CallAnalysisResult>(
    systemPrompt,
    userPrompt
  );

  // Save call log
  const callLog = await prisma.callLog.create({
    data: {
      rawText: callLogText,
      type,
      outcome: analysis.outcome,
      aiSummary: analysis.summary,
      aiKeyPoints: JSON.stringify(analysis.keyPoints),
      aiAgreements: JSON.stringify(analysis.agreements),
      aiOpenQuestions: JSON.stringify(analysis.openQuestions),
      aiNextSteps: JSON.stringify(analysis.nextSteps),
      aiRecommendedStatus: analysis.recommendedStatus,
      aiEngagementLevel: analysis.engagementLevel,
      meetingId,
      leadId,
      userId,
    },
  });

  return { callLog, analysis };
}

export async function applyCallAnalysis(
  callLogId: string,
  userId: string
): Promise<{ tasksCreated: number; statusUpdated: boolean }> {
  const callLog = await prisma.callLog.findFirst({
    where: { id: callLogId, userId },
    include: { lead: true },
  });

  if (!callLog) throw new Error("Call log not found");

  let statusUpdated = false;

  // Update lead status if recommended
  if (
    callLog.aiRecommendedStatus &&
    callLog.aiRecommendedStatus !== callLog.lead.status
  ) {
    await prisma.lead.update({
      where: { id: callLog.leadId },
      data: {
        status: callLog.aiRecommendedStatus,
        lastContact: new Date(),
      },
    });
    statusUpdated = true;
  } else {
    await prisma.lead.update({
      where: { id: callLog.leadId },
      data: { lastContact: new Date() },
    });
  }

  // Create tasks from next steps
  let tasksCreated = 0;
  if (callLog.aiNextSteps) {
    const nextSteps = JSON.parse(callLog.aiNextSteps) as Array<{
      action: string;
      owner: string;
      deadline: string;
    }>;

    for (const step of nextSteps) {
      let dueDate: Date | null = null;
      if (step.deadline && step.deadline !== "TBD") {
        const parsed = new Date(step.deadline);
        if (!isNaN(parsed.getTime())) dueDate = parsed;
      }

      await prisma.task.create({
        data: {
          title: step.action,
          dueDate,
          priority: "MEDIUM",
          owner: step.owner,
          source: "AI_ANALYSIS",
          leadId: callLog.leadId,
          userId,
        },
      });
      tasksCreated++;
    }
  }

  return { tasksCreated, statusUpdated };
}
