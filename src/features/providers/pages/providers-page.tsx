import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  Cpu,
  Database,
  Mic,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Volume2,
} from "lucide-react";

import { abilityFromLegacyKind, type ProviderStatus } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProviderFormDialog } from "@/features/providers/components/provider-form-dialog";
import { providerDisplayState, providerCanCheck, providerKindLabel } from "@/features/providers/lib/provider-status";
import { useCheckProvider } from "@/features/providers/mutations/providers.mutations";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { featureFlags } from "@/lib/feature-flags";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type KindFilter = "all" | "llm" | "speech" | "embeddings" | "vector";

const filters: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "llm", label: "Language" },
  { value: "speech", label: "Speech" },
  { value: "embeddings", label: "Embeddings" },
  { value: "vector", label: "Vector" },
];

const providerIcons = {
  opencode: Cpu,
  elevenlabs: Volume2,
  salad: Mic,
  kokoro: Volume2,
  voyage: Database,
  deeplake: Boxes,
} as const;

function matchesFilter(provider: ProviderStatus, filter: KindFilter) {
  if (filter === "all") return true;
  if (filter === "speech") {
    return provider.kind === "tts" || provider.kind === "stt";
  }
  return provider.kind === filter;
}

function ProviderCard({ provider }: { provider: ProviderStatus }) {
  const navigate = useNavigate();
  const check = useCheckProvider();
  const state = providerDisplayState(provider);
  const Icon = providerIcons[provider.id as keyof typeof providerIcons] ?? Plug;
  const abilities = Array.from(
    new Set((provider.models ?? []).map((model) => abilityFromLegacyKind(model.capability))),
  );
  const last = provider.lastCheck ?? null;
  const checkedAt = last?.checkedAt ?? provider.checkedAt;
  const latency = last?.latencyMs ?? provider.latencyMs;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{provider.displayName}</CardTitle>
            <CardDescription>{providerKindLabel(provider.kind ?? undefined)}</CardDescription>
          </div>
        </div>
        <Badge variant={state.variant} className="shrink-0">{state.label}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={provider.endpoint}>
          {provider.endpoint || "No base URL"}
        </p>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Credential</dt>
            <dd className={cn("mt-1 font-medium", !provider.configured && "text-warning-foreground")}>
              {provider.configured
                ? "Key " + (provider.apiKeyHint ?? "configured")
                : "Key missing"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Models</dt>
            <dd className="mt-1 font-medium">{provider.models?.length ?? 0} catalogued</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Last check</dt>
            <dd className="mt-1">
              {checkedAt ? formatDateTime(checkedAt) : "Never checked"}
              {latency !== null && latency !== undefined ? " · " + formatNumber(latency) + " ms" : ""}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-1.5">
          {abilities.length > 0 ? (
            abilities.map((ability) => (
              <Badge key={ability} variant="outline">{providerKindLabel(ability)}</Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No models yet</span>
          )}
        </div>

        <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
          {provider.detail}
        </p>

        {check.isError ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {getErrorMessage(check.error)}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void navigate({ to: "/providers/$providerId", params: { providerId: provider.id } })}
          >
            Manage
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => check.mutate(provider.id)}
            disabled={!providerCanCheck(provider) || check.isPending}
            title={providerCanCheck(provider) ? "Run a safe health probe" : "Add a key and model before checking"}
          >
            <RefreshCw className={cn(check.isPending && "animate-spin")} />
            {check.isPending ? "Checking…" : "Check health"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
