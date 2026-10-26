import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, CreditCard, Database, RefreshCw, Server, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { capabilityKeys } from "@/features/capabilities/api/capabilities.api";
import { modelKeys } from "@/features/models/api/models.api";
import { revenueCatStatusQueryOptions } from "@/features/users/queries/revenuecat.queries";
import { getErrorMessage } from "@/platform/api";
import { systemApi, systemKeys } from "@/platform/api/system";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OperationsPage() {
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: systemKeys.health, queryFn: systemApi.health });
  const meta = useQuery({ queryKey: systemKeys.meta, queryFn: systemApi.meta });
  const revenuecat = useQuery(revenueCatStatusQueryOptions);
  const invalidate = useMutation({
    mutationFn: systemApi.invalidateCache,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.all });
      void queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });

  const gatewayOk = health.data?.status === "ok";
  const liveness = health.data?.gateway?.liveness ?? "—";
  const readiness = health.data?.gateway?.readiness ?? "—";
  const revenuecatReady = revenuecat.data?.configured === true;

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="System"
        title="Operations"
        description="Check the console boundary, inspect registry freshness, and run safe system actions."
        actions={
          <Button type="button" variant="outline" onClick={() => void health.refetch()} disabled={health.isFetching}>
            <RefreshCw className={cn(health.isFetching && "animate-spin")} />
            Run health check
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-success/10 text-success"><Server className="size-4" /></span>
            <Badge variant={liveness === "ok" ? "success" : "warning"}>{liveness}</Badge>
          </div>
          <h2 className="mt-4 text-sm font-semibold">Gateway liveness</h2>
          <p className="mt-1 text-xs text-muted-foreground">{health.data?.gateway ? "Probed from the BFF" : "No probe data"}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-info/10 text-info"><ShieldCheck className="size-4" /></span>
            <Badge variant={readiness === "ok" ? "success" : "warning"}>{readiness}</Badge>
          </div>
          <h2 className="mt-4 text-sm font-semibold">Gateway readiness</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {readiness === "not_configured"
              ? "Backend has no /readyz endpoint yet"
              : health.data?.gateway
                ? "Probed from the BFF"
                : "No probe data"}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning-foreground"><Activity className="size-4" /></span>
            <Badge variant="outline">live</Badge>
          </div>
          <h2 className="mt-4 text-sm font-semibold">Admin API mode</h2>
          <p className="mt-1 text-xs text-muted-foreground">Gateway admin API</p>
        </Card>
      </div>

      {health.isError ? (
        <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {getErrorMessage(health.error)}
        </p>
      ) : null}

      <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Registry cache</CardTitle>
            <CardDescription>Force the gateway to reload its in-memory capability snapshot.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Database className="size-4" /></span>
                <div>
                  <p className="text-sm font-semibold">Invalidate capability cache</p>
                  <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                    Safe but fleet-affecting. Use after a direct SQL seed or when a capability change has not propagated.
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => invalidate.mutate()} disabled={invalidate.isPending}>
                <RefreshCw className={cn(invalidate.isPending && "animate-spin")} />
                {invalidate.isPending ? "Invalidating…" : "Invalidate cache"}
              </Button>
            </div>
            {invalidate.data ? (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">
                <CheckCircle2 className="size-4 text-success" />
                <span>Cache invalidation requested at <strong>{formatDateTime(invalidate.data.invalidatedAt)}</strong>.</span>
              </div>
            ) : null}
            {invalidate.isError ? (
              <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {getErrorMessage(invalidate.error)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>Read-only console context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Target</span>
              <Badge variant="outline" className="gap-1.5"><span className="size-1.5 rounded-full bg-warning" />{meta.data?.environment ?? "—"}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Auth mode</span>
              <span className="font-medium">{meta.data?.authMode === "development" ? "Development" : "Cloudflare Access"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Admin API</span>
              <span className="font-medium">live</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Console</span>
              <span className="font-mono text-[11px]">{meta.data?.version ?? "0.1.0"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Last checked</span>
              <span className="font-medium">{health.isFetching ? "checking…" : gatewayOk ? "ok" : "degraded"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>RevenueCat grants</CardTitle>
            <CardDescription>Positive CRD adjustments; status reflects gateway credentials, not live RC reachability.</CardDescription>
          </div>
          <Badge variant={revenuecat.isLoading ? "outline" : revenuecatReady ? "success" : "warning"}>
            {revenuecat.isLoading ? "Checking" : revenuecatReady ? "Configured" : "Not configured"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="mt-1 font-medium">{revenuecatReady ? "Credentials present" : "Not configured"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Project</p>
            <p className="mt-1 break-all font-mono text-[11px]">{revenuecat.data?.projectId ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">API base</p>
            <p className="mt-1 break-all font-mono text-[11px]">{revenuecat.data?.baseUrl ?? "—"}</p>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground sm:col-span-3">
            <CreditCard className="mt-0.5 size-3.5 shrink-0" />
            <p>
              {revenuecatReady
                ? "Grants are routed by the gateway to RevenueCat with an idempotent request ID. A successful grant is the reachability check. Open a user to grant credits."
                : "Set REVENUECAT_SECRET_KEY and REVENUECAT_PROJECT_ID on the gateway to enable grants. The rest of the console stays usable."}
            </p>
          </div>
          {revenuecat.isError ? (
            <p role="alert" className="text-[11px] text-destructive sm:col-span-3">
              {getErrorMessage(revenuecat.error)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Scheduled jobs</CardTitle>
          <CardDescription>Intentionally not exposed in this template</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
            Sweep, export, and retention jobs use a separate internal secret and are outside the backoffice admin boundary. They will be added only when the gateway exposes an admin-scoped job route.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
