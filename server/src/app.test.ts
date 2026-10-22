import { describe, expect, it } from "vitest";

import { app } from "./app.js";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("BFF admin mock API", () => {
  it("reports health and meta", async () => {
    const health = await json<{ status: string; environment: string }>(
      await app.request("/api/health"),
    );
    expect(health.status).toBe("ok");
    expect(health.environment).toBe("development");

    const meta = await json<{ adminApiMode: string; authMode: string }>(
      await app.request("/api/meta"),
    );
    expect(meta.adminApiMode).toBe("mock");
    expect(meta.authMode).toBe("development");
  });

  it("lists capabilities and reads one with providers", async () => {
    const list = await json<{ items: Array<{ id: string }> }>(
      await app.request("/api/admin/capabilities"),
    );
    expect(list.items.some((item) => item.id === "chat.standard")).toBe(true);

    const response = await app.request("/api/admin/capabilities/chat.standard");
    expect(response.status).toBe(200);
    const capability = await json<{ id: string; providers: unknown[]; revision: number }>(
      response,
    );
    expect(capability.id).toBe("chat.standard");
    expect(capability.providers.length).toBeGreaterThan(0);
    expect(capability.revision).toBeGreaterThan(0);
  });

  it("lists models, ledger, usage, and audit", async () => {
    const models = await json<{ items: unknown[] }>(await app.request("/api/admin/models"));
    expect(models.items.length).toBeGreaterThan(0);

    const ledger = await json<{ items: Array<{ state: string }> }>(
      await app.request("/api/admin/users/uid_7f3a9c21/ledger"),
    );
    expect(ledger.items.some((entry) => entry.state === "COMMITTED")).toBe(true);

    const usage = await json<{ items: unknown[] }>(
      await app.request("/api/admin/users/uid_7f3a9c21/usage"),
    );
    expect(usage.items.length).toBeGreaterThan(0);

    const audit = await json<{ items: unknown[] }>(
      await app.request("/api/admin/capabilities/chat.standard/audit"),
    );
    expect(audit.items.length).toBeGreaterThan(0);
  });

  it("toggles a capability and records the revision", async () => {
    const response = await app.request("/api/admin/capabilities/tts/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true, reason: "test: re-enable tts" }),
    });
    expect(response.status).toBe(200);
    const capability = await json<{ enabled: boolean; revision: number }>(response);
    expect(capability.enabled).toBe(true);
    expect(capability.revision).toBeGreaterThan(2);
  });

  it("invalidates the cache", async () => {
    const response = await app.request("/api/admin/cache/invalidate", {
      method: "POST",
    });
    expect(response.status).toBe(200);
    const body = await json<{ invalidatedAt: string; revision: number }>(response);
    expect(body.invalidatedAt).toBeTruthy();
    expect(body.revision).toBeGreaterThan(0);
  });

  it("grants credits idempotently", async () => {
    const requestId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      amount: 30,
      reason: "test: idempotent grant",
      requestId,
    };

    const first = await app.request("/api/admin/users/uid_grant_test/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(200);
    const result = await json<{ amount: number; balanceAfter: number }>(first);
    expect(result.amount).toBe(30);
    expect(result.balanceAfter).toBe(30);

    const second = await app.request("/api/admin/users/uid_grant_test/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const replay = await json<{ amount: number; balanceAfter: number }>(second);
    expect(replay.balanceAfter).toBe(30);
  });

  it("rejects invalid grant payloads", async () => {
    const response = await app.request("/api/admin/users/uid_grant_test/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 0, reason: "x", requestId: "nope" }),
    });
    expect(response.status).toBe(422);
    const body = await json<{ code: string }>(response);
    expect(body.code).toBe("VALIDATION_FAILED");
  });
});
