import { prisma } from "@/lib/prisma";
import { generateAIResponse, generateStructuredAIResponse } from "./client";
import { formatDate } from "@/lib/utils";

// Language instruction helper
function langInstruction(lang: string): string {
  if (lang === "ru") return "\n\nIMPORTANT: Write your ENTIRE response in Russian (Русский). All sections, headers, and content must be in Russian.";
  return "\n\nIMPORTANT: Write your ENTIRE response in English. All sections, headers, and content must be in English.";
}

// Shared: fetch all lead data
async function fetchLeadContext(leadId: string, userId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      emails: { orderBy: { date: "desc" }, take: 30 },
      callLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      notes: { orderBy: { createdAt: "desc" }, take: 10 },
      meetings: { orderBy: { startTime: "desc" }, take: 10 },
      tasks: { orderBy: { dueDate: "asc" } },
      flowOfFunds: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!lead) throw new Error("Lead not found");

  const emailContext = lead.emails
    .map(
      (e) =>
        `[${formatDate(e.date)}] ${e.isInbound ? "FROM" : "TO"} ${e.fromEmail}: Subject: ${e.subject || "(no subject)"}\n${e.body || e.snippet || ""}`
    )
    .join("\n\n");

  const callLogContext = lead.callLogs
    .map(
      (c) =>
        `[${formatDate(c.createdAt)}] Type: ${c.type}, Outcome: ${c.outcome || "N/A"}\nSummary: ${c.aiSummary || c.rawText.substring(0, 500)}${c.aiNextSteps ? `\nNext Steps: ${c.aiNextSteps}` : ""}${c.aiAgreements ? `\nAgreements: ${c.aiAgreements}` : ""}`
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

  const tasksContext = lead.tasks
    .map(
      (t) =>
        `${t.completed ? "[DONE]" : "[TODO]"} ${t.title}${t.dueDate ? ` (due: ${formatDate(t.dueDate)})` : ""} [${t.priority}]`
    )
    .join("\n");

  const fof = lead.flowOfFunds[0];
  const fofContext = fof
    ? `Payment Direction: ${fof.paymentDirection || "N/A"}, Business Model: ${fof.businessModel || "N/A"}, Source of Funds: ${fof.sourceOfFunds || "N/A"}, Destination: ${fof.destinationOfFunds || "N/A"}, Payment Methods: ${fof.paymentMethods || "N/A"}, Currencies: ${fof.currencies || "N/A"}, Expected Volume: ${fof.expectedVolume || "N/A"}, Fee Structure: ${fof.feeStructure || "N/A"}, Settlement: ${fof.settlementTimeline || "N/A"}, Integration: ${fof.integrationType || "N/A"}, Risk: ${fof.riskLevel || "N/A"}, Geographic Scope: ${fof.geographicScope || "N/A"}, Compliance: ${fof.complianceRequirements || "N/A"}, Confidence: ${fof.confidenceScore ?? 0}%`
    : "No FOF data yet";

  return { lead, emailContext, callLogContext, notesContext, meetingsContext, tasksContext, fofContext, fof };
}

function buildClientInfoBlock(lead: { name: string; email: string; company: string | null; role: string | null; status: string; stage: string; source: string; lastContact: Date | null }) {
  return `## Client Info
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || "Unknown"}
- Role: ${lead.role || "N/A"}
- Status: ${lead.status}
- Stage: ${lead.stage}
- Source: ${lead.source}
- Last Contact: ${lead.lastContact ? formatDate(lead.lastContact) : "Never"}`;
}

// ─────────────── 1. COMPANY PROFILE ───────────────

export async function generateCompanyProfile(
  leadId: string,
  userId: string,
  lang: string = "en"
): Promise<string> {
  const ctx = await fetchLeadContext(leadId, userId);

  const systemPrompt = `You are a business analyst for ItIsPay, a payment orchestration company.
Your job is to build a comprehensive company profile based on all available data — emails, calls, notes, and any other information.
Analyze every piece of data to extract and infer information about the client's company.
Write in clear, professional language. Use markdown formatting.
Be thorough — extract every detail you can find about their business from the communications.${langInstruction(lang)}`;

  const userPrompt = `Based on all available communications and data, build a detailed company profile:

${buildClientInfoBlock(ctx.lead)}

## Flow of Funds Data
${ctx.fofContext}

## All Emails (${ctx.lead.emails.length} total):
${ctx.emailContext || "No emails"}

## Call Logs (${ctx.lead.callLogs.length}):
${ctx.callLogContext || "No call logs"}

## Notes:
${ctx.notesContext || "No notes"}

## Meetings:
${ctx.meetingsContext || "No meetings"}

Please provide a company profile with these sections:

## Company Overview
Company name, what they do, their main product/service, founding year if known.

## Business Model
How they make money, their revenue model, pricing approach.

## Target Market & Customers
Who are their customers, B2B/B2C, geographic markets, customer segments.

## Payment Needs Analysis
Why they need payment orchestration, current payment setup, pain points with current solution, what triggered the search for a new provider.

## Technical Profile
Their tech stack (if mentioned), current integrations, API capabilities, technical maturity.

## Company Size & Scale
Team size, revenue indicators, transaction volumes, growth stage (startup/SMB/enterprise).

## Key Decision Makers
People involved in the decision, their roles, who is the champion, who is the blocker.

## Competitive Landscape
Competitors they mentioned, other payment providers they use or evaluated.

## Red Flags & Concerns
Any concerns, hesitations, or potential issues identified from communications.

## Strengths & Opportunities
What makes this a good potential client, opportunities for ItIsPay.`;

  return generateAIResponse(systemPrompt, userPrompt);
}

