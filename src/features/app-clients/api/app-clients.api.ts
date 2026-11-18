import {
  activatedAppClientKeySchema,
  appClientActivityListSchema,
  appClientAuditListSchema,
  appClientDeleteSchema,
  appClientListSchema,
  appClientSchema,
  cancelledAppClientKeySchema,
  preparedAppClientKeySchema,
  type PreparedAppClientKey,
  type AppClientInput,
  type AppClientRouteInput,
} from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

function pageSuffix(cursor?: string) {
  return "?limit=50" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
}

function activitySuffix(cursor?: string, date?: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (cursor) params.set("cursor", cursor);
  if (date) params.set("date", date);
  return "?" + params.toString();
}

export const appClientsApi = {
  list: () => apiRequest("/api/admin/app-clients", appClientListSchema),
  get: (id: string) =>
    apiRequest("/api/admin/app-clients/" + encodeURIComponent(id), appClientSchema),
  create: (input: AppClientInput) =>
    apiRequest("/api/admin/app-clients", appClientSchema, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: AppClientInput) =>
    apiRequest("/api/admin/app-clients/" + encodeURIComponent(id), appClientSchema, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  saveRoutes: (id: string, routes: AppClientRouteInput[]) =>
    apiRequest(
      "/api/admin/app-clients/" + encodeURIComponent(id) + "/routes",
      appClientSchema,
      { method: "PUT", body: JSON.stringify({ routes }) },
    ),
  remove: (id: string) =>
    apiRequest("/api/admin/app-clients/" + encodeURIComponent(id), appClientDeleteSchema, {
      method: "DELETE",
    }),
  prepareKey: (id: string, rotationId: string) =>
    apiRequest(
      "/api/admin/app-clients/" + encodeURIComponent(id) + "/key/prepare",
      preparedAppClientKeySchema,
      { method: "POST", body: JSON.stringify({ rotationId }) },
    ),
  activateKey: (id: string, prepared: PreparedAppClientKey) =>
    apiRequest(
      "/api/admin/app-clients/" + encodeURIComponent(id) + "/key/activate",
      activatedAppClientKeySchema,
      { method: "POST", body: JSON.stringify(prepared) },
    ),
  cancelKey: (id: string, rotationId: string) =>
    apiRequest(
      "/api/admin/app-clients/" + encodeURIComponent(id) + "/key/cancel",
      cancelledAppClientKeySchema,
      { method: "POST", body: JSON.stringify({ rotationId }) },
    ),
  audit: (id: string, cursor?: string) =>
    apiRequest(
      "/api/admin/app-clients/" + encodeURIComponent(id) + "/audit" + pageSuffix(cursor),
      appClientAuditListSchema,
    ),
  activity: (id: string, cursor?: string, date?: string) =>
    apiRequest(
      "/api/admin/app-clients/" +
        encodeURIComponent(id) +
        "/activity" +
        activitySuffix(cursor, date),
      appClientActivityListSchema,
    ),
};

export const appClientKeys = {
  all: ["app-clients"] as const,
  detail: (id: string) => ["app-clients", id] as const,
  detailPrefix: (id: string) => ["app-clients", id] as const,
  audit: (id: string, cursor?: string) =>
    ["app-clients", id, "audit", cursor ?? "first"] as const,
  activity: (id: string, cursor?: string, date?: string) =>
    ["app-clients", id, "activity", date ?? "default", cursor ?? "first"] as const,
};
