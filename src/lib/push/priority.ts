import type { Lead, PushQueue } from "@prisma/client";

export type Priority = "P1" | "STANDARD" | "COLD";

interface ComputeArgs {
  lead: Pick<Lead, "isActiveDeal" | "stage" | "status">;
  queue: Pick<PushQueue, "status" | "lastTouchAt">;
  /** epoch ms of last inbound message from the lead, or null */
  lastInboundAt?: number | null;
  /** "now" override for testing */
  now?: Date;
}

/**
 * P1: hot — active deal in PROPOSAL/NEGOTIATION, OR recent inbound (last 7 days)
 * COLD: queue.status === "COLD"
 * STANDARD: everything else in ACTIVE
 */
export function computePriority({
  lead,
  queue,
  lastInboundAt,
  now = new Date(),
}: ComputeArgs): Priority {
  if (queue.status === "COLD") return "COLD";

  const stage = (lead.stage || "").toUpperCase();
  if (lead.isActiveDeal && (stage === "PROPOSAL" || stage === "NEGOTIATION")) {
    return "P1";
  }

  const status = (lead.status || "").toUpperCase();
  if (status === "PROPOSAL" || status === "NEGOTIATION") {
    return "P1";
  }

  if (lastInboundAt) {
    const days = (now.getTime() - lastInboundAt) / 86400000;
    if (days <= 7) return "P1";
  }

  return "STANDARD";
}
