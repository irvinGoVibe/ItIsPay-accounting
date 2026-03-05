import { prisma } from "@/lib/prisma";
import { generateAIResponse } from "./client";
import { formatDate } from "@/lib/utils";

export async function generateCallScript(
  leadId: string,
  meetingId: string | null,
  userId: string
): Promise<string> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      emails: { orderBy: { date: "desc" }, take: 10 },
      callLogs: { orderBy: { createdAt: "desc" }, take: 3 },
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!lead) throw new Error("Lead not found");

  const emailContext = lead.emails
    .map((e) => `- ${formatDate(e.date)}: ${e.subject} — ${e.snippet ?? ""}`)
    .join("\n") || "No emails";

  const callContext = lead.callLogs
    .map((c) => `- ${formatDate(c.createdAt)}: ${c.aiSummary ?? c.rawText.slice(0, 200)}`)
    .join("\n") || "No previous calls";

  const systemPrompt = `You are a sales coach for ItIsPay, a payment solutions company.
Generate a personalized call script. Use markdown formatting.
The script should feel natural, not robotic. Include specific conversation cues based on the lead's history.`;

  const userPrompt = `Generate a call script for a meeting with this lead.

LEAD:
- Name: ${lead.name}
- Company: ${lead.company ?? "Unknown"}
- Status: ${lead.status}
- Stage: ${lead.stage}

EMAIL HISTORY:
${emailContext}

CALL HISTORY:
${callContext}

Create a script with these sections:

## Opening
[Personalized greeting referencing last interaction]

## Context Recap
[Brief reminder of where we left off]

## Discovery Questions
[Questions about their payment flow, pain points, requirements]

## Pain Points to Explore
[Based on what we know, areas to dig deeper]

## Solution Positioning
[How ItIsPay addresses their needs — keep it high-level]

## Next Steps
[How to close the call with clear action items]

## Objection Handling
[Common objections and suggested responses]`;

  return await generateAIResponse(systemPrompt, userPrompt);
}
