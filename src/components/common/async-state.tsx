import type { ReactNode } from "react";
import { AlertCircle, Inbox, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-1" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">Could not load this view</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Shown when the gateway has not shipped a resource the console is ready to
 * consume. It is a neutral, non-error state so operators know the difference
 * between "nothing recorded" and "not available yet".
 */
export function PendingGatewayState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-warning/10 text-warning-foreground">
        <Unplug className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground">
        <Inbox className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
