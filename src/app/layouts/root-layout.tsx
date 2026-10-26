import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";

import { queryClient } from "@/platform/query/client";
import { ThemeProvider } from "@/lib/theme";

export function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="min-h-dvh bg-background">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
          >
            Skip to main content
          </a>
          <Outlet />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
