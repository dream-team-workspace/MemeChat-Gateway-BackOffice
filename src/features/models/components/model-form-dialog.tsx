import { useState } from "react";

import { modelInputSchema, type Capability, type Model } from "@shared/admin-api";

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

export function ModelFormDialog({
  open,
  onOpenChange,
  model,
  capabilities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  capabilities: Capability[];
}) {
  const [draft, setDraft] = useState<Draft>(model ? fromModel(model) : emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpsertModel();

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError(null);
  }

  function save() {
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
    if (!draft.id.trim()) {
      setError("Model ID is required.");
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
      description="The app model picker. IDs are path keys and cannot be renamed after creation."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save model"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="model-id" className="text-xs font-semibold">Model ID</label>
          <Input
            id="model-id"
            value={draft.id}
            onChange={(event) => patch({ id: event.target.value })}
            readOnly={Boolean(model)}
            className="font-mono text-xs"
            placeholder="deepseek-v4-flash"
          />
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
          <Select id="model-capability" value={draft.capabilityId} onChange={(event) => patch({ capabilityId: event.target.value })}>
            <option value="">None</option>
            {capabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>{capability.id}</option>
            ))}
          </Select>
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
