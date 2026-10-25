import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import type { AppClient } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { AddCapabilityDialog } from "@/features/app-clients/components/add-capability-dialog";
import {
  AppClientAdminAudit,
  AppClientUserActivity,
} from "@/features/app-clients/components/app-client-audit-panel";
import { AppClientFormDialog } from "@/features/app-clients/components/app-client-form-dialog";
import { ClientKeyDialog } from "@/features/app-clients/components/client-key-dialog";
import {
  useDeleteAppClient,
  useRotateAppClientKey,
  useUpdateAppClient,
} from "@/features/app-clients/mutations/app-clients.mutations";
import { appClientQueryOptions } from "@/features/app-clients/queries/app-clients.queries";
import { capabilitiesQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { providersQueryOptions } from "@/features/providers/queries/providers.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "access" | "audit" | "activity";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "access", label: "Access" },
  { id: "audit", label: "Admin audit" },
  { id: "activity", label: "User activity" },
];

/** Enabled capabilities only: capabilityId -> bound model id. */
function toActive(client: AppClient): Record<string, string> {
  return Object.fromEntries(
    client.capabilities
      .filter((capability) => capability.enabled)
      .map((capability) => [capability.capabilityId, capability.modelId ?? ""]),
  );
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
  const update = useUpdateAppClient(client.id);
  const remove = useDeleteAppClient();
  const rotate = useRotateAppClientKey(client.id);
  const capabilities = useQuery(capabilitiesQueryOptions);
  const providers = useQuery(providersQueryOptions);

  const [active, setActive] = useState<Record<string, string>>(() => toActive(client));
  const [baseline, setBaseline] = useState(client.updatedAt);
  const [tab, setTab] = useState<Tab>("access");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  const modelOptions = useMemo(() => {
    const map = new Map<string, string[]>();
    const add = (capabilityId: string, modelId: string) => {
      const list = map.get(capabilityId) ?? [];
      if (!list.includes(modelId)) list.push(modelId);
      map.set(capabilityId, list);
    };
    for (const capability of capabilities.data?.items ?? []) {
      for (const route of capability.providers) add(capability.id, route.model);
    }
    for (const provider of providers.data?.items ?? []) {
      for (const model of provider.models ?? []) add(model.capability, model.id);
    }
    for (const capability of client.capabilities) {
      if (capability.modelId) add(capability.capabilityId, capability.modelId);
    }
    return map;
  }, [capabilities.data, providers.data, client.capabilities]);

  const serverActive = toActive(client);
  const serverChanged = client.updatedAt !== baseline;
  const dirty =
    Object.keys(serverActive).length !== Object.keys(active).length ||
    Object.entries(active).some(([capabilityId, modelId]) => serverActive[capabilityId] !== modelId);

  const activeCapabilities = client.capabilities.filter(
    (capability) => active[capability.capabilityId] !== undefined,
  );
  const availableCapabilities = client.capabilities.filter(
    (capability) => active[capability.capabilityId] === undefined,
  );

  function markDirty() {
    setSaved(false);
    setError(null);
  }

  function addCapability(capabilityId: string, modelId: string) {
    setActive((current) => ({ ...current, [capabilityId]: modelId }));
    markDirty();
  }

  function removeCapability(capabilityId: string) {
    setActive((current) => {
      const next = { ...current };
      delete next[capabilityId];
      return next;
    });
    markDirty();
  }

  function setCapabilityModel(capabilityId: string, modelId: string) {
    setActive((current) => ({ ...current, [capabilityId]: modelId }));
    markDirty();
  }

  function resetActive() {
    setActive(toActive(client));
    setBaseline(client.updatedAt);
    setError(null);
    setSaved(false);
  }

  function saveMatrix() {
    setError(null);
    setSaved(false);

    const invalid = Object.entries(active).find(([, modelId]) => !modelId);
    if (invalid) {
      setError("Choose a model for every enabled capability.");
      return;
    }

    const rows = client.capabilities.map((capability) => {
      const modelId = active[capability.capabilityId];
      return {
        capabilityId: capability.capabilityId,
        // Disabled rows remain in the matrix but are not grants.
        modelId: modelId ?? capability.modelId,
        enabled: modelId !== undefined,
      };
    });

    update.mutate(
      {
        name: client.name,
        slug: client.slug,
        platform: client.platform,
        description: client.description,
        enabled: client.enabled,
        capabilities: rows,
      },
      {
        onSuccess: (updated) => {
          setActive(toActive(updated));
          setBaseline(updated.updatedAt);
          setSaved(true);
          setError(null);
        },
        onError: (mutationError) => setError(getErrorMessage(mutationError)),
      },
    );
  }

  function deleteClient() {
    if (!window.confirm("Delete " + client.name + "? This removes its capability mappings.")) return;
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

  const mapped = activeCapabilities.length;
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
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{client.slug}</p>
          {client.description ? (
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">{client.description}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Updated {formatDateTime(client.updatedAt)} · {mapped} {mapped === 1 ? "capability" : "capabilities"} enabled
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

      <nav
        role="tablist"
        aria-label="App client sections"
        className="mt-2 flex gap-1 border-b border-border"
      >
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
      {saved ? (
        <p role="status" className="mt-4 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">
          Capability map saved.
        </p>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-5"><AppClientAdminAudit clientId={client.id} /></div>
      ) : tab === "activity" ? (
        <div className="mt-5"><AppClientUserActivity clientId={client.id} /></div>
      ) : (
        <>
          {serverChanged ? (
            <div className="mt-5 flex flex-col gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className="text-foreground">
                This client changed on the gateway. Reload it before saving to avoid overwriting the newer version.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={resetActive}>
                Reload client
              </Button>
            </div>
          ) : null}
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

          <Card className="mt-4">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Capability map</CardTitle>
                <CardDescription>
                  Only enabled capabilities are listed. Add a capability, bind it to a routed model,
                  then save. New clients start with no grants.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setAddOpen(true)}
                disabled={availableCapabilities.length === 0 || capabilities.isLoading}
              >
                <Plus />
                Add capability
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {capabilities.isError || providers.isError ? (
                <ErrorState
                  message={getErrorMessage(capabilities.error ?? providers.error)}
                  onRetry={() => {
                    void capabilities.refetch();
                    void providers.refetch();
                  }}
                />
              ) : capabilities.isLoading || providers.isLoading ? (
                <div className="p-5"><LoadingRows rows={6} /></div>
              ) : activeCapabilities.length === 0 ? (
                <EmptyState
                  title="No capabilities enabled"
                  description="This client cannot call the gateway yet. Add a capability and choose a routed model."
                  action={
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddOpen(true)}
                      disabled={availableCapabilities.length === 0}
                    >
                      <Plus />
                      Add capability
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-border">
                  {activeCapabilities.map((capability) => {
                    const options = modelOptions.get(capability.capabilityId) ?? [];
                    const modelId = active[capability.capabilityId] ?? "";
                    return (
                      <div
                        key={capability.capabilityId}
                        className="grid gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_240px_40px] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{capability.capabilityName}</p>
                            <Badge variant="outline">{capability.kind}</Badge>
                            <Badge variant="success">Enabled</Badge>
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {capability.capabilityId}
                          </p>
                        </div>
                        <Select
                          id={"model-" + capability.capabilityId}
                          name={"model-" + capability.capabilityId}
                          value={modelId}
                          onChange={(event) =>
                            setCapabilityModel(capability.capabilityId, event.target.value)
                          }
                          aria-label={"Model for " + capability.capabilityId}
                        >
                          {options.length === 0 ? <option value="">No routed model</option> : null}
                          {options.map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={"Remove " + capability.capabilityId}
                          onClick={() => removeCapability(capability.capabilityId)}
                          className="justify-self-end text-muted-foreground hover:text-destructive"
                        >
                          <X />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetActive}
              disabled={update.isPending || !dirty}
            >
              <RefreshCw />
              Reset
            </Button>
            <Button type="button" onClick={saveMatrix} disabled={update.isPending || !dirty}>
              <Save />
              {update.isPending ? "Saving…" : "Save capability map"}
            </Button>
          </div>
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

      {addOpen ? (
        <AddCapabilityDialog
          open
          onOpenChange={setAddOpen}
          available={availableCapabilities}
          modelOptions={modelOptions}
          onAdd={addCapability}
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
