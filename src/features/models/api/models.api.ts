import {
  modelListSchema,
  modelSchema,
  type ModelInput,
} from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

export const modelsApi = {
  list: () => apiRequest("/api/admin/models", modelListSchema),
  upsert: (id: string, input: ModelInput) =>
    apiRequest("/api/admin/models/" + encodeURIComponent(id), modelSchema, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};

export const modelKeys = {
  all: ["models"] as const,
};
