import { queryOptions } from "@tanstack/react-query";

import { userKeys, usersApi } from "../api/users.api";

export function userLedgerQueryOptions(uid: string, cursor?: string) {
  return queryOptions({
    queryKey: userKeys.ledger(uid, cursor),
    queryFn: () => usersApi.ledger(uid, cursor),
  });
}

export function userUsageQueryOptions(uid: string, cursor?: string) {
  return queryOptions({
    queryKey: userKeys.usage(uid, cursor),
    queryFn: () => usersApi.usage(uid, cursor),
  });
}

export function userActivityQueryOptions(uid: string, cursor?: string, date?: string) {
  return queryOptions({
    queryKey: userKeys.activity(uid, cursor, date),
    queryFn: () => usersApi.activity(uid, cursor, date),
  });
}

export function userDirectoryQueryOptions(
  query: string,
  cursor?: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: userKeys.directory(query, cursor),
    queryFn: () => usersApi.list({ query: query || undefined, cursor }),
    enabled,
  });
}
