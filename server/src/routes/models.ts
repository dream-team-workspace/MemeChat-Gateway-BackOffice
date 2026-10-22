import { Hono } from "hono";

import {
  modelInputSchema,
  modelListSchema,
  modelSchema,
} from "../../../shared/admin-api/index.js";
import { config } from "../config.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import { mockStore } from "../mock/store.js";
import type { AppEnv } from "../types.js";
import { jsonBody } from "./helpers.js";

const models = new Hono<AppEnv>();
const isMock = config.adminApiMode === "mock";

models.get("/", async (c) => {
  if (isMock) {
    return c.json({ items: mockStore.listModels() });
  }
  const raw = await adminFetch("/internal/admin/models", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(modelListSchema.parse({ items: listItems(camelize(raw)) }));
});

models.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = await jsonBody(c, modelInputSchema);
  if (isMock) {
    return c.json(mockStore.upsertModel(id, input));
  }
  const raw = await adminFetch(
    "/internal/admin/models/" + encodeURIComponent(id),
    c.get("actor"),
    {
      method: "PUT",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(modelSchema.parse(camelize(raw)));
});

export { models };
