import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";

import type { LedgerState } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { userLedgerQueryOptions } from "@/features/users/queries/users.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatNumber } from "@/lib/format";

function stateVariant(state: LedgerState): BadgeProps["variant"] {
  if (state === "COMMITTED") return "success";
  if (state === "REFUNDED") return "outline";
  if (state === "FAILED" || state === "EXPIRED") return "destructive";
  if (state === "PENDING_SPEND" || state === "RESERVED" || state === "REFUND_PENDING") return "warning";
  return "outline";
}

export function UserLedgerPage() {
  const { uid } = useParams({ from: "/app/users/$uid" });
  const [cursor, setCursor] = useState<string | undefined>();
  const query = useQuery(userLedgerQueryOptions(uid, cursor));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Credit ledger</CardTitle>
          <CardDescription>Newest first. Internal states are shown verbatim.</CardDescription>
        </div>
        {cursor ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCursor(undefined)}>Back to newest</Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading ? (
          <div className="p-5"><LoadingRows rows={5} /></div>
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="No ledger activity" description="This UID has no ledger rows in the current page." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Created</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead className="hidden md:table-cell">Request</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Reserved</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Committed</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Balance</TableHead>
                  <TableHead className="pr-5 text-right">RC txn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={String(entry.id)}>
                    <TableCell className="pl-5 text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{entry.capability}</TableCell>
                    <TableCell className="hidden font-mono text-[11px] text-muted-foreground md:table-cell">{entry.requestId.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant={stateVariant(entry.state)}>{entry.state.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatNumber(entry.reserved)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{entry.committed === null ? "—" : formatNumber(entry.committed)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums xl:table-cell">{entry.balanceAfter === null ? "—" : formatNumber(entry.balanceAfter)}</TableCell>
                    <TableCell className="pr-5 text-right font-mono text-[11px] text-muted-foreground">{entry.rcTxnId ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {query.data.nextCursor ? (
              <div className="flex justify-center border-t border-border p-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setCursor(query.data?.nextCursor ?? undefined)}>
                  <ArrowDown />
                  Load older
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
