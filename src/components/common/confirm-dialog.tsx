import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * One confirmation shell for destructive/high-impact actions. Callers pass an
 * explicit variant rather than a boolean mode, so the rendered intent is clear
 * at the call site.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working…",
  pending = false,
  variant = "destructive",
  error,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  variant?: "default" | "destructive";
  error?: string | null;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} disabled={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs leading-5">
        {children}
        {error ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
