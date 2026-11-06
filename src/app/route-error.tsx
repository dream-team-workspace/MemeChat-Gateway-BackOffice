import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Route-level boundary. Query errors are rendered as ErrorState by the page;
 * this catches render/contract bugs so a single feature cannot blank the shell.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const message =
    error instanceof Error ? error.message : "An unexpected render error occurred.";

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" />
      </span>
      <div>
        <h1 className="text-sm font-semibold">This view could not be rendered</h1>
        <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
          {message}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset?.();
            void router.invalidate();
          }}
        >
          Try again
        </Button>
        <Link
          to="/"
          className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
