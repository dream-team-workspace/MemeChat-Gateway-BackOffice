import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, RefreshCw } from "lucide-react";

import { abilityFromLegacyKind } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
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
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { getErrorMessage } from "@/platform/api";
import { cn } from "@/lib/utils";

export function AbilitiesPage() {
  const abilities = useQuery(abilitiesQueryOptions);
  const providers = useQuery(providersQueryOptions);
  const capabilities = useQuery(capabilitiesQueryOptions);

  const providerNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of providers.data?.items ?? []) {
      map.set(provider.id, provider.displayName);
    }
    return map;
  }, [providers.data]);

  const profileCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const capability of capabilities.data?.items ?? []) {
      const abilityId = abilityFromLegacyKind(capability.kind);
      map.set(abilityId, (map.get(abilityId) ?? 0) + 1);
    }
    return map;
  }, [capabilities.data]);

  const isLoading = abilities.isLoading || providers.isLoading || capabilities.isLoading;
  const error = abilities.error ?? providers.error ?? capabilities.error;

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Registry"
        title="Abilities"
        description="The five coarse abilities apps can call, and the providers that can serve them."
        actions={
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
        }
      />

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Ability catalog</CardTitle>
          <CardDescription>
            Each app client selects one provider and model per ability. Cost and limits remain on the legacy capability profiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5"><LoadingRows rows={5} /></div>
          ) : error ? (
            <ErrorState
              message={getErrorMessage(error)}
              onRetry={() => {
                void abilities.refetch();
                void providers.refetch();
                void capabilities.refetch();
              }}
            />
          ) : !abilities.data || abilities.data.items.length === 0 ? (
            <EmptyState
              title="No abilities returned"
              description="The gateway ability catalog is empty. Apply migration 0009 and reload."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Ability</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Available providers</TableHead>
                  <TableHead className="hidden md:table-cell">Profiles</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                  <TableHead className="w-10 pr-5"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abilities.data.items.map((ability) => {
                  const providerIds = Array.from(new Set(ability.models.map((model) => model.providerId)));
                  return (
                    <TableRow key={ability.id}>
                      <TableCell className="pl-5">
                        <Link
                          to="/abilities/$abilityId"
                          params={{ abilityId: ability.id }}
                          className="group flex flex-col gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-mono text-[11px] text-muted-foreground">{ability.id}</span>
                          <span className="font-medium group-hover:text-accent-foreground">{ability.displayName}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ability.kind}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {providerIds.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None catalogued</span>
                          ) : (
                            providerIds.map((providerId) => (
                              <Badge key={providerId} variant="outline">
                                {providerNames.get(providerId) ?? providerId}
                                <span className="text-muted-foreground">
                                  {ability.models.filter((model) => model.providerId === providerId).length}
                                </span>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {profileCounts.get(ability.id) ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={ability.enabled ? "success" : "outline"}>
                          {ability.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Link
                          to="/abilities/$abilityId"
                          params={{ abilityId: ability.id }}
                          aria-label={"Open " + ability.id}
                          className="inline-flex rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
