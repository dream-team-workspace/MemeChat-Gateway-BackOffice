import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useParams, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Copy, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GrantCreditsDialog } from "@/features/users/components/grant-credits-dialog";
import { revenueCatStatusQueryOptions } from "@/features/users/queries/revenuecat.queries";
import { userLedgerQueryOptions } from "@/features/users/queries/users.queries";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Ledger", path: "ledger" },
  { label: "Usage", path: "usage" },
  { label: "Activity", path: "activity" },
];

export function UserDetailLayout() {
  const { uid } = useParams({ from: "/app/users/$uid" });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const ledger = useQuery(userLedgerQueryOptions(uid));
  const revenuecat = useQuery(revenueCatStatusQueryOptions);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantedBalance, setGrantedBalance] = useState<number | undefined>();
  const balance = ledger.data?.items[0]?.balanceAfter;
  const displayedBalance = grantedBalance ?? balance;
  const revenuecatReady = revenuecat.data?.configured === true;

  return (
    <div className="animate-in">
      <Link to="/users" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        User lookup
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">User</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="break-all font-mono text-xl font-semibold tracking-tight">{uid}</h1>
            <Button type="button" variant="ghost" size="icon" aria-label="Copy UID" onClick={() => void navigator.clipboard?.writeText(uid)}>
              <Copy />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest known balance: <span className="font-medium text-foreground">{typeof displayedBalance === "number" ? formatNumber(displayedBalance) + " CRD" : "—"}</span>{" "}
            {typeof grantedBalance === "number"
              ? "· returned by the most recent RevenueCat grant"
              : "· from the newest ledger row, not a live RevenueCat read"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Button
            type="button"
            onClick={() => setGrantOpen(true)}
            disabled={!revenuecatReady}
            title={
              revenuecat.isLoading
                ? "Checking RevenueCat configuration"
                : revenuecatReady
                  ? "Grant credits through RevenueCat"
                  : "RevenueCat is not configured on the gateway"
            }
          >
            <CreditCard />
            Grant credits
          </Button>
          <Badge variant={revenuecatReady ? "success" : "warning"}>
            {revenuecat.isLoading
              ? "Checking RevenueCat"
              : revenuecatReady
                ? "RevenueCat" + (revenuecat.data?.projectId ? " · " + revenuecat.data.projectId : "")
                : "RevenueCat not configured"}
          </Badge>
        </div>
      </div>

      <nav aria-label="User sections" className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = pathname.endsWith("/" + tab.path);
          const href = "/users/$uid/" + tab.path;
          return (
            <Link
              key={tab.path}
              to={href as "/users/$uid/ledger" | "/users/$uid/usage" | "/users/$uid/activity"}
              params={{ uid }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <Badge variant="outline" className="ml-auto my-1.5 hidden sm:inline-flex">Metadata only</Badge>
      </nav>

      <div className="mt-6"><Outlet /></div>

      {grantOpen && revenuecatReady ? (
        <GrantCreditsDialog
          uid={uid}
          open
          onOpenChange={setGrantOpen}
          onGranted={(result) => {
            if (result.balanceAfter !== undefined) setGrantedBalance(result.balanceAfter);
          }}
        />
      ) : null}
    </div>
  );
}
