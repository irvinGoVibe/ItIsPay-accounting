"use client";

import { Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  dueColorClasses,
  dueLabel,
  daysSinceLabel,
  touchLabel,
} from "./utils";

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

export function TodayList({ rows, loading, onSelect, onSent, onSkip }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
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
    <div className="space-y-2">
      {rows.map((r) => {
        const bucket = dueBucket(r.nextTouchDueAt);
        const due = dueLabel(r.nextTouchDueAt);
        return (
          <div
            key={r.id}
            className={`flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 transition-all ${dueColorClasses(bucket)}`}
          >
            {/* Priority pill */}
            <div
              className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${PRIORITY_BADGE[r.priority] || PRIORITY_BADGE.STANDARD}`}
              title="Priority"
            >
              {PRIORITY_LABEL[r.priority] || r.priority}
            </div>

            {/* Lead */}
            <button
              onClick={() => onSelect(r.lead.id)}
              className="flex-1 text-left min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{r.lead.name || r.lead.email}</div>
                {r.lead.isActiveDeal && (
                  <span className="text-amber-500" title="Active deal">★</span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </div>
              <div className="text-sm text-gray-500 truncate">
                {r.lead.company || r.lead.email}
                {r.lead.role ? ` · ${r.lead.role}` : ""}
              </div>
            </button>

            {/* Touch info */}
            <div className="hidden md:flex flex-col items-end shrink-0 w-40">
              <div className="text-xs text-gray-500">Next touch</div>
              <div className="text-sm font-medium text-gray-900">{touchLabel(r.currentTouch)}</div>
            </div>

            {/* Silence */}
            <div className="hidden md:flex flex-col items-end shrink-0 w-20">
              <div className="text-xs text-gray-500">Silence</div>
              <div className="text-sm font-medium text-gray-900">
                {r.lastTouchAt ? daysSinceLabel(r.lastTouchAt) : "—"}
              </div>
            </div>

            {/* Due */}
            <div className="hidden md:flex flex-col items-end shrink-0 w-24">
              <div className="text-xs text-gray-500">Due</div>
              <div className={`text-sm ${due.color}`}>{due.text}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onSent(r.lead.id); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-4 w-4 mr-1" />
                Отправил
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onSkip(r.lead.id); }}
                className="text-gray-600"
              >
                <X className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
