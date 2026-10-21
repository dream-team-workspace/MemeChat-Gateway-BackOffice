import { useState, type FormEvent } from "react";
import { ArrowRight, Search, ShieldAlert, UserRound } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentLookups = [
  {
    uid: "uid_7f3a9c21",
    balance: "274 CRD",
    lastSeen: "2 min ago",
    status: "Active",
  },
  {
    uid: "uid_19bd4e80",
    balance: "12 CRD",
    lastSeen: "18 min ago",
    status: "Active",
  },
  {
    uid: "uid_5a0e77c4",
    balance: "0 CRD",
    lastSeen: "Yesterday",
    status: "No activity",
  },
];

export function UsersPage() {
  const [uid, setUid] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = uid.trim();
    if (!value) {
      setError("Enter a Firebase UID to continue.");
      setResult(null);
      return;
    }
    setError(null);
    setResult(value);
  }

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Support"
        title="Users"
        description="Look up a Firebase UID to inspect its credit ledger and metadata-only usage."
      />

      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <UserRound className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Find a user</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                Exact UID lookup only. The console does not expose a user directory,
                email search, or message content.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="uid">Firebase UID</Label>
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
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "uid-error" : "uid-help"}
                className="font-mono text-xs"
              />
              <p id="uid-help" className="text-[11px] text-muted-foreground">
                Paste the UID from the gateway support request. It is never stored
                in this template.
              </p>
              {error ? (
                <p id="uid-error" role="alert" className="text-[11px] font-medium text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="sm:mb-[22px]">
              <Search />
              Look up
              <ArrowRight />
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card className="mt-4 border-info/20 bg-info/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-info/15 text-info">
                <ShieldAlert className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Demo lookup for {result}</p>
                <p className="text-xs text-muted-foreground">
                  In production this opens the ledger and usage views for this UID.
                </p>
              </div>
            </div>
            <Badge variant="warning">Preview only</Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Recent lookups</CardTitle>
          <CardDescription>Placeholder rows for layout review</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">UID</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="hidden sm:table-cell">Last seen</TableHead>
                <TableHead className="pr-5 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLookups.map((row) => (
                <TableRow key={row.uid}>
                  <TableCell className="pl-5 font-mono text-[11px]">{row.uid}</TableCell>
                  <TableCell className="tabular-nums">{row.balance}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {row.lastSeen}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Badge variant={row.status === "Active" ? "success" : "outline"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-5 text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Ledger and usage are confidential metadata. Do not paste UIDs into
          analytics, chat, or external tools.
        </p>
      </div>
    </div>
  );
}
