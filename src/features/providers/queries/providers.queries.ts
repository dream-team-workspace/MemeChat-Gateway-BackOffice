import { queryOptions } from "@tanstack/react-query";

import { providerKeys, providersApi } from "../api/providers.api";

export const providersQueryOptions = queryOptions({
  queryKey: providerKeys.all,
  queryFn: providersApi.list,
});
