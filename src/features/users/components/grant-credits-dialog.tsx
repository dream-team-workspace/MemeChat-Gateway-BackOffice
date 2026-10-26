import { useState } from "react";
import { Copy, CreditCard } from "lucide-react";

import { creditGrantInputSchema, type CreditGrantResult } from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGrantCredits } from "@/features/users/mutations/users.mutations";
import { getErrorMessage } from "@/platform/api";
import { formatNumber } from "@/lib/format";

export function GrantCreditsDialog({
  uid,
  open,
  onOpenChange,
  onGranted,
}: {
  uid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted?: (result: CreditGrantResult) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreditGrantResult | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const mutation = useGrantCredits(uid);

  function submit() {
    const parsed = creditGrantInputSchema.safeParse({
      amount: Number(amount),
      reason,
      requestId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the grant fields.");
      return;
    }
    setError(null);
    mutation.mutate(parsed.data, {
      onSuccess: (value) => {
        setResult(value);
        onGranted?.(value);
      },
      onError: (mutationError) => setError(getErrorMessage(mutationError)),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
      title="Grant credits"
      description="Positive CRD deposit. The request ID makes retries idempotent; do not reuse it for a new grant."
      footer={
        result ? (
          <Button type="button" onClick={() => onOpenChange(false)}>Close</Button>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={mutation.isPending}>
              <CreditCard />
              {mutation.isPending ? "Granting…" : "Grant credits"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="rounded-md border border-success/20 bg-success/5 px-3 py-2">
            Granted <strong>{formatNumber(result.amount)} CRD</strong>
            {typeof result.balanceAfter === "number" ? " · balance " + formatNumber(result.balanceAfter) : ""}.
          </p>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Request ID</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={result.requestId} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => void navigator.clipboard?.writeText(result.requestId)} aria-label="Copy request ID">
                <Copy />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-info/20 bg-info/5 px-3 py-2 text-xs">
            UID <span className="font-mono">{uid}</span>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="grant-amount" className="text-xs font-semibold">Amount (CRD)</label>
            <Input id="grant-amount" type="number" min={1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="grant-reason" className="text-xs font-semibold">Reason</label>
            <Textarea id="grant-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Support: duplicate charge on 2026-10-20." maxLength={500} />
            <p className="text-[11px] text-muted-foreground">{reason.trim().length}/500 · minimum 10</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Idempotency request ID</p>
            <Input readOnly value={requestId} className="font-mono text-xs" />
            <p className="text-[11px] text-muted-foreground">Retries from this dialog reuse this ID.</p>
          </div>
          {error ? <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
