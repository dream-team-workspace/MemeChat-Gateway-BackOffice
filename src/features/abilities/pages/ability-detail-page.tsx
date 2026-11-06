import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Boxes, RefreshCw } from "lucide-react";

import {
  abilityFromLegacyKind,
  type Capability,
  type ProviderCatalogModel,
  type ProviderStatus,
} from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { abilitiesQueryOptions } from "@/features/abilities/queries/abilities.queries";
import { capabilitiesQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { providerDisplayState } from "@/features/providers/lib/provider-status";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { getErrorMessage } from "@/platform/api";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";

function chainSummary(capability: Capability) {
  if (capability.providers.length === 0) return "No legacy chain";
  return capability.providers
    .map((route) => route.provider + " / " + route.model)
    .join(" · ");
}

export function AbilityDetailPage() {
  const { abilityId } = useParams({ from: "/app/abilities/$abilityId" });
  const abilities = useQuery(abilitiesQueryOptions);
  const providers = useQuery(providersQueryOptions);
  const capabilities = useQuery(capabilitiesQueryOptions);

  const ability = abilities.data?.items.find((item) => item.id === abilityId);
  const profiles = useMemo(
    () =>
      (capabilities.data?.items ?? []).filter(
        (capability) => abilityFromLegacyKind(capability.kind) === abilityId,
      ),
    [abilityId, capabilities.data],
  );
  const providerById = useMemo(() => {
    const map = new Map<string, ProviderStatus>();
    for (const provider of providers.data?.items ?? []) map.set(provider.id, provider);
    return map;
  }, [providers.data]);

  const isLoading = abilities.isLoading || providers.isLoading || capabilities.isLoading;
  const error = abilities.error ?? providers.error ?? capabilities.error;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5"><LoadingRows rows={5} /></CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState
            message={getErrorMessage(error)}
            onRetry={() => {
              void abilities.refetch();
              void providers.refetch();
              void capabilities.refetch();
            }}
          />
        </CardContent>
      </Card>
    );
  }
  if (!ability) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="Ability not found"
            description={"The gateway catalog does not contain " + abilityId + "."}
            action={<Link to="/abilities" className="text-xs font-medium underline">Back to abilities</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  const grouped = new Map<string, ProviderCatalogModel[]>();
  for (const model of ability.models) {
    const list = grouped.get(model.providerId) ?? [];
    list.push(model);
    grouped.set(model.providerId, list);
  }
  const providerIds = Array.from(grouped.keys());

  return (
    <div className="animate-in">
      <Link
        to="/abilities"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All abilities
      </Link>

      <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md border border-border bg-accent text-accent-foreground">
              <Boxes className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">{ability.displayName}</h1>
            <Badge variant="outline">{ability.kind}</Badge>
            <Badge variant={ability.enabled ? "success" : "outline"}>
              {ability.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{ability.id}</p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            {providerIds.length} {providerIds.length === 1 ? "provider" : "providers"} · {ability.models.length} catalogue models · {profiles.length} legacy cost profiles.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void abilities.refetch();
            void providers.refetch();
            void capabilities.refetch();
          }}
          disabled={abilities.isFetching || providers.isFetching || capabilities.isFetching}
        >
          <RefreshCw className={cn((abilities.isFetching || providers.isFetching) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card className="mt-5 overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Available providers and models</CardTitle>
            <CardDescription>
              Only enabled models appear in new app-client routes. Disabled entries stay visible here for migration.
            </CardDescription>
          </div>
          <Link to="/providers" className="text-xs font-medium underline underline-offset-4">All providers</Link>
        </CardHeader>
        <CardContent className="p-0">
          {providerIds.length === 0 ? (
            <EmptyState
              title="No models serve this ability"
              description="Add a provider model first; app clients cannot route this ability until one exists."
              action={<Link to="/providers" className="text-xs font-medium underline">Open providers</Link>}
            />
          ) : (
            <div className="divide-y divide-border">
              {providerIds.map((providerId) => {
                const provider = providerById.get(providerId);
                const models = grouped.get(providerId) ?? [];
                const status = provider ? providerDisplayState(provider) : null;
                return (
                  <div key={providerId} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/providers/$providerId"
                        params={{ providerId }}
                        className="text-sm font-semibold hover:underline"
                      >
                        {provider?.displayName ?? providerId}
                      </Link>
                      <span className="font-mono text-[10px] text-muted-foreground">{providerId}</span>
                      {status ? <Badge variant={status.variant}>{status.label}</Badge> : (
                        <Badge variant="outline">Not in registry</Badge>
                      )}
                      <Link
                        to="/providers/$providerId"
                        params={{ providerId }}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Manage provider <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-md border border-border">
                      {models.map((model) => (
                        <div
                          key={model.modelId}
                          className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs last:border-b-0"
                        >
                          <span className="font-mono text-[11px]">{model.modelId}</span>
                          <span className="text-muted-foreground">{model.displayName}</span>
                          <Badge variant={model.enabled ? "success" : "outline"} className="ml-auto">
                            {model.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {model.costCredits} {model.costUnit} / {model.costPer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Cost and limits profiles</CardTitle>
          <CardDescription>
            Billing stays on the legacy capability profile. The selected route model does not change the profile cost unit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {profiles.length === 0 ? (
            <EmptyState
              title="No legacy profiles"
              description="This ability has no capability rows yet; cost and limits are not configured."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Capability</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="hidden md:table-cell">Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="pl-5">
                      <p className="font-mono text-[11px]">{profile.id}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{profile.displayName}</p>
                    </TableCell>
                    <TableCell className="text-xs">{formatCost(profile)}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {Object.keys(profile.limits).length} configured
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.enabled ? "success" : "outline"}>
                        {profile.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Link
                        to="/capabilities/$capabilityId"
                        params={{ capabilityId: profile.id }}
                        className="text-[11px] font-medium underline underline-offset-4"
                      >
                        Open cost profile
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Legacy provider chain</CardTitle>
          <CardDescription>
            Read-only. Runtime resolution uses the app client ability routes, not this ordered chain.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {profiles.length === 0 ? (
            <EmptyState title="No legacy chain" description="No capability profile is mapped to this ability." />
          ) : (
            <div className="divide-y divide-border">
              {profiles.map((profile) => (
                <div key={profile.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px]">{profile.id}</span>
                    <Badge variant="outline">legacy</Badge>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{chainSummary(profile)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
