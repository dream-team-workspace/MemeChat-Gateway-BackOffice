import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search, ShieldAlert, UserRound } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function UsersPage() {
  const navigate = useNavigate();
  const [uid, setUid] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = uid.trim();
    if (!UID_PATTERN.test(value)) {
      setError("Enter a valid Firebase UID (letters, numbers, _ and -).");
      return;
    }
    setError(null);
    void navigate({ to: "/users/$uid/ledger", params: { uid: value } });
  }

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Support"
        title="Users"
        description="Look up a Firebase UID to inspect its credit ledger and metadata-only usage."
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Find a user</CardTitle>
            <CardDescription>
              Exact UID lookup only. There is no user directory, email search, or message content in this console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="uid" className="text-xs font-semibold">Firebase UID</label>
                <Input
                  id="uid"
                  value={uid}
                  onChange={(event) => {
                    setUid(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. uid_7f3a9c21"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-xs"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "uid-error" : "uid-help"}
                />
                <p id="uid-help" className="text-[11px] text-muted-foreground">
                  Paste the UID from the support request. It is used only for this lookup.
                </p>
                {error ? <p id="uid-error" role="alert" className="text-[11px] font-medium text-destructive">{error}</p> : null}
              </div>
              <Button type="submit" className="sm:mt-6">
                <Search />
                Look up
                <ArrowRight />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Try the mock user</CardTitle>
            <CardDescription>The BFF seed includes a ledger and usage history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" className="w-full justify-between" onClick={() => void navigate({ to: "/users/$uid/ledger", params: { uid: "uid_7f3a9c21" } })}>
              <span className="font-mono text-xs">uid_7f3a9c21</span>
              <ArrowRight />
            </Button>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Ledger and usage are metadata-only. Do not paste UIDs into analytics or external tools.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-info/20 bg-info/5">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info/10 text-info"><UserRound className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold">What you can inspect</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Credit ledger states, request IDs, RevenueCat transaction IDs, and metadata-only usage events. Provider content and message text never exist here.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-5 text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        <p>Ledger and usage are confidential metadata. Do not paste UIDs into external tools.</p>
      </div>
    </div>
  );
}
