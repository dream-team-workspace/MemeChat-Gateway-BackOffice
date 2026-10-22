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
