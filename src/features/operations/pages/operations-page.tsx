import { useState } from "react";
import { Activity, CheckCircle2, Database, RefreshCw, Server, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function timeLabel() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function OperationsPage() {
  const [invalidatedAt, setInvalidatedAt] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState("just now");

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="System"
        title="Operations"
        description="Check the console boundary, inspect registry freshness, and run safe system actions."
        actions={
          <Button type="button" variant="outline" onClick={() => setCheckedAt(timeLabel())}>
            <RefreshCw />
            Run health check
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-success/10 text-success">
              <Server className="size-4" />
            </span>
            <Badge variant="success">Operational</Badge>
          </div>
          <h2 className="mt-4 text-sm font-semibold">Gateway API</h2>
          <p className="mt-1 text-xs text-muted-foreground">api.dev.memechat.app</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-info/10 text-info">
              <ShieldCheck className="size-4" />
            </span>
            <Badge variant="success">Reachable</Badge>
          </div>
          <h2 className="mt-4 text-sm font-semibold">Admin API</h2>
          <p className="mt-1 text-xs text-muted-foreground">BFF boundary mock</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning-foreground">
              <Activity className="size-4" />
            </span>
            <Badge variant="outline">Updated {checkedAt}</Badge>
          </div>
          <h2 className="mt-4 text-sm font-semibold">Registry snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">Fresh · revision 42</p>
        </Card>
      </div>

      <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Registry cache</CardTitle>
            <CardDescription>
              Force the gateway to reload its in-memory capability snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Database className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Invalidate capability cache</p>
                  <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                    Safe but fleet-affecting. Use after a direct SQL seed or when a
                    capability change has not propagated.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInvalidatedAt(timeLabel())}
              >
                <RefreshCw />
                Invalidate cache
              </Button>
            </div>

            {invalidatedAt ? (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">
                <CheckCircle2 className="size-4 text-success" />
                <span>
                  Cache invalidation requested at <strong>{invalidatedAt}</strong>.
                  This is a preview action; no gateway call was made.
                </span>
              </div>
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
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-warning" />
                Staging
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Gateway</span>
              <span className="truncate font-mono text-[11px]">api.dev.memechat.app</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Console</span>
              <span className="font-mono text-[11px]">v0.1.0</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Auth mode</span>
              <span className="font-medium">Mock session</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Last checked</span>
              <span className="font-medium">{checkedAt}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Scheduled jobs</CardTitle>
          <CardDescription>Intentionally not exposed in this template</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
            Sweep, export, and retention jobs use a separate internal secret and are
            outside the backoffice admin boundary. They will be added only when the
            gateway exposes an admin-scoped job route.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
