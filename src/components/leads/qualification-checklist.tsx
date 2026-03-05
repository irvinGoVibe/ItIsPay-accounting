"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_QUESTIONS: Record<string, Array<{ id: string; question: string }>> = {
  QUALIFICATION: [
    { id: "q1", question: "Does the client have a problem ItIsPay solves?" },
    { id: "q2", question: "Is there a budget allocated?" },
    { id: "q3", question: "Who is the decision maker?" },
    { id: "q4", question: "What is the timeline for implementation?" },
    { id: "q5", question: "Are there competing solutions being evaluated?" },
  ],
  DISCOVERY: [
    { id: "d1", question: "What is their current payment process?" },
    { id: "d2", question: "What are the main pain points?" },
    { id: "d3", question: "What are the technical requirements?" },
    { id: "d4", question: "What is the integration complexity?" },
    { id: "d5", question: "What volume of transactions do they process?" },
  ],
  PROPOSAL: [
    { id: "p1", question: "Custom pricing prepared and presented?" },
    { id: "p2", question: "Contract terms discussed?" },
    { id: "p3", question: "Implementation timeline agreed upon?" },
    { id: "p4", question: "Technical POC/demo completed?" },
  ],
  NEGOTIATION: [
    { id: "n1", question: "All objections addressed?" },
    { id: "n2", question: "Final pricing adjustments made?" },
    { id: "n3", question: "Legal review completed?" },
    { id: "n4", question: "Sign-off from all stakeholders?" },
  ],
  CLOSED: [
    { id: "c1", question: "Contract signed?" },
    { id: "c2", question: "Onboarding scheduled?" },
  ],
};

export function QualificationChecklist({ stage }: { stage: string }) {
  const questions = STAGE_QUESTIONS[stage] ?? [];
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (questions.length === 0) return null;

  const progress = questions.length > 0 ? Math.round((checked.size / questions.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Qualification</h3>
        <span className="text-xs text-gray-500">
          {checked.size}/{questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            progress === 100 ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {progress === 100 && (
        <p className="text-xs text-green-600 font-medium">
          Ready to advance to next stage
        </p>
      )}

      {/* Questions */}
      <div className="space-y-1.5">
        {questions.map((q) => {
          const isChecked = checked.has(q.id);
          return (
            <button
              key={q.id}
              onClick={() => toggle(q.id)}
              className="flex items-start gap-2 w-full text-left group cursor-pointer"
            >
              {isChecked ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 mt-0.5 shrink-0 group-hover:text-gray-400" />
              )}
              <span
                className={cn(
                  "text-sm leading-tight",
                  isChecked ? "text-gray-400 line-through" : "text-gray-700"
                )}
              >
                {q.question}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