// ─────────────── 2. SALES SCRIPT (FOF DATA GATHERING) ───────────────

export async function generateSalesScript(
  leadId: string,
  userId: string,
  lang: string = "en"
): Promise<string> {
  const ctx = await fetchLeadContext(leadId, userId);

  // Determine which FOF fields are still missing
  const missingFields: string[] = [];
  if (ctx.fof) {
    if (!ctx.fof.paymentDirection) missingFields.push("Payment Direction (inbound/outbound/both)");
    if (!ctx.fof.sourceOfFunds) missingFields.push("Source of Funds");
    if (!ctx.fof.destinationOfFunds) missingFields.push("Destination of Funds");
    if (!ctx.fof.paymentMethods) missingFields.push("Payment Methods (cards, bank transfers, crypto, etc.)");
    if (!ctx.fof.currencies) missingFields.push("Currencies");
    if (!ctx.fof.expectedVolume) missingFields.push("Expected Transaction Volume");
    if (!ctx.fof.feeStructure) missingFields.push("Fee Structure preferences");
    if (!ctx.fof.settlementTimeline) missingFields.push("Settlement Timeline requirements");
    if (!ctx.fof.complianceRequirements) missingFields.push("Compliance Requirements");
    if (!ctx.fof.integrationType) missingFields.push("Integration Type (API, hosted page, plugin, white-label)");
    if (!ctx.fof.riskLevel) missingFields.push("Risk assessment");
    if (!ctx.fof.geographicScope) missingFields.push("Geographic Scope");
    if (!ctx.fof.businessModel) missingFields.push("Business Model");
    if (!ctx.fof.specialRequirements) missingFields.push("Special Requirements");
  } else {
    missingFields.push(
      "Payment Direction", "Source of Funds", "Destination of Funds",
      "Payment Methods", "Currencies", "Expected Volume", "Fee Structure",
      "Settlement Timeline", "Compliance Requirements", "Integration Type",
      "Geographic Scope", "Business Model", "Special Requirements"
    );
  }

  const systemPrompt = `You are a senior sales coach at ItIsPay, a payment orchestration company.
Your job is to create a ready-to-use sales script for a call or meeting with a client.
The script should help the salesperson gather ALL missing Flow of Funds (FOF) information naturally — not like an interrogation, but as a professional consultative conversation.

ItIsPay provides payment orchestration — connecting merchants to multiple payment providers, optimizing routing, managing settlements, and ensuring compliance across geographies.

The script should:
1. Start with a warm, personalized intro based on previous communications
2. Naturally transition into discovery questions
3. Ask about missing FOF fields in a conversational way
4. Include handling for objections or deflections
5. End with clear next steps

Use markdown formatting with clear sections.${langInstruction(lang)}`;

  const userPrompt = `Create a sales script for the next interaction with this client:

${buildClientInfoBlock(ctx.lead)}

## Current Flow of Funds Data
${ctx.fofContext}

## Missing FOF Fields to Gather:
${missingFields.length > 0 ? missingFields.map((f) => `- ${f}`).join("\n") : "All FOF fields are filled! Focus on deepening understanding and verifying data."}

## Communication History:
### Recent Emails:
${ctx.emailContext || "No emails"}

### Call Logs:
${ctx.callLogContext || "No call logs"}

### Notes:
${ctx.notesContext || "No notes"}

## Current Tasks:
${ctx.tasksContext || "No tasks"}

Please create a sales script with these sections:

## Opening & Intro
Personalized greeting referencing previous interactions. Warm, professional tone.

## Agenda Setting
How to frame the call purpose — position it as helping them, not selling.

## Discovery Questions
Natural, conversational questions to gather the missing FOF information. For each question:
- The question itself
- Why you're asking (what it tells you)
- Follow-up probes if they give a vague answer
- How to naturally transition to the next topic

## Key Talking Points
Important points to mention about ItIsPay capabilities relevant to this client.

## Objection Handling
Likely objections based on the communication history and how to address them.

## Closing & Next Steps
How to end the conversation with clear commitments and next steps.

## Quick Reference Card
A compact checklist of ALL information to gather during the call, for quick reference.`;

  return generateAIResponse(systemPrompt, userPrompt);
}

