"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Send,
  Check,
  X,
  Pause,
  Play,
  Ban,
  ArrowUpRight,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTouchByNumber } from "@/lib/push/cadence";

interface PushQueue {
  id: string;
  status: string;
  priority: string;
  currentTouch: number;
  startedAt: string;
  lastTouchAt: string | null;
  nextTouchDueAt: string | null;
}

interface DrawerData {
  lead: { id: string; name: string; pushQueue: PushQueue | null };
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  REPLIED: "bg-purple-100 text-purple-700",
  COLD: "bg-blue-100 text-blue-700",
  PAUSED: "bg-amber-100 text-amber-700",
  DISQUALIFIED: "bg-gray-200 text-gray-600",
};

const PRIORITY_COLOR: Record<string, string> = {
  P1: "bg-red-100 text-red-700",
  STANDARD: "bg-gray-100 text-gray-700",
  COLD: "bg-blue-100 text-blue-700",
};

function shortDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dueText(due: string | null): { label: string; cls: string } {
  if (!due) return { label: "—", cls: "text-gray-400" };
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d = new Date(due);
  const d0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((t0 - d0) / 86400000);
  if (diff > 0) return { label: `${diff}d overdue`, cls: "text-red-600 font-semibold" };
  if (diff === 0) return { label: "Today", cls: "text-orange-600 font-semibold" };
  if (diff === -1) return { label: "Tomorrow", cls: "text-emerald-600" };
  return { label: `in ${-diff}d`, cls: "text-gray-600" };
}

function pastText(d: string | null): string {
  if (!d) return "no outbound yet";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

interface Props {
  leadId: string;
}

export function LeadPushCard({ leadId }: Props) {
  const [queue, setQueue] = useState<PushQueue | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/push/${leadId}`);
    if (!r.ok) { setQueue(null); return; }
    const data: DrawerData = await r.json();
    setQueue(data.lead.pushQueue);
  }, [leadId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function action(path: string) {
    setBusy(path);
    try {
      await fetch(`/api/push/${leadId}/${path}`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function seed() {
    setBusy("seed");
    try {
      await fetch("/api/push/sync", { method: "POST" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  // Loading
  if (queue === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            Push Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400">Loading…</CardContent>
      </Card>
    );
  }

  // No queue yet — offer to seed
  if (queue === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            Push Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-500">No queue yet for this lead.</p>
          <Button size="sm" onClick={seed} disabled={busy === "seed"} variant="outline" className="w-full">
            {busy === "seed" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Initialize cadence
          </Button>
        </CardContent>
      </Card>
    );
  }

  const due = dueText(queue.nextTouchDueAt);
  const sequenceComplete = queue.currentTouch >= 6;
  const isPaused = queue.status === "PAUSED";
  const isDisqualified = queue.status === "DISQUALIFIED";
  const progress = (queue.currentTouch / 6) * 100;
  const nextTouch = getTouchByNumber(queue.currentTouch + 1);
  const isEmailNext = nextTouch?.channel === "email";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            Push Scheduler
          </span>
          <Link
            href={`/push?selected=${leadId}`}
            className="text-xs font-normal text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            Open in Push <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Status + priority pills */}
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[queue.status] || "bg-gray-100 text-gray-700"}`}>
            {queue.status}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[queue.priority] || "bg-gray-100 text-gray-700"}`}>
            {queue.priority === "P1" ? "🔥 P1" : queue.priority}
          </span>
        </div>

        {/* Touch progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Touch {queue.currentTouch}/6</span>
            <span>{sequenceComplete ? "complete" : `${6 - queue.currentTouch} left`}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Last touch</div>
            <div className="font-medium text-gray-900">{shortDate(queue.lastTouchAt)}</div>
            <div className="text-xs text-gray-500">{pastText(queue.lastTouchAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Next due</div>
            <div className="font-medium text-gray-900">{shortDate(queue.nextTouchDueAt)}</div>
            <div className={`text-xs ${due.cls}`}>{due.label}</div>
          </div>
        </div>

        {/* Actions */}
        {!isDisqualified && (
          <div className="flex flex-wrap gap-1.5 pt-1 items-center">
            {isEmailNext && !sequenceComplete ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500"
                title="Sent emails are detected automatically on Gmail sync"
              >
                <Mail className="h-3.5 w-3.5" />
                Auto (Gmail)
              </span>
            ) : (
              <Button
                size="sm"
                onClick={() => action("sent")}
                disabled={sequenceComplete || busy !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Sent {!sequenceComplete && `(${queue.currentTouch + 1})`}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => action("skip")}
              disabled={sequenceComplete || busy !== null}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Skip
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => action(`pause${isPaused ? "?resume=1" : ""}`)}
              disabled={busy !== null}
            >
              {isPaused ? <><Play className="h-3.5 w-3.5 mr-1" /> Resume</> : <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => action("disqualify")}
              disabled={busy !== null}
              className="text-red-600 hover:bg-red-50"
            >
              <Ban className="h-3.5 w-3.5 mr-1" /> Disqualify
            </Button>
          </div>
        )}
        {isDisqualified && (
          <div className="text-xs text-gray-500 italic">
            Disqualified. Use Push Scheduler to re-activate if needed.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
