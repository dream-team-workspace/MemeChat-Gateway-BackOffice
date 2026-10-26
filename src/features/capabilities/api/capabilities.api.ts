import {
  auditListSchema,
  capabilityListSchema,
  capabilitySchema,
  type CapabilityUpdate,
  type ProvidersUpdate,
  type ToggleCapability,
} from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

function path(id: string) {
  return "/api/admin/capabilities/" + encodeURIComponent(id);
}

export const capabilitiesApi = {
  list: () => apiRequest("/api/admin/capabilities", capabilityListSchema),
  get: (id: string) => apiRequest(path(id), capabilitySchema),
  update: (id: string, input: CapabilityUpdate) =>
    apiRequest(path(id), capabilitySchema, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  toggle: (id: string, input: ToggleCapability) =>
    apiRequest(path(id) + "/toggle", capabilitySchema, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  replaceProviders: (id: string, input: ProvidersUpdate) =>
    apiRequest(path(id) + "/providers", capabilitySchema, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  audit: (id: string, limit = 50, cursor?: string) =>
    apiRequest(
      path(id) +
        "/audit?limit=" +
        String(limit) +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      auditListSchema,
    ),
};

export const capabilityKeys = {
  all: ["capabilities"] as const,
  detail: (id: string) => ["capabilities", id] as const,
  auditPrefix: (id: string) => ["capabilities", id, "audit"] as const,
  auditPage: (id: string, cursor?: string) =>
    ["capabilities", id, "audit", cursor ?? "first"] as const,
};
