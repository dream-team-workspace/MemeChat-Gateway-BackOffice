import { Hono } from "hono";

import { cacheInvalidationSchema } from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";

const operations = new Hono<AppEnv>();

operations.post("/invalidate", async (c) => {
  const raw = await adminFetch("/internal/admin/cache/invalidate", c.get("actor"), {
    method: "POST",
    requestId: c.get("requestId"),
  });
  return c.json(cacheInvalidationSchema.parse(camelize(raw)));
});

export { operations };
