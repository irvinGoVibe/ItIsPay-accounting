import { prisma } from "@/lib/prisma";
import { generateStructuredAIResponse } from "./client";
import { formatDate } from "@/lib/utils";

export interface FlowOfFundsData {
  paymentDirection: string | null;
  sourceOfFunds: string | null;
  destinationOfFunds: string | null;
  paymentMethods: string[];
  currencies: string[];
  expectedVolume: string | null;
  feeStructure: string | null;
  settlementTimeline: string | null;
  complianceRequirements: string | null;
  integrationType: string | null;
  riskLevel: string | null;
  geographicScope: string[];
  businessModel: string | null;
  keyStakeholders: string | null;
  specialRequirements: string | null;
  confidenceScore: number;
}

export async function generateFOF(
  leadId: string,
  userId: string,
  trigger: string = "MANUAL",
  lang: string = "en"
): Promise<{
  fof: { id: string; version: number };
  data: FlowOfFundsData | null;
  skipped: boolean;
}> {
  // Rate limiting: skip if generated < 5 minutes ago (except MANUAL)
  if (trigger !== "MANUAL") {
    const recentFof = await prisma.flowOfFunds.findFirst({
      where: {
        leadId,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true, version: true },
    });
    if (recentFof) {
      return { fof: recentFof, data: null, skipped: true };
    }
  }

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

  // Build context from all communications
  const emailContext = lead.emails
    .map(
      (e) =>
        `[${formatDate(e.date)}] ${e.isInbound ? "FROM" : "TO"} ${e.fromEmail}\nSubject: ${e.subject || "(no subject)"}\n${e.body || e.snippet || ""}`
    )
    .join("\n---\n");

  const callLogContext = lead.callLogs
    .map(
      (c) =>
        `[${formatDate(c.createdAt)}] Type: ${c.type}\n${c.aiSummary || c.rawText.substring(0, 1000)}`
    )
    .join("\n---\n");

  const notesContext = lead.notes
    .map((n) => `[${formatDate(n.createdAt)}] ${n.content}`)
    .join("\n");

  // Previous FOF for refinement
  const prevFof = lead.flowOfFunds[0];
  const prevFofContext = prevFof
    ? `
CURRENT FOF STATE (version ${prevFof.version}, confidence: ${prevFof.confidenceScore || 0}%):
- Payment Direction: ${prevFof.paymentDirection || "unknown"}
- Source of Funds: ${prevFof.sourceOfFunds || "unknown"}
- Destination: ${prevFof.destinationOfFunds || "unknown"}
- Payment Methods: ${prevFof.paymentMethods || "unknown"}
- Currencies: ${prevFof.currencies || "unknown"}
- Expected Volume: ${prevFof.expectedVolume || "unknown"}
- Fee Structure: ${prevFof.feeStructure || "unknown"}
- Settlement: ${prevFof.settlementTimeline || "unknown"}
- Compliance: ${prevFof.complianceRequirements || "unknown"}
- Integration: ${prevFof.integrationType || "unknown"}
- Risk Level: ${prevFof.riskLevel || "unknown"}
- Geographic Scope: ${prevFof.geographicScope || "unknown"}
- Business Model: ${prevFof.businessModel || "unknown"}
- Stakeholders: ${prevFof.keyStakeholders || "unknown"}
- Special Requirements: ${prevFof.specialRequirements || "unknown"}

Update and refine this FOF based on new information. Keep existing data if not contradicted.`
    : "No previous FOF exists. Extract all available information from communications.";

  const langNote = lang === "ru"
    ? "\n- Write descriptive text fields (sourceOfFunds, destinationOfFunds, feeStructure, complianceRequirements, keyStakeholders, specialRequirements, expectedVolume) in Russian."
    : "\n- Write descriptive text fields in English.";

  const systemPrompt = `You are a payment flow analyst for ItIsPay, a payment orchestration company.
Extract and structure the Flow of Funds (FOF) information from all available communications with this client.
FOF describes how money flows through the system for this client's use case.

Rules:
- If information is not explicitly mentioned, set the field to null
- For array fields (paymentMethods, currencies, geographicScope), return empty arrays if unknown
- Include a confidenceScore (0-100) reflecting how complete and reliable the FOF data is
- Confidence below 30 = very little info, 30-70 = partial info, above 70 = good coverage
- Respond ONLY with valid JSON matching the exact schema provided${langNote}`;

  const userPrompt = `Analyze all communications for this client and extract Flow of Funds data:

## Client
- Name: ${lead.name}
- Company: ${lead.company || "Unknown"}
- Email: ${lead.email}
- Status: ${lead.status} | Stage: ${lead.stage}

## Previous FOF
${prevFofContext}

## Emails (${lead.emails.length} total):
${emailContext || "No emails"}

## Call Logs (${lead.callLogs.length}):
${callLogContext || "No call logs"}

## Notes:
${notesContext || "No notes"}

Respond with JSON matching this exact schema:
{
  "paymentDirection": "INBOUND" | "OUTBOUND" | "BOTH" | null,
  "sourceOfFunds": "description of where money comes from" | null,
  "destinationOfFunds": "description of where money goes" | null,
  "paymentMethods": ["cards", "bank_transfers", "crypto", "e-wallets", ...] or [],
  "currencies": ["USD", "EUR", ...] or [],
  "expectedVolume": "$X/month or description" | null,
  "feeStructure": "description of fees" | null,
  "settlementTimeline": "T+1, T+2, Real-time, etc." | null,
  "complianceRequirements": "KYC, AML, PCI-DSS, licenses needed, etc." | null,
  "integrationType": "API" | "HOSTED_PAGE" | "PLUGIN" | "WHITE_LABEL" | null,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null,
  "geographicScope": ["US", "EU", "LATAM", ...] or [],
  "businessModel": "MARKETPLACE" | "SAAS" | "ECOMMERCE" | "GAMBLING" | "TRAVEL" | "FINTECH" | "OTHER" | null,
  "keyStakeholders": "names and roles" | null,
  "specialRequirements": "any special needs" | null,
  "confidenceScore": 0-100
}`;

  const data = await generateStructuredAIResponse<FlowOfFundsData>(
    systemPrompt,
    userPrompt
  );

  // Determine next version
  const latestVersion = await prisma.flowOfFunds.findFirst({
    where: { leadId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestVersion?.version ?? 0) + 1;

  // Save to database
  const fof = await prisma.flowOfFunds.create({
    data: {
      version: nextVersion,
      trigger,
      paymentDirection: data.paymentDirection,
      sourceOfFunds: data.sourceOfFunds,
      destinationOfFunds: data.destinationOfFunds,
      paymentMethods: JSON.stringify(data.paymentMethods || []),
      currencies: JSON.stringify(data.currencies || []),
      expectedVolume: data.expectedVolume,
      feeStructure: data.feeStructure,
      settlementTimeline: data.settlementTimeline,
      complianceRequirements: data.complianceRequirements,
      integrationType: data.integrationType,
      riskLevel: data.riskLevel,
      geographicScope: JSON.stringify(data.geographicScope || []),
      businessModel: data.businessModel,
      keyStakeholders: data.keyStakeholders,
      specialRequirements: data.specialRequirements,
      confidenceScore: data.confidenceScore ?? 0,
      leadId,
      userId,
    },
    select: { id: true, version: true },
  });

  return { fof, data, skipped: false };
}
