import { z } from "zod";

export const isoDateTimeSchema = z.string();

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(512).optional(),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export const healthSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  version: z.string(),
  commit: z.string().optional(),
  environment: z.enum(["development", "staging", "production"]),
  gateway: z
    .object({
      liveness: z.string(),
      readiness: z.string(),
    })
    .optional(),
});

export type Health = z.infer<typeof healthSchema>;

export const cacheInvalidationSchema = z.object({
  invalidatedAt: isoDateTimeSchema,
  revision: z.number().int().nonnegative().optional(),
});

export type CacheInvalidation = z.infer<typeof cacheInvalidationSchema>;

export const providerModelSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  capability: z.string(),
  default: z.boolean().optional(),
});

export type ProviderModel = z.infer<typeof providerModelSchema>;

export const providerStateSchema = z.enum([
  "configured",
  "unconfigured",
  "misconfigured",
  "healthy",
  "reachable",
  "degraded",
  "unreachable",
]);

export type ProviderState = z.infer<typeof providerStateSchema>;

/**
 * The gateway's persisted probe result. `provider.status` describes current
 * configuration; this object is the last health check written to the database.
 */
export const providerHealthSchema = z.object({
  status: providerStateSchema,
  checkedAt: isoDateTimeSchema,
  latencyMs: z.number().int().nullable(),
  detail: z.string(),
  checkedBy: z.string().nullable(),
});

export type ProviderHealth = z.infer<typeof providerHealthSchema>;

export const providerStatusSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: z.string(),
  capabilities: z.array(z.string()).optional(),
  models: z.array(providerModelSchema).optional(),
  endpoint: z.string(),
  model: z.string(),
  modelValid: z.boolean(),
  apiVersion: z.string().optional(),
  limits: z.record(z.string(), z.unknown()).optional(),
  credential: z.string(),
  configured: z.boolean(),
  status: providerStateSchema,
  detail: z.string(),
  latencyMs: z.number().int().nullable(),
  checkedAt: isoDateTimeSchema.nullable(),
  /** Present once the gateway persists probe results. */
  lastCheck: providerHealthSchema.nullable().optional(),
});

export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export const providerListSchema = z.object({
  items: z.array(providerStatusSchema),
});

export const metaSchema = z.object({
  environment: z.enum(["development", "staging", "production"]),
  authMode: z.enum(["cloudflare-access", "development"]),
  adminApiMode: z.literal("live"),
  version: z.string(),
  commit: z.string().optional(),
});

export type Meta = z.infer<typeof metaSchema>;
