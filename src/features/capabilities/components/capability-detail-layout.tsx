import { Link, Outlet, useParams, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { capabilityQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { KillSwitchDialog } from "@/features/capabilities/components/kill-switch-dialog";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", to: "/capabilities/$capabilityId" as const },
  { label: "Routing", to: "/capabilities/$capabilityId/routing" as const },
  { label: "Audit", to: "/capabilities/$capabilityId/audit" as const },
];

export function CapabilityDetailLayout() {
  const { capabilityId } = useParams({ from: "/app/capabilities/$capabilityId" });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: capability, isLoading, isError, error, refetch, isFetching } = useQuery(
    capabilityQueryOptions(capabilityId),
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <LoadingRows rows={4} />
        </CardContent>
      </Card>
    );
  }

  if (isError || !capability) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const basePath = "/capabilities/" + capability.id;

  return (
    <div className="animate-in">
      <Link
        to="/capabilities"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All capabilities
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] text-muted-foreground">{capability.id}</p>
            <Badge variant={capability.enabled ? "success" : "outline"}>
              {capability.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {capability.displayName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Revision {capability.revision} · updated {formatDateTime(capability.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
          <KillSwitchDialog capability={capability} />
        </div>
      </div>

      {!capability.enabled ? (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning-foreground">
          This capability is disabled. Users receive <span className="font-mono">CAPABILITY_DISABLED</span>.
        </div>
      ) : null}

      <nav aria-label="Capability sections" className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active =
            tab.to === "/capabilities/$capabilityId"
              ? pathname === basePath
              : pathname.startsWith(basePath + "/" + tab.to.split("/").pop());
          return (
            <Link
              key={tab.to}
              to={tab.to}
              params={{ capabilityId: capability.id }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link
          to="/capabilities"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "ml-auto hidden text-muted-foreground sm:inline-flex",
          )}
        >
          Close
        </Link>
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
