import { useState } from "react";

import {
  modelInputSchema,
  type Capability,
  type Model,
  type ProviderModel,
  type ProviderStatus,
} from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpsertModel } from "@/features/models/mutations/models.mutations";
import { getErrorMessage } from "@/platform/api";

type Draft = {
  id: string;
  displayName: string;
  tier: string;
  capabilityId: string;
  sortOrder: string;
  enabled: boolean;
  minAppVersion: string;
};

function emptyDraft(): Draft {
  return {
    id: "",
    displayName: "",
    tier: "standard",
    capabilityId: "",
    sortOrder: "0",
    enabled: true,
    minAppVersion: "",
  };
}

function fromModel(model: Model): Draft {
  return {
    id: model.id,
    displayName: model.displayName,
    tier: model.tier,
    capabilityId: model.capabilityId ?? "",
    sortOrder: String(model.sortOrder),
    enabled: model.enabled,
    minAppVersion: model.minAppVersion ?? "",
  };
}

function modelDisplayName(model: ProviderModel) {
  return (
    model.displayName ??
    model.id
      .split(/[-_.]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function inferTier(capabilityId: string) {
  if (capabilityId === "chat.premium") return "premium";
  if (capabilityId.startsWith("embeddings.")) return "balanced";
  return "standard";
}

function inferProviderId(model: Model | null, providers: ProviderStatus[]) {
  if (model) {
    const byModel = providers.find((provider) =>
      provider.models?.some((candidate) => candidate.id === model.id),
    );
    if (byModel) return byModel.id;
    if (model.capabilityId) {
      const byCapability = providers.find((provider) =>
        provider.capabilities?.includes(model.capabilityId ?? ""),
      );
      if (byCapability) return byCapability.id;
    }
  }
  return providers.find((provider) => (provider.models?.length ?? 0) > 0)?.id ?? "";
}

export function ModelFormDialog({
  open,
  onOpenChange,
  model,
  capabilities,
  providers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  capabilities: Capability[];
  providers: ProviderStatus[];
}) {
  const [providerId, setProviderId] = useState(() =>
    inferProviderId(model, providers),
  );
  const [draft, setDraft] = useState<Draft>(model ? fromModel(model) : emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpsertModel();

  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const providerModels = selectedProvider?.models ?? [];
  const selectedModel = providerModels.find((candidate) => candidate.id === draft.id);
  const modelOptions =
    draft.id && !selectedModel
      ? [...providerModels, { id: draft.id, capability: draft.capabilityId }]
      : providerModels;

  const compatibleCapabilities = capabilities.filter(
    (capability) =>
      !selectedProvider?.capabilities ||
      selectedProvider.capabilities.includes(capability.id),
  );
  const mappedCapability = selectedModel?.capability;
  const capabilityOptions = mappedCapability
    ? compatibleCapabilities.filter((capability) => capability.id === mappedCapability)
    : compatibleCapabilities;

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError(null);
  }

  function applyModel(providerModel: ProviderModel) {
    patch({
      id: providerModel.id,
      displayName: modelDisplayName(providerModel),
      capabilityId: providerModel.capability,
      tier: inferTier(providerModel.capability),
    });
  }

  function selectProvider(nextProviderId: string) {
    const provider = providers.find((item) => item.id === nextProviderId);
    setProviderId(nextProviderId);
    const defaultModel =
      provider?.models?.find((candidate) => candidate.default) ??
      provider?.models?.[0];
    if (defaultModel) {
      setDraft({
        ...emptyDraft(),
        id: defaultModel.id,
        displayName: modelDisplayName(defaultModel),
        capabilityId: defaultModel.capability,
        tier: inferTier(defaultModel.capability),
      });
      setError(null);
    } else {
      setDraft(emptyDraft());
    }
  }

  function save() {
    if (!draft.id.trim()) {
      setError("Select a model from the provider catalog.");
      return;
    }
    if (!selectedProvider || !selectedModel) {
      setError("The selected model is not in this provider's catalog.");
      return;
    }
    if (draft.capabilityId !== selectedModel.capability) {
      setError("Capability must match the selected model's catalog mapping.");
      return;
    }

    const parsed = modelInputSchema.safeParse({
      displayName: draft.displayName,
      tier: draft.tier,
      capabilityId: draft.capabilityId || null,
      sortOrder: Number(draft.sortOrder),
      enabled: draft.enabled,
      minAppVersion: draft.minAppVersion.trim() || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form values.");
      return;
    }

    mutation.mutate(
      { id: draft.id.trim(), input: parsed.data },
      {
        onSuccess: () => onOpenChange(false),
        onError: (mutationError) => setError(getErrorMessage(mutationError)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
      title={model ? "Edit model" : "Add model"}
      description="Provider catalogs determine the model list; each model maps to exactly one capability."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={mutation.isPending || providers.length === 0}>
            {mutation.isPending ? "Saving…" : "Save model"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="model-provider" className="text-xs font-semibold">Provider</label>
          <Select
            id="model-provider"
            value={providerId}
            onChange={(event) => selectProvider(event.target.value)}
            disabled={Boolean(model) || providers.length === 0}
          >
            <option value="">Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="model-id" className="text-xs font-semibold">Model</label>
          {model ? (
            <Input id="model-id" value={draft.id} readOnly className="font-mono text-xs" />
          ) : (
            <Select
              id="model-id"
              value={draft.id}
              onChange={(event) => {
                const option = providerModels.find((candidate) => candidate.id === event.target.value);
                if (option) applyModel(option);
              }}
              disabled={!selectedProvider}
            >
              <option value="">Select model</option>
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.id}</option>
              ))}
            </Select>
          )}
          <p className="text-[11px] text-muted-foreground">
            Catalog: {selectedProvider?.displayName ?? "select a provider"}.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="model-name" className="text-xs font-semibold">Display name</label>
          <Input id="model-name" value={draft.displayName} onChange={(event) => patch({ displayName: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="model-tier" className="text-xs font-semibold">Tier</label>
          <Input id="model-tier" value={draft.tier} onChange={(event) => patch({ tier: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="model-capability" className="text-xs font-semibold">Capability</label>
          <Select
            id="model-capability"
            value={draft.capabilityId}
            onChange={(event) => patch({ capabilityId: event.target.value })}
            disabled={Boolean(mappedCapability)}
          >
            <option value="">None</option>
            {(capabilityOptions.length > 0 ? capabilityOptions : compatibleCapabilities).map((capability) => (
              <option key={capability.id} value={capability.id}>{capability.id}</option>
            ))}
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {mappedCapability
              ? "Derived from the selected model."
              : "Select a catalogue model to derive the capability."}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="model-sort" className="text-xs font-semibold">Sort order</label>
          <Input id="model-sort" type="number" step={1} value={draft.sortOrder} onChange={(event) => patch({ sortOrder: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="model-min-version" className="text-xs font-semibold">Minimum app version</label>
          <Input id="model-min-version" value={draft.minAppVersion} onChange={(event) => patch({ minAppVersion: event.target.value })} placeholder="e.g. 2.4.0" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-xs font-semibold">Enabled</p>
            <p className="text-[11px] text-muted-foreground">Show in the app picker.</p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(enabled) => patch({ enabled })} aria-label="Model enabled" />
        </div>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p> : null}
    </Dialog>
  );
}
