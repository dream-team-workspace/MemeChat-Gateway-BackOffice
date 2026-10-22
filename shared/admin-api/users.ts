import { z } from "zod";

import { isoDateTimeSchema, paginatedSchema } from "./common.js";

export const ledgerStateSchema = z.enum([
  "PENDING_SPEND",
  "RESERVED",
  "COMMITTED",
  "REFUND_PENDING",
  "REFUNDED",
  "EXPIRED",
  "FAILED",
]);

export type LedgerState = z.infer<typeof ledgerStateSchema>;

export const ledgerEntrySchema = z.object({
  id: z.union([z.number(), z.string()]),
  uid: z.string(),
  requestId: z.string(),
  capability: z.string(),
  capabilityRevision: z.number().int().nullable(),
  state: ledgerStateSchema,
  reserved: z.number().int(),
  committed: z.number().int().nullable(),
  units: z.number().int().nullable(),
  costUnit: z.string().nullable(),
  unitAmount: z.number().int().nullable(),
  rcTxnId: z.string().nullable(),
  balanceAfter: z.number().int().nullable(),
  spendAttempts: z.number().int(),
  refundAttempts: z.number().int(),
  refundedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const ledgerPageSchema = paginatedSchema(ledgerEntrySchema);

export const usageEventSchema = z.object({
  id: z.union([z.number(), z.string()]),
  uid: z.string(),
  requestId: z.string(),
  capability: z.string(),
  capabilityRevision: z.number().int().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  inputTokens: z.number().int().nullable(),
  outputTokens: z.number().int().nullable(),
  characters: z.number().int().nullable(),
  audioSeconds: z.number().int().nullable(),
  credits: z.number().int(),
  status: z.string(),
  latencyMs: z.number().int().nullable(),
  createdAt: isoDateTimeSchema,
});

export type UsageEvent = z.infer<typeof usageEventSchema>;

export const usagePageSchema = paginatedSchema(usageEventSchema);

export const creditGrantInputSchema = z.object({
  amount: z.number().int().min(1).max(1_000_000),
  reason: z.string().min(10).max(500),
  requestId: z.string().uuid(),
});

export type CreditGrantInput = z.infer<typeof creditGrantInputSchema>;

export const creditGrantResultSchema = z.object({
  uid: z.string(),
  amount: z.number().int(),
  requestId: z.string(),
  balanceAfter: z.number().int().optional(),
  rcTxnId: z.string().optional(),
});

export type CreditGrantResult = z.infer<typeof creditGrantResultSchema>;

export type LedgerPage = z.infer<typeof ledgerPageSchema>;
export type UsagePage = z.infer<typeof usagePageSchema>;
