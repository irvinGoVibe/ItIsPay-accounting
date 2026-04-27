"use client";

import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { touchLabel } from "./utils";

interface WeekRow {
  id: string;
  currentTouch: number;
  nextTouchDueAt: string;
  lead: { id: string; name: string; email: string; company: string | null };
}

interface Props {
  rows: WeekRow[];
  onSelect: (leadId: string) => void;
}

export function WeekPreview({ rows, onSelect }: Props) {
  // Group by date label
  const groups = new Map<string, WeekRow[]>();
  for (const r of rows) {
    const d = new Date(r.nextTouchDueAt);
    const key = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-gray-700">На этой неделе</span>
        <span className="ml-auto text-xs text-gray-500">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">На этой неделе пушей не запланировано.</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto">
          {Array.from(groups.entries()).map(([date, items]) => (
            <li key={date}>
              <div className="text-xs font-semibold text-gray-500 mb-1">{date}</div>
              <ul className="space-y-1">
                {items.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => onSelect(r.lead.id)}
                      className="w-full text-left rounded-md px-2 py-1 hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{r.lead.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {touchLabel(r.currentTouch)} · {r.lead.company || r.lead.email}
                      </div>
                    </button>
                  </li>
                ))}
                {items.length > 6 && (
                  <li className="text-xs text-gray-400 px-2">+{items.length - 6} ещё</li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
