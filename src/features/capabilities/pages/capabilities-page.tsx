import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

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
import { cn } from "@/lib/utils";

type Status = "Enabled" | "Disabled";

type CapabilityRow = {
  id: string;
  name: string;
  kind: string;
  cost: string;
  routes: number;
  status: Status;
};

const capabilities: CapabilityRow[] = [
  {
    id: "chat.standard",
    name: "Standard chat",
    kind: "Chat",
    cost: "1 CRD / turn",
    routes: 2,
    status: "Enabled",
  },
  {
    id: "chat.premium",
    name: "Premium chat",
    kind: "Chat",
    cost: "5 CRD / turn",
    routes: 3,
    status: "Enabled",
  },
  {
    id: "tts",
    name: "Text to speech",
    kind: "Voice",
    cost: "1 CRD / 500 chars",
    routes: 1,
    status: "Disabled",
  },
  {
    id: "embeddings.balanced",
    name: "Balanced embeddings",
    kind: "Embeddings",
    cost: "1 CRD / 100K tokens",
    routes: 2,
    status: "Enabled",
  },
];

type Filter = "all" | "enabled" | "disabled";

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

export function CapabilitiesPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [lastUpdated, setLastUpdated] = useState("just now");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return capabilities.filter((capability) => {
      const matchesQuery =
        !term ||
        capability.id.toLowerCase().includes(term) ||
        capability.name.toLowerCase().includes(term) ||
        capability.kind.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" || capability.status.toLowerCase() === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query]);

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
        eyebrow="Registry"
        title="Capabilities"
        description="Costs, limits, provider routing, and kill switches for every gateway capability."
        actions={
          <Button type="button" variant="outline" onClick={refresh}>
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
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
              All capabilities, including disabled entries · updated {lastUpdated}
            </CardDescription>
          </div>
          <Badge variant="outline">{capabilities.length} total</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Capability</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Routes</TableHead>
                <TableHead className="pr-5 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((capability) => (
                <TableRow key={capability.id}>
                  <TableCell className="pl-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {capability.id}
                      </span>
                      <span className="font-medium">{capability.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {capability.kind}
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">
                    {capability.cost}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {capability.routes}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Badge
                      variant={capability.status === "Enabled" ? "success" : "outline"}
                    >
                      {capability.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold">No capabilities match these filters.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search or clear the status filter.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </CardContent>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-[11px] text-muted-foreground">
            Showing {filtered.length} of {capabilities.length} capabilities
          </p>
          <Badge variant="outline">Demo data</Badge>
        </div>
      </Card>
    </div>
  );
}
