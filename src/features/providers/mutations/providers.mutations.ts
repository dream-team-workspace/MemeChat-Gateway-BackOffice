import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ProviderStatus } from "@shared/admin-api";

import { providerKeys, providersApi } from "../api/providers.api";

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
