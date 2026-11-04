import { z } from "zod";

import { isoDateTimeSchema } from "./common.js";

/** Coarse ability/provider kind used by the gateway registry. */
export const providerKindSchema = z.enum([
  "llm",
  "tts",
  "stt",
  "embeddings",
  "vector",
]);

export type ProviderKind = z.infer<typeof providerKindSchema>;

/** One model advertised by a provider. This is the full detail shape. */
export const providerCatalogModelSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  ability: providerKindSchema,
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).default({}),
  costUnit: z.string(),
  costCredits: z.number().int(),
  costPer: z.number().int(),
  sortOrder: z.number().int(),
});

export type ProviderCatalogModel = z.infer<typeof providerCatalogModelSchema>;

export const providerCatalogModelListSchema = z.object({
  items: z.array(providerCatalogModelSchema),
});

export type ProviderCatalogModelList = z.infer<
  typeof providerCatalogModelListSchema
>;

export const providerCredentialSchema = z.enum(["configured", "missing"]);

/** Full provider detail. The gateway never returns the plaintext key. */
export const providerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  kind: providerKindSchema,
  baseUrl: z.string(),
  enabled: z.boolean(),
  hasApiKey: z.boolean(),
  configured: z.boolean(),
  apiKeyHint: z.string().nullable(),
  apiKeyUpdatedAt: isoDateTimeSchema.nullable(),
  credential: providerCredentialSchema.or(z.string()),
  config: z.record(z.string(), z.unknown()).default({}),
  models: z.array(providerCatalogModelSchema).default([]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Provider = z.infer<typeof providerSchema>;

export const providerDeleteSchema = z.object({
  deleted: z.boolean(),
});

export type ProviderDelete = z.infer<typeof providerDeleteSchema>;

export const providerInputSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]{1,40}$/, "Use lowercase letters, numbers, and hyphens.")
    .optional(),
  displayName: z.string().trim().min(1).max(120),
  kind: providerKindSchema,
  baseUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Base URL must be an http(s) URL."),
  enabled: z.boolean().default(true),
  apiKey: z.string().trim().min(1).max(4096).optional(),
  clearApiKey: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type ProviderInput = z.infer<typeof providerInputSchema>;

export const providerModelInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  ability: providerKindSchema,
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
  costUnit: z.string().trim().min(1).max(60),
  costCredits: z.number().int().min(0),
  costPer: z.number().int().min(1),
  sortOrder: z.number().int().min(0),
});

export type ProviderModelInput = z.infer<typeof providerModelInputSchema>;
