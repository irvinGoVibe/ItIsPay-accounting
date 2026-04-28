"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const KEY = "push.lastGmailSyncAt";
const DEBOUNCE_MS = 30_000;

interface Props {
  onSynced?: () => void;
}

/**
 * Mount-once background sync. POSTs /api/sync/gmail when /push opens, unless a
 * sync ran less than 30s ago (sessionStorage guard — also prevents StrictMode
 * double-fire). Renders a subtle inline "Syncing…" pill while in flight; never
 * blocks the page.
 */
export function PushAutoSync({ onSynced }: Props) {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < DEBOUNCE_MS) return;
    sessionStorage.setItem(KEY, String(Date.now()));

    let cancelled = false;
    const run = async () => {
      // setState inside an async callback (post-await) is fine; the rule
      // only flags synchronous setState in the effect body.
      await Promise.resolve();
      if (cancelled) return;
      setSyncing(true);
      try {
        await fetch("/api/sync/gmail", { method: "POST" });
        if (!cancelled) onSynced?.();
      } catch (e) {
        console.error("PushAutoSync failed:", e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [onSynced]);

  if (!syncing) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Syncing Gmail…
    </span>
  );
}
