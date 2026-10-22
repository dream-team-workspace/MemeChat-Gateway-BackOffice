import { Hono } from "hono";

import {
  auditListSchema,
  capabilityListSchema,
  capabilitySchema,
  capabilityUpdateSchema,
  providersUpdateSchema,
  toggleCapabilitySchema,
  type Capability,
} from "../../../shared/admin-api/index.js";
import { config } from "../config.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import { HttpError } from "../lib/errors.js";
import { mockStore } from "../mock/store.js";
import type { AppEnv } from "../types.js";
import { jsonBody, readPageQuery } from "./helpers.js";

const capabilities = new Hono<AppEnv>();
const isMock = config.adminApiMode === "mock";

async function liveCapability(id: string, actor: string, requestId: string): Promise<Capability> {
  const raw = await adminFetch("/internal/admin/capabilities", { email: actor }, { requestId });
  const parsed = capabilityListSchema.parse({
    items: listItems(camelize(raw)),
  });
  const found = parsed.items.find((item) => item.id === id);
  if (!found) throw new HttpError(404, "NOT_FOUND", "Capability not found.");
  return found;
}

capabilities.get("/", async (c) => {
  if (isMock) {
    return c.json({ items: mockStore.listCapabilities() });
  }
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
  const id = c.req.param("id");
  if (isMock) {
    return c.json(mockStore.getCapability(id));
  }
  return c.json(
    await liveCapability(id, c.get("actor").email, c.get("requestId")),
  );
});

capabilities.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = await jsonBody(c, capabilityUpdateSchema);
  if (isMock) {
    return c.json(mockStore.updateCapability(id, input, c.get("actor").email));
  }
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
  if (isMock) {
    return c.json(mockStore.toggleCapability(id, input, c.get("actor").email));
  }
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
  if (isMock) {
    return c.json(mockStore.replaceProviders(id, input, c.get("actor").email));
  }
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
  if (isMock) {
    const page = mockStore.listAudit(id, query.limit);
    return c.json(auditListSchema.parse(page));
  }
  const raw = await adminFetch(
    "/internal/admin/capabilities/" +
      encodeURIComponent(id) +
      "/audit?limit=" +
      String(query.limit),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(
    auditListSchema.parse({
      items: listItems(camelize(raw)),
      nextCursor: null,
    }),
  );
});

export { capabilities };
