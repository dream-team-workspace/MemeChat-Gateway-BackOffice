import { useState } from "react";
import { Power } from "lucide-react";

import type { Capability } from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToggleCapability } from "@/features/capabilities/mutations/capabilities.mutations";
import { getErrorMessage } from "@/platform/api";

export function KillSwitchDialog({ capability }: { capability: Capability }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toggle = useToggleCapability(capability.id);
  const disabling = capability.enabled;
  const valid =
    reason.trim().length >= 10 &&
    (!disabling || confirmId.trim() === capability.id);

  function close(next: boolean) {
    if (toggle.isPending) return;
    setOpen(next);
    if (!next) {
      setReason("");
      setConfirmId("");
      setError(null);
    }
  }

  function submit() {
    if (!valid) {
      setError("Add a reason of at least 10 characters and confirm the capability ID.");
      return;
    }
    setError(null);
    toggle.mutate(
      { enabled: !capability.enabled, reason: reason.trim() },
      {
        onSuccess: () => close(false),
        onError: (mutationError) => setError(getErrorMessage(mutationError)),
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={disabling ? "destructive" : "default"}
        onClick={() => setOpen(true)}
      >
        <Power />
        {disabling ? "Disable capability" : "Enable capability"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={close}
        title={disabling ? "Disable " + capability.id + "?" : "Enable " + capability.id + "?"}
        description={
          disabling
            ? "All users will receive CAPABILITY_DISABLED for this capability. This is recorded in the audit trail."
            : "The capability becomes available to users again. This is recorded in the audit trail."
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => close(false)} disabled={toggle.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={disabling ? "destructive" : "default"}
              onClick={submit}
              disabled={!valid || toggle.isPending}
            >
              {toggle.isPending
                ? "Saving…"
                : disabling
                  ? "Disable capability"
                  : "Enable capability"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="kill-reason" className="text-xs font-semibold">
              Reason <span className="text-muted-foreground">(required)</span>
            </label>
            <Textarea
              id="kill-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Provider 5xx spike; disabling while we fail over."
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground">{reason.trim().length}/500 · minimum 10</p>
          </div>

          {disabling ? (
            <div className="space-y-1.5">
              <label htmlFor="kill-confirm" className="text-xs font-semibold">
                Type <span className="font-mono">{capability.id}</span> to confirm
              </label>
              <Input
                id="kill-confirm"
                value={confirmId}
                onChange={(event) => setConfirmId(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
