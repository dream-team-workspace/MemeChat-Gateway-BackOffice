function enabled(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

/**
 * Rollout switches for the ability -> provider -> model console. Both default
 * to on; set the Vite variable to "false" to return to the legacy UI.
 */
export const featureFlags = {
  providerKeyManagement: enabled(
    import.meta.env.VITE_PROVIDER_KEY_MANAGEMENT,
    true,
  ),
  abilityRoutes: enabled(import.meta.env.VITE_ABILITY_ROUTES, true),
} as const;
