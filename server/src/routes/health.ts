import type { Context } from "hono";

import { healthSchema, metaSchema } from "../../../shared/admin-api/index.js";
import { config } from "../config.js";
import type { AppEnv } from "../types.js";

type Probe = "ok" | "missing" | "down";

async function probe(path: string): Promise<Probe> {
  try {
    const response = await fetch(config.adminApiBaseUrl + path, {
      signal: AbortSignal.timeout(2_000),
    });
    if (response.status === 404) return "missing";
    return response.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

export async function healthHandler(c: Context<AppEnv>) {
  const liveness = await probe("/healthz");
  const readiness = await probe("/readyz");
  const gateway = {
    liveness,
    readiness: readiness === "missing" ? "not_configured" : readiness,
  };
  const status =
    gateway.liveness === "ok" &&
    (gateway.readiness === "ok" || gateway.readiness === "not_configured")
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
      version: config.version,
      commit: config.commit,
      adminApiMode: config.adminApiMode,
    }),
  );
}
