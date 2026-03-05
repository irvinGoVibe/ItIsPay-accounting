import { prisma } from "@/lib/prisma";
import { generateAIResponse } from "./client";
import { formatDate } from "@/lib/utils";

export async function generateBriefing(
  meetingId: string,
  userId: string
): Promise<string> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId },
    include: {
      lead: {
        include: {
          emails: { orderBy: { date: "desc" }, take: 20 },
          callLogs: { orderBy: { createdAt: "desc" }, take: 5 },
          notes: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      },
    },
  });

  if (!meeting) throw new Error("Meeting not found");

  const lead = meeting.lead;
  const participants = JSON.parse(meeting.participants || "[]");

  const emailHistory = lead?.emails
    .map(
      (e) =>
        `- ${formatDate(e.date)}: ${e.subject ?? "(no subject)"} - ${e.snippet ?? ""}`
    )
    .join("\n") ?? "No email history";

  const callHistory = lead?.callLogs
    .map(
      (c) =>
        `- ${formatDate(c.createdAt)}: ${c.aiSummary ?? c.rawText.slice(0, 200)}\n  Next steps: ${c.aiNextSteps ?? "N/A"}`
    )
    .join("\n") ?? "No call history";

  const notesList = lead?.notes
    .map((n) => `- ${formatDate(n.createdAt)}: ${n.content}`)
    .join("\n") ?? "No notes";

  const systemPrompt = `You are a sales assistant for ItIsPay, a payment solutions company.
Create a pre-meeting briefing that is professional, concise, and actionable.
Use markdown formatting. Write in the language that matches the lead's communication history.`;

  const userPrompt = `Prepare a briefing for an upcoming meeting.

LEAD CONTEXT:
- Name: ${lead?.name ?? "Unknown"}
- Company: ${lead?.company ?? "Unknown"}
- Email: ${lead?.email ?? "Unknown"}
- Current Status: ${lead?.status ?? "N/A"}
- Current Stage: ${lead?.stage ?? "N/A"}
- Meeting Time: ${formatDate(meeting.startTime)}
- Participants: ${participants.map((p: { name: string; email: string }) => `${p.name} (${p.email})`).join(", ")}

EMAIL HISTORY:
${emailHistory}

CALL HISTORY:
${callHistory}

NOTES:
${notesList}

Create a structured briefing with these sections:
## About the Client
[Who they are, what's known about them and their company]

## Communication History
[Brief summary of past interactions, key themes from emails]

## Open Questions
[What remains unclear from previous conversations]

## Meeting Goal
[What needs to be discussed or clarified today]

## Discovery Questions (ItIsPay Flow of Funds)
[Targeted questions for qualification]

## Recommendations
[Where to focus, potential pain points to address]`;

  const content = await generateAIResponse(systemPrompt, userPrompt);

  // Save briefing
  const briefing = await prisma.briefing.create({
    data: {
      content,
      meetingId,
      leadId: lead?.id ?? "",
      userId,
    },
  });

  return briefing.content;
}
