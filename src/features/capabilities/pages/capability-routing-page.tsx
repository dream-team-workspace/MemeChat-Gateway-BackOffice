import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import type { Capability, ProviderRoute } from "@shared/admin-api";

import { ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useReplaceProviders } from "@/features/capabilities/mutations/capabilities.mutations";
import { capabilityQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { getErrorMessage } from "@/platform/api";

type RouteDraft = {
  key: string;
  provider: string;
  model: string;
  enabled: boolean;
  configText: string;
};

function toDraft(route: ProviderRoute): RouteDraft {
  return {
    key: String(route.id),
    provider: route.provider,
    model: route.model,
    enabled: route.enabled,
    configText: JSON.stringify(route.config, null, 2),
  };
}

function newRoute(): RouteDraft {
  return {
    key: crypto.randomUUID(),
    provider: "",
    model: "",
    enabled: true,
    configText: "{}",
  };
}

export function CapabilityRoutingPage() {
  const { capabilityId } = useParams({ from: "/app/capabilities/$capabilityId" });
  const { data, isLoading, isError, error, refetch } = useQuery(
    capabilityQueryOptions(capabilityId),
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5"><LoadingRows rows={4} /></CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        </CardContent>
      </Card>
    );
  }

  return <CapabilityRoutingEditor key={data.revision} capability={data} />;
}

function CapabilityRoutingEditor({ capability }: { capability: Capability }) {
  const mutation = useReplaceProviders(capability.id);
  const [routes, setRoutes] = useState<RouteDraft[]>(() =>
    capability.providers.map(toDraft),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function updateRoute(key: string, patch: Partial<RouteDraft>) {
    setRoutes((current) =>
      current.map((route) => (route.key === key ? { ...route, ...patch } : route)),
    );
    setSaved(null);
  }

  function move(index: number, direction: -1 | 1) {
    setRoutes((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
    setSaved(null);
  }

  function remove(key: string) {
    setRoutes((current) =>
      current.length <= 1 ? current : current.filter((route) => route.key !== key),
    );
    setSaved(null);
  }

  function save() {
    setSaveError(null);
    setSaved(null);
    if (routes.length === 0) {
      setSaveError("At least one provider route is required.");
      return;
    }
    if (!routes.some((route) => route.enabled)) {
      setSaveError("At least one provider route must be enabled.");
      return;
    }

    const providers = [];
    for (const route of routes) {
      if (!route.provider.trim() || !route.model.trim()) {
        setSaveError("Every route needs a provider and model.");
        return;
      }
      let config: unknown;
      try {
        config = JSON.parse(route.configText);
      } catch {
        setSaveError("Provider config must be valid JSON.");
        return;
      }
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        setSaveError("Provider config must be a JSON object.");
        return;
      }
      providers.push({
        priority: providers.length + 1,
        provider: route.provider.trim(),
        model: route.model.trim(),
        enabled: route.enabled,
        config: config as Record<string, unknown>,
      });
    }

    mutation.mutate(
      { providers },
      {
        onSuccess: (updated) => {
          setRoutes(updated.providers.map(toDraft));
          setSaved("Provider chain saved at revision " + updated.revision + ".");
        },
        onError: (mutationError) => setSaveError(getErrorMessage(mutationError)),
      },
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Provider routing</CardTitle>
            <CardDescription>
              Tried in order. Disabled routes are skipped. At least one must remain enabled.
            </CardDescription>
          </div>
          <Badge variant="outline">{routes.length} routes</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {routes.map((route, index) => (
            <div key={route.key} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={route.enabled ? "info" : "outline"}>Priority {index + 1}</Badge>
                {index === 0 && route.enabled ? <Badge variant="success">Primary</Badge> : null}
                <div className="ml-auto flex items-center gap-1">
                  <Switch
                    checked={route.enabled}
                    onCheckedChange={(enabled) => updateRoute(route.key, { enabled })}
                    aria-label={"Enable route " + String(index + 1)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move route up">
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === routes.length - 1} aria-label="Move route down">
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(route.key)} disabled={routes.length <= 1} aria-label="Remove route">
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor={"provider-" + route.key} className="text-xs font-semibold">Provider</label>
                  <Input id={"provider-" + route.key} value={route.provider} onChange={(event) => updateRoute(route.key, { provider: event.target.value })} placeholder="e.g. opencode" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={"model-" + route.key} className="text-xs font-semibold">Model</label>
                  <Input id={"model-" + route.key} value={route.model} onChange={(event) => updateRoute(route.key, { model: event.target.value })} placeholder="e.g. deepseek-v4.1-flash" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor={"config-" + route.key} className="text-xs font-semibold">Config JSON</label>
                  <Textarea id={"config-" + route.key} value={route.configText} onChange={(event) => updateRoute(route.key, { configText: event.target.value })} className="min-h-20 font-mono text-xs" spellCheck={false} />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setRoutes((current) => [...current, newRoute()])}>
            <Plus />
            Add route
          </Button>
        </CardContent>
      </Card>

      {saveError ? (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{saveError}</p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">{saved}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setRoutes(capability.providers.map(toDraft))} disabled={mutation.isPending}>Reset</Button>
        <Button type="button" onClick={save} disabled={mutation.isPending}>
          <Save />
          {mutation.isPending ? "Saving…" : "Save provider chain"}
        </Button>
      </div>
    </div>
  );
}
