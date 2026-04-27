"use client";

import { Card } from "@/components/ui/card";

interface Props {
  data: {
    week: { sent: number; replied: number; replyRate: number };
    queues: { active: number; cold: number; replied: number };
  } | null;
}

export function StatsCard({ data }: Props) {
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-gray-700 mb-3">Эта неделя</div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Отправлено" value={data?.week.sent ?? "—"} />
        <Stat label="Ответили" value={data?.week.replied ?? "—"} />
        <Stat label="Reply rate" value={data ? `${data.week.replyRate}%` : "—"} />
      </div>
      {data && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>В работе: <b className="text-gray-900">{data.queues.active}</b></span>
          <span>Replied: <b className="text-gray-900">{data.queues.replied}</b></span>
          <span>Cold: <b className="text-gray-900">{data.queues.cold}</b></span>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
