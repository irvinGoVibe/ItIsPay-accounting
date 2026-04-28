"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodayList, type QueueRow } from "@/components/push/today-list";
import { SideDrawer } from "@/components/push/side-drawer";
import { StatsCard } from "@/components/push/stats-card";
import { NewQueueCard } from "@/components/push/new-queue-card";
import { WeekPreview } from "@/components/push/week-preview";
import { PushAutoSync } from "@/components/push/push-auto-sync";

const PRIORITY_TABS = ["ALL", "P1", "STANDARD", "COLD"] as const;
type PriorityTab = (typeof PRIORITY_TABS)[number];

const SORT_OPTIONS = [
  { value: "smart", label: "Priority + Due" },
  { value: "due_asc", label: "Due ↑ (overdue first)" },
  { value: "due_desc", label: "Due ↓ (latest first)" },
  { value: "last_asc", label: "Last contact ↑ (longest silent)" },
  { value: "last_desc", label: "Last contact ↓ (most recent)" },
  { value: "touch_desc", label: "Touch # ↓ (closest to cold)" },
  { value: "touch_asc", label: "Touch # ↑ (just started)" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const PRIORITY_RANK: Record<string, number> = { P1: 0, STANDARD: 1, COLD: 2 };

function sortRows(rows: QueueRow[], key: SortKey): QueueRow[] {
  const get = (d: string | null) => (d ? new Date(d).getTime() : null);
  const arr = [...rows];
  switch (key) {
    case "smart":
      arr.sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] ?? 9;
        const pb = PRIORITY_RANK[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return (get(a.nextTouchDueAt) ?? Infinity) - (get(b.nextTouchDueAt) ?? Infinity);
      });
      break;
    case "due_asc":
      arr.sort((a, b) => (get(a.nextTouchDueAt) ?? Infinity) - (get(b.nextTouchDueAt) ?? Infinity));
      break;
    case "due_desc":
      arr.sort((a, b) => (get(b.nextTouchDueAt) ?? -Infinity) - (get(a.nextTouchDueAt) ?? -Infinity));
      break;
    case "last_asc":
      arr.sort((a, b) => (get(a.lastTouchAt) ?? -Infinity) - (get(b.lastTouchAt) ?? -Infinity));
      break;
    case "last_desc":
      arr.sort((a, b) => (get(b.lastTouchAt) ?? -Infinity) - (get(a.lastTouchAt) ?? -Infinity));
      break;
    case "touch_desc":
      arr.sort((a, b) => b.currentTouch - a.currentTouch);
      break;
    case "touch_asc":
      arr.sort((a, b) => a.currentTouch - b.currentTouch);
      break;
  }
  return arr;
}

interface StatsData {
  week: { sent: number; replied: number; replyRate: number };
  queues: { active: number; cold: number; replied: number };
}

interface NewLead {
  id: string; name: string; email: string; company: string | null; createdAt: string;
}

interface WeekRow {
  id: string; currentTouch: number; nextTouchDueAt: string;
  lead: { id: string; name: string; email: string; company: string | null };
}

export default function PushSchedulerPage() {
  const [today, setToday] = useState<QueueRow[]>([]);
  const [week, setWeek] = useState<WeekRow[]>([]);
  const [newQueue, setNewQueue] = useState<NewLead[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PriorityTab>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("smart");
  const [selected, setSelected] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const searchParams = useSearchParams();
  const sortedToday = useMemo(() => sortRows(today, sortKey), [today, sortKey]);

  // Auto-open drawer when navigated with ?selected=<leadId> (e.g. from a
  // lead's "Open in Push" link). Runs once on mount; clearing the URL is
  // up to the user — they can close the drawer normally.
  useEffect(() => {
    const sel = searchParams.get("selected");
    if (sel) setSelected(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = filter === "ALL" ? "" : `?priority=${filter}`;
    const [t, w, n, s] = await Promise.all([
      fetch(`/api/push/today${params}`).then((r) => r.json()),
      fetch("/api/push/week").then((r) => r.json()),
      fetch("/api/push/new-queue").then((r) => r.json()),
      fetch("/api/push/stats").then((r) => r.json()),
    ]);
    setToday(t.leads ?? []);
    setWeek(w.leads ?? []);
    setNewQueue(n.leads ?? []);
    setStats(s.week ? s : null);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function callAction(leadId: string, path: string) {
    await fetch(`/api/push/${leadId}/${path}`, { method: "POST" });
    fetchAll();
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await fetch("/api/push/sync", { method: "POST" });
      const d = await r.json();
      const seed = d.seed ?? { created: 0, scanned: 0 };
      const sync = d.sync ?? {};
      alert(
        `Sync done.\n` +
        `Seeded: ${seed.created}/${seed.scanned} new leads.\n` +
        `Recomputed: ${sync.recomputed}/${sync.processed} queues.\n` +
        `Touches advanced: ${sync.touchesAdvanced ?? 0}\n` +
        `Replied: ${sync.repliedFlipped ?? 0}, Cold: ${sync.coldFlipped ?? 0}, Priority: ${sync.priorityUpdated ?? 0}.`
      );
      await fetchAll();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Push Scheduler</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            6 касаний за 21 день. Кого пушить сегодня и кого ставить в очередь.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <PushAutoSync onSynced={fetchAll} />
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </div>

      {/* Filter tabs + sort */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 items-center">
        {PRIORITY_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === t
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t === "ALL" ? "Все" : t === "P1" ? "🔥 P1" : t === "STANDARD" ? "Standard" : "Cold"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 pb-1">
          <span className="text-sm text-gray-500">
            {loading ? "…" : `${today.length} в фокусе`}
          </span>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Sort:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Layout: list | side cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Сегодня нужно пушить</h2>
          <TodayList
            rows={sortedToday}
            loading={loading}
            onSelect={setSelected}
            onSent={(id) => callAction(id, "sent")}
            onSkip={(id) => callAction(id, "skip")}
            onLeadEdited={fetchAll}
          />
        </div>
        <div className="space-y-4">
          <StatsCard data={stats} />
          <NewQueueCard leads={newQueue} onSelect={setSelected} />
          <WeekPreview rows={week} onSelect={setSelected} />
        </div>
      </div>

      {/* Drawer */}
      <SideDrawer
        leadId={selected}
        onClose={() => setSelected(null)}
        onAction={fetchAll}
      />
    </div>
  );
}
