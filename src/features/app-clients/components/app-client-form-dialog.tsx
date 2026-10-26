import { useState } from "react";

import {
  appClientInputSchema,
  type AppClient,
  type AppPlatform,
} from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateAppClient,
  useUpdateAppClient,
} from "@/features/app-clients/mutations/app-clients.mutations";
import { getErrorMessage } from "@/platform/api";

type Draft = {
  name: string;
  slug: string;
  platform: AppPlatform;
  description: string;
  enabled: boolean;
};

const platforms: { value: AppPlatform; label: string }[] = [
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
  { value: "backend", label: "Backend" },
  { value: "other", label: "Other" },
];

function emptyDraft(): Draft {
  return {
    name: "",
    slug: "",
    platform: "android",
    description: "",
    enabled: true,
  };
}

function fromClient(client: AppClient): Draft {
  return {
    name: client.name,
    slug: client.slug,
    platform: client.platform,
    description: client.description,
    enabled: client.enabled,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function AppClientFormDialog({
  open,
  onOpenChange,
  client,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: AppClient | null;
  onCreated?: (client: AppClient) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    client ? fromClient(client) : emptyDraft(),
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(client));
  const [error, setError] = useState<string | null>(null);
  const create = useCreateAppClient();
  const update = useUpdateAppClient(client?.id ?? "");
  const pending = create.isPending || update.isPending;

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError(null);
  }

  function save() {
    const parsed = appClientInputSchema.safeParse({
      name: draft.name,
      slug: draft.slug.trim() || undefined,
      platform: draft.platform,
      description: draft.description,
      enabled: draft.enabled,
      capabilities: (client?.capabilities ?? []).map((capability) => ({
        capabilityId: capability.capabilityId,
        modelId: capability.modelId,
        enabled: capability.enabled,
      })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form values.");
      return;
    }

    if (client) {
      update.mutate(parsed.data, {
        onSuccess: () => onOpenChange(false),
        onError: (mutationError) => setError(getErrorMessage(mutationError)),
      });
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: (created) => {
        onOpenChange(false);
        onCreated?.(created);
      },
      onError: (mutationError) => setError(getErrorMessage(mutationError)),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={client ? "Edit app client" : "Add app client"}
      description={
        client
          ? "Update the client identity. Capability grants are edited on the client page."
          : "Create a client, then map its capabilities and models."
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Saving…" : client ? "Save changes" : "Create client"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="app-client-name" className="text-xs font-semibold">Name</label>
          <Input
            id="app-client-name"
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              patch({
                name,
                ...(slugTouched ? {} : { slug: slugify(name) }),
              });
            }}
            placeholder="MemeChat Android"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="app-client-slug" className="text-xs font-semibold">Slug</label>
          <Input
            id="app-client-slug"
            value={draft.slug}
            onChange={(event) => {
              setSlugTouched(true);
              patch({ slug: event.target.value.toLowerCase() });
            }}
            className="font-mono text-xs"
            placeholder="memechat-android"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="app-client-platform" className="text-xs font-semibold">Platform</label>
          <Select
            id="app-client-platform"
            value={draft.platform}
            onChange={(event) => patch({ platform: event.target.value as AppPlatform })}
          >
            {platforms.map((platform) => (
              <option key={platform.value} value={platform.value}>{platform.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="app-client-description" className="text-xs font-semibold">Description</label>
          <Textarea
            id="app-client-description"
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            placeholder="What this app client is used for"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 sm:col-span-2">
          <div>
            <p className="text-xs font-semibold">Enabled</p>
            <p className="text-[11px] text-muted-foreground">Disabled clients cannot use granted capabilities.</p>
          </div>
          <Switch
            checked={draft.enabled}
            onCheckedChange={(enabled) => patch({ enabled })}
            aria-label="App client enabled"
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
