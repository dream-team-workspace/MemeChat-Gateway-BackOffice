import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search } from "lucide-react";

import type { Model } from "@shared/admin-api";

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
import { ModelFormDialog } from "@/features/models/components/model-form-dialog";
import { modelsQueryOptions } from "@/features/models/queries/models.queries";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ModelsPage() {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const models = useQuery(modelsQueryOptions);
  const capabilities = useQuery(capabilitiesQueryOptions);
  const providers = useQuery(providersQueryOptions);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const items = models.data?.items ?? [];
    if (!term) return items;
    return items.filter(
      (model) =>
        model.id.toLowerCase().includes(term) ||
        model.displayName.toLowerCase().includes(term) ||
        model.tier.toLowerCase().includes(term) ||
        (model.capabilityId ?? "").toLowerCase().includes(term),
    );
  }, [models.data, query]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(model: Model) {
    setEditing(model);
    setDialogOpen(true);
  }

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Catalog"
        title="Models"
        description="The app-facing model picker. Disable a row instead of deleting it."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void models.refetch()} disabled={models.isFetching}>
              <RefreshCw className={cn(models.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus />
              Add model
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="model-search" name="model-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models" aria-label="Search models" className="pl-9" />
        </div>
        <Badge variant="outline">{models.data?.items.length ?? 0} models · BFF API</Badge>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Model catalog</CardTitle>
          <CardDescription>Changes are applied through the gateway admin API.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {models.isLoading ? (
            <div className="p-5"><LoadingRows rows={4} /></div>
          ) : models.isError ? (
            <ErrorState message={getErrorMessage(models.error)} onRetry={() => void models.refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={models.data?.items.length ? "No models match that search" : "No models in the catalog"}
              description={models.data?.items.length ? "Try a model ID, name, tier, or capability." : "Add the first app-facing model."}
              action={<Button type="button" size="sm" onClick={openCreate}>Add model</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Model</TableHead>
                  <TableHead className="hidden md:table-cell">Tier</TableHead>
                  <TableHead className="hidden lg:table-cell">Capability</TableHead>
                  <TableHead className="hidden md:table-cell">Sort</TableHead>
                  <TableHead className="hidden xl:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-12 pr-5"><span className="sr-only">Edit</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="pl-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[11px] text-muted-foreground">{model.id}</span>
                        <span className="font-medium">{model.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline">{model.tier}</Badge></TableCell>
                    <TableCell className="hidden font-mono text-[11px] text-muted-foreground lg:table-cell">{model.capabilityId ?? "None"}</TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">{model.sortOrder}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{formatDateTime(model.updatedAt)}</TableCell>
                    <TableCell className="text-right"><Badge variant={model.enabled ? "success" : "outline"}>{model.enabled ? "Enabled" : "Disabled"}</Badge></TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(model)} aria-label={"Edit " + model.id}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialogOpen ? (
        <ModelFormDialog
          key={editing?.id ?? "new-model"}
          open
          onOpenChange={setDialogOpen}
          model={editing}
          capabilities={capabilities.data?.items ?? []}
          providers={providers.data?.items ?? []}
        />
      ) : null}
    </div>
  );
}
