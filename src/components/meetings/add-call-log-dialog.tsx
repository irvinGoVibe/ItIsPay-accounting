"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LeadPicker } from "./lead-picker";

interface Props {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
  /** Pre-attached lead from the meeting (if any). null → user must pick one. */
  leadFromMeeting: { id: string; name: string; company: string | null } | null;
  onSaved: () => void;
}

const TYPES = [
  { value: "SUMMARY", label: "Summary" },
  { value: "FULL_TRANSCRIPT", label: "Full transcript" },
  { value: "MANUAL_NOTES", label: "Manual notes" },
] as const;

const OUTCOMES = [
  { value: "", label: "— Outcome (optional) —" },
  { value: "SUCCESSFUL", label: "Successful" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "NO_ANSWER", label: "No answer" },
] as const;

export function AddCallLogDialog({
  open,
  onClose,
  meetingId,
  meetingTitle,
  leadFromMeeting,
  onSaved,
}: Props) {
  const [text, setText] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("SUMMARY");
  const [outcome, setOutcome] = useState("");
  const [analyze, setAnalyze] = useState(true);
  const [pickedLead, setPickedLead] = useState(leadFromMeeting);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setText("");
    setOutcome("");
    setType("SUMMARY");
    setAnalyze(true);
    setError(null);
    setPickedLead(leadFromMeeting);
  }

  async function handleSave() {
    setError(null);
    if (!text.trim()) { setError("Paste the call log text first."); return; }
    if (!pickedLead) { setError("Pick a lead — call logs are attached per lead."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: pickedLead.id,
          meetingId,
          text,
          type,
          ...(outcome ? { outcome } : {}),
          skipAnalysis: !analyze,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save call log");
        return;
      }
      onSaved();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add call log</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-gray-700">{meetingTitle}</span>
            {analyze && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                <Sparkles className="h-3 w-3" /> AI will extract key points, agreements, next steps
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Lead — locked if already attached, picker otherwise */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lead</label>
            <LeadPicker
              value={pickedLead}
              onChange={setPickedLead}
              placeholder="Search lead to attach this call log to…"
            />
          </div>

          {/* Type + outcome on one row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Call log / transcript / notes</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the transcript, summary or your notes from the call…"
              rows={12}
              className="min-h-[240px]"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={analyze}
              onChange={(e) => setAnalyze(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Analyze with AI (key points, agreements, next steps, recommended status)
          </label>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !text.trim() || !pickedLead}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : analyze ? <Sparkles className="h-4 w-4 mr-1" /> : null}
            {saving ? "Saving…" : analyze ? "Save & analyze" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
