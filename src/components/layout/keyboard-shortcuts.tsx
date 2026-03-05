"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Navigation shortcuts (g + key)
      if (e.key === "g") {
        const handleSecondKey = (e2: KeyboardEvent) => {
          switch (e2.key) {
            case "d":
              router.push("/");
              break;
            case "l":
              router.push("/leads");
              break;
            case "m":
              router.push("/meetings");
              break;
            case "t":
              router.push("/tasks");
              break;
            case "s":
              router.push("/settings");
              break;
          }
          document.removeEventListener("keydown", handleSecondKey);
        };
        document.addEventListener("keydown", handleSecondKey, { once: true });
        setTimeout(() => {
          document.removeEventListener("keydown", handleSecondKey);
        }, 1000);
        return;
      }

      // Quick actions
      if (e.key === "?" && !e.shiftKey) {
        // Could show keyboard shortcut help modal
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
