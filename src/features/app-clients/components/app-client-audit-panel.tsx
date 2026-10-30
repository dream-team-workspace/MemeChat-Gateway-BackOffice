import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { ActivityDateFilter } from "@/components/common/activity-date-filter";
import { EmptyState, ErrorState, LoadingRows, PendingGatewayState } from "@/components/common/async-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  appClientActivityQueryOptions,
  appClientAuditQueryOptions,
} from "@/features/app-clients/queries/app-clients.queries";
import { getErrorMessage, isGatewayFeatureMissing } from "@/platform/api";
import { dateInputToApiDate, todayDateInput } from "@/lib/activity-date";
import { formatDateTime, formatJson, formatNumber } from "@/lib/format";

function firebaseUidPolicyChange(entry: {
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}) {
  const before = entry.beforeState?.requireFirebaseUid;
  const after = entry.afterState?.requireFirebaseUid;
  if (typeof before !== "boolean" || typeof after !== "boolean" || before === after) {
    return null;
  }
  return { before, after };
}

function policyLabel(value: boolean) {
  return value ? "Required" : "Not required";
}

/** Operator actions recorded by the gateway against one app client. */
export function AppClientAdminAudit({ clientId }: { clientId: string }) {
  const [cursor, setCursor] = useState<string | undefined>();
  const query = useQuery(appClientAuditQueryOptions(clientId, cursor));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Admin activity</CardTitle>
          <CardDescription>
            Immutable record of what operators changed on this client. Newest first.
          </CardDescription>
        </div>
        {cursor ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCursor(undefined)}>
            Back to newest
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading ? (
          <div className="p-5"><LoadingRows rows={4} /></div>
        ) : query.isError && !isGatewayFeatureMissing(query.error) ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.isError ? (
          <PendingGatewayState
            title="Admin audit is not available from the gateway yet"
            description="The console is ready for it. Events will appear here once the gateway exposes GET /internal/admin/app-clients/{id}/audit and records client mutations."
          />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            title="No admin activity recorded"
            description="Creating, editing, or rotating this client will appear here once the gateway audit is live."
          />
        ) : (
          <>
            <div className="divide-y divide-border">
              {query.data.items.map((entry) => (
                <details key={String(entry.id)} className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 hover:bg-accent/40">
                    <Badge variant="outline">{entry.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.changedBy ?? "unknown actor"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </summary>
                  <div className="grid gap-3 border-t border-border bg-muted/30 px-5 py-4 lg:grid-cols-2">
                    {firebaseUidPolicyChange(entry) ? (
                      <div className="rounded-md border border-info/20 bg-info/5 px-3 py-2 text-xs lg:col-span-2">
                        <span className="font-semibold">Firebase UID policy: </span>
                        {policyLabel(firebaseUidPolicyChange(entry)!.before)}
                        {" → "}
                        {policyLabel(firebaseUidPolicyChange(entry)!.after)}
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Before
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-5 scrollbar-thin">
                        {entry.beforeState ? formatJson(entry.beforeState) : "not captured"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        After
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-5 scrollbar-thin">
                        {entry.afterState ? formatJson(entry.afterState) : "not captured"}
                      </pre>
                    </div>
                  </div>
                </details>
              ))}
            </div>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Dated, metadata-only requests made through this client identity. */
function activityStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "ok") return "success";
  if (status === "error") return "destructive";
  return "outline";
}

function shortIdentifier(value: string, max = 18) {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

export function AppClientUserActivity({ clientId }: { clientId: string }) {
  const [cursor, setCursor] = useState<string | undefined>();
  const [date, setDate] = useState(todayDateInput);
  const apiDate = dateInputToApiDate(date);
  const query = useQuery(appClientActivityQueryOptions(clientId, cursor, apiDate));

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
            Metadata-only requests authenticated with this client key, newest first. Provider content is never stored.
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
            description="The console is ready for it. Requests will appear here once the gateway exposes the file-backed activity endpoint."
          />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            title="No activity on this date"
            description="Requests authenticated with this client key are written to daily files. Try another date or make a request through the client."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Request</TableHead>
                  <TableHead className="hidden pr-5 text-right sm:table-cell">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={String(entry.id)}>
                    <TableCell className="whitespace-nowrap pl-5 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      {entry.uid ? (
                        <Link
                          to="/users/$uid/ledger"
                          params={{ uid: entry.uid }}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-4 hover:underline"
                          title={entry.uid}
                        >
                          {shortIdentifier(entry.uid)}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Anonymous</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{entry.capability || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={activityStatusVariant(entry.status)}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-[10px] text-muted-foreground lg:table-cell" title={entry.requestId}>
                      {entry.requestId ? shortIdentifier(entry.requestId, 22) : "—"}
                    </TableCell>
                    <TableCell className="hidden pr-5 text-right tabular-nums sm:table-cell">
                      {entry.latencyMs === null ? "—" : formatNumber(entry.latencyMs) + " ms"}
                    </TableCell>
                  </TableRow>
                ))}
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
              File-backed activity records request metadata only. Model and credit cost are not captured yet.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
