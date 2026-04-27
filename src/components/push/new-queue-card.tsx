"use client";

import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface NewLead {
  id: string; name: string; email: string; company: string | null; createdAt: string;
}

interface Props {
  leads: NewLead[];
  onSelect: (leadId: string) => void;
}

export function NewQueueCard({ leads, onSelect }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-gray-700">Очередь новых (48h)</span>
        <span className="ml-auto text-xs text-gray-500">{leads.length}</span>
      </div>
      {leads.length === 0 ? (
        <p className="text-sm text-gray-500">Пусто. Никого нового без касания нет.</p>
      ) : (
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {leads.slice(0, 10).map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onSelect(l.id)}
                className="w-full text-left rounded-md px-2 py-1.5 hover:bg-gray-50 group"
              >
                <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
                  {l.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {l.company || l.email}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
