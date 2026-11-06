import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus, RefreshCw, Search } from "lucide-react";

import type { ProviderStatus } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProviderCard } from "@/features/providers/components/provider-card";
import { ProviderFormDialog } from "@/features/providers/components/provider-form-dialog";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { featureFlags } from "@/lib/feature-flags";
import { getErrorMessage } from "@/platform/api";
import { cn } from "@/lib/utils";

type KindFilter = "all" | "llm" | "speech" | "embeddings" | "vector";

const filters: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "llm", label: "Language" },
  { value: "speech", label: "Speech" },
  { value: "embeddings", label: "Embeddings" },
  { value: "vector", label: "Vector" },
];

function matchesFilter(provider: ProviderStatus, filter: KindFilter) {
  if (filter === "all") return true;
  if (filter === "speech") {
    return provider.kind === "tts" || provider.kind === "stt";
  }
  return provider.kind === filter;
}

export function ProvidersPage() {
  const providers = useQuery(providersQueryOptions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<KindFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (providers.data?.items ?? []).filter((provider) => {
      if (!matchesFilter(provider, filter)) return false;
      if (!term) return true;
      return (
        provider.id.toLowerCase().includes(term) ||
        provider.displayName.toLowerCase().includes(term) ||
        provider.endpoint.toLowerCase().includes(term)
      );
    });
  }, [filter, providers.data, query]);

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Registry"
        title="Providers"
        description="External services, credentials, and the models each one advertises."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void providers.refetch()}
              disabled={providers.isFetching}
            >
              <RefreshCw className={cn(providers.isFetching && "animate-spin")} />
              Refresh
            </Button>
            {featureFlags.providerKeyManagement ? (
              <Button type="button" onClick={() => setAddOpen(true)}>
                <Plus />
                Add provider
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="provider-search"
            name="provider-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search providers"
            aria-label="Search providers"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted p-0.5">
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

      {providers.isLoading ? (
        <div className="mt-6"><LoadingRows rows={5} /></div>
      ) : providers.isError ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <ErrorState message={getErrorMessage(providers.error)} onRetry={() => void providers.refetch()} />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <EmptyState
              title={providers.data?.items.length ? "No providers match this view" : "No providers registered"}
              description={
                providers.data?.items.length
                  ? "Try another kind filter or search term."
                  : "Register a provider, then add the models it can serve."
              }
              action={
                featureFlags.providerKeyManagement ? (
                  <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus />
                    Add provider
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}

      {addOpen ? (
        <ProviderFormDialog
          key="create-provider"
          open
          onOpenChange={setAddOpen}
          onSaved={(provider) =>
            void navigate({ to: "/providers/$providerId", params: { providerId: provider.id } })
          }
        />
      ) : null}
    </div>
  );
}
