import { z } from "zod";

import { providerCatalogModelSchema } from "./providers.js";

export const abilityIdSchema = z.enum([
  "llm",
  "tts",
  "stt",
  "embeddings",
  "vector",
]);

export type AbilityId = z.infer<typeof abilityIdSchema>;

export const abilityKindSchema = z.enum([
  "chat",
  "tts",
  "stt",
  "embeddings",
  "vector",
]);

export type AbilityKind = z.infer<typeof abilityKindSchema>;

/** One coarse ability and every model that can serve it. */
export const abilitySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  kind: abilityKindSchema.or(z.string()),
  sortOrder: z.number().int(),
  enabled: z.boolean(),
  models: z.array(providerCatalogModelSchema).default([]),
});

export type Ability = z.infer<typeof abilitySchema>;

export const abilityListSchema = z.object({
  items: z.array(abilitySchema),
});

export type AbilityList = z.infer<typeof abilityListSchema>;

export const abilityOrder = [
  "llm",
  "tts",
  "stt",
  "embeddings",
  "vector",
] as const;

export const abilityLabels: Record<(typeof abilityOrder)[number], string> = {
  llm: "Language model",
  tts: "Text to speech",
  stt: "Speech to text",
  embeddings: "Embeddings",
  vector: "Vector storage",
};

/** Maps legacy capability kinds (chat, chat.standard, embeddings.fast) to abilities. */
export function abilityFromLegacyKind(kind: string): string {
  if (kind === "chat") return "llm";
  if (kind.startsWith("chat.")) return "llm";
  if (kind.startsWith("embeddings.")) return "embeddings";
  return kind;
}

export function providerKindForAbility(ability: string): string {
  return ability;
}

export function isProviderKindForAbility(
  providerKind: string | undefined,
  ability: string,
) {
  return providerKind === ability;
}
