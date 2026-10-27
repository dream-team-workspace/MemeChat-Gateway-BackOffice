import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { EmptyState, ErrorState, LoadingRows, PendingGatewayState } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  appClientActivityQueryOptions,
  appClientAuditQueryOptions,
} from "@/features/app-clients/queries/app-clients.queries";
import { getErrorMessage, isGatewayFeatureMissing } from "@/platform/api";
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

/** Successful requests made by signed-in users through this client identity. */
export function AppClientUserActivity({ clientId }: { clientId: string }) {
  const [cursor, setCursor] = useState<string | undefined>();
  const query = useQuery(appClientActivityQueryOptions(clientId, cursor));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>User activity</CardTitle>
          <CardDescription>
            Metadata-only requests authenticated with this client key. Provider content is never stored.
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
          <div className="p-5"><LoadingRows rows={5} /></div>
        ) : query.isError && !isGatewayFeatureMissing(query.error) ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.isError ? (
          <PendingGatewayState
            title="User activity is not available from the gateway yet"
            description="The console is ready for it. Requests will appear here once the gateway records the app client on each authenticated usage event and exposes GET /internal/admin/app-clients/{id}/activity."
          />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            title="No user activity recorded"
            description="Requests authenticated with this client key will appear here once the gateway logs client activity."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead className="hidden md:table-cell">Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Credits</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={String(entry.id)}>
                    <TableCell className="whitespace-nowrap pl-5 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/users/$uid/ledger"
                        params={{ uid: entry.uid }}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-4 hover:underline"
                        title={entry.uid}
                      >
                        {entry.uid.length > 18 ? entry.uid.slice(0, 18) + "…" : entry.uid}
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{entry.capability}</TableCell>
                    <TableCell className="hidden font-mono text-[11px] text-muted-foreground md:table-cell">
                      {entry.model ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "ok" ? "success" : "warning"}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {formatNumber(entry.credits)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
