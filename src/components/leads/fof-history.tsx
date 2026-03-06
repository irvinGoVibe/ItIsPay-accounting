"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { FlowOfFundsRecord } from "./fof-display";

interface FofHistoryProps {
  versions: FlowOfFundsRecord[];
  currentVersion: number;
  onSelectVersion: (version: FlowOfFundsRecord) => void;
}

const triggerLabels: Record<string, string> = {
  MANUAL: "Manual",
  EMAIL_SYNC: "Email Sync",
  CALL_LOG: "Call Log",
};

const triggerColors: Record<string, string> = {
  MANUAL: "bg-gray-100 text-gray-700",
  EMAIL_SYNC: "bg-blue-100 text-blue-700",
  CALL_LOG: "bg-purple-100 text-purple-700",
};

export function FofHistory({ versions, currentVersion, onSelectVersion }: FofHistoryProps) {
  if (versions.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Version History</h4>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelectVersion(v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors text-sm ${
              v.version === currentVersion
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">v{v.version}</span>
              <Badge
                className={`text-xs ${triggerColors[v.trigger] || "bg-gray-100 text-gray-700"}`}
              >
                {triggerLabels[v.trigger] || v.trigger}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {v.confidenceScore ?? 0}%
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(new Date(v.createdAt))}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
