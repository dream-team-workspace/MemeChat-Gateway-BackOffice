import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Plus, RefreshCw, Search, Smartphone } from "lucide-react";

import type { AppClient } from "@shared/admin-api";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/async-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppClientFormDialog } from "@/features/app-clients/components/app-client-form-dialog";
import { ClientKeyDialog } from "@/features/app-clients/components/client-key-dialog";
import { appClientsQueryOptions } from "@/features/app-clients/queries/app-clients.queries";
import { getErrorMessage } from "@/platform/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function platformLabel(platform: AppClient["platform"]) {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function mappedCount(client: AppClient) {
  return client.capabilities.filter((capability) => capability.enabled).length;
}

export function AppClientsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revealed, setRevealed] = useState<{ client: AppClient; key: string } | null>(null);
  const clients = useQuery(appClientsQueryOptions);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const items = clients.data?.items ?? [];
    if (!term) return items;
    return items.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        client.slug.toLowerCase().includes(term) ||
        client.platform.toLowerCase().includes(term),
    );
  }, [clients.data, query]);

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Clients"
        title="App clients"
        description="Manage consumer apps and map each one to gateway capabilities and models."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void clients.refetch()}
              disabled={clients.isFetching}
            >
              <RefreshCw className={cn(clients.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus />
              Add app client
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="app-client-search"
            name="app-client-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search app clients"
            aria-label="Search app clients"
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{clients.data?.items.length ?? 0} clients · gateway API</Badge>
      </div>

      {clients.isLoading ? (
        <div className="mt-4"><LoadingRows rows={4} /></div>
      ) : clients.isError ? (
        <Card className="mt-4">
          <CardContent className="p-0">
            <ErrorState message={getErrorMessage(clients.error)} onRetry={() => void clients.refetch()} />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="p-0">
            <EmptyState
              title={clients.data?.items.length ? "No app clients match that search" : "No app clients yet"}
              description={
                clients.data?.items.length
                  ? "Try a name, slug, or platform."
                  : "Create a client, then choose which capabilities and models it can use."
              }
              action={
                <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus />
                  Add app client
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filtered.map((client) => (
            <LinkCard key={client.id} client={client} onOpen={() => void navigate({ to: "/app-clients/$clientId", params: { clientId: client.id } })} />
          ))}
        </div>
      )}

      {dialogOpen ? (
        <AppClientFormDialog
          open
          onOpenChange={setDialogOpen}
          onCreated={(client) => {
            if (client.clientKey) {
              setRevealed({ client, key: client.clientKey });
              return;
            }
            void navigate({ to: "/app-clients/$clientId", params: { clientId: client.id } });
          }}
        />
      ) : null}

      {revealed ? (
        <ClientKeyDialog
          open
          client={revealed.client}
          clientKey={revealed.key}
          onClose={() => {
            const client = revealed.client;
            setRevealed(null);
            void navigate({ to: "/app-clients/$clientId", params: { clientId: client.id } });
          }}
        />
      ) : null}
    </div>
  );
}

function LinkCard({ client, onOpen }: { client: AppClient; onOpen: () => void }) {
  return (
    <Card className="group transition-colors hover:border-primary/30">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-accent text-accent-foreground">
              <Smartphone className="size-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate">{client.name}</CardTitle>
              <CardDescription className="mt-1 font-mono text-[11px]">{client.slug}</CardDescription>
            </div>
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{platformLabel(client.platform)}</Badge>
            <Badge variant={client.enabled ? "success" : "warning"}>
              {client.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant="outline">
              {mappedCount(client)} {mappedCount(client) === 1 ? "capability" : "capabilities"} enabled
            </Badge>
            <Badge variant={client.requireFirebaseUid ? "info" : "outline"}>
              {client.requireFirebaseUid ? "Firebase UID required" : "Firebase UID not required"}
            </Badge>
          </div>
          <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {client.description || "No description"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Updated {formatDateTime(client.updatedAt)}
          </p>
        </CardContent>
      </button>
    </Card>
  );
}
