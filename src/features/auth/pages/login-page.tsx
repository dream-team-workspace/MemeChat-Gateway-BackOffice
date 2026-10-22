import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ScrollText,
  ShieldCheck,
  Waypoints,
} from "lucide-react";

import { BrandMark } from "@/components/common/brand-mark";
import { GithubIcon } from "@/components/common/github-icon";
import { GoogleIcon } from "@/components/common/google-icon";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signInDemo } from "@/features/auth/auth-store";

type Provider = "github" | "google" | "demo";

export function LoginPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<Provider | null>(null);

  function handleSignIn(provider: Provider) {
    if (pending) return;
    setPending(provider);
    window.setTimeout(() => {
      signInDemo();
      void navigate({ to: "/" });
    }, 450);
  }

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
                Secure operator access
              </Badge>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in with your workspace identity to manage the MemeChat
                gateway.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => handleSignIn("github")}
                disabled={pending !== null}
              >
                {pending === "github" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <GithubIcon className="size-4" />
                )}
                Continue with GitHub
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => handleSignIn("google")}
                disabled={pending !== null}
              >
                {pending === "google" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <GoogleIcon className="size-4" />
                )}
                Continue with Google
              </Button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                or
              </span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => handleSignIn("demo")}
              disabled={pending !== null}
            >
              {pending === "demo" ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Continue in demo mode
              {pending !== "demo" ? <ArrowRight /> : null}
            </Button>

            <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
              Preview template — authentication is mocked. No gateway calls are
              made.
            </p>

            <p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">
              Access is limited to the Dream Team workspace.
              <br />
              By continuing you agree to the internal operations policy.
            </p>

            <p className="sr-only" role="status" aria-live="polite">
              {pending ? "Signing in" : ""}
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-4 text-[10px] uppercase tracking-[0.12em] text-muted-foreground lg:px-8">
          <span>© 2026 MemeChat</span>
          <span>Gateway console · Staging</span>
        </footer>
      </main>
    </div>
  );
}
