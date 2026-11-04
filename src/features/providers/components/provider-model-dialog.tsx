import { useState } from "react";

import {
  abilityLabels,
  type Provider,
  type ProviderCatalogModel,
  type ProviderModelInput,
} from "@shared/admin-api";

import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertProviderModel } from "@/features/providers/mutations/providers.mutations";
import { getErrorMessage } from "@/platform/api";

const costUnits = ["request", "turn", "characters", "seconds", "tokens"];

function configHint(kind: Provider["kind"]) {
  switch (kind) {
    case "tts":
      return "ElevenLabs: defaultVoiceId, outputFormat. Kokoro: defaultVoice.";
    case "vector":
      return "DeepLake: workspace, orgId. The route derives the table from the client identity.";
    case "embeddings":
      return "Optional profile metadata. The model id is the route target.";
    case "llm":
      return "supportsReasoning shows the premium capability in the app manifest.";
    default:
      return "Model-specific defaults. Leave empty when the provider has none.";
  }
}

export function ProviderModelDialog({
  open,
  onOpenChange,
  provider,
  model,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider;
  model?: ProviderCatalogModel | null;
  onSaved?: (model: ProviderCatalogModel) => void;
}) {
  const mutation = useUpsertProviderModel(provider.id);
  const editing = Boolean(model);
  const [modelId, setModelId] = useState(model?.modelId ?? "");
  const [displayName, setDisplayName] = useState(model?.displayName ?? "");
  const [enabled, setEnabled] = useState(model?.enabled ?? true);
  const [configText, setConfigText] = useState(
    JSON.stringify(model?.config ?? {}, null, 2),
  );
  const [costUnit, setCostUnit] = useState(model?.costUnit ?? "request");
  const [costCredits, setCostCredits] = useState(model?.costCredits ?? 0);
  const [costPer, setCostPer] = useState(model?.costPer ?? 1);
  const [sortOrder, setSortOrder] = useState(model?.sortOrder ?? 10);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    let config: unknown;
    try {
      config = JSON.parse(configText || "{}");
    } catch {
      setError("Model config must be valid JSON.");
      return;
    }
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      setError("Model config must be a JSON object.");
      return;
    }
    const input: ProviderModelInput = {
      displayName: displayName.trim() || modelId.trim(),
      ability: provider.kind,
      enabled,
      config: config as Record<string, unknown>,
      costUnit: costUnit.trim(),
      costCredits,
      costPer,
      sortOrder,
    };
    mutation.mutate(
      { modelId: modelId.trim(), input },
      {
        onSuccess: (saved) => {
          onSaved?.(saved);
          onOpenChange(false);
        },
        onError: (mutationError) => setError(getErrorMessage(mutationError)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit model" : "Add model"}
      description={
        editing
          ? "Update the catalog entry. The model ID is immutable."
          : "Advertise a model that can be selected by an app-client route."
      }
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={mutation.isPending || modelId.trim().length === 0}
          >
            {mutation.isPending ? "Saving…" : "Save model"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            htmlFor="model-id"
            label="Model ID"
            hint={editing ? "Immutable. Create a new model to rename it." : "The provider API model identifier."}
          >
            <Input
              id="model-id"
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              placeholder="eleven_turbo_v2_5"
              disabled={editing}
              className="font-mono text-xs"
              spellCheck={false}
              autoFocus={!editing}
            />
          </FormField>
          <FormField htmlFor="model-display-name" label="Display name">
            <Input
              id="model-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="ElevenLabs Turbo v2.5"
            />
          </FormField>
          <FormField
            htmlFor="model-ability"
            label="Ability"
            hint="A model must match its provider kind; the gateway rejects mismatches."
          >
            <Select id="model-ability" value={provider.kind} disabled>
              <option value={provider.kind}>{abilityLabels[provider.kind]}</option>
            </Select>
          </FormField>
          <FormField htmlFor="model-enabled" label="Enabled">
            <div className="flex h-9 items-center gap-2">
              <Switch
                id="model-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Model enabled"
              />
              <span className="text-xs text-muted-foreground">
                {enabled ? "Selectable in routes" : "Hidden from new routes"}
              </span>
            </div>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField htmlFor="model-cost-unit" label="Cost unit">
            <Select
              id="model-cost-unit"
              value={costUnit}
              onChange={(event) => setCostUnit(event.target.value)}
            >
              {costUnits.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </Select>
          </FormField>
          <FormField htmlFor="model-cost-credits" label="Credits">
            <Input
              id="model-cost-credits"
              type="number"
              min={0}
              value={costCredits}
              onChange={(event) => setCostCredits(Number(event.target.value))}
            />
          </FormField>
          <FormField htmlFor="model-cost-per" label="Per units">
            <Input
              id="model-cost-per"
              type="number"
              min={1}
              value={costPer}
              onChange={(event) => setCostPer(Number(event.target.value))}
            />
          </FormField>
        </div>

        <FormField htmlFor="model-sort-order" label="Sort order">
          <Input
            id="model-sort-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </FormField>

        <FormField
          htmlFor="model-config"
          label="Model config (JSON)"
          hint={configHint(provider.kind)}
        >
          <Textarea
            id="model-config"
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
            className="min-h-32 font-mono text-xs"
            spellCheck={false}
          />
        </FormField>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
