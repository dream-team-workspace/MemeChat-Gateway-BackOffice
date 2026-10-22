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

export const metaSchema = z.object({
  environment: z.enum(["development", "staging", "production"]),
  authMode: z.enum(["cloudflare-access", "development"]),
  adminApiMode: z.enum(["mock", "live"]),
  version: z.string(),
  commit: z.string().optional(),
});

export type Meta = z.infer<typeof metaSchema>;
