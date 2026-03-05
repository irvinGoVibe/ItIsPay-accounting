"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Phone,
  FileText,
  StickyNote,
  Plus,
  Sparkles,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateTime, formatRelativeTime, LEAD_STATUSES, type LeadStage } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { StageProgress } from "@/components/leads/stage-progress";
import { QualificationChecklist } from "@/components/leads/qualification-checklist";
import { useToast } from "@/components/ui/toast";

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  stage: string;
  phone: string | null;
  role: string | null;
  lastContact: string | null;
  createdAt: string;
  emails: Array<{
    id: string;
    subject: string | null;
    snippet: string | null;
    fromEmail: string;
    fromName: string | null;
    date: string;
    isInbound: boolean;
  }>;
  meetings: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
    participants: string;
    briefings: Array<{ id: string; content: string; createdAt: string }>;
  }>;
  callLogs: Array<{
    id: string;
    rawText: string;
    type: string;
    outcome: string | null;
    aiSummary: string | null;
    aiKeyPoints: string | null;
    aiAgreements: string | null;
    aiNextSteps: string | null;
    aiRecommendedStatus: string | null;
    aiEngagementLevel: string | null;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    priority: string;
    completed: boolean;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  CLOSED_WON: "success",
  CLOSED_LOST: "destructive",
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "calllog" | "briefing">("timeline");
  const [newNote, setNewNote] = useState("");
  const [callLogText, setCallLogText] = useState("");
  const [callLogType, setCallLogType] = useState("SUMMARY");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const { toast } = useToast();

  async function fetchLead() {
    const res = await fetch(`/api/leads/${id}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast("Status updated");
    fetchLead();
  }

  async function updateStage(stage: LeadStage) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    toast(`Stage updated to ${stage}`);
    fetchLead();
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, leadId: id }),
    });
    setNewNote("");
    toast("Note added");
    fetchLead();
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle, leadId: id }),
    });
    setNewTaskTitle("");
    toast("Task created");
    fetchLead();
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, completed }),
    });
    fetchLead();
  }

  async function analyzeCallLog() {
    if (!callLogText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          text: callLogText,
          type: callLogType,
        }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch {
      // Show in UI
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyAnalysis() {
    if (!analysisResult) return;
    const callLog = analysisResult.callLog as { id: string };
    await fetch("/api/call-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callLogId: callLog.id }),
    });
    setCallLogText("");
    setAnalysisResult(null);
    fetchLead();
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (!lead) {
    return <div className="text-center py-12 text-gray-400">Lead not found</div>;
  }

  // Build timeline from all activities
  const timeline = [
    ...lead.emails.map((e) => ({
      type: "email" as const,
      date: new Date(e.date),
      data: e,
    })),
    ...lead.meetings.map((m) => ({
      type: "meeting" as const,
      date: new Date(m.startTime),
      data: m,
    })),
    ...lead.callLogs.map((c) => ({
      type: "calllog" as const,
      date: new Date(c.createdAt),
      data: c,
    })),
    ...lead.notes.map((n) => ({
      type: "note" as const,
      date: new Date(n.createdAt),
      data: n,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{lead.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {lead.company && <span>{lead.company}</span>}
            <span>{lead.email}</span>
            {lead.phone && <span>{lead.phone}</span>}
            {lead.role && <span>{lead.role}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lead.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <Badge variant={statusBadgeVariant[lead.status] ?? "secondary"}>
            Stage: {lead.stage}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "timeline", label: "Timeline" },
              { key: "calllog", label: "Add Call Log" },
              { key: "briefing", label: "Briefings" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    No interactions yet
                  </CardContent>
                </Card>
              ) : (
                timeline.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {item.type === "email" && (
                            <Mail className="h-4 w-4 text-blue-500" />
                          )}
                          {item.type === "meeting" && (
                            <Calendar className="h-4 w-4 text-green-500" />
                          )}
                          {item.type === "calllog" && (
                            <Phone className="h-4 w-4 text-purple-500" />
                          )}
                          {item.type === "note" && (
                            <StickyNote className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.type === "email" && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {(item.data as LeadDetail["emails"][0]).isInbound ? "Received" : "Sent"}:
                                </span>
                                <span className="text-sm text-gray-900 truncate">
                                  {(item.data as LeadDetail["emails"][0]).subject ?? "(no subject)"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {(item.data as LeadDetail["emails"][0]).snippet}
                              </p>
                            </>
                          )}
                          {item.type === "meeting" && (
                            <>
                              <span className="text-sm font-medium">
                                Meeting: {(item.data as LeadDetail["meetings"][0]).title}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateTime((item.data as LeadDetail["meetings"][0]).startTime)}
                              </p>
                            </>
                          )}
                          {item.type === "calllog" && (
                            <>
                              <span className="text-sm font-medium">
                                Call Log
                                {(item.data as LeadDetail["callLogs"][0]).outcome && (
                                  <Badge variant="secondary" className="ml-2">
                                    {(item.data as LeadDetail["callLogs"][0]).outcome}
                                  </Badge>
                                )}
                              </span>
                              <p className="text-sm text-gray-700 mt-1">
                                {(item.data as LeadDetail["callLogs"][0]).aiSummary ??
                                  (item.data as LeadDetail["callLogs"][0]).rawText.slice(0, 200)}
                              </p>
                            </>
                          )}
                          {item.type === "note" && (
                            <p className="text-sm text-gray-700">
                              {(item.data as LeadDetail["notes"][0]).content}
                            </p>
                          )}
                          <span className="text-xs text-gray-400 mt-1 block">
                            {formatRelativeTime(item.date.toISOString())}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Call Log Tab */}
          {activeTab === "calllog" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Add Call Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {["SUMMARY", "FULL_TRANSCRIPT", "MANUAL_NOTES"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setCallLogType(type)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        callLogType === type
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {type.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Paste your call transcript, summary, or notes here..."
                  value={callLogText}
                  onChange={(e) => setCallLogText(e.target.value)}
                  className="min-h-[200px]"
                />
                <Button onClick={analyzeCallLog} disabled={analyzing || !callLogText.trim()}>
                  <Sparkles className="h-4 w-4" />
                  {analyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>

                {analysisResult && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-gray-900">Analysis Results</h3>
                    {(() => {
                      const analysis = analysisResult.analysis as Record<string, unknown>;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="py-3">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Summary</h4>
                              <p className="text-sm">{analysis.summary as string}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="py-3">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Outcome</h4>
                              <Badge>{analysis.outcome as string}</Badge>
                              <span className="ml-2 text-sm">
                                Engagement: {analysis.engagementLevel as string}
                              </span>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="py-3">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Key Points</h4>
                              <ul className="text-sm space-y-1">
                                {(analysis.keyPoints as string[]).map((p, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-blue-500">-</span> {p}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="py-3">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Next Steps</h4>
                              <ul className="text-sm space-y-1">
                                {(analysis.nextSteps as Array<{ action: string; owner: string; deadline: string }>).map(
                                  (step, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-green-500">-</span>
                                      {step.action} ({step.owner}, {step.deadline})
                                    </li>
                                  )
                                )}
                              </ul>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                    <div className="flex gap-2">
                      <Button onClick={applyAnalysis}>
                        Save &amp; Update Lead
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAnalysisResult(null)}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Briefings Tab */}
          {activeTab === "briefing" && (
            <div className="space-y-4">
              {lead.meetings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    No meetings to generate briefings for
                  </CardContent>
                </Card>
              ) : (
                lead.meetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{meeting.title}</span>
                        <span className="text-sm text-gray-500 font-normal">
                          {formatDateTime(meeting.startTime)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {meeting.briefings.length > 0 ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>
                            {meeting.briefings[0].content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <BriefingGenerator meetingId={meeting.id} onGenerated={fetchLead} />
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sales Stage */}
          <Card>
            <CardContent className="py-4">
              <StageProgress
                currentStage={lead.stage}
                onStageChange={updateStage}
              />
            </CardContent>
          </Card>

          {/* Qualification Checklist */}
          <Card>
            <CardContent className="py-4">
              <QualificationChecklist stage={lead.stage} />
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Next Steps
                <Badge variant="secondary">{lead.tasks.filter((t) => !t.completed).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => toggleTask(task.id, e.target.checked)}
                    className="rounded"
                  />
                  <span
                    className={`text-sm flex-1 ${
                      task.completed ? "line-through text-gray-400" : "text-gray-700"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-gray-400">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Add a task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={addTask}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Write a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
              <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                <Send className="h-3 w-3" />
                Save Note
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Emails</dt>
                  <dd className="font-medium">{lead.emails.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Meetings</dt>
                  <dd className="font-medium">{lead.meetings.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Call Logs</dt>
                  <dd className="font-medium">{lead.callLogs.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium">{formatDate(lead.createdAt)}</dd>
                </div>
                {lead.lastContact && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Last Contact</dt>
                    <dd className="font-medium">{formatRelativeTime(lead.lastContact)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BriefingGenerator({
  meetingId,
  onGenerated,
}: {
  meetingId: string;
  onGenerated: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      await fetch("/api/briefings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      onGenerated();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button variant="outline" onClick={generate} disabled={generating}>
      <Sparkles className="h-4 w-4" />
      {generating ? "Generating..." : "Generate Briefing"}
    </Button>
  );
}