// ─────────────── 3. NEXT STEPS RECOMMENDATIONS ───────────────

export async function generateRecommendations(
  leadId: string,
  userId: string,
  lang: string = "en"
): Promise<string> {
  const ctx = await fetchLeadContext(leadId, userId);

  const systemPrompt = `You are a senior sales strategist for ItIsPay, a payment orchestration company.
Your job is to analyze all available information about a client and provide actionable, strategic recommendations for next steps.
Focus on moving the deal forward, addressing risks, and maximizing the chance of closing.
Write in clear, professional language. Use markdown formatting with structured sections.
Be specific — reference actual emails, calls, agreements, and FOF data in your recommendations.${langInstruction(lang)}`;

  const userPrompt = `Analyze this client and provide strategic recommendations:

${buildClientInfoBlock(ctx.lead)}

## Flow of Funds
${ctx.fofContext}

## Recent Emails (${ctx.lead.emails.length} total):
${ctx.emailContext || "No emails"}

## Call Logs (${ctx.lead.callLogs.length}):
${ctx.callLogContext || "No call logs"}

## Notes:
${ctx.notesContext || "No notes"}

## Meetings:
${ctx.meetingsContext || "No meetings"}

## Current Tasks:
${ctx.tasksContext || "No tasks"}

Please provide recommendations in these sections:

## Deal Assessment
Brief assessment of deal health, momentum, and probability of closing.

## Immediate Actions (Next 24-48h)
Specific, actionable steps to take right now. Each action should have a clear owner and deadline.

## Short-Term Strategy (This Week)
What to focus on this week to move the deal forward.

## Risk Mitigation
Identified risks and specific actions to mitigate them.

## Key Questions to Resolve
Critical questions that need answers before progressing to the next stage.

## Communication Strategy
How and when to reach out, what messaging to use, preferred channels.

## Deal Optimization
Suggestions for upselling, cross-selling, or structuring the deal better for both sides.`;

  return generateAIResponse(systemPrompt, userPrompt);
}

// ─────────────── 4. STRUCTURED RECOMMENDATIONS (for Activate Lead flow) ───────────────

export interface ActionItem {
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueInDays: number;
  owner: "us" | "client";
}

export interface StructuredRecommendations {
  markdown: string;
  actions: ActionItem[];
}

export async function generateStructuredRecommendations(
  leadId: string,
  userId: string,
  lang: string = "ru"
): Promise<StructuredRecommendations> {
  const ctx = await fetchLeadContext(leadId, userId);

  const systemPrompt = `You are a senior sales strategist for ItIsPay, a payment orchestration company.
Your job is to analyze all available information about a client and provide actionable, strategic recommendations.
Focus on moving the deal forward, addressing risks, and maximizing the chance of closing.

You must return a JSON object with two fields:
1. "markdown" — a detailed recommendation report in markdown format with sections: Deal Assessment, Immediate Actions (24-48h), Short-Term Strategy (this week), Risk Mitigation, Key Questions to Resolve, Communication Strategy.
2. "actions" — an array of 3-7 concrete action items, each with: title (string), priority ("HIGH"/"MEDIUM"/"LOW"), dueInDays (number, days from now), owner ("us" or "client").

Be specific — reference actual emails, calls, agreements, and FOF data.${langInstruction(lang)}`;

  const userPrompt = `Analyze this client and provide strategic recommendations:

${buildClientInfoBlock(ctx.lead)}

## Flow of Funds
${ctx.fofContext}

## Recent Emails (${ctx.lead.emails.length} total):
${ctx.emailContext || "No emails"}

## Call Logs (${ctx.lead.callLogs.length}):
${ctx.callLogContext || "No call logs"}

## Notes:
${ctx.notesContext || "No notes"}

## Meetings:
${ctx.meetingsContext || "No meetings"}

## Current Tasks:
${ctx.tasksContext || "No tasks"}

Respond with JSON:
{
  "markdown": "## Deal Assessment\\n...",
  "actions": [
    { "title": "Action description", "priority": "HIGH", "dueInDays": 1, "owner": "us" },
    ...
  ]
}`;

  return generateStructuredAIResponse<StructuredRecommendations>(systemPrompt, userPrompt);
}
