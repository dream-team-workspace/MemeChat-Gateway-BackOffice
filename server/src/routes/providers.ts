import { Hono } from "hono";

import {
  providerListSchema,
  providerStatusSchema,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";

const providers = new Hono<AppEnv>();

providers.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/providers", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(
    providerListSchema.parse({
      items: listItems(camelize(raw)),
    }),
  );
});

providers.post("/:id/check", async (c) => {
  const raw = await adminFetch(
    "/internal/admin/providers/" + encodeURIComponent(c.req.param("id")) + "/check",
    c.get("actor"),
    {
      method: "POST",
      requestId: c.get("requestId"),
    },
  );
  return c.json(providerStatusSchema.parse(camelize(raw)));
});

export { providers };
