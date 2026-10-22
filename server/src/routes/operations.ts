import { Hono } from "hono";

import { config } from "../config.js";
import { adminFetch } from "../gateway/live.js";
import { camelize } from "../gateway/mappers.js";
import { mockStore } from "../mock/store.js";
import type { AppEnv } from "../types.js";

const operations = new Hono<AppEnv>();
const isMock = config.adminApiMode === "mock";

operations.post("/cache/invalidate", async (c) => {
  if (isMock) {
    return c.json(mockStore.invalidateCache());
  }
  const raw = await adminFetch("/internal/admin/cache/invalidate", c.get("actor"), {
    method: "POST",
    requestId: c.get("requestId"),
  });
  return c.json(camelize(raw));
});

export { operations };
