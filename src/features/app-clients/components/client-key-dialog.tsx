import { useId, useState } from "react";
import { Check, Copy } from "lucide-react";

import type { AppClient } from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

export function ClientKeyDialog({
  open,
  client,
  clientKey,
  onClose,
}: {
  open: boolean;
  client: AppClient;
  clientKey: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Client key"
      description={`New identity key for ${client.name}. It is shown only once.`}
      footer={
        <Button type="button" onClick={onClose}>I stored the key</Button>
      }
    >
      <div className="space-y-4">
        <ClientKeyField clientKey={clientKey} />
        <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-xs leading-5 text-warning-foreground">
          Store this key in the app's configuration now. The gateway stores its fingerprint.
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          The app sends this value in the <span className="font-mono">X-App-Client-Key</span> header.
          {client.keyRotatedAt ? " Rotated " + formatDateTime(client.keyRotatedAt) + "." : " Generated just now."}
        </p>
      </div>
    </Dialog>
  );
}

export function ClientKeyField({ clientKey }: { clientKey: string }) {
  const fieldId = useId();
  const [copyStatus, setCopyStatus] = useState<"ready" | "copied" | "error">("ready");

  async function copy() {
    try {
      await navigator.clipboard.writeText(clientKey);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold">App-client key</label>
      <Input
        id={fieldId}
        value={clientKey}
        readOnly
        autoComplete="off"
        spellCheck={false}
        className="font-mono text-xs"
        onFocus={(event) => event.currentTarget.select()}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
        {copyStatus === "copied" ? <Check /> : <Copy />}
        Copy app-client key
      </Button>
      {copyStatus === "copied" ? (
        <p role="status" className="text-xs text-muted-foreground">App-client key copied.</p>
      ) : null}
      {copyStatus === "error" ? (
        <p role="alert" className="text-xs text-destructive">
          Clipboard unavailable. Select and copy the key from the field.
        </p>
      ) : null}
    </div>
  );
}
