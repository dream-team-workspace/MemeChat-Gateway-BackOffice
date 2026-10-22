import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Boxes,
  CreditCard,
  Cpu,
  RefreshCw,
  Search,
  Server,
} from "lucide-react";

import { ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { capabilitiesQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { modelsQueryOptions } from "@/features/models/queries/models.queries";
import { systemApi, systemKeys } from "@/platform/api/system";
import { getErrorMessage } from "@/platform/api";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OverviewPage() {
  const capabilities = useQuery(capabilitiesQueryOptions);
  const models = useQuery(modelsQueryOptions);
  const health = useQuery({ queryKey: systemKeys.health, queryFn: systemApi.health });
  const meta = useQuery({ queryKey: systemKeys.meta, queryFn: systemApi.meta });

  const capabilityItems = capabilities.data?.items ?? [];
  const enabled = capabilityItems.filter((item) => item.enabled).length;
  const disabled = capabilityItems.length - enabled;
  const modelItems = models.data?.items ?? [];
  const gatewayHealthy = health.data?.status === "ok";
  const isLoading = capabilities.isLoading || models.isLoading || health.isLoading;

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Command center"
        title="Overview"
        description="A live read on the gateway's capabilities, models, and operator surface."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void capabilities.refetch();
                void models.refetch();
                void health.refetch();
              }}
              disabled={capabilities.isFetching || models.isFetching}
            >
              <RefreshCw className={cn((capabilities.isFetching || models.isFetching) && "animate-spin")} />
              Refresh
            </Button>
            <Link to="/capabilities" className={buttonVariants()}>
              <Boxes />
              Open capabilities
              <ArrowUpRight />
            </Link>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={cn("size-2.5 rounded-full", gatewayHealthy ? "bg-success" : "bg-warning")} />
          <div>
            <p className="text-sm font-semibold">
              {isLoading ? "Checking gateway" : gatewayHealthy ? "Gateway operational" : "Gateway degraded"}
            </p>
            <p className="text-xs text-muted-foreground">
              {health.isError
                ? "Health endpoint unreachable."
                : "BFF probes the gateway liveness and readiness endpoints."}
            </p>
          </div>
        </div>
        <Badge variant={gatewayHealthy ? "success" : "warning"} className="w-fit">
          {health.isLoading ? "Checking" : gatewayHealthy ? "Healthy" : "Degraded"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="mt-6"><LoadingRows rows={4} /></div>
      ) : capabilities.isError || models.isError ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <ErrorState
              message={getErrorMessage(capabilities.error ?? models.error)}
              onRetry={() => {
                void capabilities.refetch();
                void models.refetch();
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active capabilities" value={String(enabled)} caption={disabled + " disabled"} icon={Boxes} tone="info" />
            <StatCard label="Models in catalog" value={String(modelItems.length)} caption="App-facing picker entries" icon={Cpu} />
            <StatCard label="Registry entries" value={String(capabilityItems.length)} caption="Loaded from the BFF" icon={Server} tone="success" />
            <StatCard label="Environment" value={meta.data?.environment ?? "—"} caption={meta.data?.adminApiMode === "mock" ? "Mock admin API" : "Live admin API"} icon={CreditCard} tone="warning" />
          </div>

          <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Registry snapshot</CardTitle>
                <CardDescription>Capabilities currently known to the console</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {capabilityItems.map((capability) => (
                    <Link
                      key={capability.id}
                      to="/capabilities/$capabilityId"
                      params={{ capabilityId: capability.id }}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{capability.displayName}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{capability.id}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground sm:inline">{formatCost(capability)}</span>
                        <Badge variant={capability.enabled ? "success" : "outline"}>
                          {capability.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>Common operator paths</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Link to="/capabilities" className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/50">
                    <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground"><Boxes className="size-4" /></span>
                    <span className="text-xs font-semibold">Open registry</span>
                  </Link>
                  <Link to="/users" className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/50">
                    <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground"><Search className="size-4" /></span>
                    <span className="text-xs font-semibold">Look up a user</span>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                  <CardDescription>Console boundary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Environment</span>
                    <Badge variant="outline" className="gap-1.5"><span className="size-1.5 rounded-full bg-warning" />{meta.data?.environment ?? "—"}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Auth</span>
                    <span className="font-medium">{meta.data?.authMode === "development" ? "Development" : "Cloudflare Access"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Admin API</span>
                    <span className="font-medium">{meta.data?.adminApiMode === "mock" ? "Mock" : "Live"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Console</span>
                    <span className="font-mono text-[11px]">{meta.data?.version ?? "0.1.0"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
