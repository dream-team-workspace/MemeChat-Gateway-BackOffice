import { Menu } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/common/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/": "Overview",
  "/capabilities": "Capabilities",
  "/models": "Models",
  "/users": "Users",
  "/operations": "Operations",
  "/settings": "Settings",
};

export function Topbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const title = titles[pathname] ?? "BackOffice";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuOpen}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span>BackOffice</span>
          <span aria-hidden="true">/</span>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
          <span className="size-1.5 rounded-full bg-warning" />
          Staging
        </Badge>
        <ThemeToggle />
      </div>
    </header>
  );
}
