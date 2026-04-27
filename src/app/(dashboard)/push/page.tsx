"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodayList, type QueueRow } from "@/components/push/today-list";
import { SideDrawer } from "@/components/push/side-drawer";
import { StatsCard } from "@/components/push/stats-card";
import { NewQueueCard } from "@/components/push/new-queue-card";
import { WeekPreview } from "@/components/push/week-preview";

const PRIORITY_TABS = ["ALL", "P1", "STANDARD", "COLD"] as const;
type PriorityTab = (typeof PRIORITY_TABS)[number];

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
  const [selected, setSelected] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
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
        <span className="ml-auto self-center text-sm text-gray-500">
          {loading ? "…" : `${today.length} в фокусе`}
        </span>
      </div>

      {/* Layout: list | side cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Сегодня нужно пушить</h2>
          <TodayList
            rows={today}
            loading={loading}
            onSelect={setSelected}
            onSent={(id) => callAction(id, "sent")}
            onSkip={(id) => callAction(id, "skip")}
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
