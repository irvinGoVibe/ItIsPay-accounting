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
  Copy,
  Pencil,
  DollarSign,
  History,
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  ScrollText,
  ArrowRightCircle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime, formatRelativeTime, LEAD_STATUSES, LEAD_CLASSIFICATIONS, CLASSIFICATION_LABELS, type LeadStage } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { StageProgress } from "@/components/leads/stage-progress";
import { QualificationChecklist } from "@/components/leads/qualification-checklist";
import { FofDisplay, FofEmpty, type FlowOfFundsRecord } from "@/components/leads/fof-display";
import { FofHistory } from "@/components/leads/fof-history";
import { FofEditForm } from "@/components/leads/fof-edit-form";
import { useToast } from "@/components/ui/toast";

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  stage: string;
  classification: string | null;
  isActiveDeal: boolean;
  phone: string | null;
  role: string | null;
  lastContact: string | null;
  createdAt: string;
  emails: Array<{
    id: string;
    subject: string | null;
    snippet: string | null;
    body: string | null;
    threadId: string | null;
    fromEmail: string;
    fromName: string | null;
    toEmail: string;
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
  flowOfFunds: FlowOfFundsRecord[];
}

type TabKey = "timeline" | "conversation" | "calllogs" | "fof" | "recommendations";

const statusBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  CLOSED_WON: "success",
  CLOSED_LOST: "destructive",
};

