import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

import {
  providerInputSchema,
  type Provider,
  type ProviderInput,
  type ProviderKind,
} from "@shared/admin-api";

import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { providerErrorHint } from "@/features/providers/lib/provider-errors";
import { useCreateProvider, useUpdateProvider } from "@/features/providers/mutations/providers.mutations";
import { getErrorMessage } from "@/platform/api";

const kinds: Array<{ value: ProviderKind; label: string }> = [
  { value: "llm", label: "Language model" },
  { value: "tts", label: "Text to speech" },
  { value: "stt", label: "Speech to text" },
  { value: "embeddings", label: "Embeddings" },
  { value: "vector", label: "Vector storage" },
];

function slugifyProviderId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function configTextFor(provider?: Provider | null) {
  return JSON.stringify(provider?.config ?? {}, null, 2);
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: Provider | null;
  onSaved?: (provider: Provider) => void;
}) {
  const editing = Boolean(provider);
  const create = useCreateProvider();
  const update = useUpdateProvider(provider?.id ?? "");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [displayName, setDisplayName] = useState(provider?.displayName ?? "");
  const [kind, setKind] = useState<ProviderKind>(provider?.kind ?? "llm");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
  const [enabled, setEnabled] = useState(provider?.enabled ?? true);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [configText, setConfigText] = useState(() => configTextFor(provider));
  const [configOpen, setConfigOpen] = useState(
    Object.keys(provider?.config ?? {}).length > 0,
  );
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;
  const mutationError = editing ? update.error : create.error;
  const errorHint =
    error && mutationError && getErrorMessage(mutationError) === error
      ? providerErrorHint(mutationError)
      : null;

  function submit() {
    setError(null);
    let config: unknown;
    try {
      config = JSON.parse(configText || "{}");
    } catch {
      setError("Advanced config must be valid JSON.");
      return;
    }
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      setError("Advanced config must be a JSON object.");
      return;
    }

    const input: ProviderInput = {
      ...(id.trim() ? { id: id.trim() } : {}),
      displayName: displayName.trim(),
      kind,
      baseUrl: baseUrl.trim(),
      enabled,
      config: config as Record<string, unknown>,
    };
    if (!editing && apiKey.trim()) input.apiKey = apiKey.trim();

    const parsed = providerInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.length ? String(issue.path[0]) + ": " : "";
      setError(field + (issue?.message ?? "Check the form values."));
      return;
    }

    const mutation = editing ? update : create;
    mutation.mutate(parsed.data, {
      onSuccess: (saved) => {
        setApiKey("");
        setError(null);
        onSaved?.(saved);
        onOpenChange(false);
      },
      onError: (mutationError) => setError(getErrorMessage(mutationError)),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit provider" : "Add provider"}
      description={
        editing
          ? "Update provider metadata. The API key is managed separately and is never shown."
          : "Register an external service. The key is write-only and encrypted by the gateway."
      }
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || displayName.trim().length === 0}>
            {pending ? "Saving…" : editing ? "Save provider" : "Add provider"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="provider-display-name" label="Display name">
            <Input
              id="provider-display-name"
              value={displayName}
              onChange={(event) => {
                const value = event.target.value;
                setDisplayName(value);
                if (!editing && !idTouched) setId(slugifyProviderId(value));
              }}
              placeholder="ElevenLabs"
              autoFocus
            />
          </FormField>
          <FormField
            htmlFor="provider-id"
            label="Provider ID"
            hint={editing ? "Immutable after creation." : "Generated from the name; editable before creation."}
          >
            <Input
              id="provider-id"
              value={editing ? (provider?.id ?? "") : id}
              onChange={(event) => {
                setIdTouched(true);
                setId(event.target.value.toLowerCase());
              }}
              placeholder="elevenlabs"
              disabled={editing}
              className="font-mono text-xs"
              spellCheck={false}
            />
          </FormField>
          <FormField htmlFor="provider-kind" label="Kind">
            <Select
              id="provider-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as ProviderKind)}
            >
              {kinds.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField htmlFor="provider-enabled" label="Enabled">
            <div className="flex h-9 items-center gap-2">
              <Switch
                id="provider-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Provider enabled"
              />
              <span className="text-xs text-muted-foreground">
                {enabled ? "Routes can use this provider" : "Calls will fail while disabled"}
              </span>
            </div>
          </FormField>
        </div>

        <FormField
          htmlFor="provider-base-url"
          label="Base URL"
          hint="Required for most providers; Kokoro may use a deployment-specific URL."
        >
          <Input
            id="provider-base-url"
            type="url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.example.com/v1"
            className="font-mono text-xs"
            spellCheck={false}
          />
        </FormField>

        {!editing ? (
          <FormField
            htmlFor="provider-api-key"
            label="API key"
            hint="Optional at creation. The plaintext key is never returned after saving."
          >
            <div className="relative">
              <Input
                id="provider-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste key"
                autoComplete="new-password"
                spellCheck={false}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <KeyRound className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium">API key</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                Replace or remove the key from the provider overview. Metadata edits never change it.
              </p>
            </div>
          </div>
        )}

        <details
          className="rounded-lg border border-border"
          open={configOpen}
          onToggle={(event) => setConfigOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
            Advanced config (JSON)
          </summary>
          <div className="space-y-1.5 border-t border-border p-3">
            <p className="text-[11px] text-muted-foreground">
              Provider-level defaults such as workspace, organization, or output format.
            </p>
            <Textarea
              id="provider-config"
              value={configText}
              onChange={(event) => setConfigText(event.target.value)}
              className="min-h-28 font-mono text-xs"
              spellCheck={false}
              aria-label="Advanced config JSON"
            />
          </div>
        </details>

        {error ? (
          <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <p>{error}</p>
            {errorHint ? (
              <p className="mt-1 text-[11px] leading-5">{errorHint}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
