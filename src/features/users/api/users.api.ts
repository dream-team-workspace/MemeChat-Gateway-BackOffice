import {
  creditGrantResultSchema,
  ledgerPageSchema,
  usagePageSchema,
  userListSchema,
  type CreditGrantInput,
} from "@shared/admin-api";

import { apiRequest } from "@/platform/api";

function path(uid: string, resource: string) {
  return "/api/admin/users/" + encodeURIComponent(uid) + "/" + resource;
}

export type UserDirectoryParams = {
  query?: string;
  cursor?: string;
  limit?: number;
};

export const usersApi = {
  list: ({ query, cursor, limit = 50 }: UserDirectoryParams = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    if (query) params.set("query", query);
    return apiRequest("/api/admin/users?" + params.toString(), userListSchema);
  },
  ledger: (uid: string, cursor?: string, limit = 50) => {
    const suffix =
      "?limit=" + String(limit) + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
    return apiRequest(path(uid, "ledger") + suffix, ledgerPageSchema);
  },
  usage: (uid: string, cursor?: string, limit = 50) => {
    const suffix =
      "?limit=" + String(limit) + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
    return apiRequest(path(uid, "usage") + suffix, usagePageSchema);
  },
  grant: (uid: string, input: CreditGrantInput) =>
    apiRequest(path(uid, "credits/grant"), creditGrantResultSchema, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export const userKeys = {
  all: ["users"] as const,
  directory: (query: string, cursor?: string) =>
    ["users", "directory", query, cursor ?? "first"] as const,
  ledgerPrefix: (uid: string) => ["users", uid, "ledger"] as const,
  ledger: (uid: string, cursor?: string) => ["users", uid, "ledger", cursor ?? "first"] as const,
  usage: (uid: string, cursor?: string) => ["users", uid, "usage", cursor ?? "first"] as const,
};
