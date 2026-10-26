import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import type { Capability, CapabilityUpdate } from "@shared/admin-api";

import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCapability } from "@/features/capabilities/mutations/capabilities.mutations";
import { getErrorMessage } from "@/platform/api";
import { zodResolver } from "@/lib/zod-resolver";
import { formatJson } from "@/lib/format";

function isJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

const formSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(120),
  streaming: z.string().min(1),
  supportsReasoning: z.boolean(),
  supportsImage: z.boolean(),
  costUnit: z.string().min(1),
  costCredits: z.number().int().positive("Must be a positive integer."),
  costPer: z.number().int().positive("Must be a positive integer."),
  minAppVersion: z.string(),
  limitsText: z.string().refine(isJsonObject, "Limits must be a JSON object."),
  fairUseText: z.string().refine(isJsonObject, "Fair use must be a JSON object."),
});

type FormValues = z.infer<typeof formSchema>;

function toForm(capability: Capability): FormValues {
  return {
    displayName: capability.displayName,
    streaming: capability.streaming,
    supportsReasoning: capability.supportsReasoning,
    supportsImage: capability.supportsImage,
    costUnit: capability.costUnit,
    costCredits: capability.costCredits,
    costPer: capability.costPer,
    minAppVersion: capability.minAppVersion ?? "",
    limitsText: formatJson(capability.limits),
    fairUseText: formatJson(capability.fairUse),
  };
}

function toUpdate(values: FormValues): CapabilityUpdate {
  return {
    displayName: values.displayName.trim(),
    streaming: values.streaming,
    supportsReasoning: values.supportsReasoning,
    supportsImage: values.supportsImage,
    costUnit: values.costUnit,
    costCredits: values.costCredits,
    costPer: values.costPer,
    limits: JSON.parse(values.limitsText) as Record<string, unknown>,
    fairUse: JSON.parse(values.fairUseText) as Record<string, unknown>,
    minAppVersion: values.minAppVersion.trim() || null,
  };
}

const changedLabels: Record<keyof CapabilityUpdate, string> = {
  displayName: "Display name",
  streaming: "Streaming mode",
  supportsReasoning: "Reasoning support",
  supportsImage: "Image support",
  costUnit: "Cost unit",
  costCredits: "Credits per unit",
  costPer: "Units per credit",
  limits: "Limits JSON",
  fairUse: "Fair use JSON",
  minAppVersion: "Minimum app version",
};

export function CapabilityConfigurationForm({ capability }: { capability: Capability }) {
  const [review, setReview] = useState<CapabilityUpdate | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutation = useUpdateCapability(capability.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toForm(capability),
  });

  const changed = useMemo(() => {
    if (!review) return [];
    return (Object.keys(review) as Array<keyof CapabilityUpdate>).filter(
      (key) => JSON.stringify(review[key]) !== JSON.stringify((capability as unknown as CapabilityUpdate)[key]),
    );
  }, [capability, review]);

  function onSubmit(values: FormValues) {
    setMutationError(null);
    setSaved(null);
    try {
      setReview(toUpdate(values));
    } catch {
      form.setError("limitsText", { message: "Limits and fair use must be valid JSON." });
    }
  }

  function confirm() {
    if (!review) return;
    mutation.mutate(review, {
      onSuccess: (updated) => {
        setReview(null);
        setSaved("Saved revision " + updated.revision + ".");
        form.reset(toForm(updated));
      },
      onError: (error) => setMutationError(getErrorMessage(error)),
    });
  }

  const errors = form.formState.errors;

  return (
    <>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="displayName" label="Display name" error={errors.displayName?.message}>
              <Input id="displayName" {...form.register("displayName")} />
            </FormField>
            <FormField htmlFor="kind" label="Kind" hint="Kind is immutable in this console.">
              <Input id="kind" value={capability.kind} readOnly className="bg-muted" />
            </FormField>
            <FormField htmlFor="streaming" label="Streaming" error={errors.streaming?.message}>
              <Select id="streaming" {...form.register("streaming")}>
                <option value="sse">SSE</option>
                <option value="chunked-audio">Chunked audio</option>
                <option value="none">None</option>
              </Select>
            </FormField>
            <FormField htmlFor="minAppVersion" label="Minimum app version">
              <Input id="minAppVersion" placeholder="e.g. 2.4.0" {...form.register("minAppVersion")} />
            </FormField>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 sm:col-span-1">
              <div>
                <p className="text-xs font-semibold">Reasoning support</p>
                <p className="text-[11px] text-muted-foreground">Premium chat style thinking output.</p>
              </div>
              <Controller
                control={form.control}
                name="supportsReasoning"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Reasoning support" />
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 sm:col-span-1">
              <div>
                <p className="text-xs font-semibold">Image support</p>
                <p className="text-[11px] text-muted-foreground">The app may attach one image.</p>
              </div>
              <Controller
                control={form.control}
                name="supportsImage"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Image support" />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commercial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField htmlFor="costUnit" label="Cost unit" error={errors.costUnit?.message}>
              <Select id="costUnit" {...form.register("costUnit")}>
                <option value="turn">Turn</option>
                <option value="chars">Characters</option>
                <option value="seconds">Seconds</option>
                <option value="tokens">Tokens</option>
              </Select>
            </FormField>
            <FormField htmlFor="costCredits" label="Credits" error={errors.costCredits?.message}>
              <Input id="costCredits" type="number" min={1} step={1} {...form.register("costCredits", { valueAsNumber: true })} />
            </FormField>
            <FormField htmlFor="costPer" label="Per units" error={errors.costPer?.message}>
              <Input id="costPer" type="number" min={1} step={1} {...form.register("costPer", { valueAsNumber: true })} />
            </FormField>
            <p className="text-[11px] text-muted-foreground sm:col-span-3">
              Current formula: <span className="font-medium text-foreground">{capability.costCredits} CRD per {capability.costPer} {capability.costUnit}</span>. Changes apply to new requests.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits &amp; fair use</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <FormField htmlFor="limitsText" label="Limits JSON" error={errors.limitsText?.message} hint="Preserved as an object; validate against the capability kind.">
              <Textarea id="limitsText" className="min-h-44 font-mono text-xs" spellCheck={false} {...form.register("limitsText")} />
            </FormField>
            <FormField htmlFor="fairUseText" label="Fair use JSON" error={errors.fairUseText?.message} hint="Use {} for no fair-use rule.">
              <Textarea id="fairUseText" className="min-h-44 font-mono text-xs" spellCheck={false} {...form.register("fairUseText")} />
            </FormField>
          </CardContent>
        </Card>

        {mutationError ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {mutationError}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs text-foreground">
            {saved}
          </p>
        ) : null}

        <div className="sticky bottom-4 z-20 flex flex-col gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {form.formState.isDirty ? "Unsaved changes." : "No unsaved changes."} Every save is attributed and audited.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => form.reset(toForm(capability))} disabled={!form.formState.isDirty || mutation.isPending}>
              Discard
            </Button>
            <Button type="submit" disabled={!form.formState.isDirty || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Review changes"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setReview(null);
        }}
        title="Review capability changes"
        description="Only changed fields are listed. The server validates and audits the final state."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setReview(null)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={mutation.isPending || changed.length === 0}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {changed.length === 0 ? (
          <p className="text-xs text-muted-foreground">No changed fields.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {changed.map((key) => (
              <li key={key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="font-medium">{changedLabels[key]}</span>
                <span className="max-w-[55%] truncate font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(review?.[key])}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
