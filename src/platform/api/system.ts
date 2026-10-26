import { cacheInvalidationSchema, healthSchema, metaSchema } from "@shared/admin-api";

import { apiRequest } from "./client";

export const systemApi = {
  health: () => apiRequest("/api/health", healthSchema),
  meta: () => apiRequest("/api/meta", metaSchema),
  invalidateCache: () =>
    apiRequest("/api/admin/cache/invalidate", cacheInvalidationSchema, {
      method: "POST",
    }),
};

export const systemKeys = {
  health: ["system", "health"] as const,
  meta: ["system", "meta"] as const,
};
