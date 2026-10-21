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

type ModelRow = {
  id: string;
  name: string;
  tier: string;
  capability: string;
  sort: number;
  enabled: boolean;
};

const models: ModelRow[] = [
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    tier: "Standard",
    capability: "chat.standard",
    sort: 10,
    enabled: true,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    tier: "Standard",
    capability: "chat.standard",
    sort: 20,
    enabled: true,
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    tier: "Premium",
    capability: "chat.premium",
    sort: 10,
    enabled: true,
  },
  {
    id: "deepseek-v4-flash-legacy",
    name: "DeepSeek V4 Flash (legacy)",
    tier: "Standard",
    capability: "chat.standard",
    sort: 30,
    enabled: false,
  },
];

export function ModelsPage() {
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState("just now");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return models;
    return models.filter(
      (model) =>
        model.id.toLowerCase().includes(term) ||
        model.name.toLowerCase().includes(term) ||
        model.tier.toLowerCase().includes(term) ||
        model.capability.toLowerCase().includes(term),
    );
  }, [query]);

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
        eyebrow="Catalog"
        title="Models"
        description="The app-facing model picker. Disable a row instead of deleting it."
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
            placeholder="Search models"
            aria-label="Search models"
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{filtered.length} models · demo data</Badge>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Model catalog</CardTitle>
          <CardDescription>Updated {lastUpdated}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Model</TableHead>
                <TableHead className="hidden md:table-cell">Tier</TableHead>
                <TableHead className="hidden lg:table-cell">Capability</TableHead>
                <TableHead className="hidden md:table-cell">Sort</TableHead>
                <TableHead className="pr-5 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="pl-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {model.id}
                      </span>
                      <span className="font-medium">{model.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{model.tier}</Badge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-[11px] text-muted-foreground lg:table-cell">
                    {model.capability}
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                    {model.sort}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Badge variant={model.enabled ? "success" : "outline"}>
                      {model.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold">No models match that search.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a model ID, name, tier, or capability.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
