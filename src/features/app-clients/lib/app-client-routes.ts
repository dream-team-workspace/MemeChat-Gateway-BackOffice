import type { AppClient, AppClientRouteInput } from "@shared/admin-api";

/**
 * Converts the client's current routes into the mutation shape. Metadata-only
 * edits must send this so the gateway does not derive routes from the legacy
 * capability mirror and silently replace the operator's selection.
 */
export function routeInputsForMetadataEdit(
  client?: AppClient | null,
): AppClientRouteInput[] | undefined {
  if (!client?.routes) return undefined;
  return client.routes
    .filter(
      (route) =>
        route.enabled &&
        route.providerId !== null &&
        route.modelId !== null,
    )
    .map((route) => ({
      ability: route.ability as AppClientRouteInput["ability"],
      providerId: route.providerId ?? "",
      modelId: route.modelId ?? "",
      enabled: true,
    }));
}
