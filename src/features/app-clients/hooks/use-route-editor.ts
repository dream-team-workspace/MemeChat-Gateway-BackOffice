import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  abilityOrder,
  type AbilityId,
  type AppClient,
  type ProviderCatalogModel,
  type ProviderStatus,
} from "@shared/admin-api";

import { abilitiesQueryOptions } from "@/features/abilities/queries/abilities.queries";
import { appClientKeys, appClientsApi } from "@/features/app-clients/api/app-clients.api";
import {
  firstIncomplete,
  routeInputs,
  routesEqual,
  toRouteDraft,
  type RouteDraft,
} from "@/features/app-clients/hooks/use-route-draft";
import { routeErrorAbility } from "@/features/app-clients/lib/route-errors";
import { useSaveAppClientRoutes } from "@/features/app-clients/mutations/app-clients.mutations";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { ApiError, getErrorMessage } from "@/platform/api";

/**
 * Owns the route editor's server interactions and draft state. The component
 * stays presentational: it composes Rows and Footer and never invents a cache
 * key or a mutation payload.
 */
export function useRouteEditor(client: AppClient) {
  const abilities = useQuery(abilitiesQueryOptions);
  const providers = useQuery(providersQueryOptions);
  const save = useSaveAppClientRoutes(client.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<RouteDraft[]>(() => toRouteDraft(client.routes));
  const [baseline, setBaseline] = useState<RouteDraft[]>(() => toRouteDraft(client.routes));
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<AbilityId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useMutation({
    mutationFn: () => appClientsApi.get(client.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(appClientKeys.detail(client.id), updated);
      setDraft(toRouteDraft(updated.routes));
      setBaseline(toRouteDraft(updated.routes));
      setError(null);
      setRowError(null);
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

  function discard() {
    setDraft(toRouteDraft(client.routes));
    setBaseline(toRouteDraft(client.routes));
    setError(null);
    setRowError(null);
    setNotice(null);
  }

  const serverRoutes = toRouteDraft(client.routes);
  const serverChanged = !routesEqual(baseline, serverRoutes);
  const dirty = !routesEqual(draft, baseline);
  const incomplete = firstIncomplete(draft);
  const isLoading = abilities.isLoading || providers.isLoading;
  const loadError = abilities.error ?? providers.error;

  function saveRoutes() {
    setNotice(null);
    setError(null);
    setRowError(null);
    if (incomplete) {
      setError("Finish or remove the incomplete " + incomplete.ability + " row before saving.");
      setRowError(incomplete.ability);
      return;
    }
    save.mutate(routeInputs(draft), {
      onSuccess: (updated) => {
        setDraft(toRouteDraft(updated.routes));
        setBaseline(toRouteDraft(updated.routes));
        setNotice("Routes saved");
        setRowError(null);
      },
      onError: (mutationError) => {
        setError(getErrorMessage(mutationError));
        if (mutationError instanceof ApiError && mutationError.status === 404) {
          void navigate({ to: "/app-clients" });
          return;
        }
        if (mutationError instanceof ApiError && mutationError.status === 422) {
          setRowError(routeErrorAbility(mutationError, draft));
        }
      },
    });
  }

  return {
    draft,
    abilities,
    providers,
    save,
    reload,
    error,
    rowError,
    notice,
    dirty,
    incomplete,
    isLoading,
    loadError,
    serverChanged,
    modelsFor,
    providersFor: (ability: AbilityId) => providersByAbility.get(ability) ?? [],
    changeProvider,
    changeModel: (ability: AbilityId, modelId: string) => updateRow(ability, { modelId }),
    removeRow,
    discard,
    saveRoutes,
  };
}
