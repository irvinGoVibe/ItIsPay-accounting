"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, RefreshCw, ArrowUpDown, Star, Sparkles } from "lucide-react";
import { ActivateLeadDialog } from "@/components/leads/activate-lead-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRelativeTime, LEAD_CLASSIFICATIONS, CLASSIFICATION_LABELS } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  stage: string;
  classification: string | null;
  isActiveDeal: boolean;
  lastContact: string | null;
  createdAt: string;
  tasks: Array<{ id: string; title: string; dueDate: string | null }>;
  _count: { emails: number; meetings: number; callLogs: number };
}

type ViewMode = "all" | "active";

const STATUS_TABS = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const;

const classificationColors: Record<string, string> = {
  CLIENT: "bg-blue-100 text-blue-700",
  RAIL: "bg-purple-100 text-purple-700",
  ADVISER: "bg-amber-100 text-amber-700",
  CONSULTING: "bg-green-100 text-green-700",
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  CLOSED_WON: "success",
  CLOSED_LOST: "destructive",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [syncing, setSyncing] = useState(false);
  const [activeClassification, setActiveClassification] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  // Listen for keyboard shortcut event
  useEffect(() => {
    const handler = () => setShowActivateDialog(true);
    window.addEventListener("open-activate-lead", handler);
    return () => window.removeEventListener("open-activate-lead", handler);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeStatus !== "ALL") params.set("status", activeStatus);
    if (activeClassification !== "ALL") params.set("classification", activeClassification);
    if (viewMode === "active") params.set("activeDeal", "true");
    if (search) params.set("search", search);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, [activeStatus, activeClassification, viewMode, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync/gmail", { method: "POST" });
      await fetchLeads();
    } finally {
      setSyncing(false);
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  const newLeadsCount = leads.filter((l) => l.status === "NEW").length;

  async function toggleActiveDeal(leadId: string, current: boolean) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActiveDeal: !current }),
    });
    fetchLeads();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} leads {newLeadsCount > 0 && `(${newLeadsCount} new)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Gmail
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowActivateDialog(true)}>
            <Sparkles className="h-4 w-4 text-amber-500" />
            Активировать лид
          </Button>
          <Link href="/leads/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode("all")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            viewMode === "all"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Все лиды
        </button>
        <button
          onClick={() => setViewMode("active")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            viewMode === "active"
              ? "bg-white text-amber-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Star className={`h-4 w-4 ${viewMode === "active" ? "fill-amber-500 text-amber-500" : ""}`} />
          Активные сделки
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeStatus === status
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <select
          value={activeClassification}
          onChange={(e) => setActiveClassification(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Types</option>
          {LEAD_CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-3 w-8" />
                {[
                  { key: "name", label: "Name" },
                  { key: "company", label: "Company" },
                  { key: "classification", label: "Type" },
                  { key: "status", label: "Status" },
                  { key: "lastContact", label: "Last Contact" },
                  { key: "createdAt", label: "Created" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap"
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                ))}
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Next Step
                </th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    No leads found. Sync your Gmail to get started.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-3">
                      <button
                        onClick={() => toggleActiveDeal(lead.id, lead.isActiveDeal)}
                        className="cursor-pointer hover:scale-110 transition-transform"
                        title={lead.isActiveDeal ? "Убрать из активных сделок" : "Добавить в активные сделки"}
                      >
                        <Star className={`h-4 w-4 ${lead.isActiveDeal ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3 max-w-[160px]">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                      >
                        {lead.name}
                      </Link>
                      <div className="text-xs text-gray-500 truncate">{lead.email}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[120px] truncate">
                      {lead.company ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      {lead.classification ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classificationColors[lead.classification] ?? "bg-gray-100 text-gray-700"}`}>
                          {CLASSIFICATION_LABELS[lead.classification] ?? lead.classification}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={statusBadgeVariant[lead.status] ?? "secondary"}>
                        {lead.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {lead.lastContact
                        ? formatRelativeTime(lead.lastContact)
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(lead.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[150px]">
                      {lead.tasks[0]?.title ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ActivateLeadDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        onActivated={fetchLeads}
      />
    </div>
  );
}
