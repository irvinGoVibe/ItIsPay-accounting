/**
 * Push Scheduler cadence config.
 *
 * Sequence: 6 touches over 21 days, then auto-cold.
 *   1: day 0   — first email
 *   2: day 3   — follow-up
 *   3: day 7   — LinkedIn / other channel
 *   4: day 10  — second follow-up
 *   5: day 14  — trigger email (new angle)
 *   6: day 21  — last email
 *   after 21d without reply → COLD, removed from active queue
 */

export type TouchType =
  | "FIRST"
  | "FU1"
  | "LINKEDIN"
  | "FU2"
  | "TRIGGER"
  | "LAST";

export interface TouchConfig {
  number: number;
  day: number;
  type: TouchType;
  label: string;
  channel: "email" | "linkedin" | "any";
}

export const TOUCH_SCHEDULE: TouchConfig[] = [
  { number: 1, day: 0,  type: "FIRST",    label: "First email",         channel: "email" },
  { number: 2, day: 3,  type: "FU1",      label: "Follow-up 1",         channel: "email" },
  { number: 3, day: 7,  type: "LINKEDIN", label: "LinkedIn / other",    channel: "linkedin" },
  { number: 4, day: 10, type: "FU2",      label: "Follow-up 2",         channel: "email" },
  { number: 5, day: 14, type: "TRIGGER",  label: "Trigger (new angle)", channel: "email" },
  { number: 6, day: 21, type: "LAST",     label: "Last email",          channel: "email" },
];

export const TOTAL_TOUCHES = TOUCH_SCHEDULE.length;
export const COLD_DAYS = 21;

/** Get config for next pending touch given current completed count (0..6). */
export function getNextTouch(currentTouch: number): TouchConfig | null {
  return TOUCH_SCHEDULE.find((t) => t.number === currentTouch + 1) ?? null;
}

export function getTouchByNumber(n: number): TouchConfig | null {
  return TOUCH_SCHEDULE.find((t) => t.number === n) ?? null;
}

/** Compute date when the next touch is due. Returns null if sequence complete. */
export function nextDueDate(currentTouch: number, startedAt: Date): Date | null {
  const next = getNextTouch(currentTouch);
  if (!next) return null;
  return new Date(startedAt.getTime() + next.day * 86400000);
}

/** Days between today (UTC midnight) and a date. Negative = future, positive = past. */
export function daysSince(date: Date, today: Date = new Date()): number {
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d0 = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((t0 - d0) / 86400000);
}

/** Color bucket for due date relative to today. */
export type DueColor = "overdue" | "today" | "tomorrow" | "later" | "none";

export function dueColor(due: Date | null | undefined, today: Date = new Date()): DueColor {
  if (!due) return "none";
  const d = daysSince(due, today);
  if (d > 0) return "overdue";
  if (d === 0) return "today";
  if (d === -1) return "tomorrow";
  return "later";
}
