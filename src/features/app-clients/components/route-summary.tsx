import { abilityOrder, type AppClient } from "@shared/admin-api";

import { routedAbilityCount } from "@/features/app-clients/lib/app-client-routes";
import { cn } from "@/lib/utils";

const shortLabels = {
  llm: "L",
  tts: "T",
  stt: "S",
  embeddings: "E",
  vector: "V",
} as const;

export function RouteSummary({ client }: { client: AppClient }) {
  if (!client.routes) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {routedAbilityCount(client)} legacy capabilities
      </span>
    );
  }

  const routed = new Set(
    client.routes
      .filter((route) => route.enabled && route.providerId !== null && route.modelId !== null)
      .map((route) => route.ability),
  );

  return (
    <span
      className="inline-flex items-center gap-2"
      aria-label={routed.size + " of 5 abilities routed"}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {abilityOrder.map((ability) => (
          <span
            key={ability}
            title={(routed.has(ability) ? "Routed: " : "Not routed: ") + ability}
            className={cn(
              "size-1.5 rounded-full",
              routed.has(ability) ? "bg-success" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">{routed.size}/5</span>
      <span className="sr-only">
        {abilityOrder.map((ability) => shortLabels[ability] + (routed.has(ability) ? " routed" : " not routed")).join(", ")}
      </span>
    </span>
  );
}
