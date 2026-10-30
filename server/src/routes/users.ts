import { Hono } from "hono";

import {
  appClientActivityEntrySchema,
  appClientActivityListSchema,
  creditGrantInputSchema,
  creditGrantResultSchema,
  ledgerEntrySchema,
  ledgerPageSchema,
  usageEventSchema,
  usagePageSchema,
  userListSchema,
  userSummarySchema,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, toApiBody } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";
import {
  jsonBody,
  normalizePage,
  readActivityQuery,
  readPageQuery,
  readUid,
  readUserQuery,
} from "./helpers.js";

const users = new Hono<AppEnv>();

function pageSuffix(limit: number, cursor?: string) {
  return "?limit=" + String(limit) + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
}

users.get("/", async (c) => {
  const query = readPageQuery(c);
  const search = readUserQuery(c);
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.cursor) params.set("cursor", query.cursor);
  if (search) params.set("query", search);
  const raw = await adminFetch(
    "/internal/admin/users?" + params.toString(),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(
    userListSchema.parse(normalizePage(camelize(raw), userSummarySchema)),
  );
});

users.get("/:uid/ledger", async (c) => {
  const uid = readUid(c);
  const query = readPageQuery(c);
  const raw = await adminFetch(
    "/internal/admin/users/" + encodeURIComponent(uid) + "/ledger" + pageSuffix(query.limit, query.cursor),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(ledgerPageSchema.parse(normalizePage(camelize(raw), ledgerEntrySchema)));
});

users.get("/:uid/usage", async (c) => {
  const uid = readUid(c);
  const query = readPageQuery(c);
  const raw = await adminFetch(
    "/internal/admin/users/" + encodeURIComponent(uid) + "/usage" + pageSuffix(query.limit, query.cursor),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(usagePageSchema.parse(normalizePage(camelize(raw), usageEventSchema)));
});

users.get("/:uid/activity", async (c) => {
  const uid = readUid(c);
  const query = readActivityQuery(c);
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.date) params.set("date", query.date);
  const raw = await adminFetch(
    "/internal/admin/users/" + encodeURIComponent(uid) + "/activity?" + params.toString(),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(
    appClientActivityListSchema.parse(
      normalizePage(camelize(raw), appClientActivityEntrySchema),
    ),
  );
});

users.post("/:uid/credits/grant", async (c) => {
  const uid = readUid(c);
  const input = await jsonBody(c, creditGrantInputSchema);
  const raw = await adminFetch(
    "/internal/admin/users/" + encodeURIComponent(uid) + "/credits/grant",
    c.get("actor"),
    {
      method: "POST",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(creditGrantResultSchema.parse(camelize(raw)));
});

export { users };
