import {
  CheckCircle2,
  ScrollText,
  ShieldCheck,
  Waypoints,
} from "lucide-react";

import { BrandMark } from "@/components/common/brand-mark";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signIn } from "@/features/auth/auth-store";

export function LoginPage() {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="relative grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-brand-panel-border bg-brand-panel p-12 text-brand-panel-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-sm font-semibold leading-5">MemeChat</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-panel-muted">
              BackOffice
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-panel-muted">
            Operator console
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight">
            Keep every gateway decision visible.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-brand-panel-muted">
            Inspect capabilities, change routing, and act on incidents with a
            console built around evidence and auditability.
          </p>

          <ul className="mt-9 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <Waypoints className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-semibold">Registry and routing</span>
                <span className="block text-brand-panel-muted">
                  See costs, provider chains, and kill switches in one place.
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-semibold">Safe operator actions</span>
                <span className="block text-brand-panel-muted">
                  Review before you commit. Every change is attributed.
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-semibold">Ledger and usage context</span>
                <span className="block text-brand-panel-muted">
                  Investigate a charge without touching prompt content.
                </span>
              </span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-brand-panel-muted">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-primary" />
            Authorized operators only
          </span>
          <span>Console v0.1.0</span>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-20 size-80 rounded-full border border-brand-panel-border"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 top-44 size-48 rounded-full border border-brand-panel-border"
        />
      </aside>

      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end lg:p-8">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark className="size-8" />
            <span className="text-sm font-semibold">MemeChat BackOffice</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <Badge variant="outline" className="mb-4">
                Zero Trust access
              </Badge>
              <h1 className="text-2xl font-semibold tracking-tight">
                Operator sign-in
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isDevelopment
                  ? "Local development uses a stand-in operator identity. Cloudflare Access is only in front of the deployed hostname."
                  : "Cloudflare Access verifies your workspace identity before this console loads. This app never stores a password or an identity token."}
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => signIn()}
            >
              <ShieldCheck className="size-4" />
              Continue with Cloudflare Access
            </Button>

            <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
              {isDevelopment
                ? "Development mode signs you in locally; a full reload re-establishes the development identity."
                : "You will be redirected to your organization's Access login if your session is missing or expired."}
            </p>

            <p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">
              Access is limited to the Dream Team workspace.
              <br />
              By continuing you agree to the internal operations policy.
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-4 text-[10px] uppercase tracking-[0.12em] text-muted-foreground lg:px-8">
          <span>© 2026 MemeChat</span>
          <span>Gateway console · Cloudflare Access</span>
        </footer>
      </main>
    </div>
  );
}
