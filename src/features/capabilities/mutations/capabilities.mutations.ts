import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  Capability,
  CapabilityUpdate,
  ProvidersUpdate,
  ToggleCapability,
} from "@shared/admin-api";

import { capabilitiesApi, capabilityKeys } from "../api/capabilities.api";

export function useUpdateCapability(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CapabilityUpdate) => capabilitiesApi.update(id, input),
    onSuccess: (capability) => {
      queryClient.setQueryData(capabilityKeys.detail(id), capability);
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.all });
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.auditPrefix(id) });
    },
  });
}

export function useToggleCapability(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ToggleCapability) => capabilitiesApi.toggle(id, input),
    onSuccess: (capability) => {
      queryClient.setQueryData(capabilityKeys.detail(id), capability);
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.all });
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.auditPrefix(id) });
    },
  });
}

export function useReplaceProviders(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProvidersUpdate) => capabilitiesApi.replaceProviders(id, input),
    onSuccess: (capability: Capability) => {
      queryClient.setQueryData(capabilityKeys.detail(id), capability);
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.all });
      void queryClient.invalidateQueries({ queryKey: capabilityKeys.auditPrefix(id) });
    },
  });
}
