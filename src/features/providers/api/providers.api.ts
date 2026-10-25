import {
  providerListSchema,
  providerStatusSchema,
} from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

export const providersApi = {
  list: () => apiRequest("/api/admin/providers", providerListSchema),
  check: (id: string) =>
    apiRequest(
      "/api/admin/providers/" + encodeURIComponent(id) + "/check",
      providerStatusSchema,
      { method: "POST" },
    ),
};

export const providerKeys = {
  all: ["providers"] as const,
};
