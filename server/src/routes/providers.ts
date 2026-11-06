import type { Context } from "hono";
import { Hono } from "hono";

import {
  appClientListSchema,
  deriveCredentialState,
  providerCatalogModelListSchema,
  providerCatalogModelSchema,
  providerDeleteSchema,
  providerInputSchema,
  providerListSchema,
  providerModelInputSchema,
  providerSchema,
  providerStatusSchema,
  type ProviderUsageRef,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import { HttpError } from "../lib/errors.js";
import type { AppEnv } from "../types.js";
import { jsonBody } from "./helpers.js";

const providers = new Hono<AppEnv>();

function credentialState(raw: Record<string, unknown>) {
  return deriveCredentialState({
    configured: raw.configured === true,
    hasApiKey: raw.hasApiKey === true,
  });
}

function statusWithCredentialState(raw: unknown) {
  const item = camelize(raw) as Record<string, unknown>;
  return providerStatusSchema.parse({
    ...item,
    credentialState: credentialState(item),
  });
}

function providerWithCredentialState(raw: unknown) {
  const item = camelize(raw) as Record<string, unknown>;
  return providerSchema.parse({
    ...item,
    credentialState: credentialState(item),
  });
}

/**
 * The gateway's 409 body intentionally names the provider/model but not the
 * app clients that reference it. Enrich the error with references from the
 * app-client read model so the delete dialog can explain the blocker. The read
 * is best-effort: a failed lookup must not replace the gateway's 409.
 */
async function providerUsage(
  c: Context<AppEnv>,
  providerId: string,
  modelId?: string,
): Promise<ProviderUsageRef[]> {
  try {
    const raw = await adminFetch("/internal/admin/app-clients", c.get("actor"), {
      requestId: c.get("requestId"),
    });
    const clients = appClientListSchema.parse({
      items: listItems(camelize(raw)),
    });
    const refs: ProviderUsageRef[] = [];
    for (const client of clients.items) {
      for (const route of client.routes ?? []) {
        if (route.providerId !== providerId) continue;
        if (modelId && route.modelId !== modelId) continue;
        refs.push({
          appClientId: client.id,
          appClientName: client.name,
          appClientSlug: client.slug,
          ability: route.ability,
          modelId: route.modelId,
        });
      }
    }
    return refs;
  } catch {
    return [];
  }
}

async function withProviderUsage(
  c: Context<AppEnv>,
  error: unknown,
  providerId: string,
  modelId?: string,
) {
  if (!(error instanceof HttpError) || error.status !== 409) return error;
  const appClients = await providerUsage(c, providerId, modelId);
  return new HttpError(409, error.code, error.message, {
    appClients,
    ...(modelId ? { modelId } : {}),
  });
}

function providerPath(id: string) {
  return "/internal/admin/providers/" + encodeURIComponent(id);
}

providers.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/providers", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(
    providerListSchema.parse({
      items: listItems(camelize(raw)).map(statusWithCredentialState),
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
  return c.json(providerWithCredentialState(raw), 201);
});

providers.get("/:id", async (c) => {
  const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(providerWithCredentialState(raw));
});

providers.put("/:id", async (c) => {
  const input = await jsonBody(c, providerInputSchema);
  const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
    method: "PUT",
    body: toApiBody(input),
    requestId: c.get("requestId"),
  });
  return c.json(providerWithCredentialState(raw));
});

providers.delete("/:id", async (c) => {
  try {
    const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
      method: "DELETE",
      requestId: c.get("requestId"),
    });
    return c.json(providerDeleteSchema.parse(camelize(raw)));
  } catch (error) {
    throw await withProviderUsage(c, error, c.req.param("id"));
  }
});

providers.post("/:id/check", async (c) => {
  const raw = await adminFetch(providerPath(c.req.param("id")) + "/check", c.get("actor"), {
    method: "POST",
    requestId: c.get("requestId"),
  });
  return c.json(statusWithCredentialState(raw));
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
  try {
    const raw = await adminFetch(path, c.get("actor"), {
      method: "DELETE",
      requestId: c.get("requestId"),
    });
    return c.json(providerDeleteSchema.parse(camelize(raw)));
  } catch (error) {
    throw await withProviderUsage(c, error, c.req.param("id"), c.req.param("modelId"));
  }
});

export { providers };
