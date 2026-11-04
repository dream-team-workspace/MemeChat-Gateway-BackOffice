import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, TriangleAlert } from "lucide-react";

import {
  abilityLabels,
  abilityOrder,
  type AbilityId,
  type AppClient,
  type ProviderCatalogModel,
  type ProviderStatus,
} from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteRow } from "@/features/app-clients/components/route-row";
import {
  firstIncomplete,
  routeInputs,
  routesEqual,
  toRouteDraft,
  type RouteDraft,
} from "@/features/app-clients/hooks/use-route-draft";
import { appClientKeys, appClientsApi } from "@/features/app-clients/api/app-clients.api";
import { useSaveAppClientRoutes } from "@/features/app-clients/mutations/app-clients.mutations";
import { abilitiesQueryOptions } from "@/features/abilities/queries/abilities.queries";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { featureFlags } from "@/lib/feature-flags";
import { ApiError, getErrorMessage } from "@/platform/api";

function LegacyCapabilityMatrix({
  client,
  reason,
}: {
  client: AppClient;
  reason: string;
}) {
  return (
    <>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p>{reason}</p>
      </div>
      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Legacy capability matrix</CardTitle>
          <CardDescription>Read-only. This gateway response has no ability routes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {client.capabilities.length === 0 ? (
            <EmptyState title="No capability grants" description="This client has no legacy capability rows either." />
          ) : (
            <div className="divide-y divide-border">
              {client.capabilities.map((capability) => (
                <div key={capability.capabilityId} className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs">
                  <span className="font-mono text-[11px]">{capability.capabilityId}</span>
                  <span className="text-muted-foreground">{capability.capabilityName}</span>
                  <span className="ml-auto font-mono text-[11px]">{capability.modelId ?? "No model"}</span>
                  <Badge variant={capability.enabled ? "success" : "outline"}>
                    {capability.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function RouteEditor({ client }: { client: AppClient }) {
  const abilities = useQuery(abilitiesQueryOptions);
  const providers = useQuery(providersQueryOptions);
  const save = useSaveAppClientRoutes(client.id);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RouteDraft[]>(() => toRouteDraft(client.routes));
  const [baseline, setBaseline] = useState(client.updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const reload = useMutation({
    mutationFn: () => appClientsApi.get(client.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(appClientKeys.detail(client.id), updated);
      setDraft(toRouteDraft(updated.routes));
      setBaseline(updated.updatedAt);
      setError(null);
      setRowError(null);
      setConflict(false);
      setNotice("Client reloaded");
    },
    onError: (reloadError) => setError(getErrorMessage(reloadError)),
  });

  const { modelsByAbility, providersByAbility } = useMemo(() => {
    const abilityItems = abilities.data?.items ?? [];
    const providerItems = providers.data?.items ?? [];
    const modelMap = new Map<string, ProviderCatalogModel[]>();
    const providerMap = new Map<string, ProviderStatus[]>();
    for (const abilityId of abilityOrder) {
      const models = abilityItems.find((item) => item.id === abilityId)?.models ?? [];
      modelMap.set(abilityId, models);
      providerMap.set(
        abilityId,
        providerItems.filter(
          (provider) =>
            provider.kind === abilityId ||
            models.some((model) => model.providerId === provider.id),
        ),
      );
    }
    return { modelsByAbility: modelMap, providersByAbility: providerMap };
  }, [abilities.data, providers.data]);

  function modelsFor(ability: AbilityId, providerId: string, currentModelId: string) {
    return (modelsByAbility.get(ability) ?? []).filter(
      (model) =>
        model.providerId === providerId &&
        (model.enabled || model.modelId === currentModelId),
    );
  }

  function updateRow(ability: AbilityId, patch: Partial<RouteDraft>) {
    setDraft((current) =>
      current.map((row) => (row.ability === ability ? { ...row, ...patch } : row)),
    );
    setNotice(null);
    setError(null);
    setRowError(null);
    setConflict(false);
  }

  function changeProvider(ability: AbilityId, providerId: string) {
    if (providerId === "") {
      updateRow(ability, { providerId: "", modelId: "" });
      return;
    }
    const first = modelsFor(ability, providerId, "").find((model) => model.enabled);
    updateRow(ability, { providerId, modelId: first?.modelId ?? "" });
  }

  function removeRow(ability: AbilityId) {
    updateRow(ability, { providerId: "", modelId: "" });
  }

  const serverChanged = client.updatedAt !== baseline;
  const dirty = !routesEqual(draft, toRouteDraft(client.routes));
  const incomplete = firstIncomplete(draft);
  const isLoading = abilities.isLoading || providers.isLoading;
  const loadError = abilities.error ?? providers.error;

  if (!client.routes) {
    return (
      <LegacyCapabilityMatrix
        client={client}
        reason="This gateway does not expose ability routes yet. Showing the legacy capability matrix. Deploy migration 0009 and the routing gateway to enable provider selection."
      />
    );
  }

  if (!featureFlags.abilityRoutes) {
    return (
      <LegacyCapabilityMatrix
        client={client}
        reason="Ability routes are disabled by the VITE_ABILITY_ROUTES rollout flag. The legacy matrix is read-only until the flag is re-enabled."
      />
    );
  }

  function submit() {
    setNotice(null);
    setError(null);
    setRowError(null);
    setConflict(false);
    if (incomplete) {
      setError("Finish or remove the incomplete " + incomplete.ability + " row before saving.");
      setRowError(incomplete.ability);
      return;
    }
    save.mutate(routeInputs(draft), {
      onSuccess: (updated) => {
        setDraft(toRouteDraft(updated.routes));
        setBaseline(updated.updatedAt);
        setNotice("Routes saved");
        setRowError(null);
      },
      onError: (mutationError) => {
        const message = getErrorMessage(mutationError);
        setError(message);
        if (mutationError instanceof ApiError && mutationError.status === 409) {
          setConflict(true);
        }
        if (mutationError instanceof ApiError && mutationError.status === 422) {
          const affected = draft.find((row) => message.includes(row.ability));
          if (affected) setRowError(affected.ability);
        }
      },
    });
  }

  return (
    <>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Configure one provider and model per ability. The app calls the ability only; it never names the provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5"><LoadingRows rows={5} /></div>
          ) : loadError ? (
            <ErrorState
              message={getErrorMessage(loadError)}
              onRetry={() => {
                void abilities.refetch();
                void providers.refetch();
              }}
            />
          ) : (
            <div className="divide-y divide-border">
              {abilityOrder.map((ability) => {
                const row = draft.find((item) => item.ability === ability) ?? {
                  ability,
                  providerId: "",
                  modelId: "",
                };
                const label = abilities.data?.items.find((item) => item.id === ability)?.displayName ?? abilityLabels[ability];
                const compatible = providersByAbility.get(ability) ?? [];
                return (
                  <RouteRow
                    key={ability}
                    ability={ability}
                    label={label}
                    value={row}
                    providers={compatible}
                    models={modelsFor(ability, row.providerId, row.modelId)}
                    disabled={save.isPending || serverChanged}
                    error={rowError === ability ? error ?? undefined : undefined}
                    onProviderChange={(providerId) => changeProvider(ability, providerId)}
                    onModelChange={(modelId) => updateRow(ability, { modelId })}
                    onRemove={() => removeRow(ability)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {serverChanged ? (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>This client changed on the gateway. Reload it before saving to avoid overwriting the newer version.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => reload.mutate()} disabled={reload.isPending}>
            {reload.isPending ? "Reloading…" : "Reload client"}
          </Button>
        </div>
      ) : null}

      {error && !rowError ? (
        <div role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p>{error}</p>
          {conflict ? (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => reload.mutate()} disabled={reload.isPending}>
              Reload client
            </Button>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="mt-4 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">{notice}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraft(toRouteDraft(client.routes));
            setBaseline(client.updatedAt);
            setError(null);
            setRowError(null);
            setNotice(null);
          }}
          disabled={save.isPending || !dirty}
        >
          Discard
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={save.isPending || !dirty || serverChanged || Boolean(incomplete) || isLoading}
        >
          <Save />
          {save.isPending ? "Saving…" : "Save routes"}
        </Button>
      </div>
    </>
  );
}
