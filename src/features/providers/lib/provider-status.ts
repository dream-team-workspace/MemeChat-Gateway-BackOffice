import { abilityLabels, type Provider, type ProviderStatus } from "@shared/admin-api";

import type { BadgeProps } from "@/components/ui/badge";

export function providerKindLabel(kind: string | undefined) {
  if (!kind) return "External service";
  return abilityLabels[kind as keyof typeof abilityLabels] ?? kind;
}

export function providerDisplayState(provider: ProviderStatus) {
  if (provider.credentialState === "unreadable") {
    return { label: "Credential error", variant: "destructive" as BadgeProps["variant"] };
  }
  if (provider.credentialState === "missing") {
    return { label: "Key missing", variant: "warning" as BadgeProps["variant"] };
  }
  if (!provider.enabled) {
    return { label: "Disabled", variant: "outline" as BadgeProps["variant"] };
  }
  if (provider.status === "misconfigured") {
    return { label: "Misconfigured", variant: "warning" as BadgeProps["variant"] };
  }
  const check = provider.lastCheck?.status ?? provider.status;
  switch (check) {
    case "healthy":
      return { label: "Healthy", variant: "success" as BadgeProps["variant"] };
    case "degraded":
      return { label: "Degraded", variant: "warning" as BadgeProps["variant"] };
    case "unreachable":
      return { label: "Unreachable", variant: "destructive" as BadgeProps["variant"] };
    case "reachable":
      return { label: "Reachable", variant: "info" as BadgeProps["variant"] };
    case "configured":
      return { label: "Configured", variant: "success" as BadgeProps["variant"] };
    default:
      return { label: "Configured", variant: "success" as BadgeProps["variant"] };
  }
}

export function providerCanCheck(provider: ProviderStatus) {
  return provider.credentialState === "ready" && provider.modelValid;
}

/** The only place the UI turns credential state into operator-facing copy. */
export function providerCredentialSummary(
  provider: Pick<ProviderStatus, "credentialState" | "apiKeyHint"> | Pick<Provider, "credentialState" | "apiKeyHint">,
) {
  switch (provider.credentialState) {
    case "ready":
      return "Key " + (provider.apiKeyHint ?? "configured");
    case "unreadable":
      return "Stored key unusable";
    default:
      return "Key missing";
  }
}

/**
 * Route warnings must distinguish "no key" from "a stored ciphertext cannot be
 * opened"; the remedy is different (add a key vs. fix PROVIDER_SECRET_KEY).
 */
export function providerRouteWarning(
  provider: Pick<ProviderStatus, "credentialState" | "enabled" | "displayName">,
) {
  if (provider.credentialState === "unreadable") {
    return {
      tone: "destructive" as const,
      title: "Stored key cannot be used",
      body: "The gateway cannot decrypt this provider's saved key. Check PROVIDER_SECRET_KEY or replace the key.",
    };
  }
  if (provider.credentialState === "missing") {
    return {
      tone: "warning" as const,
      title: "Provider key is missing",
      body: "Calls routed to this provider return 503 until a key is set.",
    };
  }
  if (!provider.enabled) {
    return {
      tone: "destructive" as const,
      title: "Provider is disabled",
      body: "Calls routed to this provider return 503 until it is enabled.",
    };
  }
  return null;
}
