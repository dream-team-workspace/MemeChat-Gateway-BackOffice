import { Hono } from "hono";

import {
  auditEntrySchema,
  auditListSchema,
  capabilityListSchema,
  capabilitySchema,
  capabilityUpdateSchema,
  providersUpdateSchema,
  toggleCapabilitySchema,
  type Capability,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";
import { jsonBody, normalizePage, readPageQuery } from "./helpers.js";

const capabilities = new Hono<AppEnv>();

async function liveCapability(
  id: string,
  actor: string,
  requestId: string,
): Promise<Capability> {
  const raw = await adminFetch(
    "/internal/admin/capabilities/" + encodeURIComponent(id),
    { email: actor },
    { requestId },
  );
  return capabilitySchema.parse(camelize(raw));
}

capabilities.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/capabilities", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(
    capabilityListSchema.parse({
      items: listItems(camelize(raw)),
    }),
  );
});

capabilities.get("/:id", async (c) => {
  return c.json(
    await liveCapability(
      c.req.param("id"),
      c.get("actor").email,
      c.get("requestId"),
    ),
  );
});

capabilities.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = await jsonBody(c, capabilityUpdateSchema);
  const raw = await adminFetch(
    "/internal/admin/capabilities/" + encodeURIComponent(id),
    c.get("actor"),
    {
      method: "PUT",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(capabilitySchema.parse(camelize(raw)));
});

capabilities.post("/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const input = await jsonBody(c, toggleCapabilitySchema);
  const raw = await adminFetch(
    "/internal/admin/capabilities/" + encodeURIComponent(id) + "/toggle",
    c.get("actor"),
    {
      method: "POST",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(capabilitySchema.parse(camelize(raw)));
});

capabilities.put("/:id/providers", async (c) => {
  const id = c.req.param("id");
  const input = await jsonBody(c, providersUpdateSchema);
  await adminFetch(
    "/internal/admin/capabilities/" + encodeURIComponent(id) + "/providers",
    c.get("actor"),
    {
      method: "PUT",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(
    await liveCapability(id, c.get("actor").email, c.get("requestId")),
  );
});

capabilities.get("/:id/audit", async (c) => {
  const id = c.req.param("id");
  const query = readPageQuery(c);
  const raw = await adminFetch(
    "/internal/admin/capabilities/" +
      encodeURIComponent(id) +
      "/audit?limit=" +
      String(query.limit) +
      (query.cursor ? "&cursor=" + encodeURIComponent(query.cursor) : ""),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(auditListSchema.parse(normalizePage(camelize(raw), auditEntrySchema)));
});

export { capabilities };