const classificationColors: Record<string, string> = {
  CLIENT: "bg-blue-100 text-blue-700",
  RAIL: "bg-purple-100 text-purple-700",
  ADVISER: "bg-amber-100 text-amber-700",
  CONSULTING: "bg-green-100 text-green-700",
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [newNote, setNewNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const { toast } = useToast();

  // Call Log form state
  const [callLogText, setCallLogText] = useState("");
  const [callLogType, setCallLogType] = useState("SUMMARY");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [showCallLogModal, setShowCallLogModal] = useState(false);

  // Call log detail expansion
  const [expandedCallLog, setExpandedCallLog] = useState<string | null>(null);

  // Conversation expanded messages
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  function toggleMessage(id: string) {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // FOF state
  const [generatingFof, setGeneratingFof] = useState(false);
  const [fofVersions, setFofVersions] = useState<FlowOfFundsRecord[]>([]);
  const [selectedFof, setSelectedFof] = useState<FlowOfFundsRecord | null>(null);
  const [showFofEdit, setShowFofEdit] = useState(false);
  const [showFofHistory, setShowFofHistory] = useState(false);

  // Telegram state
  const [showTelegramPreview, setShowTelegramPreview] = useState(false);
  const [telegramText, setTelegramText] = useState("");
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramMode, setTelegramMode] = useState<"short" | "detailed">("short");

  function buildTelegramShort() {
    if (!lead) return "";
    const lines = [
      `📋 <b>${lead.name}</b>`,
      lead.company ? `🏢 ${lead.company}` : null,
      `📊 ${lead.status.replace("_", " ")} → ${lead.stage}`,
      lead.lastContact ? `📅 Последний контакт: ${new Date(lead.lastContact).toLocaleDateString("ru-RU")}` : null,
      lead.tasks?.filter((t) => !t.completed)?.[0]?.title
        ? `⏭ Следующий шаг: ${lead.tasks.filter((t) => !t.completed)[0].title}`
        : null,
    ].filter(Boolean);
    return lines.join("\n");
  }

  function buildTelegramDetailed() {
    if (!lead) return "";
    const sections: string[] = [];

    // Header
    sections.push(`📋 <b>${lead.name}</b>`);
    if (lead.company) sections.push(`🏢 ${lead.company}`);
    sections.push(`📧 ${lead.email}`);
    sections.push(`📊 ${lead.status.replace("_", " ")} → ${lead.stage}`);
    if (lead.lastContact) sections.push(`📅 Последний контакт: ${new Date(lead.lastContact).toLocaleDateString("ru-RU")}`);
    sections.push("");

    // FOF Quick Info
    if (selectedFof) {
      sections.push(`<b>💰 Flow of Funds</b>`);
      if (selectedFof.paymentDirection) sections.push(`Direction: ${selectedFof.paymentDirection}`);
      if (selectedFof.businessModel) sections.push(`Business: ${selectedFof.businessModel}`);
      if (selectedFof.expectedVolume) sections.push(`Volume: ${selectedFof.expectedVolume}`);
      if (selectedFof.currencies) sections.push(`Currencies: ${selectedFof.currencies}`);
      if (selectedFof.riskLevel) sections.push(`Risk: ${selectedFof.riskLevel}`);
      sections.push("");
    }

    // Recent Meetings
    const meetings = lead.meetings?.slice(0, 5) ?? [];
    if (meetings.length > 0) {
      sections.push(`<b>📅 Встречи (последние ${meetings.length})</b>`);
      meetings.forEach((m) => {
        const isUpcoming = new Date(m.startTime) > new Date();
        const status = m.status === "CANCELLED" ? "❌" : isUpcoming ? "🟢" : "✅";
        sections.push(`${status} ${m.title} — ${new Date(m.startTime).toLocaleDateString("ru-RU")} ${new Date(m.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`);
      });
      sections.push("");
    }

    // Recent Call Logs
    const calls = lead.callLogs?.slice(0, 5) ?? [];
    if (calls.length > 0) {
      sections.push(`<b>📞 Звонки (последние ${calls.length})</b>`);
      calls.forEach((c) => {
        const date = new Date(c.createdAt).toLocaleDateString("ru-RU");
        const summary = c.aiSummary ? c.aiSummary.slice(0, 100) + (c.aiSummary.length > 100 ? "..." : "") : c.rawText.slice(0, 100) + "...";
        sections.push(`• ${date}${c.outcome ? ` [${c.outcome}]` : ""}: ${summary}`);
      });
      sections.push("");
    }

    // Recent Emails
    const emails = lead.emails?.slice(0, 5) ?? [];
    if (emails.length > 0) {
      sections.push(`<b>✉️ Письма (последние ${emails.length})</b>`);
      emails.forEach((e) => {
        const dir = e.isInbound ? "📥" : "📤";
        const date = new Date(e.date).toLocaleDateString("ru-RU");
        sections.push(`${dir} ${date}: ${e.subject ?? "(без темы)"}`);
      });
      sections.push("");
    }

    // Tasks
    const pendingTasks = lead.tasks?.filter((t) => !t.completed) ?? [];
    if (pendingTasks.length > 0) {
      sections.push(`<b>✅ Задачи (${pendingTasks.length} активных)</b>`);
      pendingTasks.slice(0, 5).forEach((t) => {
        const due = t.dueDate ? ` (до ${new Date(t.dueDate).toLocaleDateString("ru-RU")})` : "";
        sections.push(`☐ ${t.title}${due}`);
      });
    }

    return sections.join("\n");
  }

  async function sendToTelegram() {
    setSendingTelegram(true);
    try {
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: telegramText }),
      });
      if (res.ok) {
        toast("Sent to Telegram");
        setShowTelegramPreview(false);
      } else {
        toast("Failed to send");
      }
    } finally {
      setSendingTelegram(false);
    }
  }

  // AI Recommendations state (3 sections)
  type RecSection = "company_profile" | "sales_script" | "next_steps";
  const [recData, setRecData] = useState<Record<RecSection, string>>({
    company_profile: "",
    sales_script: "",
    next_steps: "",
  });
  const [recLoading, setRecLoading] = useState<Record<RecSection, boolean>>({
    company_profile: false,
    sales_script: false,
    next_steps: false,
  });
  const [activeRecSection, setActiveRecSection] = useState<RecSection>("company_profile");
  const [aiLang, setAiLang] = useState<"en" | "ru">("en");

  async function fetchLead() {
    const res = await fetch(`/api/leads/${id}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      if (data.flowOfFunds?.length > 0) {
        setFofVersions(data.flowOfFunds);
        setSelectedFof(data.flowOfFunds[0]);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Actions ---

  async function updateStatus(status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast("Status updated");
    fetchLead();
  }

  async function updateClassification(classification: string | null) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classification }),
    });
    toast("Classification updated");
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

  // Save call log directly (no AI)
  const [savingCallLog, setSavingCallLog] = useState(false);
  async function saveCallLog() {
    if (!callLogText.trim()) return;
    setSavingCallLog(true);
    try {
      await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          text: callLogText,
          type: callLogType,
          skipAnalysis: true,
        }),
      });
      setCallLogText("");
      setShowCallLogModal(false);
      toast("Call log added");
      fetchLead();
    } catch {
      toast("Failed to save call log");
    } finally {
      setSavingCallLog(false);
    }
  }

  // Save + AI analysis
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
      toast("Analysis failed");
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
    setShowCallLogModal(false);
    toast("Call log saved & lead updated");
    fetchLead();
  }

  async function generateFof() {
    setGeneratingFof(true);
    try {
      const res = await fetch("/api/fof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, lang: aiLang }),
      });
      if (res.ok) {
        toast("FOF generated");
        fetchLead();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("FOF generation server error:", res.status, err);
        toast(`FOF error: ${(err as { error?: string }).error || res.statusText}`);
      }
    } catch (error) {
      console.error("FOF generation failed:", error);
      toast("FOF generation failed — check console");
    } finally {
      setGeneratingFof(false);
    }
  }

  async function generateRecSection(section: RecSection) {
    setRecLoading((prev) => ({ ...prev, [section]: true }));
    try {
      const res = await fetch(`/api/leads/${id}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: section, lang: aiLang }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecData((prev) => ({ ...prev, [section]: data.content }));
      } else {
        toast("Failed to generate — check console");
      }
    } catch {
      toast("Failed to generate — check console");
    } finally {
      setRecLoading((prev) => ({ ...prev, [section]: false }));
    }
  }

  // --- Rendering ---

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  if (!lead) {
    return <div className="text-center py-12 text-gray-400">Lead not found</div>;
  }

  // Build timeline (sorted newest first)
  const timeline = [
    ...lead.emails.map((e) => ({ type: "email" as const, date: new Date(e.date), data: e })),
    ...lead.meetings.map((m) => ({ type: "meeting" as const, date: new Date(m.startTime), data: m })),
    ...lead.callLogs.map((c) => ({ type: "calllog" as const, date: new Date(c.createdAt), data: c })),
    ...lead.notes.map((n) => ({ type: "note" as const, date: new Date(n.createdAt), data: n })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Build conversation threads (sorted oldest first for natural reading)
  const emailsByThread = new Map<string, LeadDetail["emails"]>();
  const sortedEmails = [...lead.emails].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (const email of sortedEmails) {
    const threadKey = email.threadId || email.id;
    if (!emailsByThread.has(threadKey)) {
      emailsByThread.set(threadKey, []);
    }
    emailsByThread.get(threadKey)!.push(email);
  }
  // Sort threads by latest email date (newest thread first)
  const threads = Array.from(emailsByThread.entries()).sort((a, b) => {
    const aLatest = new Date(a[1][a[1].length - 1].date).getTime();
    const bLatest = new Date(b[1][b[1].length - 1].date).getTime();
    return bLatest - aLatest;
  });

  // Call Log form content (used in modal and inline)
  const callLogFormContent = (
    <div className="space-y-4">
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
            {type.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Paste your call transcript, summary, or notes here..."
        value={callLogText}
        onChange={(e) => setCallLogText(e.target.value)}
        className="min-h-[200px]"
      />
      <div className="flex gap-2">
        <Button onClick={saveCallLog} disabled={savingCallLog || analyzing || !callLogText.trim()}>
          <Plus className="h-4 w-4" />
          {savingCallLog ? "Saving..." : "Add"}
        </Button>
        <Button variant="outline" onClick={analyzeCallLog} disabled={analyzing || savingCallLog || !callLogText.trim()}>
          <Sparkles className="h-4 w-4" />
          {analyzing ? "Analyzing..." : "Add & Analyze with AI"}
        </Button>
      </div>

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
                    <span className="ml-2 text-sm">Engagement: {analysis.engagementLevel as string}</span>
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
            <Button onClick={applyAnalysis}>Save &amp; Update Lead</Button>
            <Button variant="outline" onClick={() => setAnalysisResult(null)}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "timeline", label: "Timeline", icon: <Calendar className="h-4 w-4" /> },
    { key: "conversation", label: "Conversation", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "calllogs", label: "Call Logs", icon: <Phone className="h-4 w-4" /> },
    { key: "fof", label: "Flow of Funds", icon: <DollarSign className="h-4 w-4" /> },
    { key: "recommendations", label: "AI Recommendations", icon: <Lightbulb className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await fetch(`/api/leads/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isActiveDeal: !lead.isActiveDeal }),
                });
                setLead({ ...lead, isActiveDeal: !lead.isActiveDeal });
                toast(lead.isActiveDeal ? "Убрано из активных сделок" : "Добавлено в активные сделки");
              }}
              className="cursor-pointer hover:scale-110 transition-transform"
              title={lead.isActiveDeal ? "Убрать из активных сделок" : "Добавить в активные сделки"}
            >
              <Star className={`h-6 w-6 ${lead.isActiveDeal ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`} />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{lead.name}</h1>
            {lead.classification && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classificationColors[lead.classification] ?? "bg-gray-100 text-gray-700"}`}>
                {CLASSIFICATION_LABELS[lead.classification] ?? lead.classification}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {lead.company && <span>{lead.company}</span>}
            <span>{lead.email}</span>
            {lead.phone && <span>{lead.phone}</span>}
            {lead.role && <span>{lead.role}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lead.classification ?? ""}
            onChange={(e) => updateClassification(e.target.value || null)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No Type</option>
            {LEAD_CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
            ))}
          </select>
          <select
            value={lead.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <Badge variant={statusBadgeVariant[lead.status] ?? "secondary"}>
            Stage: {lead.stage}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTelegramMode("short");
              setTelegramText(buildTelegramShort());
              setShowTelegramPreview(true);
            }}
          >
            <Send className="h-4 w-4" />
            Telegram
          </Button>
        </div>
      </div>

      {/* Telegram Preview Modal */}
      <Dialog open={showTelegramPreview} onOpenChange={setShowTelegramPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Отправить в Telegram</DialogTitle>
          </DialogHeader>

          {/* Mode Switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${telegramMode === "short" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => { setTelegramMode("short"); setTelegramText(buildTelegramShort()); }}
            >
              📋 Кратко
            </button>
            <button
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${telegramMode === "detailed" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => { setTelegramMode("detailed"); setTelegramText(buildTelegramDetailed()); }}
            >
              📊 Подробно
            </button>
          </div>

          <Textarea
            value={telegramText}
            onChange={(e) => setTelegramText(e.target.value)}
            rows={telegramMode === "short" ? 6 : 16}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500">HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt; · Можно редактировать перед отправкой</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTelegramPreview(false)}>
              Отмена
            </Button>
            <Button onClick={sendToTelegram} disabled={sendingTelegram || !telegramText.trim()}>
              {sendingTelegram ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* =================== TAB 1: Timeline =================== */}
          {activeTab === "timeline" && (
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">No interactions yet</CardContent>
                </Card>
              ) : (
                timeline.map((item, i) => (
                  <Card key={i} className={
                    item.type === "meeting" && new Date((item.data as LeadDetail["meetings"][0]).startTime) > new Date()
                      ? "border-l-4 border-l-green-400"
                      : item.type === "meeting" && (item.data as LeadDetail["meetings"][0]).status === "CANCELLED"
                        ? "border-l-4 border-l-red-300 opacity-60"
                        : ""
                  }>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {item.type === "email" && <Mail className="h-4 w-4 text-blue-500" />}
                          {item.type === "meeting" && <Calendar className="h-4 w-4 text-green-500" />}
                          {item.type === "calllog" && <Phone className="h-4 w-4 text-purple-500" />}
                          {item.type === "note" && <StickyNote className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.type === "email" && (() => {
                            const e = item.data as LeadDetail["emails"][0];
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <Badge variant={e.isInbound ? "default" : "secondary"} className="text-xs">
                                    {e.isInbound ? "Received" : "Sent"}
                                  </Badge>
                                  <span className="text-sm text-gray-900 truncate font-medium">{e.subject ?? "(no subject)"}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 truncate">{e.snippet}</p>
                              </>
                            );
                          })()}
                          {item.type === "meeting" && (() => {
                            const m = item.data as LeadDetail["meetings"][0];
                            const isUpcoming = new Date(m.startTime) > new Date();
                            const isCancelled = m.status === "CANCELLED";
                            const participants: Array<{email: string; name?: string}> = (() => {
                              try { return JSON.parse(m.participants ?? "[]"); } catch { return []; }
                            })();
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <Badge variant={isCancelled ? "destructive" : isUpcoming ? "default" : "secondary"} className={`text-xs ${isUpcoming && !isCancelled ? "bg-green-100 text-green-700" : ""}`}>
                                    {isCancelled ? "Cancelled" : isUpcoming ? "Upcoming" : "Completed"}
                                  </Badge>
                                  <span className={`text-sm font-medium ${isCancelled ? "line-through text-gray-400" : ""}`}>{m.title}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDateTime(m.startTime)} — {new Date(m.endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                                {participants.length > 0 && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    👥 {participants.map(p => p.name || p.email).join(", ")}
                                  </p>
                                )}
                                {m.location && (
                                  <p className="text-xs text-gray-400 mt-0.5">📍 {m.location}</p>
                                )}
                              </>
                            );
                          })()}
                          {item.type === "calllog" && (() => {
                            const c = item.data as LeadDetail["callLogs"][0];
                            return (
                              <>
                                <span className="text-sm font-medium">
                                  Call Log
                                  {c.outcome && <Badge variant="secondary" className="ml-2">{c.outcome}</Badge>}
                                </span>
                                <p className="text-sm text-gray-700 mt-1 line-clamp-2">{c.aiSummary ?? c.rawText.slice(0, 200)}</p>
                              </>
                            );
                          })()}
                          {item.type === "note" && (
                            <p className="text-sm text-gray-700">{(item.data as LeadDetail["notes"][0]).content}</p>
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

          {/* =================== TAB 2: Conversation (iMessage style) =================== */}
          {activeTab === "conversation" && (
            <div className="space-y-8">
              {threads.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    No email conversations yet
                  </CardContent>
                </Card>
              ) : (
                threads.map(([threadKey, emails]) => (
                  <div key={threadKey}>
                    {/* Thread subject header */}
                    <div className="flex items-center gap-2 mb-4 px-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {emails[0].subject ?? "(no subject)"}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {emails.length} {emails.length === 1 ? "message" : "messages"}
                      </span>
                    </div>

                    {/* Chat bubbles */}
                    <div className="space-y-3">
                      {emails.map((email) => {
                        const isMe = !email.isInbound;
                        const isExpanded = expandedMessages.has(email.id);
                        const fullText = email.body || email.snippet || "(no content)";
                        const preview = email.snippet || fullText.slice(0, 120);
                        const hasMore = fullText.length > 140;

                        return (
                          <div
                            key={email.id}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[85%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                              {/* Sender + date */}
                              <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                                <span className="text-xs font-medium text-gray-500">
                                  {isMe ? "You" : (email.fromName || email.fromEmail)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDateTime(email.date)}
                                </span>
                              </div>

                              {/* Bubble */}
                              <div
                                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                  isMe
                                    ? "bg-blue-500 text-white rounded-br-md"
                                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                                }`}
                              >
                                {isExpanded ? (
                                  <div className="whitespace-pre-wrap">{fullText}</div>
                                ) : (
                                  <div className="whitespace-pre-wrap">{preview}{hasMore && !isExpanded ? "..." : ""}</div>
                                )}
                              </div>

                              {/* Expand / collapse button */}
                              {hasMore && (
                                <button
                                  onClick={() => toggleMessage(email.id)}
                                  className={`text-xs mt-1 px-1 cursor-pointer ${
                                    isMe
                                      ? "text-blue-400 hover:text-blue-300 self-end"
                                      : "text-blue-500 hover:text-blue-700 self-start"
                                  }`}
                                >
                                  {isExpanded ? "Collapse" : "Read full message"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =================== TAB 3: Call Logs =================== */}
          {activeTab === "calllogs" && (
            <div className="space-y-4">
              {/* Add new call log button */}
              <div className="flex justify-end">
                <Button onClick={() => setShowCallLogModal(true)}>
                  <Plus className="h-4 w-4" />
                  Add Call Log
                </Button>
              </div>

              {/* Existing call logs */}
              {lead.callLogs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    <Phone className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No call logs yet</p>
                    <p className="text-sm mt-1">Click &quot;Add Call Log&quot; to record a call</p>
                  </CardContent>
                </Card>
              ) : (
                lead.callLogs.map((log) => {
                  const isExpanded = expandedCallLog === log.id;
                  return (
                    <Card key={log.id}>
                      <CardContent className="py-4">
                        {/* Header row */}
                        <button
                          onClick={() => setExpandedCallLog(isExpanded ? null : log.id)}
                          className="w-full flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  Call Log
                                </span>
                                <Badge variant="secondary" className="text-xs">{log.type.replace(/_/g, " ")}</Badge>
                                {log.outcome && (
                                  <Badge
                                    variant={
                                      log.outcome === "POSITIVE" ? "success"
                                        : log.outcome === "NEGATIVE" ? "destructive"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {log.outcome}
                                  </Badge>
                                )}
                                {log.aiEngagementLevel && (
                                  <span className="text-xs text-gray-400">
                                    Engagement: {log.aiEngagementLevel}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(log.createdAt)}
                              </span>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </button>

                        {/* AI Summary (always visible) */}
                        {log.aiSummary && (
                          <div className="mt-3 pl-7">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Summary</h4>
                            <p className="text-sm text-gray-700">{log.aiSummary}</p>
                          </div>
                        )}

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-4 pl-7 space-y-4">
                            {/* Key Points */}
                            {log.aiKeyPoints && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Key Points</h4>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{log.aiKeyPoints}</div>
                              </div>
                            )}

                            {/* Agreements */}
                            {log.aiAgreements && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Agreements</h4>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{log.aiAgreements}</div>
                              </div>
                            )}

                            {/* Next Steps */}
                            {log.aiNextSteps && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Steps</h4>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{log.aiNextSteps}</div>
                              </div>
                            )}

                            {/* Full transcript */}
                            <div className="border-t pt-3">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Transcript / Raw Text</h4>
                              <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-80 overflow-y-auto">
                                {log.rawText}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* =================== TAB 4: Flow of Funds =================== */}
          {activeTab === "fof" && (
            <div className="space-y-4">
              {showFofEdit ? (
                <FofEditForm
                  currentFof={selectedFof}
                  leadId={id}
                  onSaved={() => { setShowFofEdit(false); fetchLead(); toast("FOF updated"); }}
                  onCancel={() => setShowFofEdit(false)}
                />
              ) : selectedFof ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFofEdit(true)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit Manually
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateFof}
                        disabled={generatingFof}
                      >
                        <Sparkles className="h-3 w-3" />
                        {generatingFof ? "Regenerating..." : "Regenerate with AI"}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFofHistory(!showFofHistory)}
                    >
                      <History className="h-3 w-3" />
                      {fofVersions.length} version{fofVersions.length !== 1 ? "s" : ""}
                    </Button>
                  </div>

                  <FofDisplay fof={selectedFof} />

                  {showFofHistory && (
                    <FofHistory
                      versions={fofVersions}
                      currentVersion={selectedFof.version}
                      onSelectVersion={(v) => setSelectedFof(v)}
                    />
                  )}
                </>
              ) : generatingFof ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-3 text-blue-500 animate-pulse" />
                    <p className="text-gray-600 font-medium">Generating Flow of Funds...</p>
                    <p className="text-xs text-gray-400 mt-1">AI is analyzing all emails and call logs. This may take 15-30 seconds.</p>
                  </CardContent>
                </Card>
              ) : (
                <FofEmpty onGenerate={generateFof} generating={generatingFof} />
              )}
            </div>
          )}

          {/* =================== TAB 5: AI Recommendations (3 sub-sections) =================== */}
          {activeTab === "recommendations" && (() => {
            const recSections: { key: RecSection; label: string; icon: React.ReactNode; description: string }[] = [
              { key: "company_profile", label: "Company Profile", icon: <Building2 className="h-4 w-4" />, description: "AI analysis of the company based on all communications" },
              { key: "sales_script", label: "Sales Script", icon: <ScrollText className="h-4 w-4" />, description: "Script for gathering FOF information with personalized intro" },
              { key: "next_steps", label: "Next Steps", icon: <ArrowRightCircle className="h-4 w-4" />, description: "Strategic recommendations and action plan" },
            ];

            const current = recSections.find((s) => s.key === activeRecSection)!;
            const isLoading = recLoading[activeRecSection];
            const content = recData[activeRecSection];

            return (
              <div className="space-y-4">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
                  {recSections.map((sec) => (
                    <button
                      key={sec.key}
                      onClick={() => setActiveRecSection(sec.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex-1 justify-center ${
                        activeRecSection === sec.key
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {sec.icon}
                      {sec.label}
                      {recData[sec.key] && (
                        <span className="w-2 h-2 rounded-full bg-green-400 ml-1" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Section header + language toggle + generate button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{current.label}</h3>
                    <p className="text-sm text-gray-500">{current.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Language toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setAiLang("en")}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          aiLang === "en"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setAiLang("ru")}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          aiLang === "ru"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        RU
                      </button>
                    </div>
                    <Button
                      onClick={() => generateRecSection(activeRecSection)}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isLoading ? "Generating..." : content ? "Regenerate" : "Generate"}
                    </Button>
                  </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Sparkles className="h-8 w-8 mx-auto mb-3 text-blue-500 animate-pulse" />
                      <p className="text-gray-600 font-medium">Generating {current.label}...</p>
                      <p className="text-xs text-gray-400 mt-1">AI is analyzing all available data. This may take 15-30 seconds.</p>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {!isLoading && !content && (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-400">
                      <div className="flex justify-center mb-3 opacity-50">{current.icon}</div>
                      <p>No {current.label.toLowerCase()} generated yet</p>
                      <p className="text-sm mt-1">
                        Click &quot;Generate&quot; to create an AI-powered {current.label.toLowerCase()}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Content */}
                {!isLoading && content && (
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex justify-end mb-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(content);
                            toast("Copied to clipboard");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* FOF Quick View */}
          {selectedFof && activeTab !== "fof" && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  FOF Quick View
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Direction</span>
                  <span className="font-medium">{selectedFof.paymentDirection || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Business</span>
                  <span className="font-medium">{selectedFof.businessModel || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Risk</span>
                  <span className="font-medium">{selectedFof.riskLevel || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Confidence</span>
                  <span className="font-medium">{selectedFof.confidenceScore ?? 0}%</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setActiveTab("fof")}
                >
                  View Full FOF
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sales Stage */}
          <Card>
            <CardContent className="py-4">
              <StageProgress currentStage={lead.stage} onStageChange={updateStage} />
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
                  <span className={`text-sm flex-1 ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {task.title}
                  </span>
                  {task.dueDate && <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>}
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

          {/* Lead Info */}
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

      {/* Call Log Modal */}
      <Dialog open={showCallLogModal} onOpenChange={setShowCallLogModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Add Call Log
            </DialogTitle>
          </DialogHeader>
          {callLogFormContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BriefingGenerator({ meetingId, onGenerated }: { meetingId: string; onGenerated: () => void }) {
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
