import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { ActivityDateFilter } from "@/components/common/activity-date-filter";
import { EmptyState, ErrorState, LoadingRows, PendingGatewayState } from "@/components/common/async-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appClientsQueryOptions } from "@/features/app-clients/queries/app-clients.queries";
import { userActivityQueryOptions } from "@/features/users/queries/users.queries";
import { dateInputToApiDate, todayDateInput } from "@/lib/activity-date";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getErrorMessage, isGatewayFeatureMissing } from "@/platform/api";

function activityStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "ok") return "success";
  if (status === "error") return "destructive";
  return "outline";
}

function shortIdentifier(value: string, max = 22) {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

export function UserActivityPage() {
  const { uid } = useParams({ from: "/app/users/$uid" });
  const [cursor, setCursor] = useState<string | undefined>();
  const [date, setDate] = useState(todayDateInput);
  const apiDate = dateInputToApiDate(date);
  const query = useQuery(userActivityQueryOptions(uid, cursor, apiDate));
  const clients = useQuery(appClientsQueryOptions);
  const clientNames = new Map((clients.data?.items ?? []).map((client) => [client.id, client.name]));

  function changeDate(next: string) {
    setDate(next);
    setCursor(undefined);
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>User activity</CardTitle>
          <CardDescription>
            Metadata-only requests this user made through an app client, newest first. Provider content is never stored.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActivityDateFilter value={date} onChange={changeDate} />
          {cursor ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCursor(undefined)}>
              Back to newest
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading ? (
          <div className="p-5"><LoadingRows rows={5} /></div>
        ) : query.isError && !isGatewayFeatureMissing(query.error) ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.isError ? (
          <PendingGatewayState
            title="User activity is not available from the gateway yet"
            description="The console is ready for it. Activity will appear here once the gateway exposes the file-backed user activity endpoint."
          />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            title="No activity on this date"
            description="This user made no authenticated requests through an app client on the selected day. Try another date."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">When</TableHead>
                  <TableHead>App client</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Request</TableHead>
                  <TableHead className="hidden pr-5 text-right sm:table-cell">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((entry) => {
                  const clientName = clientNames.get(entry.appClientId);
                  return (
                    <TableRow key={String(entry.id)}>
                      <TableCell className="whitespace-nowrap pl-5 text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        {entry.appClientId ? (
                          <Link
                            to="/app-clients/$clientId"
                            params={{ clientId: entry.appClientId }}
                            className="inline-flex items-center gap-1 text-xs text-foreground underline-offset-4 hover:underline"
                            title={entry.appClientId}
                          >
                            {clientName ?? shortIdentifier(entry.appClientId)}
                            <ArrowUpRight className="size-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unidentified client</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{entry.capability || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={activityStatusVariant(entry.status)}>{entry.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden font-mono text-[10px] text-muted-foreground lg:table-cell" title={entry.requestId}>
                        {entry.requestId ? shortIdentifier(entry.requestId) : "—"}
                      </TableCell>
                      <TableCell className="hidden pr-5 text-right tabular-nums sm:table-cell">
                        {entry.latencyMs === null ? "—" : formatNumber(entry.latencyMs) + " ms"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {query.data.nextCursor ? (
              <div className="flex justify-center border-t border-border p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCursor(query.data?.nextCursor ?? undefined)}
                >
                  <ArrowDown />
                  Load older
                </Button>
              </div>
            ) : null}
            <p className="border-t border-border px-5 py-3 text-[11px] leading-5 text-muted-foreground">
              Activity is read from daily gateway files. Model and credit cost are not captured yet.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}