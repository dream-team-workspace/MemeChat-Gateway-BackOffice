import type { Context } from "hono";

import { healthSchema, metaSchema } from "../../../shared/admin-api/index.js";
import { config } from "../config.js";
import type { AppEnv } from "../types.js";

async function probe(path: string) {
  try {
    const response = await fetch(config.adminApiBaseUrl + path, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

export async function healthHandler(c: Context<AppEnv>) {
  let gateway = { liveness: "ok", readiness: "ok" };

  if (config.adminApiMode === "live") {
    gateway = {
      liveness: await probe("/healthz"),
      readiness: await probe("/readyz"),
    };
  }

  const status =
    gateway.liveness === "ok" && gateway.readiness === "ok"
      ? "ok"
      : "degraded";

  return c.json(
    healthSchema.parse({
      status,
      version: config.version,
      commit: config.commit,
      environment: config.environment,
      gateway,
    }),
  );
}

export function metaHandler(c: Context<AppEnv>) {
  return c.json(
    metaSchema.parse({
      environment: config.environment,
      authMode: config.isProduction ? "cloudflare-access" : "development",
      adminApiMode: config.adminApiMode,
      version: config.version,
      commit: config.commit,
    }),
  );
}
