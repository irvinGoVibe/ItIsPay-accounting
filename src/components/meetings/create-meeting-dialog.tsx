"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LeadPicker } from "./lead-picker";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Local datetime input value formatted as "YYYY-MM-DDTHH:mm" for now+1h. */
function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function plusHour(s: string): string {
  const d = new Date(s);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

export function CreateMeetingDialog({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(() => plusHour(defaultStart()));
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [lead, setLead] = useState<{ id: string; name: string; company: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    const s = defaultStart();
    setStartTime(s);
    setEndTime(plusHour(s));
    setLocation("");
    setDescription("");
    setLead(null);
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!startTime) { setError("Start time is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          leadId: lead?.id ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to create meeting");
        return;
      }
      onCreated();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New meeting</DialogTitle>
          <DialogDescription>
            Create a meeting that isn&apos;t in your Google Calendar — useful for
            calls you logged after the fact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Discovery call with Acme"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  // bump end if it's now before start
                  if (e.target.value && (!endTime || endTime <= e.target.value)) {
                    setEndTime(plusHour(e.target.value));
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lead (optional)</label>
            <LeadPicker value={lead} onChange={setLead} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location / link</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="https://meet.google.com/… or office address"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description / notes</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Agenda, context, anything to remember…"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            {saving ? "Creating…" : "Create meeting"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
