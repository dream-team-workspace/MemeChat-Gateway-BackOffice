import { useNavigate } from "@tanstack/react-router";
import { Building2, Check, LogOut, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signOut, useSession } from "@/features/auth/auth-store";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/lib/theme";

const themeOptions: Array<{
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces, dark text.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light operator mode.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your OS setting.",
    icon: Monitor,
  },
];

export function SettingsPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  if (!session) return null;

  const signedIn = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(session.signedInAt));

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Appearance, session details, and the environment this console is targeting."
      />

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Preferences are stored in this browser. The boot script applies
                them before paint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {themeOptions.map((option) => {
                  const selected = theme === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={selected}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary bg-accent"
                          : "border-border hover:bg-accent/50",
                      )}
                    >
                      <span className="grid size-8 place-items-center rounded-md bg-background text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-xs font-semibold">{option.label}</span>
                      <span className="text-[11px] leading-4 text-muted-foreground">
                        {option.description}
                      </span>
                      {selected ? (
                        <span className="absolute right-2.5 top-2.5 text-primary">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                The selected mode is saved automatically. System mode responds to
                your OS theme changes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Identity used for the mock operator session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {session.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{session.name}</p>
                    <p className="text-xs text-muted-foreground">{session.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit">
                  {session.role}
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold">Session</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Signed in {signedIn} · mock preview, not a real session.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    signOut();
                    void navigate({ to: "/login" });
                  }}
                >
                  <LogOut />
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>Boundary context is read-only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Target</span>
                <Badge variant="outline" className="gap-1.5">
                  <span className="size-1.5 rounded-full bg-warning" />
                  Staging
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Gateway</span>
                <span className="truncate font-mono text-[11px]">api.dev.memechat.app</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Console</span>
                <span className="font-mono text-[11px]">v0.1.0</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Auth</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="size-3.5" />
                  Mock session
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About this template</CardTitle>
              <CardDescription>Layout preview, not production wiring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-[11px] leading-5 text-muted-foreground">
              <p>
                The login, navigation, theme, and page layouts are implemented.
                Data is dummy and no gateway request is made.
              </p>
              <p>
                In production, the BFF owns the admin secret and the actor header.
                The browser never calls the gateway directly.
              </p>
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="size-3.5" />
                <span className="font-medium">Dream Team workspace</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
