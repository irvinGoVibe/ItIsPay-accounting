"use client";

import { cn } from "@/lib/utils";
import { LEAD_STAGES, type LeadStage } from "@/lib/utils";
import { Check } from "lucide-react";

const STAGE_INFO: Record<string, { label: string; description: string }> = {
  QUALIFICATION: {
    label: "Qualification",
    description: "Is there a fit? Budget? Decision maker?",
  },
  DISCOVERY: {
    label: "Discovery",
    description: "Pain points, current process, technical requirements",
  },
  PROPOSAL: {
    label: "Proposal",
    description: "Custom pricing, contract terms, timeline",
  },
  NEGOTIATION: {
    label: "Negotiation",
    description: "Objections, final pricing, legal review",
  },
  CLOSED: {
    label: "Closed",
    description: "Deal won or lost",
  },
};

export function StageProgress({
  currentStage,
  onStageChange,
}: {
  currentStage: string;
  onStageChange?: (stage: LeadStage) => void;
}) {
  const currentIndex = LEAD_STAGES.indexOf(currentStage as LeadStage);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Sales Stage</h3>
      <div className="flex items-center gap-1">
        {LEAD_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const info = STAGE_INFO[stage];

          return (
            <div key={stage} className="flex items-center flex-1">
              <button
                onClick={() => onStageChange?.(stage)}
                className={cn(
                  "relative flex flex-col items-center flex-1 group cursor-pointer",
                )}
                title={info.description}
              >
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-3 right-1/2 w-full h-0.5 -translate-y-1/2",
                      isCompleted || isCurrent ? "bg-blue-500" : "bg-gray-200"
                    )}
                  />
                )}
                {/* Circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCompleted
                      ? "bg-blue-500 text-white"
                      : isCurrent
                        ? "bg-blue-500 text-white ring-4 ring-blue-100"
                        : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                {/* Label */}
                <span
                  className={cn(
                    "mt-1.5 text-xs text-center leading-tight",
                    isCurrent
                      ? "font-medium text-blue-700"
                      : isCompleted
                        ? "text-gray-600"
                        : "text-gray-400"
                  )}
                >
                  {info.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {/* Current stage hint */}
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        {STAGE_INFO[currentStage]?.description ?? ""}
      </p>
    </div>
  );
}
