"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/shared/cookie-banner";
import { PwaRegistrar } from "@/components/pwa/pwa-install";
import { DittoProvider } from "@/components/ditto/ditto-context";
import { DittoAssistant } from "@/components/ditto/ditto-widget";
import type { PlatformConfig } from "@/lib/platform/types";

export function Providers({
  children,
  platformConfig,
}: {
  children: React.ReactNode;
  platformConfig: PlatformConfig;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DittoProvider>
            <PwaRegistrar />
            {children}
            <DittoAssistant config={platformConfig} />
            <CookieBanner />
            <Toaster richColors position="top-right" />
          </DittoProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
