import { z } from "zod";

import { isoDateTimeSchema } from "./common.js";

export const modelSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  tier: z.string(),
  capabilityId: z.string().nullable(),
  sortOrder: z.number().int(),
  enabled: z.boolean(),
  minAppVersion: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Model = z.infer<typeof modelSchema>;

export const modelListSchema = z.object({
  items: z.array(modelSchema),
});

export type ModelList = z.infer<typeof modelListSchema>;

export const modelInputSchema = z.object({
  displayName: z.string().min(1).max(120),
  tier: z.string().min(1).max(60),
  capabilityId: z.string().nullable(),
  sortOrder: z.number().int().min(0),
  enabled: z.boolean(),
  minAppVersion: z.string().nullable(),
});

export type ModelInput = z.infer<typeof modelInputSchema>;
