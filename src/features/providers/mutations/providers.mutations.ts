import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ProviderInput, ProviderModelInput, ProviderStatus } from "@shared/admin-api";

import { abilityKeys } from "@/features/abilities/api/abilities.api";
import { providerKeys, providersApi } from "../api/providers.api";

function useInvalidateProviders() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: providerKeys.all });
    if (id) void queryClient.invalidateQueries({ queryKey: providerKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: abilityKeys.all });
    // Route rows carry provider and model display names.
    void queryClient.invalidateQueries({ queryKey: ["app-clients"] });
  };
}

export function useCreateProvider() {
  const invalidate = useInvalidateProviders();
  return useMutation({
    mutationFn: (input: ProviderInput) => providersApi.create(input),
    onSuccess: (provider) => invalidate(provider.id),
  });
}

export function useUpdateProvider(id: string) {
  const invalidate = useInvalidateProviders();
  return useMutation({
    mutationFn: (input: ProviderInput) => providersApi.update(id, input),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteProvider() {
  const invalidate = useInvalidateProviders();
  return useMutation({
    mutationFn: (id: string) => providersApi.remove(id),
    onSuccess: (_result, id) => invalidate(id),
  });
}

export function useUpsertProviderModel(providerId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProviders();
  return useMutation({
    mutationFn: ({ modelId, input }: { modelId: string; input: ProviderModelInput }) =>
      providersApi.upsertModel(providerId, modelId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.models(providerId) });
      invalidate(providerId);
    },
  });
}

export function useDeleteProviderModel(providerId: string) {
  const invalidate = useInvalidateProviders();
  return useMutation({
    mutationFn: (modelId: string) => providersApi.deleteModel(providerId, modelId),
    onSuccess: () => invalidate(providerId),
  });
}

export function useCheckProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersApi.check(id),
    onSuccess: (checked) => {
      queryClient.setQueryData(
        providerKeys.all,
        (current: { items: ProviderStatus[] } | undefined) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === checked.id ? checked : item,
                ),
              }
            : current,
      );
    },
  });
}
