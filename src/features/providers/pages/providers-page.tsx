import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Cpu,
  Database,
  Mic,
  Plug,
  RefreshCw,
  Volume2,
} from "lucide-react";

import type { ProviderStatus } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capabilitiesQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { useCheckProvider } from "@/features/providers/mutations/providers.mutations";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const providerIcons = {
  opencode: Cpu,
  salad: Mic,
  kokoro: Volume2,
  voyage: Database,
  revenuecat: CreditCard,
} as const;

function statusVariant(status: ProviderStatus["status"]): BadgeProps["variant"] {
  switch (status) {
    case "healthy":
      return "success";
    case "reachable":
      return "info";
    case "degraded":
    case "misconfigured":
      return "warning";
    case "unreachable":
      return "destructive";
    default:
      return "outline";
  }
}

function statusLabel(status: ProviderStatus["status"]) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "reachable":
      return "Reachable";
    case "degraded":
      return "Degraded";
    case "misconfigured":
      return "Misconfigured";
    case "unreachable":
      return "Unreachable";
    case "configured":
      return "Configured";
    default:
      return "Not configured";
  }
}

function ProviderCard({
  provider,
  capabilities,
}: {
  provider: ProviderStatus;
  capabilities: string[];
}) {
  const check = useCheckProvider();
  const last = provider.lastCheck ?? null;
  // Current configuration wins: never show a historical "healthy" for a provider
  // that is now unconfigured or has an invalid model.
  const configIssue = !provider.configured || !provider.modelValid;
  const effectiveStatus = configIssue ? provider.status : (last?.status ?? provider.status);
  const checkedAt = last?.checkedAt ?? provider.checkedAt;
  const latencyMs = last ? last.latencyMs : provider.latencyMs;
  const Icon = providerIcons[provider.id as keyof typeof providerIcons] ?? Plug;
  const usedBy = provider.id === "revenuecat" ? ["credit grants"] : capabilities;
  const limitSummary = provider.limits
    ? Object.entries(provider.limits)
        .map(([key, value]) => key + ": " + String(value))
        .join(" · ")
    : "";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{provider.displayName}</CardTitle>
            <CardDescription>{provider.role}</CardDescription>
          </div>
        </div>
        <Badge variant={statusVariant(effectiveStatus)} className="shrink-0">
          {statusLabel(effectiveStatus)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Endpoint</dt>
            <dd className="mt-1 break-all font-mono text-[11px]">{provider.endpoint || "Not configured"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Model / target</dt>
            <dd className={cn("mt-1 break-all font-mono text-[11px]", !provider.modelValid && "text-warning-foreground")}>
              {provider.model || "No model"} {provider.modelValid ? null : "(fallback, invalid config)"}
            </dd>
          </div>
          {provider.apiVersion ? (
            <div>
              <dt className="text-muted-foreground">API version</dt>
              <dd className="mt-1 font-mono text-[11px]">{provider.apiVersion}</dd>
            </div>
          ) : null}
          {limitSummary ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Provider limits</dt>
              <dd className="mt-1 break-all font-mono text-[11px]">{limitSummary}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Credential</dt>
            <dd className={cn("mt-1 font-medium", !provider.configured && "text-warning-foreground")}>
              {provider.credential}
            </dd>
          </div>
          <div className={cn(last?.detail && "sm:col-span-2")}>
            <dt className="text-muted-foreground">Last check</dt>
            <dd className="mt-1 font-medium">
              {checkedAt ? formatDateTime(checkedAt) : "Never checked"}
              {latencyMs !== null && latencyMs !== undefined
                ? " · " + formatNumber(latencyMs) + " ms"
                : ""}
              {last?.checkedBy ? " · " + last.checkedBy : ""}
            </dd>
            {last?.detail ? (
              <dd className="mt-1 text-[11px] leading-4 text-muted-foreground">{last.detail}</dd>
            ) : provider.checkedAt ? (
              <dd className="mt-1 text-[11px] leading-4 text-muted-foreground">
                This session only — the gateway has not persisted probe results yet.
              </dd>
            ) : null}
          </div>
        </dl>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Used by
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {usedBy.length > 0 ? (
              usedBy.map((capability) => (
                <Badge key={capability} variant="outline">{capability}</Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Not currently routed</span>
            )}
          </div>
        </div>

        {provider.models && provider.models.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Available models
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.models.map((model) => (
                <Badge
                  key={model.id}
                  variant="outline"
                  title={model.capability}
                  className="font-mono text-[10px]"
                >
                  {model.id}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <p className="min-h-10 text-xs leading-5 text-muted-foreground">{provider.detail}</p>

        {check.isError ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {getErrorMessage(check.error)}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => check.mutate(provider.id)}
          disabled={!provider.configured || !provider.modelValid || check.isPending}
          title={
            !provider.configured
              ? "Configure this provider on the gateway first"
              : !provider.modelValid
                ? "Fix the configured model before probing this provider"
                : "Run a safe health probe"
          }
        >
          <RefreshCw className={cn(check.isPending && "animate-spin")} />
          {check.isPending ? "Checking…" : "Check health"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProvidersPage() {
  const providers = useQuery(providersQueryOptions);
  const capabilities = useQuery(capabilitiesQueryOptions);

  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const capability of capabilities.data?.items ?? []) {
      for (const route of capability.providers) {
        const existing = map.get(route.provider) ?? [];
        if (!existing.includes(capability.id)) existing.push(capability.id);
        map.set(route.provider, existing);
      }
    }
    return map;
  }, [capabilities.data]);

  const isLoading = providers.isLoading || capabilities.isLoading;
  const error = providers.error ?? capabilities.error;

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Services"
        title="Providers"
        description="External services the gateway uses, their connection settings, and safe health probes."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void providers.refetch();
              void capabilities.refetch();
            }}
            disabled={providers.isFetching || capabilities.isFetching}
          >
            <RefreshCw className={cn((providers.isFetching || capabilities.isFetching) && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <Card className="mt-6 border-info/20 bg-info/5">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info/10 text-info">
            <Plug className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">How health checks work</p>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Checks never invoke chat, audio, embedding, or credit operations. OpenCode uses an authenticated{" "}
              <span className="font-mono">/models</span> request; other providers use a host-reachability probe, which may
              wake a scaled-to-zero deployment. Credentials are not verified by the reachability probe. Providers with
              an invalid configured model are marked misconfigured and are not probed. The gateway stores the latest
              probe result, so the last checked state and health status survive restarts. Endpoint and credential
              presence come from the gateway process configuration; secrets are never sent to the browser.
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="mt-6"><LoadingRows rows={5} /></div>
      ) : error ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <ErrorState
              message={getErrorMessage(error)}
              onRetry={() => {
                void providers.refetch();
                void capabilities.refetch();
              }}
            />
          </CardContent>
        </Card>
      ) : !providers.data || providers.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <EmptyState
              title="No providers reported"
              description="The gateway returned an empty provider registry."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
          {providers.data.items.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              capabilities={usage.get(provider.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
