import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppClientInput } from "@shared/admin-api";

import { appClientKeys, appClientsApi } from "../api/app-clients.api";

function useInvalidateAppClients() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: appClientKeys.all });
    if (id) {
      // Detail, admin audit, and user activity all live under this prefix.
      void queryClient.invalidateQueries({ queryKey: appClientKeys.detailPrefix(id) });
    }
  };
}

export function useCreateAppClient() {
  const invalidate = useInvalidateAppClients();
  return useMutation({
    mutationFn: (input: AppClientInput) => appClientsApi.create(input),
    onSuccess: (client) => invalidate(client.id),
  });
}

export function useUpdateAppClient(id: string) {
  const invalidate = useInvalidateAppClients();
  return useMutation({
    mutationFn: (input: AppClientInput) => appClientsApi.update(id, input),
    onSuccess: () => invalidate(id),
  });
}

export function useRotateAppClientKey(id: string) {
  const invalidate = useInvalidateAppClients();
  return useMutation({
    mutationFn: () => appClientsApi.rotateKey(id),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteAppClient() {
  const invalidate = useInvalidateAppClients();
  return useMutation({
    mutationFn: (id: string) => appClientsApi.remove(id),
    onSuccess: (_result, id) => invalidate(id),
  });
}
