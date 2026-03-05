"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
