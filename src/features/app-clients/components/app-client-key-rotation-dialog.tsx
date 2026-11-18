import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { appClientKeyRotationConflictSchema, type PreparedAppClientKey } from "@shared/admin-api";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { appClientKeys, appClientsApi } from "@/features/app-clients/api/app-clients.api";
import { ClientKeyField } from "@/features/app-clients/components/client-key-dialog";
import { ApiError, getErrorMessage } from "@/platform/api";

type Rotation =
  | { stage: "start"; rotationId?: string }
  | { stage: "pending"; rotationId: string }
  | { stage: "prepared"; key: PreparedAppClientKey }
  | { stage: "active"; key: PreparedAppClientKey };

export function AppClientKeyRotationDialog({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rotation, setRotation] = useState<Rotation>({ stage: "start" });
  const [pending, setPending] = useState<"prepare" | "activate" | "discard" | null>(null);
  const [error, setError] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: appClientKeys.all }, { throwOnError: true });

  async function prepare() {
    if (rotation.stage !== "start" || pending) return;
    const rotationId = rotation.rotationId ?? crypto.randomUUID();
    setRotation({ stage: "start", rotationId });
    setPending("prepare");
    setError("");
    try {
      const key = await appClientsApi.prepareKey(clientId, rotationId);
      if (key.rotationId !== rotationId) throw new Error("The returned key belongs to a different rotation.");
      setRotation({ stage: "prepared", key });
    } catch (cause) {
      setError(getErrorMessage(cause));
      if (cause instanceof ApiError && cause.code === "KEY_ROTATION_CONFLICT") {
        const conflict = appClientKeyRotationConflictSchema.safeParse(cause.details);
        if (conflict.success && conflict.data.state === "pending") {
          setRotation({ stage: "pending", rotationId: conflict.data.rotationId });
        } else {
          setRotation({ stage: "start" });
          if (conflict.success && conflict.data.state === "activated") {
            try {
              await refresh();
            } catch {
              setError("A key is already active for this rotation. Reload the app-client details.");
            }
          }
        }
      }
    } finally {
      setPending(null);
    }
  }

  async function activate() {
    if (rotation.stage !== "prepared" || pending) return;
    setPending("activate");
    setError("");
    try {
      const result = await appClientsApi.activateKey(clientId, rotation.key);
      if (result.rotationId !== rotation.key.rotationId) {
        throw new Error("The response did not confirm this rotation.");
      }
      setRotation({ stage: "active", key: rotation.key });
      try {
        await refresh();
      } catch {
        setError("The key is active. Reload the app-client details to refresh the fingerprint.");
      }
    } catch (cause) {
      setError(getErrorMessage(cause) + " Retry activation before publishing this key.");
    } finally {
      setPending(null);
    }
  }

  async function discard() {
    if (pending || (rotation.stage !== "pending" && rotation.stage !== "prepared")) return;
    const rotationId = rotation.stage === "prepared" ? rotation.key.rotationId : rotation.rotationId;
    setPending("discard");
    setError("");
    try {
      const result = await appClientsApi.cancelKey(clientId, rotationId);
      if (result.rotationId !== rotationId) throw new Error("The response did not confirm this discard.");
      setRotation({ stage: "start" });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  function close() {
    if (pending) return;
    if (rotation.stage === "active") {
      setRotation({ stage: "start" });
      setError("");
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) close(); }}
      title="App-client key"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={pending !== null}>
            {rotation.stage === "active" ? "Done" : "Close"}
          </Button>
          {rotation.stage === "pending" || rotation.stage === "prepared" ? (
            <Button type="button" variant="outline" onClick={() => void discard()} disabled={pending !== null}>
              {pending === "discard" ? "Discarding…" : "Discard prepared key"}
            </Button>
          ) : null}
          {rotation.stage === "start" ? (
            <Button type="button" onClick={() => void prepare()} disabled={pending !== null}>
              {pending === "prepare" ? "Preparing…" : "Prepare new key"}
            </Button>
          ) : null}
          {rotation.stage === "prepared" ? (
            <Button type="button" onClick={() => void activate()} disabled={pending !== null}>
              {pending === "activate" ? "Activating…" : "Activate key"}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4 text-xs leading-5">
        {rotation.stage === "start" ? (
          <p>Prepare a new key to copy it before activation. The current key stays active during preparation.</p>
        ) : null}
        {rotation.stage === "pending" ? (
          <p>A prepared key already exists. Discard it to issue a fresh key.</p>
        ) : null}
        {rotation.stage === "prepared" || rotation.stage === "active" ? (
          <ClientKeyField key={rotation.key.rotationId} clientKey={rotation.key.clientKey} />
        ) : null}
        {rotation.stage === "prepared" ? (
          <p className="rounded-md border border-warning/20 p-3">
            Activation replaces the current key. Keep the prepared key available so you can publish it
            to Firebase Remote Config after activation.
          </p>
        ) : null}
        {rotation.stage === "active" ? (
          <p role="status">
            The new key is active. Publish the copied value as <code>online_gateway_api_key</code> in
            Firebase Remote Config before closing this dialog.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
