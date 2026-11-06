import { Save, TriangleAlert } from "lucide-react";

import {
  abilityLabels,
  abilityOrder,
  type AppClient,
} from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteRow } from "@/features/app-clients/components/route-row";
import { useRouteEditor } from "@/features/app-clients/hooks/use-route-editor";
import { featureFlags } from "@/lib/feature-flags";
import { getErrorMessage } from "@/platform/api";

function LegacyCapabilityMatrix({
  client,
  reason,
}: {
  client: AppClient;
  reason: string;
}) {
  return (
    <>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p>{reason}</p>
      </div>
      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Legacy capability matrix</CardTitle>
          <CardDescription>Read-only. This gateway response has no ability routes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {client.capabilities.length === 0 ? (
            <EmptyState title="No capability grants" description="This client has no legacy capability rows either." />
          ) : (
            <div className="divide-y divide-border">
              {client.capabilities.map((capability) => (
                <div key={capability.capabilityId} className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs">
                  <span className="font-mono text-[11px]">{capability.capabilityId}</span>
                  <span className="text-muted-foreground">{capability.capabilityName}</span>
                  <span className="ml-auto font-mono text-[11px]">{capability.modelId ?? "No model"}</span>
                  <Badge variant={capability.enabled ? "success" : "outline"}>
                    {capability.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function RouteEditor({ client }: { client: AppClient }) {
  const editor = useRouteEditor(client);

  if (!client.routes) {
    return (
      <LegacyCapabilityMatrix
        client={client}
        reason="This gateway does not expose ability routes yet. Showing the legacy capability matrix. Apply migration 0009, migration 0010, and the routing gateway to enable provider selection."
      />
    );
  }

  if (!featureFlags.abilityRoutes) {
    return (
      <LegacyCapabilityMatrix
        client={client}
        reason="Ability routes are disabled by the VITE_ABILITY_ROUTES rollout flag. The legacy matrix is read-only until the flag is re-enabled."
      />
    );
  }

  return (
    <>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Configure one provider and model per ability. The app calls the ability only; it never names the provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {editor.isLoading ? (
            <div className="p-5"><LoadingRows rows={5} /></div>
          ) : editor.loadError ? (
            <ErrorState
              message={getErrorMessage(editor.loadError)}
              onRetry={() => {
                void editor.abilities.refetch();
                void editor.providers.refetch();
              }}
            />
          ) : (
            <div className="divide-y divide-border">
              {abilityOrder.map((ability) => {
                const row = editor.draft.find((item) => item.ability === ability) ?? {
                  ability,
                  providerId: "",
                  modelId: "",
                };
                const label =
                  editor.abilities.data?.items.find((item) => item.id === ability)?.displayName ??
                  abilityLabels[ability];
                return (
                  <RouteRow
                    key={ability}
                    ability={ability}
                    label={label}
                    value={row}
                    providers={editor.providersFor(ability)}
                    models={editor.modelsFor(ability, row.providerId, row.modelId)}
                    disabled={editor.save.isPending || editor.serverChanged}
                    error={editor.rowError === ability ? editor.error ?? undefined : undefined}
                    onProviderChange={(providerId) => editor.changeProvider(ability, providerId)}
                    onModelChange={(modelId) => editor.changeModel(ability, modelId)}
                    onRemove={() => editor.removeRow(ability)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {editor.serverChanged ? (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            This client changed on the gateway. The gateway serializes concurrent saves and the
            last save wins, so reload before saving to review the newer routes.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => editor.reload.mutate()} disabled={editor.reload.isPending}>
            {editor.reload.isPending ? "Reloading…" : "Reload client"}
          </Button>
        </div>
      ) : null}

      {editor.error && !editor.rowError ? (
        <div role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p>{editor.error}</p>
        </div>
      ) : null}

      {editor.notice ? (
        <p role="status" className="mt-4 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">{editor.notice}</p>
      ) : null}

      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap justify-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
        <Button
          type="button"
          variant="outline"
          onClick={editor.discard}
          disabled={editor.save.isPending || !editor.dirty}
        >
          Discard
        </Button>
        <Button
          type="button"
          onClick={editor.saveRoutes}
          disabled={
            editor.save.isPending ||
            !editor.dirty ||
            editor.serverChanged ||
            Boolean(editor.incomplete) ||
            editor.isLoading
          }
        >
          <Save />
          {editor.save.isPending ? "Saving…" : "Save routes"}
        </Button>
      </div>
    </>
  );
}
