"use client";

import Link from "next/link";
import { Check, X, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTouchByNumber } from "@/lib/push/cadence";
import {
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  dueColorClasses,
  dueRelative,
  dueRelativeColor,
  pastRelative,
  shortDate,
  touchLabel,
} from "./utils";
import { StarButton, StatusSelect, useLeadQuickEdit } from "./quick-actions";

export interface QueueRow {
  id: string;
  status: string;
  priority: string;
  currentTouch: number;
  lastTouchAt: string | null;
  nextTouchDueAt: string | null;
  lead: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    role: string | null;
    status: string;
    stage: string;
    classification: string | null;
    isActiveDeal: boolean;
    lastContact: string | null;
  };
}

interface Props {
  rows: QueueRow[];
  loading: boolean;
  onSelect: (leadId: string) => void;
  onSent: (leadId: string) => void;
  onSkip: (leadId: string) => void;
  /** Called after a lead-level field (star, status) was edited inline. */
  onLeadEdited: () => void;
}

function dueBucket(due: string | null): string {
  if (!due) return "none";
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d = new Date(due);
  const d0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((t0 - d0) / 86400000);
  if (diff > 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === -1) return "tomorrow";
  return "later";
}

export function TodayList({ rows, loading, onSelect, onSent, onSkip, onLeadEdited }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-gray-600 font-medium">Сегодня тишина</p>
        <p className="text-sm text-gray-500 mt-1">Никого пушить не нужно. Хороший день.</p>
      </div>
    );
  }

  return (
    <>
      {/* No external column header — each row carries its own labels for visual rhythm */}

      <div className="space-y-2">
        {rows.map((r) => (
          <Row
            key={r.id}
            row={r}
            onSelect={onSelect}
            onSent={onSent}
            onSkip={onSkip}
            onLeadEdited={onLeadEdited}
          />
        ))}
      </div>
    </>
  );
}

function Row({
  row,
  onSelect,
  onSent,
  onSkip,
  onLeadEdited,
}: {
  row: QueueRow;
  onSelect: (leadId: string) => void;
  onSent: (leadId: string) => void;
  onSkip: (leadId: string) => void;
  onLeadEdited: () => void;
}) {
  const bucket = dueBucket(row.nextTouchDueAt);
  const edit = useLeadQuickEdit(
    {
      id: row.lead.id,
      isActiveDeal: row.lead.isActiveDeal,
      status: row.lead.status,
      stage: row.lead.stage,
      classification: row.lead.classification,
    },
    onLeadEdited
  );

  return (
    <div
      className={`flex items-start gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 transition-all ${dueColorClasses(bucket)}`}
    >
      {/* Priority pill */}
      <div
        className={`shrink-0 w-20 rounded-md border px-2 py-1.5 text-xs font-semibold text-center tracking-wide ${PRIORITY_BADGE[row.priority] || PRIORITY_BADGE.STANDARD}`}
        title="Priority"
      >
        {PRIORITY_LABEL[row.priority] || row.priority}
      </div>

      {/* Lead — name is the primary thing in the row */}
      <div className="flex-1 min-w-[280px] overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <StarButton active={edit.active} onChange={edit.setActive} />
          <button
            onClick={() => onSelect(row.lead.id)}
            className="text-left flex-1 min-w-0 group"
          >
            <span className="block text-lg font-bold text-gray-900 group-hover:text-blue-700 truncate leading-tight">
              {row.lead.name || row.lead.email}
            </span>
          </button>
          <Link
            href={`/leads/${row.lead.id}`}
            className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors p-1 -m-1"
            title="Open lead page"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <div className="text-sm font-medium text-gray-700 truncate mt-1">
          {row.lead.company || "—"}
          {row.lead.role ? <span className="font-normal text-gray-500"> · {row.lead.role}</span> : ""}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <a
            href={`mailto:${row.lead.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 hover:text-blue-600 hover:underline truncate"
          >
            {row.lead.email}
          </a>
          <div className="ml-auto">
            <StatusSelect value={edit.status} onChange={edit.setStatus} />
          </div>
        </div>
      </div>

      {/* Next touch */}
      <div className="hidden lg:flex flex-col shrink-0 w-32 pt-0.5">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-0.5">Touch</div>
        <div className="text-sm font-semibold text-gray-900 leading-tight">{touchLabel(row.currentTouch)}</div>
        <div className="text-xs text-gray-400 mt-0.5">{row.currentTouch} of 6 done</div>
      </div>

      {/* Last contact */}
      <div className="hidden lg:flex flex-col shrink-0 w-28 pt-0.5">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-0.5">Last</div>
        <div className="text-sm font-semibold text-gray-900 leading-tight">
          {shortDate(row.lastTouchAt)}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {row.lastTouchAt ? pastRelative(row.lastTouchAt) : "no outbound"}
        </div>
      </div>

      {/* Due */}
      <div className="hidden lg:flex flex-col shrink-0 w-28 pt-0.5">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-0.5">Due</div>
        <div className="text-sm font-semibold text-gray-900 leading-tight">
          {shortDate(row.nextTouchDueAt)}
        </div>
        <div className={`text-xs mt-0.5 ${dueRelativeColor(row.nextTouchDueAt)}`}>
          {dueRelative(row.nextTouchDueAt)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0 justify-end pt-0.5 items-center">
        {(() => {
          const nextTouch = getTouchByNumber(row.currentTouch + 1);
          const isEmailNext = nextTouch?.channel === "email";
          if (isEmailNext) {
            return (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500"
                title="Sent emails are detected automatically on Gmail sync"
              >
                <Mail className="h-3.5 w-3.5" />
                Auto (Gmail)
              </span>
            );
          }
          return (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSent(row.lead.id); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Check className="h-4 w-4 mr-1" />
              Sent
            </Button>
          );
        })()}
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onSkip(row.lead.id); }}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4 mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
}
