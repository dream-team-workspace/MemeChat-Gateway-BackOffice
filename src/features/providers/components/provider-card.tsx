import { useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  Cpu,
  Database,
  Mic,
  Plug,
  RefreshCw,
  Volume2,
} from "lucide-react";

import { abilityFromLegacyKind, type ProviderStatus } from "@shared/admin-api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  providerCanCheck,
  providerCredentialSummary,
  providerDisplayState,
  providerKindLabel,
} from "@/features/providers/lib/provider-status";
import { useCheckProvider } from "@/features/providers/mutations/providers.mutations";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const providerIcons = {
  opencode: Cpu,
  elevenlabs: Volume2,
  salad: Mic,
  kokoro: Volume2,
  voyage: Database,
  deeplake: Boxes,
} as const;

export function ProviderCard({ provider }: { provider: ProviderStatus }) {
  const navigate = useNavigate();
  const check = useCheckProvider();
  const state = providerDisplayState(provider);
  const Icon = providerIcons[provider.id as keyof typeof providerIcons] ?? Plug;
  const abilities = Array.from(
    new Set((provider.models ?? []).map((model) => abilityFromLegacyKind(model.capability))),
  );
  const last = provider.lastCheck ?? null;
  const checkedAt = last?.checkedAt ?? provider.checkedAt;
  const latency = last?.latencyMs ?? provider.latencyMs;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{provider.displayName}</CardTitle>
            <CardDescription>{providerKindLabel(provider.kind ?? undefined)}</CardDescription>
          </div>
        </div>
        <Badge variant={state.variant} className="shrink-0">{state.label}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={provider.endpoint}>
          {provider.endpoint || "No base URL"}
        </p>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Credential</dt>
            <dd
              className={cn(
                "mt-1 font-medium",
                provider.credentialState !== "ready" && "text-warning",
              )}
            >
              {providerCredentialSummary(provider)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Models</dt>
            <dd className="mt-1 font-medium">{provider.models?.length ?? 0} catalogued</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Last check</dt>
            <dd className="mt-1">
              {checkedAt ? formatDateTime(checkedAt) : "Never checked"}
              {latency !== null && latency !== undefined ? " · " + formatNumber(latency) + " ms" : ""}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-1.5">
          {abilities.length > 0 ? (
            abilities.map((ability) => (
              <Badge key={ability} variant="outline">{providerKindLabel(ability)}</Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No models yet</span>
          )}
        </div>

        <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
          {provider.detail}
        </p>

        {check.isError ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {getErrorMessage(check.error)}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void navigate({ to: "/providers/$providerId", params: { providerId: provider.id } })}
          >
            Manage
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => check.mutate(provider.id)}
            disabled={!providerCanCheck(provider) || check.isPending}
            title={providerCanCheck(provider) ? "Run a safe health probe" : "Add a key and model before checking"}
          >
            <RefreshCw className={cn(check.isPending && "animate-spin")} />
            {check.isPending ? "Checking…" : "Check health"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
