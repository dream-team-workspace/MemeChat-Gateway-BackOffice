import { queryOptions } from "@tanstack/react-query";

import { abilitiesApi, abilityKeys } from "../api/abilities.api";

export const abilitiesQueryOptions = queryOptions({
  queryKey: abilityKeys.all,
  queryFn: abilitiesApi.list,
});
