import {
  providerInUseDetailsSchema,
  type ProviderUsageRef,
} from "@shared/admin-api";

import { ApiError } from "@/platform/api";

/** Parse the BFF-enriched 409 details without trusting the error body shape. */
export function providerInUseClients(error: unknown): ProviderUsageRef[] {
  if (!(error instanceof ApiError)) return [];
  const parsed = providerInUseDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data.appClients : [];
}

/**
 * The gateway uses distinct 503 codes for distinct operator remedies. Returning
 * one hint keeps provider dialogs from collapsing them into a generic toast.
 */
export function providerErrorHint(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case "SECRET_KEY_NOT_CONFIGURED":
      return "PROVIDER_SECRET_KEY is missing or wrong on the gateway. Fix the gateway key before saving provider credentials.";
    case "CREDENTIAL_MISSING":
      return "This provider has no stored key and no environment bootstrap key. Save an API key or set the provider's bootstrap variable.";
    case "NOT_CONFIGURED":
      return "The gateway provider store is not configured. Check the admin feature and database configuration in Operations.";
    case "PROVIDER_IN_USE":
      return "Move the app-client routes that reference this provider or model before deleting it.";
    default:
      return null;
  }
}
