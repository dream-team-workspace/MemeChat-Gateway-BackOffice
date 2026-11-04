import { abilityLabels, type ProviderStatus } from "@shared/admin-api";

import type { BadgeProps } from "@/components/ui/badge";

export function providerKindLabel(kind: string | undefined) {
  if (!kind) return "External service";
  return abilityLabels[kind as keyof typeof abilityLabels] ?? kind;
}

export function providerDisplayState(provider: ProviderStatus) {
  if (!provider.configured) {
    return { label: "Key missing", variant: "warning" as BadgeProps["variant"] };
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
      return { label: "Key missing", variant: "warning" as BadgeProps["variant"] };
  }
}

export function providerCanCheck(provider: ProviderStatus) {
  return provider.configured && provider.modelValid;
}
