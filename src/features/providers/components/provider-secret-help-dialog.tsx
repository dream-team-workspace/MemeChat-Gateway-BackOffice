import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * Explains the gateway master key. This is deliberately not a provider-key
 * form: replacing a provider key cannot succeed while PROVIDER_SECRET_KEY is
 * missing or wrong.
 */
export function ProviderSecretHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gateway credential key"
      description="Provider keys are encrypted with a gateway-wide master key."
      footer={
        <Button type="button" onClick={() => onOpenChange(false)}>Close</Button>
      }
    >
      <div className="space-y-4 text-xs leading-5">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">PROVIDER_SECRET_KEY</p>
            <p className="mt-1 text-muted-foreground">
              Set this environment variable on the gateway to a 32-byte base64
              value or 64 hex characters, then restart the gateway.
            </p>
          </div>
        </div>
        <p>
          When this key is missing or wrong, saved provider ciphertexts fail
          closed. Providers can still appear with <span className="font-medium">hasApiKey</span>{" "}
          true and <span className="font-medium">configured</span> false — the
          console shows that as a credential error, not a missing key.
        </p>
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
          Do not paste a provider API key here. This panel is about the gateway
          master key; provider keys belong in the provider credential dialog.
        </p>
        <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px]">
          <p>PROVIDER_SECRET_KEY=&lt;32-byte-base64-or-64-hex&gt;</p>
          <p className="mt-1 text-muted-foreground"># then restart the gateway</p>
        </div>
      </div>
    </Dialog>
  );
}
