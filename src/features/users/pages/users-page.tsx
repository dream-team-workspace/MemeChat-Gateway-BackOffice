import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, RefreshCw, Search, UserRound } from "lucide-react";

import type { UserTier } from "@shared/admin-api";

import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PendingGatewayState,
} from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { userDirectoryQueryOptions } from "@/features/users/queries/users.queries";
import { getErrorMessage, isGatewayFeatureMissing } from "@/platform/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LookupMode = "uid" | "email";

function tierLabel(tier: UserTier) {
  if (tier === "ultra") return "Ultra";
  if (tier === "pro") return "Pro";
  if (tier === "free") return "Free";
  return "Unknown";
}

function tierVariant(tier: UserTier): BadgeProps["variant"] {
  if (tier === "ultra") return "success";
  if (tier === "pro") return "info";
  return "outline";
}

export function UsersPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LookupMode>("uid");
  const [term, setTerm] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  const directory = useQuery(userDirectoryQueryOptions(emailFilter, cursor));
  const missingDirectory = directory.isError && isGatewayFeatureMissing(directory.error);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = term.trim();
    setFormError(null);

    if (!value) {
      setFormError(mode === "uid" ? "Enter a Firebase UID." : "Enter an email address.");
      return;
    }

    if (mode === "uid") {
      if (!UID_PATTERN.test(value)) {
        setFormError("Enter a valid Firebase UID (letters, numbers, _ and -).");
        return;
      }
      void navigate({ to: "/users/$uid/ledger", params: { uid: value } });
      return;
    }

    if (!EMAIL_PATTERN.test(value)) {
      setFormError("Enter a valid email address.");
      return;
    }
    setEmailFilter(value.toLowerCase());
    setCursor(undefined);
  }

  function clearEmailFilter() {
    setEmailFilter("");
    setCursor(undefined);
    setTerm("");
  }

  const items = directory.data?.items ?? [];
  const missingProfile = items.some((user) => !user.email || user.tier === "unknown");

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Support"
        title="Users"
        description="Accounts that signed in to MemeChat, with the email and subscription tier the gateway resolved."
        actions={
          <form onSubmit={submit} className="w-full sm:w-auto">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <div role="group" aria-label="Lookup type" className="flex rounded-md bg-muted p-0.5">
                <button
                  type="button"
                  aria-pressed={mode === "uid"}
                  onClick={() => {
                    setMode("uid");
                    setFormError(null);
                  }}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mode === "uid"
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  ID
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "email"}
                  onClick={() => {
                    setMode("email");
                    setFormError(null);
                  }}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mode === "email"
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Email
                </button>
              </div>
              <Input
                id="user-lookup"
                name="user-lookup"
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder={mode === "uid" ? "Firebase UID" : "name@example.com"}
                aria-label={mode === "uid" ? "Firebase UID" : "Email address"}
                autoComplete="off"
                spellCheck={false}
                className={cn(
                  "h-8 w-full min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0 sm:w-56 sm:flex-none",
                  mode === "uid" && "font-mono",
                )}
              />
              <Button type="submit" size="sm" className="shrink-0">
                <Search />
                Find
              </Button>
            </div>
            {formError ? (
              <p role="alert" className="mt-1.5 text-right text-[11px] font-medium text-destructive">
                {formError}
              </p>
            ) : null}
          </form>
        }
      />

      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>MemeChat users</CardTitle>
            <CardDescription>
              {missingDirectory
                ? "Waiting for the gateway users endpoint; ID lookup remains available above."
                : emailFilter
                  ? "Showing accounts whose email matches " + emailFilter + "."
                  : "Newest sign-in activity first. Tier is resolved from RevenueCat entitlements."}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {emailFilter ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearEmailFilter}>
                Clear filter
              </Button>
            ) : null}
            {!missingDirectory ? (
              <Badge variant="outline">
                {directory.isLoading ? "Loading" : items.length + " shown"}
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Refresh users"
              onClick={() => void directory.refetch()}
              disabled={directory.isFetching}
            >
              <RefreshCw className={cn(directory.isFetching && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {directory.isLoading ? (
            <div className="p-5"><LoadingRows rows={6} /></div>
          ) : missingDirectory ? (
            <PendingGatewayState
              title="User directory is not available from the gateway yet"
              description={
                "ID lookup still works from the panel above. Once the gateway exposes " +
                "GET /internal/admin/users with stored email and RevenueCat tier, signed-in users appear here."
              }
            />
          ) : directory.isError ? (
            <ErrorState message={getErrorMessage(directory.error)} onRetry={() => void directory.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title={emailFilter ? "No users match that email" : "No signed-in users yet"}
              description={
                emailFilter
                  ? "Try a different address or clear the filter."
                  : "A user appears here after their first authenticated gateway request."
              }
              action={
                emailFilter ? (
                  <Button type="button" variant="outline" size="sm" onClick={clearEmailFilter}>
                    Clear filter
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="hidden sm:table-cell">Last seen</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="pr-5 text-right">Ledger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="pl-5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {user.email ?? "Email not captured"}
                          </p>
                          <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                            {user.uid}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tierVariant(user.tier)}>{tierLabel(user.tier)}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {user.lastSeenAt ? formatDateTime(user.lastSeenAt) : "—"}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {formatDateTime(user.createdAt)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Link
                          to="/users/$uid/ledger"
                          params={{ uid: user.uid }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          Open
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {missingProfile ? (
                <p className="border-t border-border px-5 py-3 text-[11px] leading-5 text-muted-foreground">
                  Some accounts have no stored email or tier yet. The gateway records these on the
                  next authenticated sign-in once its user-profile write path is enabled.
                </p>
              ) : null}
              {directory.data?.nextCursor ? (
                <div className="flex justify-center border-t border-border p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCursor(directory.data?.nextCursor ?? undefined)}
                  >
                    <ArrowDown />
                    Load older
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
        <UserRound className="mt-0.5 size-3.5 shrink-0" />
        Metadata only: ledger states, request IDs, usage counters, email, and tier. Provider content and
        message text never exist in this console.
      </p>
    </div>
  );
}
