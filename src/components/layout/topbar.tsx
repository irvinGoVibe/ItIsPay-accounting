"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const { data: session } = useSession();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await Promise.all([
        fetch("/api/sync/gmail", { method: "POST" }),
        fetch("/api/sync/calendar", { method: "POST" }),
      ]);
      window.location.reload();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync"}
        </Button>
        {session?.user && (
          <div className="flex items-center gap-2">
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="text-sm font-medium text-gray-700">
              {session.user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
