import { Hono } from "hono";

import {
  creditGrantInputSchema,
  creditGrantResultSchema,
  ledgerEntrySchema,
  ledgerPageSchema,
  usageEventSchema,
  usagePageSchema,
} from "../../../shared/admin-api/index.js";
import { config } from "../config.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, toApiBody } from "../gateway/mappers.js";
import { mockStore } from "../mock/store.js";
import type { AppEnv } from "../types.js";
import { jsonBody, normalizePage, readPageQuery, readUid } from "./helpers.js";

const users = new Hono<AppEnv>();
const isMock = config.adminApiMode === "mock";

users.get("/:uid/ledger", async (c) => {
  const uid = readUid(c);
  const query = readPageQuery(c);
  if (isMock) {
    return c.json(mockStore.listLedger(uid, query.limit, query.cursor));
  }
  const suffix =
    "?limit=" +
    String(query.limit) +
    (query.cursor ? "&cursor=" + encodeURIComponent(query.cursor) : "");
  const raw = await adminFetch(
    "/internal/admin/users/" + encodeURIComponent(uid) + "/ledger" + suffix,
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(ledgerPageSchema.parse(normalizePage(camelize(raw), ledgerEntrySchema)));
});

users.get("/:uid/usage", async (c) => {
  const uid = readUid(c);
  const query = readPageQuery(c);
  if (isMock) {
    return c.json(mockStore.listUsage(uid, query.limit, query.cursor));
  }
  const suffix =
    "?limit=" +
    String(query.limit) +
    (query.cursor ? "&cursor=" + encodeURIComponent(query.cursor) : "");
  const raw = await adminFetch(
    "/internal/admin/users/" + encodeURIComponent(uid) + "/usage" + suffix,
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(usagePageSchema.parse(normalizePage(camelize(raw), usageEventSchema)));
});

users.post("/:uid/credits/grant", async (c) => {
  const uid = readUid(c);
  const input = await jsonBody(c, creditGrantInputSchema);
  if (isMock) {
    return c.json(mockStore.grant(uid, input, c.get("actor").email));
  }
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
