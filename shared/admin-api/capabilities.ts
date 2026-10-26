import { z } from "zod";

import { isoDateTimeSchema } from "./common.js";

export const providerRouteSchema = z.object({
  id: z.union([z.number(), z.string()]),
  capabilityId: z.string(),
  priority: z.number().int().positive(),
  provider: z.string().min(1),
  model: z.string().min(1),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
});

export type ProviderRoute = z.infer<typeof providerRouteSchema>;

export const capabilitySchema = z.object({
  id: z.string(),
  kind: z.string(),
  displayName: z.string(),
  enabled: z.boolean(),
  streaming: z.string(),
  supportsReasoning: z.boolean(),
  supportsImage: z.boolean(),
  costUnit: z.string(),
  costCredits: z.number().int().positive(),
  costPer: z.number().int().positive(),
  limits: z.record(z.string(), z.unknown()),
  fairUse: z.record(z.string(), z.unknown()),
  minAppVersion: z.string().nullable(),
  revision: z.number().int().nonnegative(),
  providers: z.array(providerRouteSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Capability = z.infer<typeof capabilitySchema>;

export const capabilityListSchema = z.object({
  items: z.array(capabilitySchema),
});

export type CapabilityList = z.infer<typeof capabilityListSchema>;

export const capabilityUpdateSchema = z.object({
  displayName: z.string().min(1).max(120),
  streaming: z.string().min(1),
  supportsReasoning: z.boolean(),
  supportsImage: z.boolean(),
  costUnit: z.string().min(1),
  costCredits: z.number().int().positive(),
  costPer: z.number().int().positive(),
  limits: z.record(z.string(), z.unknown()),
  fairUse: z.record(z.string(), z.unknown()),
  minAppVersion: z.string().nullable(),
});

export type CapabilityUpdate = z.infer<typeof capabilityUpdateSchema>;

export const toggleCapabilitySchema = z.object({
  enabled: z.boolean(),
  reason: z.string().min(10).max(500),
});

export type ToggleCapability = z.infer<typeof toggleCapabilitySchema>;

export const providerRouteInputSchema = z.object({
  priority: z.number().int().positive(),
  provider: z.string().min(1),
  model: z.string().min(1),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
});

export const providersUpdateSchema = z.object({
  providers: z.array(providerRouteInputSchema).min(1),
});

export type ProvidersUpdate = z.infer<typeof providersUpdateSchema>;

export const auditEntrySchema = z.object({
  id: z.union([z.number(), z.string()]),
  capabilityId: z.string(),
  revision: z.number().int().nonnegative(),
  action: z.string(),
  changedBy: z.string().nullable(),
  beforeState: z.record(z.string(), z.unknown()).nullable(),
  afterState: z.record(z.string(), z.unknown()).nullable(),
  changedAt: isoDateTimeSchema,
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditListSchema = z.object({
  items: z.array(auditEntrySchema),
  nextCursor: z.string().nullable(),
});
