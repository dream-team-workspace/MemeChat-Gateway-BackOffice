import { Hono } from "hono";

import { abilityListSchema } from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";

const abilities = new Hono<AppEnv>();

abilities.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/abilities", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(abilityListSchema.parse({ items: listItems(camelize(raw)) }));
});

export { abilities };
