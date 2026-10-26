import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ModelInput } from "@shared/admin-api";

import { modelKeys, modelsApi } from "../api/models.api";

export function useUpsertModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModelInput }) =>
      modelsApi.upsert(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}
