import { queryOptions } from "@tanstack/react-query";

import { revenueCatApi, revenueCatKeys } from "../api/revenuecat.api";

export const revenueCatStatusQueryOptions = queryOptions({
  queryKey: revenueCatKeys.status,
  queryFn: revenueCatApi.status,
  staleTime: 30_000,
});
