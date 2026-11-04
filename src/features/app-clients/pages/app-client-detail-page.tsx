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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AppClientAdminAudit,
  AppClientUserActivity,
} from "@/features/app-clients/components/app-client-audit-panel";
import { AppClientFormDialog } from "@/features/app-clients/components/app-client-form-dialog";
import { ClientKeyDialog } from "@/features/app-clients/components/client-key-dialog";
import { RouteEditor } from "@/features/app-clients/components/route-editor";
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

function routedCount(client: AppClient) {
  if (client.routes) {
    return client.routes.filter(
      (route) => route.enabled && route.providerId !== null && route.modelId !== null,
    ).length;
  }
  return client.capabilities.filter((capability) => capability.enabled).length;
}

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
  const [copiedSha, setCopiedSha] = useState(false);

  function deleteClient() {
    if (!window.confirm("Delete " + client.name + "? This removes its ability routes and audit history remains.")) return;
    remove.mutate(client.id, {
      onSuccess: () => void navigate({ to: "/app-clients" }),
      onError: (mutationError) => setError(getErrorMessage(mutationError)),
    });
  }

  function rotateKey() {
    if (!window.confirm("Rotate " + client.name + "? The current client key stops working immediately.")) return;
    rotate.mutate(undefined, {
      onSuccess: (updated) => {
        if (!updated.clientKey) {
          setError("The gateway did not return a new client key.");
          return;
        }
        setRevealedKey(updated.clientKey);
        setError(null);
      },
      onError: (mutationError) => setError(getErrorMessage(mutationError)),
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

  const routed = routedCount(client);
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Updated {formatDateTime(client.updatedAt)} · {routed}/5 abilities routed
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
            onClick={deleteClient}
            disabled={remove.isPending}
          >
            <Trash2 />
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      <nav role="tablist" aria-label="App client sections" className="mt-2 flex gap-1 border-b border-border">
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
        {tab === "activity" ? (
          <Badge variant="outline" className="ml-auto my-1.5 hidden sm:inline-flex">
            Metadata only
          </Badge>
        ) : null}
      </nav>

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
              <Button type="button" variant="outline" onClick={rotateKey} disabled={rotate.isPending}>
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
