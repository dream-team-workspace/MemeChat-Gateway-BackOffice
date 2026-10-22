import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Cpu,
  CreditCard,
  Database,
  Power,
  RefreshCw,
  Search,
  Server,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const activity = [
  {
    time: "2 min ago",
    event: "Capability updated",
    detail: "chat.standard · 1 → 2 CRD",
    actor: "AK",
    status: "Success",
    variant: "success" as const,
  },
  {
    time: "18 min ago",
    event: "Kill switch re-enabled",
    detail: "tts · operator recovered",
    actor: "MO",
    status: "Success",
    variant: "success" as const,
  },
  {
    time: "1 hr ago",
    event: "Provider route added",
    detail: "chat.premium · openai/gpt-5-mini",
    actor: "AK",
    status: "Success",
    variant: "success" as const,
  },
  {
    time: "3 hr ago",
    event: "Credit grant",
    detail: "30 CRD · uid_…9f2",
    actor: "SP",
    status: "Success",
    variant: "success" as const,
  },
  {
    time: "Yesterday",
    event: "Model disabled",
    detail: "deepseek-v4-flash",
    actor: "MO",
    status: "Pending",
    variant: "warning" as const,
  },
];

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/capabilities" | "/users" | "/operations";
  icon: typeof Power;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">{title}</span>
        <span className="line-clamp-2 block text-[11px] leading-4 text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function DashboardPage() {
  const [lastUpdated, setLastUpdated] = useState("just now");

  function refresh() {
    setLastUpdated(
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    );
  }

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Command center"
        title="Overview"
        description="A live read on the gateway’s capabilities, models, and operator activity."
        actions={
          <>
            <Button type="button" variant="outline" onClick={refresh}>
              <RefreshCw />
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

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-success/20 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full rounded-full bg-success/30" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
          <div>
            <p className="text-sm font-semibold">Gateway operational</p>
            <p className="text-xs text-muted-foreground">
              All health checks passing · updated {lastUpdated}
            </p>
          </div>
        </div>
        <Badge variant="success" className="w-fit">
          Healthy
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active capabilities"
          value="8"
          caption="2 disabled in staging"
          icon={Boxes}
          tone="info"
        />
        <StatCard
          label="Models in catalog"
          value="12"
          caption="Across 4 capabilities"
          icon={Cpu}
        />
        <StatCard
          label="Requests today"
          value="1,284"
          caption="Across 6 active capabilities"
          icon={Server}
          tone="success"
        />
        <StatCard
          label="Credits granted"
          value="340"
          caption="14 grants today"
          icon={CreditCard}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Recent gateway activity</CardTitle>
              <CardDescription>Changes from the last 24 hours</CardDescription>
            </div>
            <Badge variant="outline">Demo data</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Detail</TableHead>
                  <TableHead className="hidden lg:table-cell">Actor</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((row) => (
                  <TableRow key={row.time + row.event}>
                    <TableCell className="pl-5 text-xs text-muted-foreground">
                      {row.time}
                    </TableCell>
                    <TableCell className="font-medium">{row.event}</TableCell>
                    <TableCell className="hidden font-mono text-[11px] text-muted-foreground md:table-cell">
                      {row.detail}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                        {row.actor}
                      </span>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Badge variant={row.variant}>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-[11px] text-muted-foreground">
              Placeholder activity for layout review.
            </p>
            <Link
              to="/capabilities"
              className="text-[11px] font-semibold text-accent-foreground hover:underline"
            >
              View capabilities
            </Link>
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Common operator paths</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <QuickAction
                to="/capabilities"
                icon={Power}
                title="Disable a capability"
                description="Open the registry and act on an incident."
              />
              <QuickAction
                to="/users"
                icon={Search}
                title="Look up a user"
                description="Inspect the ledger and usage for a UID."
              />
              <QuickAction
                to="/operations"
                icon={Database}
                title="Invalidate registry cache"
                description="Force a fresh capability snapshot."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>Current console target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="outline" className="gap-1.5">
                  <span className={cn("size-1.5 rounded-full bg-warning")} />
                  Staging
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Gateway</span>
                <span className="truncate font-mono text-[11px]">api.dev.memechat.app</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Console</span>
                <span className="font-mono text-[11px]">v0.1.0</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Operator</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="size-3.5" />
                  Operator
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
