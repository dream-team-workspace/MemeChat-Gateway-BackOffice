import { KeyRound, TriangleAlert } from "lucide-react";

import type { Provider } from "@shared/admin-api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { providerCredentialSummary } from "@/features/providers/lib/provider-status";
import { formatDateTime } from "@/lib/format";

export function ProviderCredentialCard({
  provider,
  canManage,
  onReplace,
  onRemove,
  onFixGatewayKey,
}: {
  provider: Provider;
  canManage: boolean;
  onReplace: () => void;
  onRemove: () => void;
  onFixGatewayKey: () => void;
}) {
  const unreadable = provider.credentialState === "unreadable";
  const missing = provider.credentialState === "missing";
  const state = unreadable
    ? { label: "Credential error", variant: "destructive" as const }
    : missing
      ? { label: "Key missing", variant: "warning" as const }
      : !provider.enabled
        ? { label: "Disabled", variant: "outline" as const }
        : { label: "Configured", variant: "success" as const };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Credential</CardTitle>
          <CardDescription>Write-only API key. Only a masked hint is ever returned.</CardDescription>
        </div>
        <Badge variant={state.variant}>{state.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-accent text-accent-foreground">
            {unreadable ? (
              <TriangleAlert className="size-4 text-destructive" />
            ) : (
              <KeyRound className="size-4" />
            )}
          </span>
          <div>
            <p className="text-sm font-medium">{providerCredentialSummary(provider)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {unreadable
                ? "The saved ciphertext cannot be decrypted with the gateway master key."
                : missing
                  ? "No database key. The gateway may still use an environment bootstrap key."
                  : provider.apiKeyUpdatedAt
                    ? "Updated " + formatDateTime(provider.apiKeyUpdatedAt)
                    : "Stored in the gateway database."}
            </p>
          </div>
        </div>

        {unreadable ? (
          <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] leading-5 text-destructive">
            Replacing the provider key can still fail while the gateway master
            key is wrong. Fix <span className="font-mono">PROVIDER_SECRET_KEY</span> first.
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onReplace}>
              {missing ? "Set key" : "Replace key"}
            </Button>
            {unreadable ? (
              <Button type="button" size="sm" variant="outline" onClick={onFixGatewayKey}>
                Fix gateway key
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={!provider.hasApiKey}
              onClick={onRemove}
            >
              Remove key
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Key management is disabled by rollout flag.</p>
        )}
      </CardContent>
    </Card>
  );
}
