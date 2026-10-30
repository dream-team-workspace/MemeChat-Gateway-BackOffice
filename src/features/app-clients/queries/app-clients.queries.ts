import { queryOptions } from "@tanstack/react-query";

import { appClientKeys, appClientsApi } from "../api/app-clients.api";

export const appClientsQueryOptions = queryOptions({
  queryKey: appClientKeys.all,
  queryFn: appClientsApi.list,
});

export const appClientQueryOptions = (id: string) =>
  queryOptions({
    queryKey: appClientKeys.detail(id),
    queryFn: () => appClientsApi.get(id),
  });

export function appClientAuditQueryOptions(
  id: string,
  cursor?: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: appClientKeys.audit(id, cursor),
    queryFn: () => appClientsApi.audit(id, cursor),
    enabled,
  });
}

export function appClientActivityQueryOptions(
  id: string,
  cursor?: string,
  date?: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: appClientKeys.activity(id, cursor, date),
    queryFn: () => appClientsApi.activity(id, cursor, date),
    enabled,
  });
}
