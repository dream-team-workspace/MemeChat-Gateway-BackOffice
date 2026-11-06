import { Link } from "@tanstack/react-router";
import { TriangleAlert, X } from "lucide-react";

import {
  type AbilityId,
  type ProviderCatalogModel,
  type ProviderStatus,
} from "@shared/admin-api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { providerRouteWarning } from "@/features/providers/lib/provider-status";
import { cn } from "@/lib/utils";

function providerOptionSuffix(provider: ProviderStatus) {
  if (provider.credentialState === "unreadable") return " · credential error";
  if (provider.credentialState === "missing") return " · key missing";
  if (!provider.enabled) return " · disabled";
  return "";
}

export function RouteRow({
  ability,
  label,
  value,
  providers,
  models,
  disabled,
  error,
  onProviderChange,
  onModelChange,
  onRemove,
}: {
  ability: AbilityId;
  label: string;
  value: { providerId: string; modelId: string };
  providers: ProviderStatus[];
  models: ProviderCatalogModel[];
  disabled: boolean;
  error?: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  onRemove: () => void;
}) {
  const provider = providers.find((item) => item.id === value.providerId);
  const selectedModel = models.find((item) => item.modelId === value.modelId);
  const selectedProviderMissing =
    value.providerId !== "" && !providers.some((item) => item.id === value.providerId);
  const selectedModelMissing =
    value.modelId !== "" && !models.some((item) => item.modelId === value.modelId);
  const routed = value.providerId !== "" && value.modelId !== "";
  const warning = provider ? providerRouteWarning(provider) : null;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Badge variant="outline">{ability}</Badge>
        {routed ? (
          <Badge variant="success">Configured</Badge>
        ) : (
          <Badge variant="outline">Not routed</Badge>
        )}
        {value.providerId !== "" || value.modelId !== "" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={disabled}
          >
            <X />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={"route-provider-" + ability} className="text-[11px] font-semibold text-muted-foreground">
            Provider
          </label>
          <Select
            id={"route-provider-" + ability}
            value={value.providerId}
            onChange={(event) => onProviderChange(event.target.value)}
            disabled={disabled || providers.length === 0}
            aria-label={"Provider for " + label}
          >
            <option value="">Select provider</option>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}{providerOptionSuffix(item)}
              </option>
            ))}
            {selectedProviderMissing ? (
              <option value={value.providerId}>{value.providerId} (not in registry)</option>
            ) : null}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={"route-model-" + ability} className="text-[11px] font-semibold text-muted-foreground">
            Model
          </label>
          <Select
            id={"route-model-" + ability}
            value={value.modelId}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={disabled || value.providerId === "" || models.length === 0}
            aria-label={"Model for " + label}
          >
            <option value="">Select model</option>
            {models.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.displayName || model.modelId}{model.enabled ? "" : " (disabled)"}
              </option>
            ))}
            {selectedModelMissing ? (
              <option value={value.modelId}>{value.modelId} (not catalogued)</option>
            ) : null}
          </Select>
        </div>
      </div>

      {providers.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No provider serves this ability. <Link to="/providers" className="underline">Add one</Link> first.
        </p>
      ) : value.providerId !== "" && models.length === 0 ? (
        <p className="mt-2 text-[11px] text-warning">
          This provider has no model for {label}. <Link to="/providers/$providerId" params={{ providerId: value.providerId }} className="underline">Add a model</Link> before routing.
        </p>
      ) : null}

      {warning ? (
        <div
          role="status"
          className={cn(
            "mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-[11px]",
            warning.tone === "destructive"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <p>
            <span className="font-medium">{warning.title}.</span> {warning.body}{" "}
            <Link to="/providers/$providerId" params={{ providerId: provider?.id ?? "" }} className="underline">
              Open provider
            </Link>
          </p>
        </div>
      ) : null}

      {selectedModel && !selectedModel.enabled ? (
        <p role="alert" className="mt-2 text-[11px] font-medium text-warning">
          The selected model is disabled. Choose an enabled model before saving.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
