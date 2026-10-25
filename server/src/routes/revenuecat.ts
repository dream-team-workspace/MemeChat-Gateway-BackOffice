import { Hono } from "hono";

import { revenueCatStatusSchema } from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";

const revenuecat = new Hono<AppEnv>();

revenuecat.get("/status", async (c) => {
  const raw = await adminFetch("/internal/admin/revenuecat/status", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(revenueCatStatusSchema.parse(camelize(raw)));
});

export { revenuecat };
