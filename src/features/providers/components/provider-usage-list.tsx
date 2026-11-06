import { Link } from "@tanstack/react-router";

import type { ProviderUsageRef } from "@shared/admin-api";

export function ProviderUsageList({ references }: { references: ProviderUsageRef[] }) {
  if (references.length === 0) {
    return (
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        The gateway blocked this delete but did not return a referencing client.
        Reload the app-client list and reassign any route that names this
        provider or model.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Referenced by {references.length} app client {references.length === 1 ? "route" : "routes"}
      </div>
      <ul className="divide-y divide-border">
        {references.map((reference) => (
          <li key={reference.appClientId + ":" + reference.ability + ":" + (reference.modelId ?? "")}>
            <Link
              to="/app-clients/$clientId"
              params={{ clientId: reference.appClientId }}
              className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs hover:bg-accent/40"
            >
              <span className="font-medium">{reference.appClientName}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{reference.appClientSlug}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {reference.ability}
                {reference.modelId ? " · " + reference.modelId : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
