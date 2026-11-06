import { abilityListSchema } from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

export const abilitiesApi = {
  list: () => apiRequest("/api/admin/abilities", abilityListSchema),
};

export const abilityKeys = {
  all: ["abilities"] as const,
};
