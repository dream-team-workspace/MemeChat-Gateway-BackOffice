import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/common/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm text-center animate-in">
        <BrandMark className="mx-auto" />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The page you are looking for doesn’t exist or has moved.
        </p>
        <Link to="/" className={buttonVariants({ className: "mt-6" })}>
          Back to overview
        </Link>
      </div>
    </div>
  );
}
