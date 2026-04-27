"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "CLOSED_WON", label: "Closed won" },
  { value: "CLOSED_LOST", label: "Closed lost" },
] as const;

interface PatchBody {
  isActiveDeal?: boolean;
  status?: string;
  stage?: string;
  classification?: string | null;
}

/** Update a lead (PATCH /api/leads/[id]) and recompute Push queue state. */
export async function updateLead(leadId: string, patch: PatchBody) {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Lead update failed");
  // Recompute push priority/etc — fire-and-forget so the row updates immediately.
  fetch("/api/push/sync", { method: "POST" }).catch(() => {});
  return res.json();
}

export function StarButton({
  active,
  onChange,
  size = "sm",
}: {
  active: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!active); }}
      title={active ? "Active deal — click to unmark" : "Mark as active deal (P1)"}
      className={`shrink-0 rounded-md p-1 transition-colors ${
        active ? "text-amber-500 hover:bg-amber-50" : "text-gray-300 hover:text-amber-400 hover:bg-gray-50"
      }`}
    >
      <Star className={`${cls} ${active ? "fill-amber-400" : ""}`} />
    </button>
  );
}

export function StatusSelect({
  value,
  onChange,
  size = "sm",
}: {
  value: string;
  onChange: (next: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        size === "md" ? "px-3 py-2 text-sm" : "px-2 py-1 text-xs"
      }`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

const STAGES = [
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "DISCOVERY", label: "Discovery" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "CLOSED", label: "Closed" },
] as const;

export function StageSelect({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-200 bg-white text-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

const CLASSIFICATIONS = [
  { value: "", label: "—" },
  { value: "CLIENT", label: "Client" },
  { value: "RAIL", label: "Rail" },
  { value: "ADVISER", label: "Adviser" },
  { value: "CONSULTING", label: "Consulting" },
] as const;

export function ClassificationSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-md border border-gray-200 bg-white text-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {CLASSIFICATIONS.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </select>
  );
}

/** Hook-y wrapper that handles optimistic state for a lead's quick-edit fields. */
export function useLeadQuickEdit(initial: {
  id: string;
  isActiveDeal: boolean;
  status: string;
  stage: string;
  classification: string | null;
}, onAfter?: () => void) {
  const [active, setActive] = useState(initial.isActiveDeal);
  const [status, setStatus] = useState(initial.status);
  const [stage, setStage] = useState(initial.stage);
  const [classification, setClassification] = useState<string | null>(initial.classification);
  const [pending, setPending] = useState(false);

  async function commit(patch: PatchBody) {
    setPending(true);
    try {
      await updateLead(initial.id, patch);
      onAfter?.();
    } finally {
      setPending(false);
    }
  }

  return {
    active, status, stage, classification, pending,
    setActive: (next: boolean) => { setActive(next); commit({ isActiveDeal: next }); },
    setStatus: (next: string) => { setStatus(next); commit({ status: next }); },
    setStage: (next: string) => { setStage(next); commit({ stage: next }); },
    setClassification: (next: string | null) => { setClassification(next); commit({ classification: next ?? "" }); },
  };
}
