import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Boxes,
  Cpu,
  LayoutDashboard,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";

import { BrandMark } from "@/components/common/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { systemApi, systemKeys } from "@/platform/api/system";
import { UserMenu } from "@/components/layout/user-menu";

type NavItem = {
  label: string;
  to: "/" | "/capabilities" | "/models" | "/users" | "/operations";
  icon: LucideIcon;
};

const operateNav: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Capabilities", to: "/capabilities", icon: Boxes },
  { label: "Models", to: "/models", icon: Cpu },
];

const supportNav: NavItem[] = [{ label: "Users", to: "/users", icon: Users }];

const systemNav: NavItem[] = [
  { label: "Operations", to: "/operations", icon: Activity },
];

type AppSidebarProps = {
  mobile?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
};

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

export function AppSidebar({ mobile = false, onClose, onNavigate }: AppSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const meta = useQuery({ queryKey: systemKeys.meta, queryFn: systemApi.meta });
  const environment = meta.data?.environment ?? "development";

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const active = isActive(pathname, item.to);
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
          )}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
          {active ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}
        </Link>
      );
    });

  return (
    <aside
      aria-label="Primary navigation"
      className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground"
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <BrandMark />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-5">MemeChat</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              BackOffice
            </span>
          </span>
        </Link>
        {mobile ? (
          <Button
            variant="ghost"
            size="icon"
            autoFocus
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X />
          </Button>
        ) : null}
      </div>

      <nav
        aria-label="Console sections"
        className="flex-1 overflow-y-auto px-3 pb-4 pt-2 scrollbar-thin"
      >
        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Operate
        </p>
        <div className="space-y-1">{renderNav(operateNav)}</div>

        <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Support
        </p>
        <div className="space-y-1">{renderNav(supportNav)}</div>

        <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          System
        </p>
        <div className="space-y-1">{renderNav(systemNav)}</div>
      </nav>

      <div className="mt-auto shrink-0 border-t border-sidebar-border p-3">
        <Link
          to="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings2 className="size-4 shrink-0" />
          <span>Settings</span>
          {pathname === "/settings" ? (
            <span className="ml-auto size-1.5 rounded-full bg-primary" />
          ) : null}
        </Link>

        <div className="mt-2 rounded-lg border border-sidebar-border bg-background/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Environment
            </span>
            <Badge variant="outline" className="gap-1.5 px-2 py-0">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  environment === "production"
                    ? "bg-success"
                    : environment === "staging"
                      ? "bg-warning"
                      : "bg-info",
                )}
              />
              {environment.charAt(0).toUpperCase() + environment.slice(1)}
            </Badge>
          </div>
          <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
            {meta.data?.adminApiMode === "mock" ? "BFF mock store" : "api.dev.memechat.app"}
          </p>
        </div>

        <div className="mt-3">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
