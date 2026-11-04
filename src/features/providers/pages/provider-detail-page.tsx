import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { abilityLabels, type ProviderCatalogModel } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProviderFormDialog } from "@/features/providers/components/provider-form-dialog";
import { ProviderKeyDialog } from "@/features/providers/components/provider-key-dialog";
import { ProviderModelDialog } from "@/features/providers/components/provider-model-dialog";
import { providerDisplayState, providerKindLabel } from "@/features/providers/lib/provider-status";
import {
  useCheckProvider,
  useDeleteProvider,
  useDeleteProviderModel,
} from "@/features/providers/mutations/providers.mutations";
import {
  providerQueryOptions,
  providersQueryOptions,
} from "@/features/providers/queries/providers.queries";
import { featureFlags } from "@/lib/feature-flags";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "overview" | "models" | "health";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "models", label: "Models" },
  { id: "health", label: "Health" },
];

function costLabel(model: ProviderCatalogModel) {
  return model.costCredits + " " + model.costUnit + " / " + model.costPer;
}

export function ProviderDetailPage() {
  const { providerId } = useParams({ from: "/app/providers/$providerId" });
  const navigate = useNavigate();
  const detail = useQuery(providerQueryOptions(providerId));
  const list = useQuery(providersQueryOptions);
  const remove = useDeleteProvider();
  const removeModel = useDeleteProviderModel(providerId);
  const check = useCheckProvider();
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [keyMode, setKeyMode] = useState<"replace" | "remove" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ProviderCatalogModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<ProviderCatalogModel | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  if (detail.isLoading) {
    return (
      <Card>
        <CardContent className="p-5"><LoadingRows rows={5} /></CardContent>
      </Card>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState
            message={getErrorMessage(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const provider = detail.data;
  const status = list.data?.items.find((item) => item.id === provider.id);
  const display = status
    ? providerDisplayState(status)
    : provider.configured
      ? { label: "Configured", variant: "success" as const }
      : { label: "Key missing", variant: "warning" as const };
  const lastCheck = status?.lastCheck ?? null;
  const canCheck = provider.configured && provider.models.length > 0;

  function startCreateModel() {
    setEditingModel(null);
    setModelError(null);
    setModelOpen(true);
  }

  function startEditModel(model: ProviderCatalogModel) {
    setEditingModel(model);
    setModelError(null);
    setModelOpen(true);
  }

  function confirmDeleteProvider() {
    setDeleteError(null);
    remove.mutate(provider.id, {
      onSuccess: () => void navigate({ to: "/providers" }),
      onError: (error) => setDeleteError(getErrorMessage(error)),
    });
  }

  function confirmDeleteModel() {
    if (!deletingModel) return;
    setModelError(null);
    removeModel.mutate(deletingModel.modelId, {
      onSuccess: () => {
        setDeletingModel(null);
        setNotice("Model removed");
      },
      onError: (error) => setModelError(getErrorMessage(error)),
    });
  }

  return (
    <div className="animate-in">
      <Link
        to="/providers"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All providers
      </Link>

      <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{provider.displayName}</h1>
            <Badge variant="outline">{providerKindLabel(provider.kind)}</Badge>
            <Badge variant={provider.enabled ? "success" : "destructive"}>
              {provider.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant={display.variant}>{display.label}</Badge>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{provider.id}</p>
          <p className="mt-2 max-w-2xl truncate font-mono text-xs text-muted-foreground" title={provider.baseUrl}>
            {provider.baseUrl || "No base URL configured"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => check.mutate(provider.id)}
            disabled={!canCheck || check.isPending}
            title={canCheck ? "Run a safe health probe" : "Add a key and model before checking"}
          >
            <RefreshCw className={cn(check.isPending && "animate-spin")} />
            {check.isPending ? "Checking…" : "Check health"}
          </Button>
          {featureFlags.providerKeyManagement ? (
            <>
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
              >
                <Trash2 />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <nav role="tablist" aria-label="Provider sections" className="mt-2 flex gap-1 border-b border-border">
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
        <Badge variant="outline" className="ml-auto my-1.5 hidden sm:inline-flex">
          {provider.models.length} {provider.models.length === 1 ? "model" : "models"}
        </Badge>
      </nav>

      {notice ? (
        <p role="status" className="mt-4 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">{notice}</p>
      ) : null}
      {check.isError ? (
        <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {getErrorMessage(check.error)}
        </p>
      ) : null}

      {tab === "overview" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Credential</CardTitle>
              <CardDescription>Write-only API key. Only a masked hint is ever returned.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-accent text-accent-foreground">
                  <KeyRound className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {provider.configured
                      ? "Key configured " + (provider.apiKeyHint ?? "")
                      : "Key missing"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {provider.apiKeyUpdatedAt
                      ? "Updated " + formatDateTime(provider.apiKeyUpdatedAt)
                      : "No database key. The gateway may still use an environment bootstrap key."}
                  </p>
                </div>
              </div>
              {featureFlags.providerKeyManagement ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setKeyMode("replace")}>
                    {provider.hasApiKey ? "Replace key" : "Set key"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={!provider.hasApiKey}
                    onClick={() => setKeyMode("remove")}
                  >
                    Remove key
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Key management is disabled by rollout flag.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connection</CardTitle>
              <CardDescription>Where the gateway sends requests for this provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground">Base URL</p>
                <p className="mt-1 break-all font-mono text-[11px]">{provider.baseUrl || "Not set"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider config</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px]">
                  {JSON.stringify(provider.config, null, 2)}
                </pre>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <span>Created {formatDateTime(provider.createdAt)}</span>
                <span>Updated {formatDateTime(provider.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Model catalog</CardTitle>
                <CardDescription>Selectable models for {abilityLabels[provider.kind]}.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setTab("models")}>
                Manage models
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {provider.models.length === 0 ? (
                <EmptyState
                  title="No models yet"
                  description="Add a model before an app client can route this ability."
                  action={featureFlags.providerKeyManagement ? (
                    <Button type="button" size="sm" onClick={startCreateModel}><Plus />Add model</Button>
                  ) : undefined}
                />
              ) : (
                <div className="divide-y divide-border">
                  {provider.models.slice(0, 6).map((model) => (
                    <div key={model.modelId} className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs">
                      <span className="font-mono text-[11px]">{model.modelId}</span>
                      <span className="text-muted-foreground">{model.displayName}</span>
                      <Badge variant="outline" className="ml-auto">{costLabel(model)}</Badge>
                      <Badge variant={model.enabled ? "success" : "outline"}>
                        {model.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : tab === "models" ? (
        <Card className="mt-5 overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Models</CardTitle>
              <CardDescription>
                One model belongs to one ability. Cost metadata is shown to operators and used by capability billing.
              </CardDescription>
            </div>
            {featureFlags.providerKeyManagement ? (
              <Button type="button" size="sm" onClick={startCreateModel}><Plus />Add model</Button>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            {provider.models.length === 0 ? (
              <EmptyState
                title="No models catalogued"
                description="Add a model before routing this ability."
                action={featureFlags.providerKeyManagement ? (
                  <Button type="button" size="sm" onClick={startCreateModel}><Plus />Add model</Button>
                ) : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Model</TableHead>
                    <TableHead>Ability</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provider.models.map((model) => (
                    <TableRow key={model.modelId}>
                      <TableCell className="pl-5">
                        <p className="font-mono text-[11px]">{model.modelId}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{model.displayName}</p>
                      </TableCell>
                      <TableCell className="text-xs">{abilityLabels[model.ability] ?? model.ability}</TableCell>
                      <TableCell className="text-xs">{costLabel(model)}</TableCell>
                      <TableCell>
                        <Badge variant={model.enabled ? "success" : "outline"}>
                          {model.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditModel(model)}
                            disabled={!featureFlags.providerKeyManagement}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => { setModelError(null); setDeletingModel(model); }}
                            disabled={!featureFlags.providerKeyManagement}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current health</CardTitle>
              <CardDescription>The latest persisted probe result survives gateway restarts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={display.variant}>{display.label}</Badge>
                {lastCheck ? <span className="text-muted-foreground">persisted</span> : null}
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-muted-foreground">Checked</dt>
                  <dd className="mt-1">{lastCheck ? formatDateTime(lastCheck.checkedAt) : "Never checked"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Latency</dt>
                  <dd className="mt-1">{lastCheck?.latencyMs !== null && lastCheck?.latencyMs !== undefined ? formatNumber(lastCheck.latencyMs) + " ms" : "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Detail</dt>
                  <dd className="mt-1 leading-5">{lastCheck?.detail ?? status?.detail ?? "No probe has run yet."}</dd>
                </div>
                {lastCheck?.checkedBy ? (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Checked by</dt>
                    <dd className="mt-1">{lastCheck.checkedBy}</dd>
                  </div>
                ) : null}
              </dl>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => check.mutate(provider.id)}
                disabled={!canCheck || check.isPending}
              >
                <RefreshCw className={cn(check.isPending && "animate-spin")} />
                {check.isPending ? "Checking…" : "Run health check"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>How probing works</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs leading-5 text-muted-foreground">
              <p>Checks never invoke chat, audio, embedding, or credit operations.</p>
              <p>OpenCode and Voyage use an authenticated models request; ElevenLabs uses a voices request. Other providers use a host-reachability probe.</p>
              <p>A reachability probe does not verify the credential. Missing keys and empty model catalogs block probing.</p>
              <p>If the provider has no DB key but the gateway has an environment bootstrap key, calls can still work. The badge reflects configuration, not the probe alone.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {editOpen ? (
        <ProviderFormDialog
          key={"edit-" + provider.id}
          open
          onOpenChange={setEditOpen}
          provider={provider}
          onSaved={() => setNotice("Provider updated")}
        />
      ) : null}

      {keyMode ? (
        <ProviderKeyDialog
          key={keyMode}
          open
          onOpenChange={(open) => { if (!open) setKeyMode(null); }}
          provider={provider}
          mode={keyMode}
          onDone={setNotice}
        />
      ) : null}

      {modelOpen ? (
        <ProviderModelDialog
          key={editingModel?.modelId ?? "new-model"}
          open
          onOpenChange={setModelOpen}
          provider={provider}
          model={editingModel}
          onSaved={() => setNotice(editingModel ? "Model updated" : "Model added")}
        />
      ) : null}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => { if (!open) setDeleteOpen(false); }}
        title="Delete provider"
        description="This cannot be undone. A provider still referenced by app-client routes is protected by the gateway."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteProvider}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete provider"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs leading-5">
          <p>Delete <span className="font-medium">{provider.displayName}</span>?</p>
          <p className="text-muted-foreground">Models in this catalog are deleted with it. Routes must be moved first.</p>
          {deleteError ? (
            <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
              <p>{deleteError}</p>
              <p className="mt-1 text-[11px]">Reassign the app-client routes that reference this provider, then retry.</p>
            </div>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={deletingModel !== null}
        onOpenChange={(open) => { if (!open) setDeletingModel(null); }}
        title="Remove model"
        description="A model referenced by an app-client route is protected by the gateway."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDeletingModel(null)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteModel}
              disabled={removeModel.isPending}
            >
              {removeModel.isPending ? "Removing…" : "Remove model"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs leading-5">
          <p>Remove <span className="font-mono">{deletingModel?.modelId}</span>?</p>
          {modelError ? (
            <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
              <p>{modelError}</p>
              <p className="mt-1 text-[11px]">Move the routes that use this model to another catalog entry, then retry.</p>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
