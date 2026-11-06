import { useState } from "react";
import { Eye, EyeOff, KeyRound, TriangleAlert } from "lucide-react";

import type { Provider, ProviderInput } from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { providerErrorHint } from "@/features/providers/lib/provider-errors";
import { useUpdateProvider } from "@/features/providers/mutations/providers.mutations";
import { getErrorMessage } from "@/platform/api";

function providerInput(provider: Provider): ProviderInput {
  return {
    displayName: provider.displayName,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    enabled: provider.enabled,
    config: provider.config,
  };
}

export function ProviderKeyDialog({
  open,
  onOpenChange,
  provider,
  mode,
  onDone,
  onFixGatewayKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider;
  mode: "replace" | "remove";
  onDone?: (message: string) => void;
  onFixGatewayKey?: () => void;
}) {
  const update = useUpdateProvider(provider.id);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removing = mode === "remove";
  const unreadable = provider.credentialState === "unreadable";
  const hint =
    error && update.error && getErrorMessage(update.error) === error
      ? providerErrorHint(update.error)
      : null;

  function submit() {
    setError(null);
    const input = providerInput(provider);
    if (removing) {
      input.clearApiKey = true;
    } else {
      input.apiKey = apiKey.trim();
    }
    update.mutate(input, {
      onSuccess: () => {
        setApiKey("");
        onDone?.(removing ? "Key removed" : "Key replaced");
        onOpenChange(false);
      },
      onError: (mutationError) => setError(getErrorMessage(mutationError)),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={removing ? "Remove API key" : unreadable ? "Replace unusable key" : "Replace API key"}
      description={
        removing
          ? "If no environment bootstrap key exists, routed calls fail with 503 until a new key is saved."
          : "The current key stops working immediately after saving."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={removing ? "destructive" : "default"}
            onClick={submit}
            disabled={
              update.isPending || (removing ? !confirmed : apiKey.trim().length === 0)
            }
          >
            {update.isPending ? "Saving…" : removing ? "Remove key" : "Replace key"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
          {removing || unreadable ? (
            <TriangleAlert className="mt-0.5 size-4 text-warning" />
          ) : (
            <KeyRound className="mt-0.5 size-4 text-muted-foreground" />
          )}
          <div className="text-xs leading-5">
            <p className="font-medium">{provider.displayName}</p>
            <p className="text-muted-foreground">
              {unreadable
                ? "The saved key cannot be decrypted. Replacing it may still fail until the gateway master key is fixed."
                : removing
                  ? "This clears the encrypted key on the gateway. The provider stays registered and can be re-keyed later."
                  : "The new key is encrypted at rest and only a four-character hint is returned."}
            </p>
          </div>
        </div>

        {unreadable && onFixGatewayKey ? (
          <Button type="button" size="sm" variant="outline" onClick={onFixGatewayKey}>
            Fix gateway key
          </Button>
        ) : null}

        {removing ? (
          <label className="flex items-start gap-2 text-xs leading-5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 rounded border-input"
            />
            <span>
              I understand that routed calls return 503 when the gateway has no
              environment bootstrap key.
            </span>
          </label>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="provider-new-key">New API key</Label>
            <div className="relative">
              <Input
                id="provider-new-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="new-password"
                spellCheck={false}
                placeholder="Paste the replacement key"
                className="pr-10 font-mono text-xs"
                autoFocus
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
          </div>
        )}

        {error ? (
          <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <p>{error}</p>
            {hint ? <p className="mt-1 text-[11px] leading-5">{hint}</p> : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
