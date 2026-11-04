import { Hono } from "hono";

import {
  providerCatalogModelListSchema,
  providerCatalogModelSchema,
  providerDeleteSchema,
  providerInputSchema,
  providerListSchema,
  providerModelInputSchema,
  providerSchema,
  providerStatusSchema,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";
import { jsonBody } from "./helpers.js";

const providers = new Hono<AppEnv>();

function providerPath(id: string) {
  return "/internal/admin/providers/" + encodeURIComponent(id);
}

providers.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/providers", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(
    providerListSchema.parse({
      items: listItems(camelize(raw)).map((item) => providerStatusSchema.parse(item)),
    }),
  );
});

providers.post("/", async (c) => {
  const input = await jsonBody(c, providerInputSchema);
  const raw = await adminFetch("/internal/admin/providers", c.get("actor"), {
    method: "POST",
    body: toApiBody(input),
    requestId: c.get("requestId"),
  });
  return c.json(providerSchema.parse(camelize(raw)), 201);
});

providers.get("/:id", async (c) => {
  const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(providerSchema.parse(camelize(raw)));
});

providers.put("/:id", async (c) => {
  const input = await jsonBody(c, providerInputSchema);
  const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
    method: "PUT",
    body: toApiBody(input),
    requestId: c.get("requestId"),
  });
  return c.json(providerSchema.parse(camelize(raw)));
});

providers.delete("/:id", async (c) => {
  const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
    method: "DELETE",
    requestId: c.get("requestId"),
  });
  return c.json(providerDeleteSchema.parse(camelize(raw)));
});

providers.post("/:id/check", async (c) => {
  const raw = await adminFetch(providerPath(c.req.param("id")) + "/check", c.get("actor"), {
    method: "POST",
    requestId: c.get("requestId"),
  });
  return c.json(providerStatusSchema.parse(camelize(raw)));
});

providers.get("/:id/models", async (c) => {
  const raw = await adminFetch(providerPath(c.req.param("id")) + "/models", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(
    providerCatalogModelListSchema.parse({
      items: listItems(camelize(raw)).map((item) => providerCatalogModelSchema.parse(item)),
    }),
  );
});

providers.put("/:id/models/:modelId", async (c) => {
  const input = await jsonBody(c, providerModelInputSchema);
  const path =
    providerPath(c.req.param("id")) +
    "/models/" +
    encodeURIComponent(c.req.param("modelId"));
  const raw = await adminFetch(path, c.get("actor"), {
    method: "PUT",
    body: toApiBody(input),
    requestId: c.get("requestId"),
  });
  return c.json(providerCatalogModelSchema.parse(camelize(raw)));
});

providers.delete("/:id/models/:modelId", async (c) => {
  const path =
    providerPath(c.req.param("id")) +
    "/models/" +
    encodeURIComponent(c.req.param("modelId"));
  const raw = await adminFetch(path, c.get("actor"), {
    method: "DELETE",
    requestId: c.get("requestId"),
  });
  return c.json(providerDeleteSchema.parse(camelize(raw)));
});

export { providers };
