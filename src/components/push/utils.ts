import { TOUCH_SCHEDULE, type TouchType } from "@/lib/push/cadence";

export const PRIORITY_LABEL: Record<string, string> = {
  P1: "🔥 P1",
  STANDARD: "Standard",
  COLD: "Cold",
};

export const PRIORITY_BADGE: Record<string, string> = {
  P1: "bg-red-100 text-red-700 border-red-200",
  STANDARD: "bg-gray-100 text-gray-700 border-gray-200",
  COLD: "bg-blue-100 text-blue-700 border-blue-200",
};

export const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  REPLIED: "bg-purple-100 text-purple-700",
  COLD: "bg-blue-100 text-blue-700",
  PAUSED: "bg-amber-100 text-amber-700",
  DISQUALIFIED: "bg-gray-200 text-gray-600",
  QUALIFIED: "bg-emerald-100 text-emerald-700",
};

export function touchLabel(currentTouch: number) {
  const next = TOUCH_SCHEDULE.find((t) => t.number === currentTouch + 1);
  if (!next) return "complete";
  return `${next.number}/6 · ${next.label}`;
}

export function touchTypeLabel(t: TouchType) {
  const c = TOUCH_SCHEDULE.find((s) => s.type === t);
  return c ? `${c.number} · ${c.label}` : t;
}

export function dueColorClasses(dueColor: string) {
  switch (dueColor) {
    case "overdue":  return "bg-red-50 border-l-4 border-red-500";
    case "today":    return "bg-orange-50 border-l-4 border-orange-500";
    case "tomorrow": return "bg-emerald-50 border-l-4 border-emerald-500";
    default:         return "border-l-4 border-transparent";
  }
}

export function dueLabel(due: string | null | undefined): { text: string; color: string } {
  if (!due) return { text: "—", color: "text-gray-400" };
  const d = new Date(due);
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((t0 - d0) / 86400000);
  if (diff > 0) return { text: `${diff}d overdue`, color: "text-red-600 font-semibold" };
  if (diff === 0) return { text: "Today", color: "text-orange-600 font-semibold" };
  if (diff === -1) return { text: "Tomorrow", color: "text-emerald-600" };
  return { text: `in ${-diff}d`, color: "text-gray-600" };
}

export function daysSinceLabel(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  return `${days}d`;
}

/** Compact date format: "22 Apr" or "22 Apr 25" if year ≠ current. */
export function shortDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "2-digit" }),
  });
}

/** "5d ago" / "today" / "yesterday". */
export function pastRelative(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 0) return "";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

/** "in 3d" / "Today" / "Tomorrow" / "5d overdue". */
export function dueRelative(due: string | Date | null | undefined): string {
  if (!due) return "—";
  const d = typeof due === "string" ? new Date(due) : due;
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((t0 - d0) / 86400000);
  if (diff > 0) return `${diff}d overdue`;
  if (diff === 0) return "Today";
  if (diff === -1) return "Tomorrow";
  return `in ${-diff}d`;
}

/** Color class for the relative due label. */
export function dueRelativeColor(due: string | Date | null | undefined): string {
  if (!due) return "text-gray-400";
  const d = typeof due === "string" ? new Date(due) : due;
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((t0 - d0) / 86400000);
  if (diff > 0) return "text-red-600 font-semibold";
  if (diff === 0) return "text-orange-600 font-semibold";
  if (diff === -1) return "text-emerald-600";
  return "text-gray-600";
}
