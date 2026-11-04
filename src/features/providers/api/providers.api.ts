import {
  providerCatalogModelListSchema,
  providerCatalogModelSchema,
  providerDeleteSchema,
  providerListSchema,
  providerSchema,
  providerStatusSchema,
  type ProviderInput,
  type ProviderModelInput,
} from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

function providerPath(id: string) {
  return "/api/admin/providers/" + encodeURIComponent(id);
}

export const providersApi = {
  list: () => apiRequest("/api/admin/providers", providerListSchema),
  get: (id: string) => apiRequest(providerPath(id), providerSchema),
  create: (input: ProviderInput) =>
    apiRequest("/api/admin/providers", providerSchema, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: ProviderInput) =>
    apiRequest(providerPath(id), providerSchema, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiRequest(providerPath(id), providerDeleteSchema, { method: "DELETE" }),
  check: (id: string) =>
    apiRequest(providerPath(id) + "/check", providerStatusSchema, {
      method: "POST",
    }),
  models: (id: string) =>
    apiRequest(providerPath(id) + "/models", providerCatalogModelListSchema),
  upsertModel: (id: string, modelId: string, input: ProviderModelInput) =>
    apiRequest(
      providerPath(id) + "/models/" + encodeURIComponent(modelId),
      providerCatalogModelSchema,
      { method: "PUT", body: JSON.stringify(input) },
    ),
  deleteModel: (id: string, modelId: string) =>
    apiRequest(
      providerPath(id) + "/models/" + encodeURIComponent(modelId),
      providerDeleteSchema,
      { method: "DELETE" },
    ),
};

export const providerKeys = {
  all: ["providers"] as const,
  detail: (id: string) => ["providers", id] as const,
  models: (id: string) => ["providers", id, "models"] as const,
};
