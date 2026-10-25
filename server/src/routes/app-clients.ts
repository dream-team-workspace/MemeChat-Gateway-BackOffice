import { Hono } from "hono";

import {
  appClientActivityEntrySchema,
  appClientActivityListSchema,
  appClientAuditEntrySchema,
  appClientAuditListSchema,
  appClientDeleteSchema,
  appClientInputSchema,
  appClientListSchema,
  appClientSchema,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";
import { jsonBody, normalizePage, readPageQuery } from "./helpers.js";

const appClients = new Hono<AppEnv>();

appClients.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/app-clients", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(appClientListSchema.parse({ items: listItems(camelize(raw)) }));
});

appClients.post("/", async (c) => {
  const input = await jsonBody(c, appClientInputSchema);
  const raw = await adminFetch("/internal/admin/app-clients", c.get("actor"), {
    method: "POST",
    body: toApiBody(input),
    requestId: c.get("requestId"),
  });
  return c.json(appClientSchema.parse(camelize(raw)), 201);
});

appClients.get("/:id", async (c) => {
  const raw = await adminFetch(
    "/internal/admin/app-clients/" + encodeURIComponent(c.req.param("id")),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(appClientSchema.parse(camelize(raw)));
});

appClients.put("/:id", async (c) => {
  const input = await jsonBody(c, appClientInputSchema);
  const raw = await adminFetch(
    "/internal/admin/app-clients/" + encodeURIComponent(c.req.param("id")),
    c.get("actor"),
    {
      method: "PUT",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(appClientSchema.parse(camelize(raw)));
});

appClients.get("/:id/audit", async (c) => {
  const query = readPageQuery(c);
  const raw = await adminFetch(
    "/internal/admin/app-clients/" +
      encodeURIComponent(c.req.param("id")) +
      "/audit?limit=" +
      String(query.limit) +
      (query.cursor ? "&cursor=" + encodeURIComponent(query.cursor) : ""),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(
    appClientAuditListSchema.parse(
      normalizePage(camelize(raw), appClientAuditEntrySchema),
    ),
  );
});

appClients.get("/:id/activity", async (c) => {
  const query = readPageQuery(c);
  const raw = await adminFetch(
    "/internal/admin/app-clients/" +
      encodeURIComponent(c.req.param("id")) +
      "/activity?limit=" +
      String(query.limit) +
      (query.cursor ? "&cursor=" + encodeURIComponent(query.cursor) : ""),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(
    appClientActivityListSchema.parse(
      normalizePage(camelize(raw), appClientActivityEntrySchema),
    ),
  );
});

appClients.post("/:id/key/rotate", async (c) => {
  const raw = await adminFetch(
    "/internal/admin/app-clients/" + encodeURIComponent(c.req.param("id")) + "/key/rotate",
    c.get("actor"),
    { method: "POST", requestId: c.get("requestId") },
  );
  return c.json(appClientSchema.parse(camelize(raw)));
});

appClients.delete("/:id", async (c) => {
  const raw = await adminFetch(
    "/internal/admin/app-clients/" + encodeURIComponent(c.req.param("id")),
    c.get("actor"),
    { method: "DELETE", requestId: c.get("requestId") },
  );
  return c.json(appClientDeleteSchema.parse(camelize(raw)));
});

export { appClients };
