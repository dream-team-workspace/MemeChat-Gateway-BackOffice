import { useState } from "react";
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
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(clientKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

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
        <div className="space-y-1.5">
          <label htmlFor="app-client-key" className="text-xs font-semibold">X-App-Client-Key</label>
          <div className="flex gap-2">
            <Input
              id="app-client-key"
              value={clientKey}
              readOnly
              className="font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" onClick={() => void copy()} aria-label="Copy client key">
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-xs leading-5 text-warning-foreground">
          Store this key in the app's secure configuration. The previous key stops working
          immediately when you rotate. The gateway stores only its SHA-1 digest.
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          The app sends this value in the <span className="font-mono">X-App-Client-Key</span> header.
          {client.keyRotatedAt ? " Rotated " + formatDateTime(client.keyRotatedAt) + "." : " Generated just now."}
        </p>
      </div>
    </Dialog>
  );
}
