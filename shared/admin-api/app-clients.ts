import { z } from "zod";

import { isoDateTimeSchema, paginatedSchema } from "./common.js";

export const appPlatformSchema = z.enum([
  "android",
  "ios",
  "web",
  "backend",
  "other",
]);

export type AppPlatform = z.infer<typeof appPlatformSchema>;

export const appClientCapabilitySchema = z.object({
  capabilityId: z.string(),
  capabilityName: z.string(),
  kind: z.string(),
  modelId: z.string().nullable(),
  enabled: z.boolean(),
});

export type AppClientCapability = z.infer<typeof appClientCapabilitySchema>;

export const appClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  platform: appPlatformSchema,
  description: z.string(),
  enabled: z.boolean(),
  requireFirebaseUid: z.boolean().default(false),
  capabilities: z.array(appClientCapabilitySchema),
  keyRotatedAt: isoDateTimeSchema.nullable(),
  /**
   * Lowercase SHA-1 digest of the client identity key. Optional so the console
   * keeps working against a gateway that does not expose it yet.
   */
  clientKeySha1: z.string().nullable().optional(),
  /** Returned only once by create or rotate-key; never by list/get. */
  clientKey: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type AppClient = z.infer<typeof appClientSchema>;

export const appClientListSchema = z.object({
  items: z.array(appClientSchema),
});

export type AppClientList = z.infer<typeof appClientListSchema>;

export const appClientCapabilityInputSchema = z.object({
  capabilityId: z.string(),
  modelId: z.string().nullable(),
  enabled: z.boolean(),
});

export type AppClientCapabilityInput = z.infer<
  typeof appClientCapabilityInputSchema
>;

export const appClientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(64).optional(),
  platform: appPlatformSchema,
  description: z.string().trim().max(500),
  enabled: z.boolean(),
  requireFirebaseUid: z.boolean().default(false),
  capabilities: z.array(appClientCapabilityInputSchema),
});

export type AppClientInput = z.infer<typeof appClientInputSchema>;

export const appClientDeleteSchema = z.object({
  deleted: z.boolean(),
});

/** One append-only operator action recorded against an app client. */
export const appClientAuditEntrySchema = z.object({
  id: z.union([z.number(), z.string()]),
  appClientId: z.string(),
  action: z.string(),
  changedBy: z.string().nullable(),
  beforeState: z.record(z.string(), z.unknown()).nullable(),
  afterState: z.record(z.string(), z.unknown()).nullable(),
  changedAt: isoDateTimeSchema,
});

export type AppClientAuditEntry = z.infer<typeof appClientAuditEntrySchema>;

export const appClientAuditListSchema = paginatedSchema(appClientAuditEntrySchema);

export type AppClientAuditList = z.infer<typeof appClientAuditListSchema>;

/**
 * One metadata-only request made by a signed-in user through this app client.
 * The gateway records it when it authenticates X-App-Client-Key.
 */
export const appClientActivityEntrySchema = z.object({
  id: z.union([z.number(), z.string()]),
  appClientId: z.string(),
  uid: z.string(),
  requestId: z.string(),
  capability: z.string(),
  model: z.string().nullable(),
  status: z.string(),
  credits: z.number().int(),
  latencyMs: z.number().int().nullable(),
  createdAt: isoDateTimeSchema,
});

export type AppClientActivityEntry = z.infer<
  typeof appClientActivityEntrySchema
>;

export const appClientActivityListSchema = paginatedSchema(
  appClientActivityEntrySchema,
);

export type AppClientActivityList = z.infer<
  typeof appClientActivityListSchema
>;
