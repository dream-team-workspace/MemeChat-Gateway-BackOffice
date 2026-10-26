import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capabilityAuditQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatJson } from "@/lib/format";

export function CapabilityAuditPage() {
  const { capabilityId } = useParams({ from: "/app/capabilities/$capabilityId" });
  const [cursor, setCursor] = useState<string | undefined>();
  const { data, isLoading, isError, error, refetch } = useQuery(
    capabilityAuditQueryOptions(capabilityId, cursor),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Audit history</CardTitle>
          <CardDescription>Newest first. This view is read-only.</CardDescription>
        </div>
        {cursor ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCursor(undefined)}>
            Back to newest
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-5"><LoadingRows rows={4} /></div>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No changes recorded yet" description="The first capability edit will appear here." />
        ) : (
          <>
            <div className="divide-y divide-border">
              {data.items.map((entry) => (
                <details key={String(entry.id)} className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 hover:bg-accent/40">
                    <Badge variant="outline">revision {entry.revision}</Badge>
                    <span className="text-sm font-medium">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">{entry.changedBy ?? "unknown actor"}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                  </summary>
                  <div className="grid gap-3 border-t border-border bg-muted/30 px-5 py-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-5 scrollbar-thin">
                        {entry.beforeState ? formatJson(entry.beforeState) : "not captured"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">After</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-5 scrollbar-thin">
                        {entry.afterState ? formatJson(entry.afterState) : "not captured"}
                      </pre>
                    </div>
                  </div>
                </details>
              ))}
            </div>
            {data.nextCursor ? (
              <div className="flex justify-center border-t border-border p-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setCursor(data.nextCursor ?? undefined)}>
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
