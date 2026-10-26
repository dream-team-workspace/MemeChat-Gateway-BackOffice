import { queryOptions } from "@tanstack/react-query";

import { modelKeys, modelsApi } from "../api/models.api";

export const modelsQueryOptions = queryOptions({
  queryKey: modelKeys.all,
  queryFn: modelsApi.list,
});
