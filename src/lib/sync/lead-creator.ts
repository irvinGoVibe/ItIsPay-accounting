import { prisma } from "@/lib/prisma";
import { isPersonalEmail, extractDomainFromEmail, companyFromDomain } from "@/lib/utils";

export async function createLeadsFromEmails(userId: string): Promise<number> {
  // Get all emails for this user that aren't linked to a lead
  const unlinkedEmails = await prisma.email.findMany({
    where: {
      userId,
      leadId: null,
    },
    select: {
      id: true,
      fromEmail: true,
      fromName: true,
      toEmail: true,
      isInbound: true,
    },
  });

  // Collect unique external email addresses
  const contactMap = new Map<
    string,
    { email: string; name: string | null; emailIds: string[] }
  >();

  for (const email of unlinkedEmails) {
    // Use the external party's email
    const contactEmail = email.isInbound ? email.fromEmail : email.toEmail;
    const contactName = email.isInbound ? email.fromName : null;

    if (!contactEmail || isPersonalEmail(contactEmail)) continue;

    const existing = contactMap.get(contactEmail);
    if (existing) {
      existing.emailIds.push(email.id);
      // Prefer a real name over null
      if (contactName && !existing.name) {
        existing.name = contactName;
      }
    } else {
      contactMap.set(contactEmail, {
        email: contactEmail,
        name: contactName,
        emailIds: [email.id],
      });
    }
  }

  let created = 0;

  for (const [contactEmail, contact] of contactMap) {
    // Check if lead already exists
    const existingLead = await prisma.lead.findUnique({
      where: { email_userId: { email: contactEmail, userId } },
    });

    if (existingLead) {
      // Link unlinked emails to this lead
      await prisma.email.updateMany({
        where: { id: { in: contact.emailIds } },
        data: { leadId: existingLead.id },
      });
      continue;
    }

    // Extract company from domain
    const domain = extractDomainFromEmail(contactEmail);
    const company = domain ? companyFromDomain(domain) : null;
    const name = contact.name || contactEmail.split("@")[0];

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name,
        email: contactEmail,
        company,
        status: "NEW",
        stage: "QUALIFICATION",
        source: "GMAIL",
        userId,
      },
    });

    // Link emails to lead
    await prisma.email.updateMany({
      where: { id: { in: contact.emailIds } },
      data: { leadId: lead.id },
    });

    // Update lastContact with the most recent email date
    const latestEmail = await prisma.email.findFirst({
      where: { leadId: lead.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    if (latestEmail) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContact: latestEmail.date },
      });
    }

    created++;
  }

  return created;
}
