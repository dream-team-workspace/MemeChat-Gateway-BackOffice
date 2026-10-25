import { useState } from "react";
import { Plus } from "lucide-react";

import type { AppClientCapability } from "@shared/admin-api";

import { EmptyState } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

/**
 * Lets an operator grant one more capability to an app client. The dialog only
 * lists capabilities that are not active yet; routing options come from the
 * gateway's provider catalog for that capability.
 */
export function AddCapabilityDialog({
  open,
  onOpenChange,
  available,
  modelOptions,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: AppClientCapability[];
  modelOptions: Map<string, string[]>;
  onAdd: (capabilityId: string, modelId: string) => void;
}) {
  const [models, setModels] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const capability of available) {
      initial[capability.capabilityId] =
        (modelOptions.get(capability.capabilityId) ?? [])[0] ?? "";
    }
    return initial;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add capability"
      description="Enable a capability and bind it to a model from the routed catalog. Nothing is saved until you save the map."
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      {available.length === 0 ? (
        <EmptyState
          title="Every capability is enabled"
          description="This client already has access to the full registry."
        />
      ) : (
        <div className="divide-y divide-border">
          {available.map((capability) => {
            const options = modelOptions.get(capability.capabilityId) ?? [];
            const selected = models[capability.capabilityId];
            const modelId =
              selected && options.includes(selected) ? selected : (options[0] ?? "");
            return (
              <div key={capability.capabilityId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{capability.capabilityName}</p>
                  <Badge variant="outline">{capability.kind}</Badge>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {capability.capabilityId}
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    id={"add-model-" + capability.capabilityId}
                    value={modelId}
                    onChange={(event) =>
                      setModels((current) => ({
                        ...current,
                        [capability.capabilityId]: event.target.value,
                      }))
                    }
                    aria-label={"Model for " + capability.capabilityId}
                    disabled={options.length === 0}
                  >
                    {options.length === 0 ? (
                      <option value="">No routed model</option>
                    ) : (
                      options.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    )}
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    disabled={!modelId}
                    onClick={() => onAdd(capability.capabilityId, modelId)}
                    title={options.length === 0 ? "Route a model for this capability first" : undefined}
                  >
                    <Plus />
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
