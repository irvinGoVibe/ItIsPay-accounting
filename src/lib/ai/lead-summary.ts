import { prisma } from "@/lib/prisma";
import { generateAIResponse } from "./client";
import { formatDate } from "@/lib/utils";

export async function generateFullTranscript(
  leadId: string,
  userId: string
): Promise<string> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      emails: { orderBy: { date: "asc" } },
    },
  });

  if (!lead) throw new Error("Lead not found");

  if (lead.emails.length === 0) {
    return "No emails found for this lead.";
  }

  const lines: string[] = [
    `# Full Conversation Transcript`,
    `**Lead:** ${lead.name} (${lead.email})`,
    `**Company:** ${lead.company || "N/A"}`,
    `**Total Emails:** ${lead.emails.length}`,
    "",
    "---",
    "",
  ];

  for (const email of lead.emails) {
    lines.push(`### ${formatDate(email.date)}`);
    lines.push(`**From:** ${email.fromName || email.fromEmail}`);
    lines.push(`**To:** ${email.toEmail}`);
    if (email.subject) lines.push(`**Subject:** ${email.subject}`);
    lines.push("");
    lines.push(email.body || email.snippet || "(no content)");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const content = lines.join("\n");

  // Save to database
  await prisma.leadSummary.create({
    data: {
      content,
      type: "FULL_TRANSCRIPT",
      leadId,
      userId,
    },
  });

  return content;
}

export async function generateAISummary(
  leadId: string,
  userId: string
): Promise<string> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      emails: { orderBy: { date: "desc" }, take: 50 },
      callLogs: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      meetings: { orderBy: { startTime: "desc" } },
      flowOfFunds: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!lead) throw new Error("Lead not found");

  // Build context
  const emailContext = lead.emails
    .map(
      (e) =>
        `[${formatDate(e.date)}] ${e.isInbound ? "FROM" : "TO"} ${e.fromEmail}: Subject: ${e.subject || "(no subject)"}\n${e.snippet || ""}`
    )
    .join("\n\n");

  const callLogContext = lead.callLogs
    .map(
      (c) =>
        `[${formatDate(c.createdAt)}] Type: ${c.type}, Outcome: ${c.outcome || "N/A"}\nSummary: ${c.aiSummary || c.rawText.substring(0, 500)}`
    )
    .join("\n\n");

  const notesContext = lead.notes
    .map((n) => `[${formatDate(n.createdAt)}] ${n.content}`)
    .join("\n\n");

  const meetingsContext = lead.meetings
    .map(
      (m) =>
        `[${formatDate(m.startTime)}] ${m.title} - Status: ${m.status}`
    )
    .join("\n\n");

  const fofContext =
    lead.flowOfFunds.length > 0
      ? `Payment Direction: ${lead.flowOfFunds[0].paymentDirection || "N/A"}, Business Model: ${lead.flowOfFunds[0].businessModel || "N/A"}, Risk: ${lead.flowOfFunds[0].riskLevel || "N/A"}`
      : "No FOF data yet";

  const systemPrompt = `You are a sales analyst for ItIsPay, a payment orchestration company.
Generate a comprehensive client summary based on all available data.
Write in clear, professional language. Use markdown formatting.
If writing about a Russian-speaking client, write the summary in Russian.`;

  const userPrompt = `Generate a comprehensive summary for this client:

## Client Info
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || "Unknown"}
- Phone: ${lead.phone || "N/A"}
- Role: ${lead.role || "N/A"}
- Status: ${lead.status}
- Stage: ${lead.stage}
- Source: ${lead.source}

## Flow of Funds
${fofContext}

## Emails (${lead.emails.length} total, showing recent):
${emailContext || "No emails"}

## Call Logs (${lead.callLogs.length}):
${callLogContext || "No call logs"}

## Notes (${lead.notes.length}):
${notesContext || "No notes"}

## Meetings (${lead.meetings.length}):
${meetingsContext || "No meetings"}

Please provide the summary with these sections:
## Client Profile
## Communication History Summary
## What They Need (Business Requirements)
## Current Status & Stage
## Key Agreements Made
## Open Questions & Unknowns
## Risk Assessment
## Recommended Next Steps`;

  const content = await generateAIResponse(systemPrompt, userPrompt);

  // Save to database
  await prisma.leadSummary.create({
    data: {
      content,
      type: "AI_SUMMARY",
      leadId,
      userId,
    },
  });

  return content;
}
