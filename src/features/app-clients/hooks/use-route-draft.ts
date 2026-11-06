import {
  abilityOrder,
  type AbilityId,
  type AppClientRoute,
  type AppClientRouteInput,
} from "@shared/admin-api";

export type RouteDraft = {
  ability: AbilityId;
  providerId: string;
  modelId: string;
};

export function toRouteDraft(routes?: AppClientRoute[]): RouteDraft[] {
  return abilityOrder.map((ability) => {
    const route = routes?.find(
      (item) =>
        item.ability === ability &&
        item.enabled &&
        item.providerId !== null &&
        item.modelId !== null,
    );
    return {
      ability,
      providerId: route?.providerId ?? "",
      modelId: route?.modelId ?? "",
    };
  });
}

export function routeInputs(draft: RouteDraft[]): AppClientRouteInput[] {
  return draft
    .filter((row) => row.providerId !== "" && row.modelId !== "")
    .map((row) => ({
      ability: row.ability,
      providerId: row.providerId,
      modelId: row.modelId,
      enabled: true,
    }));
}

export function routesEqual(a: RouteDraft[], b: RouteDraft[]) {
  return abilityOrder.every((ability) => {
    const left = a.find((row) => row.ability === ability);
    const right = b.find((row) => row.ability === ability);
    return left?.providerId === right?.providerId && left?.modelId === right?.modelId;
  });
}

export function firstIncomplete(draft: RouteDraft[]): RouteDraft | null {
  return (
    draft.find(
      (row) =>
        (row.providerId === "") !== (row.modelId === ""),
    ) ?? null
  );
}
