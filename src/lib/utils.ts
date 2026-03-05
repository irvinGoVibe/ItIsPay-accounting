import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(date);
}

export function extractDomainFromEmail(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase();
}

export function companyFromDomain(domain: string): string {
  // Remove common TLDs and capitalize
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "live.com",
  "msn.com",
  "me.com",
  "inbox.com",
  "mail.ru",
  "gmx.com",
  "fastmail.com",
]);

export function isPersonalEmail(email: string): boolean {
  const domain = extractDomainFromEmail(email);
  if (!domain) return true;
  return PERSONAL_DOMAINS.has(domain);
}

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

export const LEAD_STAGES = [
  "QUALIFICATION",
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED",
] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
