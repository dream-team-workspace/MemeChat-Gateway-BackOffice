import { queryOptions } from "@tanstack/react-query";

import { capabilitiesApi, capabilityKeys } from "../api/capabilities.api";

export const capabilitiesQueryOptions = queryOptions({
  queryKey: capabilityKeys.all,
  queryFn: capabilitiesApi.list,
});

export function capabilityQueryOptions(id: string) {
  return queryOptions({
    queryKey: capabilityKeys.detail(id),
    queryFn: () => capabilitiesApi.get(id),
    enabled: Boolean(id),
  });
}

export function capabilityAuditQueryOptions(id: string, cursor?: string) {
  return queryOptions({
    queryKey: capabilityKeys.auditPage(id, cursor),
    queryFn: () => capabilitiesApi.audit(id, 50, cursor),
    enabled: Boolean(id),
  });
}
