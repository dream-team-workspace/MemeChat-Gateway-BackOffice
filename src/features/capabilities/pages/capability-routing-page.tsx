import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import type { Capability, ProviderRoute, ProviderStatus } from "@shared/admin-api";

import { ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useReplaceProviders } from "@/features/capabilities/mutations/capabilities.mutations";
import { capabilityQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
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

function newRoute(provider?: ProviderStatus, capabilityId?: string): RouteDraft {
  const model =
    provider?.models?.find(
      (candidate) => candidate.capability === capabilityId && candidate.default,
    ) ??
    provider?.models?.find((candidate) => candidate.capability === capabilityId) ??
    provider?.models?.[0];
  return {
    key: crypto.randomUUID(),
    provider: provider?.id ?? "",
    model: model?.id ?? "",
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

  return <CapabilityRoutingEditor key={data.id} capability={data} />;
}

function CapabilityRoutingEditor({ capability }: { capability: Capability }) {
  const mutation = useReplaceProviders(capability.id);
  const providers = useQuery(providersQueryOptions);
  const [routes, setRoutes] = useState<RouteDraft[]>(() =>
    capability.providers.map(toDraft),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const providerItems = providers.data?.items ?? [];
  const compatibleProviders = providerItems.filter(
    (provider) =>
      !provider.capabilities || provider.capabilities.includes(capability.id),
  );

  function providerFor(id: string) {
    return providerItems.find((provider) => provider.id === id);
  }

  function modelsFor(providerId: string, current: string) {
    const provider = providerFor(providerId);
    const models = (provider?.models ?? []).filter(
      (model) => model.capability === capability.id,
    );
    return current && !models.some((model) => model.id === current)
      ? [...models, { id: current, capability: capability.id }]
      : models;
  }

  function updateRoute(key: string, patch: Partial<RouteDraft>) {
    setRoutes((current) =>
      current.map((route) => (route.key === key ? { ...route, ...patch } : route)),
    );
    setSaved(null);
  }

  function updateProvider(key: string, providerId: string) {
    const provider = providerFor(providerId);
    const model =
      provider?.models?.find(
        (candidate) =>
          candidate.capability === capability.id && candidate.default,
      ) ??
      provider?.models?.find(
        (candidate) => candidate.capability === capability.id,
      );
    updateRoute(key, {
      provider: providerId,
      model: model?.id ?? "",
    });
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
      const provider = providerFor(route.provider);
      if (!provider || (provider.capabilities && !provider.capabilities.includes(capability.id))) {
        setSaveError("Provider " + route.provider + " cannot route " + capability.id + ".");
        return;
      }
      const model = provider.models?.find((candidate) => candidate.id === route.model);
      if (!model || model.capability !== capability.id) {
        setSaveError(
          "Model " + route.model + " is not catalogued for " + capability.id + " on " + provider.displayName + ".",
        );
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
              Tried in order. Providers are limited to catalogs containing a model for {capability.id};
              models are limited to that capability. Disabled routes are skipped.
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
                  <Select
                    id={"provider-" + route.key}
                    value={route.provider}
                    onChange={(event) => updateProvider(route.key, event.target.value)}
                  >
                    <option value="">Select provider</option>
                    {compatibleProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </option>
                    ))}
                    {route.provider && !compatibleProviders.some((provider) => provider.id === route.provider) ? (
                      <option value={route.provider}>
                        {route.provider} (unsupported for {capability.id})
                      </option>
                    ) : null}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={"model-" + route.key} className="text-xs font-semibold">Model</label>
                  <Select
                    id={"model-" + route.key}
                    value={route.model}
                    onChange={(event) => updateRoute(route.key, { model: event.target.value })}
                    disabled={!route.provider}
                  >
                    <option value="">Select model</option>
                    {modelsFor(route.provider, route.model).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.id}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor={"config-" + route.key} className="text-xs font-semibold">Config JSON</label>
                  <Textarea id={"config-" + route.key} value={route.configText} onChange={(event) => updateRoute(route.key, { configText: event.target.value })} className="min-h-20 font-mono text-xs" spellCheck={false} />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRoutes((current) => [
                ...current,
                newRoute(compatibleProviders[0], capability.id),
              ])
            }
            disabled={compatibleProviders.length === 0}
          >
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
