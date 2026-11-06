import { queryOptions } from "@tanstack/react-query";

import { providerKeys, providersApi } from "../api/providers.api";

export const providersQueryOptions = queryOptions({
  queryKey: providerKeys.all,
  queryFn: providersApi.list,
});

export const providerQueryOptions = (id: string) =>
  queryOptions({
    queryKey: providerKeys.detail(id),
    queryFn: () => providersApi.get(id),
  });

export const providerModelsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: providerKeys.models(id),
    queryFn: () => providersApi.models(id),
  });
