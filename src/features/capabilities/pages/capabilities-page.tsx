import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, RefreshCw, Search } from "lucide-react";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { capabilitiesQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { getErrorMessage } from "@/platform/api";
import { formatCost, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "enabled" | "disabled";

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

export function CapabilitiesPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    capabilitiesQueryOptions,
  );

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const term = query.trim().toLowerCase();
    return items.filter((capability) => {
      const matchesQuery =
        !term ||
        capability.id.toLowerCase().includes(term) ||
        capability.displayName.toLowerCase().includes(term) ||
        capability.kind.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "enabled" ? capability.enabled : !capability.enabled);
      return matchesQuery && matchesFilter;
    });
  }, [data, filter, query]);

  const total = data?.items.length ?? 0;
  const enabled = data?.items.filter((capability) => capability.enabled).length ?? 0;

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Registry"
        title="Capabilities"
        description="Costs, limits, provider routing, and kill switches for every gateway capability."
        actions={
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="capability-search"
            name="capability-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search capabilities"
            aria-label="Search capabilities"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5">
          {filters.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "h-7 rounded px-2.5 text-xs",
                filter === option.value
                  ? "bg-background text-foreground hover:bg-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Capability registry</CardTitle>
            <CardDescription>
              {total} total · {enabled} enabled · {total - enabled} disabled
            </CardDescription>
          </div>
          <Badge variant="outline">BFF API</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5">
              <LoadingRows rows={5} />
            </div>
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={total === 0 ? "No capabilities found" : "No capabilities match these filters"}
              description={
                total === 0
                  ? "The registry returned an empty list."
                  : "Try a different search or status filter."
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Capability</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Cost</TableHead>
                  <TableHead className="hidden lg:table-cell">Providers</TableHead>
                  <TableHead className="hidden xl:table-cell">Updated</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                  <TableHead className="w-10 pr-5"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((capability) => (
                  <TableRow key={capability.id}>
                    <TableCell className="pl-5">
                      <Link
                        to="/capabilities/$capabilityId"
                        params={{ capabilityId: capability.id }}
                        className="group flex flex-col gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {capability.id}
                        </span>
                        <span className="font-medium group-hover:text-accent-foreground">
                          {capability.displayName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {capability.kind}
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">
                      {formatCost(capability)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {capability.providers.length}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      {formatDateTime(capability.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={capability.enabled ? "success" : "outline"}>
                        {capability.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Link
                        to="/capabilities/$capabilityId"
                        params={{ capabilityId: capability.id }}
                        aria-label={"Open " + capability.id}
                        className="inline-flex rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
