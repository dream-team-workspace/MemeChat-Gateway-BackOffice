import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type { AppClient } from "@shared/admin-api";

import { ErrorState, LoadingRows } from "@/components/common/async-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import {
  AppClientAdminAudit,
  AppClientUserActivity,
} from "@/features/app-clients/components/app-client-audit-panel";
import { AppClientFormDialog } from "@/features/app-clients/components/app-client-form-dialog";
import { ClientKeyDialog } from "@/features/app-clients/components/client-key-dialog";
import { RouteEditor } from "@/features/app-clients/components/route-editor";
import { RouteSummary } from "@/features/app-clients/components/route-summary";
import { routedAbilityCount } from "@/features/app-clients/lib/app-client-routes";
import {
  useDeleteAppClient,
  useRotateAppClientKey,
} from "@/features/app-clients/mutations/app-clients.mutations";
import { appClientQueryOptions } from "@/features/app-clients/queries/app-clients.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "access" | "audit" | "activity";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "access", label: "Access" },
  { id: "audit", label: "Admin audit" },
  { id: "activity", label: "User activity" },
];

function platformLabel(platform: AppClient["platform"]) {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function AppClientDetailPage() {
  const { clientId } = useParams({ from: "/app/app-clients/$clientId" });
  const client = useQuery(appClientQueryOptions(clientId));

  if (client.isLoading) {
    return (
      <Card>
        <CardContent className="p-5"><LoadingRows rows={5} /></CardContent>
      </Card>
    );
  }
  if (client.isError || !client.data) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState message={getErrorMessage(client.error)} onRetry={() => void client.refetch()} />
        </CardContent>
      </Card>
    );
  }
  return <AppClientEditor key={client.data.id} client={client.data} />;
}

function AppClientEditor({ client }: { client: AppClient }) {
  const navigate = useNavigate();
  const remove = useDeleteAppClient();
  const rotate = useRotateAppClientKey(client.id);
  const [tab, setTab] = useState<Tab>("access");
  const [editOpen, setEditOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);

  function deleteClient() {
    remove.mutate(client.id, {
      onSuccess: () => void navigate({ to: "/app-clients" }),
      onError: (mutationError) => setDeleteError(getErrorMessage(mutationError)),
    });
  }

  function rotateKey() {
    rotate.mutate(undefined, {
      onSuccess: (updated) => {
        if (!updated.clientKey) {
          setRotateError("The gateway did not return a new client key.");
          return;
        }
        setRotateOpen(false);
        setRevealedKey(updated.clientKey);
        setError(null);
      },
      onError: (mutationError) => setRotateError(getErrorMessage(mutationError)),
    });
  }

  async function copySha1() {
    const value = client.clientKeySha1;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSha(true);
      window.setTimeout(() => setCopiedSha(false), 1800);
    } catch {
      setError("The browser could not access the clipboard.");
    }
  }

  const routed = routedAbilityCount(client);
  const sha1 = client.clientKeySha1 ?? null;

  return (
    <div className="animate-in">
      <Link
        to="/app-clients"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All app clients
      </Link>

      <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
            <Badge variant="outline">{platformLabel(client.platform)}</Badge>
            <Badge variant={client.enabled ? "success" : "warning"}>
              {client.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant={client.requireFirebaseUid ? "info" : "outline"}>
              {client.requireFirebaseUid ? "Firebase UID required" : "Firebase UID optional"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{client.slug}</p>
          {client.description ? (
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">{client.description}</p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            Updated {formatDateTime(client.updatedAt)}
            <span aria-hidden="true">·</span>
            <RouteSummary client={client} />
            {!client.routes ? <span>{routed} capabilities enabled</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit details
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
            disabled={remove.isPending}
          >
            <Trash2 />
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      <Tabs.Root
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="mt-2 flex items-center gap-1 border-b border-border"
      >
        <Tabs.List label="App client sections">
          {tabs.map((item) => (
            <Tabs.Trigger key={item.id} value={item.id}>{item.label}</Tabs.Trigger>
          ))}
        </Tabs.List>
        {tab === "activity" ? (
          <Badge variant="outline" className="ml-auto my-1.5 hidden sm:inline-flex">
            Metadata only
          </Badge>
        ) : null}
      </Tabs.Root>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-5"><AppClientAdminAudit clientId={client.id} /></div>
      ) : tab === "activity" ? (
        <div className="mt-5"><AppClientUserActivity clientId={client.id} /></div>
      ) : (
        <>
          <Card className="mt-5">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-accent text-accent-foreground">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Client identity</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {client.keyRotatedAt
                      ? "Key rotated " + formatDateTime(client.keyRotatedAt) + ". The plaintext key is never shown again."
                      : "No identity key has been issued yet."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      SHA-1 identity
                    </span>
                    <code className="break-all rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
                      {sha1 ?? "—"}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copySha1()}
                      disabled={!sha1}
                      title={sha1 ? "Copy the SHA-1 identity digest" : "No digest available"}
                    >
                      {copiedSha ? <Check /> : <Copy />}
                      {copiedSha ? "Copied" : "Copy SHA-1"}
                    </Button>
                  </div>
                  {client.clientKeySha1 === undefined ? (
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                      The gateway does not expose the stored digest yet. The console shows it as soon as
                      the client payload includes clientKeySha1.
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setRotateError(null); setRotateOpen(true); }}
                disabled={rotate.isPending}
              >
                <RefreshCw className={cn(rotate.isPending && "animate-spin")} />
                {rotate.isPending
                  ? "Rotating…"
                  : client.keyRotatedAt
                    ? "Rotate key"
                    : "Issue key"}
              </Button>
            </CardContent>
          </Card>

          <RouteEditor client={client} />
        </>
      )}

      {editOpen ? (
        <AppClientFormDialog
          key={client.id + "-edit"}
          open
          onOpenChange={setEditOpen}
          client={client}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete app client"
        description="This removes the client, its ability routes, and its legacy capability grants. Audit history remains."
        confirmLabel="Delete client"
        pendingLabel="Deleting…"
        pending={remove.isPending}
        error={deleteError}
        onConfirm={deleteClient}
      >
        <p>Delete <span className="font-medium">{client.name}</span>?</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        title={client.keyRotatedAt ? "Rotate client key" : "Issue client key"}
        description="The current key stops working immediately. The new key is shown once and cannot be retrieved later."
        confirmLabel={client.keyRotatedAt ? "Rotate key" : "Issue key"}
        pendingLabel="Rotating…"
        pending={rotate.isPending}
        variant="default"
        error={rotateError}
        onConfirm={rotateKey}
      >
        <p>
          The app must be updated with the new <span className="font-mono">X-App-Client-Key</span> value.
        </p>
      </ConfirmDialog>

      {revealedKey ? (
        <ClientKeyDialog
          open
          client={client}
          clientKey={revealedKey}
          onClose={() => setRevealedKey(null)}
        />
      ) : null}
    </div>
  );
}
