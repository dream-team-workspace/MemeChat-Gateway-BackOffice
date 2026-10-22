import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { userUsageQueryOptions } from "@/features/users/queries/users.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatNumber } from "@/lib/format";

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "ok") return "success";
  if (status === "upstream_error") return "destructive";
  if (status === "client_abort") return "warning";
  if (status === "insufficient_credits" || status === "fair_use") return "warning";
  return "outline";
}

export function UserUsagePage() {
  const { uid } = useParams({ from: "/app/users/$uid" });
  const [cursor, setCursor] = useState<string | undefined>();
  const query = useQuery(userUsageQueryOptions(uid, cursor));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Usage events</CardTitle>
          <CardDescription>Metadata only — no message content is stored.</CardDescription>
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
          <EmptyState title="No usage activity" description="This UID has no usage events in the current page." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Created</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead className="hidden md:table-cell">Provider / model</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Tokens</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Chars / seconds</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((event) => (
                  <TableRow key={String(event.id)}>
                    <TableCell className="pl-5 text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</TableCell>
                    <TableCell className="font-mono text-[11px]">{event.capability}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{event.provider ?? "—"} / {event.model ?? "—"}</TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">
                      {event.inputTokens === null && event.outputTokens === null ? "—" : formatNumber((event.inputTokens ?? 0) + (event.outputTokens ?? 0))}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums xl:table-cell">
                      {event.characters === null && event.audioSeconds === null ? "—" : event.characters !== null ? formatNumber(event.characters) : formatNumber(event.audioSeconds ?? 0) + "s"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(event.credits)}</TableCell>
                    <TableCell className="pr-5 text-right"><Badge variant={statusVariant(event.status)}>{event.status.replaceAll("_", " ")}</Badge></TableCell>
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
