"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Mail, Phone, Ban, Pause, Play, Send, MailQuestion, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_BADGE, touchTypeLabel } from "./utils";
import type { TouchType } from "@/lib/push/cadence";

interface DrawerData {
  lead: {
    id: string; name: string; email: string; company: string | null; role: string | null;
    phone: string | null; status: string; stage: string; classification: string | null;
    isActiveDeal: boolean; lastContact: string | null; website: string | null;
    pushQueue: {
      id: string; status: string; priority: string; currentTouch: number;
      startedAt: string; lastTouchAt: string | null; nextTouchDueAt: string | null;
      notes: string | null;
      events: Array<{
        id: string; touchNumber: number; type: string; action: string;
        notes: string | null; createdAt: string;
      }>;
    } | null;
  };
  lastInbound: { subject: string | null; body: string | null; date: string; fromName: string | null; fromEmail: string } | null;
  lastOutbound: { subject: string | null; body: string | null; date: string; toEmail: string } | null;
  lastMeeting: { title: string; startTime: string } | null;
  counts: { inbound: number; outbound: number };
}

interface Props {
  leadId: string | null;
  onClose: () => void;
  onAction: () => void;          // refresh today list after action
}

export function SideDrawer({ leadId, onClose, onAction }: Props) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/push/${leadId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (!leadId) return null;

  async function callAction(path: string, body?: object) {
    if (!leadId) return;
    setActioning(path);
    try {
      await fetch(`/api/push/${leadId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      onAction();
      // refetch drawer
      const r = await fetch(`/api/push/${leadId}`);
      setData(await r.json());
    } finally {
      setActioning(null);
    }
  }

  const queue = data?.lead.pushQueue;
  const isPaused = queue?.status === "PAUSED";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
          {loading || !data ? (
            <div className="text-gray-400">Loading…</div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 truncate">{data.lead.name}</h2>
                {data.lead.isActiveDeal && <span className="text-amber-500">★</span>}
                {queue && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[queue.status] || ""}`}>
                    {queue.status}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                {data.lead.company} {data.lead.role ? `· ${data.lead.role}` : ""}
              </div>
              <a href={`mailto:${data.lead.email}`} className="text-sm text-blue-600 hover:underline">
                {data.lead.email}
              </a>
            </div>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!data ? null : (
          <div className="p-6 space-y-6">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => callAction("sent")}
                disabled={!queue || queue.currentTouch >= 6 || actioning !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-4 w-4 mr-1" /> Отправил touch {queue ? queue.currentTouch + 1 : ""}
              </Button>
              <Button
                onClick={() => callAction("skip")}
                disabled={!queue || queue.currentTouch >= 6 || actioning !== null}
                variant="outline"
              >
                Skip
              </Button>
              {data.lead.email && (
                <a href={`mailto:${data.lead.email}`}>
                  <Button variant="outline"><Mail className="h-4 w-4 mr-1" /> Mail</Button>
                </a>
              )}
              {data.lead.phone && (
                <a href={`tel:${data.lead.phone}`}>
                  <Button variant="outline"><Phone className="h-4 w-4 mr-1" /> Call</Button>
                </a>
              )}
              <Button
                variant="outline"
                onClick={() => callAction(`pause${isPaused ? "?resume=1" : ""}`)}
                disabled={actioning !== null}
              >
                {isPaused ? <><Play className="h-4 w-4 mr-1" /> Resume</> : <><Pause className="h-4 w-4 mr-1" /> Pause</>}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                onClick={() => callAction("disqualify")}
                disabled={actioning !== null}
              >
                <Ban className="h-4 w-4 mr-1" /> Disqualify
              </Button>
              <Link href={`/leads/${data.lead.id}`}>
                <Button variant="outline">Open lead →</Button>
              </Link>
            </div>

            {/* Sequence info */}
            {queue && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Sequence</h3>
                <div className="rounded-lg border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <KV label="Touch" value={`${queue.currentTouch}/6`} />
                  <KV label="Status" value={queue.status} />
                  <KV label="Priority" value={queue.priority} />
                  <KV
                    label="Next due"
                    value={queue.nextTouchDueAt ? new Date(queue.nextTouchDueAt).toLocaleDateString() : "—"}
                  />
                  <KV
                    label="Last touch"
                    value={queue.lastTouchAt ? new Date(queue.lastTouchAt).toLocaleDateString() : "—"}
                  />
                  <KV
                    label="Started"
                    value={new Date(queue.startedAt).toLocaleDateString()}
                  />
                  <KV label="Inbound" value={String(data.counts.inbound)} />
                  <KV label="Outbound" value={String(data.counts.outbound)} />
                </div>
              </section>
            )}

            {/* Last inbound */}
            {data.lastInbound && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MailQuestion className="h-4 w-4" /> Last inbound
                  <span className="text-xs text-gray-500 font-normal">
                    {new Date(data.lastInbound.date).toLocaleString()}
                  </span>
                </h3>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm font-medium text-gray-900">{data.lastInbound.subject || "(no subject)"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">From: {data.lastInbound.fromName || data.lastInbound.fromEmail}</div>
                  <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-12">
                    {data.lastInbound.body || data.lastInbound.subject}
                  </div>
                </div>
              </section>
            )}

            {/* Last outbound */}
            {data.lastOutbound && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Send className="h-4 w-4" /> Last outbound
                  <span className="text-xs text-gray-500 font-normal">
                    {new Date(data.lastOutbound.date).toLocaleString()}
                  </span>
                </h3>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm font-medium text-gray-900">{data.lastOutbound.subject || "(no subject)"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">To: {data.lastOutbound.toEmail}</div>
                  <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-8">
                    {data.lastOutbound.body || data.lastOutbound.subject}
                  </div>
                </div>
              </section>
            )}

            {/* Touch history */}
            {queue && queue.events.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Touch history</h3>
                <ul className="space-y-1">
                  {queue.events.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 text-sm rounded-md px-3 py-2 bg-gray-50">
                      <span className="font-mono text-xs text-gray-500">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                      <span className="text-gray-700">{touchTypeLabel(e.type as TouchType)}</span>
                      <span className="ml-auto text-xs font-semibold text-gray-600">{e.action}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
    </div>
  );
}
