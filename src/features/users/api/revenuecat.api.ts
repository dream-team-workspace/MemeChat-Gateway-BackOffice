import { revenueCatStatusSchema } from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

export const revenueCatApi = {
  status: () => apiRequest("/api/admin/revenuecat/status", revenueCatStatusSchema),
};

export const revenueCatKeys = {
  status: ["revenuecat", "status"] as const,
};
