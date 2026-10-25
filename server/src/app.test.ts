import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type AppLike = {
  request: (input: string, init?: RequestInit) => Response | Promise<Response>;
};

const capability = {
  id: "chat.standard",
  kind: "chat",
  displayName: "Standard chat",
  enabled: true,
  streaming: "sse",
  supportsReasoning: false,
  supportsImage: true,
  costUnit: "turn",
  costCredits: 1,
  costPer: 1,
  limits: { maxInputChars: 16000, maxOutputTokens: 1024 },
  fairUse: {},
  minAppVersion: null,
  revision: 1,
  providers: [
    {
      id: 1,
      capabilityId: "chat.standard",
      priority: 1,
      provider: "opencode",
      model: "deepseek-v4.1-flash",
      enabled: true,
      config: {},
    },
  ],
  createdAt: "2026-10-23T08:00:00Z",
  updatedAt: "2026-10-23T08:00:00Z",
};

const provider = {
  id: "opencode",
  displayName: "OpenCode",
  role: "Chat and reasoning models",
  capabilities: ["chat.standard", "chat.premium"],
  models: [
    {
      id: "deepseek-v4.1-flash",
      displayName: "DeepSeek V4.1 Flash",
      capability: "chat.standard",
      default: true,
    },
    {
      id: "deepseek-v4-pro",
      displayName: "DeepSeek V4 Pro",
      capability: "chat.premium",
    },
  ],
  endpoint: "https://opencode.test/v1",
  model: "deepseek-v4.1-flash",
  modelValid: true,
  credential: "Credential configured",
  configured: true,
  status: "healthy",
  detail: "Authenticated OpenCode models request succeeded (HTTP 200).",
  latencyMs: 42,
  checkedAt: "2026-10-24T09:00:00Z",
  lastCheck: {
    status: "healthy",
    checkedAt: "2026-10-24T09:00:00Z",
    latencyMs: 42,
    detail: "Authenticated OpenCode models request succeeded (HTTP 200).",
    checkedBy: "operator@test.local",
  },
};

const auditEntry = {
  id: 1,
  capabilityId: "chat.standard",
  revision: 1,
  action: "updated",
  changedBy: "operator@test.local",
  beforeState: { costCredits: 2 },
  afterState: { costCredits: 1 },
  changedAt: "2026-10-23T08:01:00Z",
};

const model = {
  id: "deepseek-v4.1-flash",
  displayName: "DeepSeek V4.1 Flash",
  tier: "standard",
  capabilityId: "chat.standard",
  sortOrder: 10,
  enabled: true,
  minAppVersion: null,
  createdAt: "2026-10-23T08:00:00Z",
  updatedAt: "2026-10-23T08:00:00Z",
};

const appClient = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "MemeChat Android",
  slug: "memechat-android",
  platform: "android",
  description: "Primary Android client",
  enabled: true,
  capabilities: [
    {
      capabilityId: "chat.standard",
      capabilityName: "Standard chat",
      kind: "chat",
      modelId: "deepseek-v4.1-flash",
      enabled: true,
    },
  ],
  keyRotatedAt: null,
  clientKeySha1: "0123456789abcdef0123456789abcdef01234567",
  createdAt: "2026-10-25T08:00:00Z",
  updatedAt: "2026-10-25T08:00:00Z",
};

const appClientAuditEntry = {
  id: 7,
  appClientId: appClient.id,
  action: "capability_granted",
  changedBy: "operator@test.local",
  beforeState: { enabled: false },
  afterState: { enabled: true, modelId: "deepseek-v4.1-flash" },
  changedAt: "2026-10-25T09:00:00Z",
};

const appClientActivityEntry = {
  id: 11,
  appClientId: appClient.id,
  uid: "uid_test",
  requestId: "9cde27e0-9a6b-4c9e-bdf4-7f2c1a4f3e21",
  capability: "chat.standard",
  model: "deepseek-v4.1-flash",
  status: "ok",
  credits: 1,
  latencyMs: 840,
  createdAt: "2026-10-25T09:05:00Z",
};

const userSummary = {
  uid: "uid_test",
  email: "user@example.test",
  tier: "ultra",
  lastSeenAt: "2026-10-25T09:05:00Z",
  createdAt: "2026-10-20T08:00:00Z",
};

const ledgerEntry = {
  id: 1,
  uid: "uid_test",
  requestId: "9cde27e0-9a6b-4c9e-bdf4-7f2c1a4f3e21",
  capability: "chat.standard",
  capabilityRevision: 1,
  state: "COMMITTED",
  reserved: 1,
  committed: 1,
  units: 1,
  costUnit: "turn",
  unitAmount: 1,
  rcTxnId: "rc_test_1",
  balanceAfter: 274,
  spendAttempts: 1,
  refundAttempts: 0,
  refundedAt: null,
  createdAt: "2026-10-23T08:00:00Z",
  updatedAt: "2026-10-23T08:00:00Z",
};

const usageEvent = {
  id: 1,
  uid: "uid_test",
  requestId: "9cde27e0-9a6b-4c9e-bdf4-7f2c1a4f3e21",
  capability: "chat.standard",
  capabilityRevision: 1,
  provider: "opencode",
  model: "deepseek-v4.1-flash",
  inputTokens: 120,
  outputTokens: 80,
  characters: null,
  audioSeconds: null,
  credits: 1,
  status: "ok",
  latencyMs: 840,
  createdAt: "2026-10-23T08:00:00Z",
};

const calls: Array<{
  path: string;
  method: string;
  headers: Headers;
  body: string | null;
}> = [];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const body = typeof init?.body === "string" ? init.body : null;
  calls.push({
    path: url.pathname + url.search,
    method,
    headers: new Headers(init?.headers),
    body,
  });

  if (url.pathname === "/healthz") return json({ status: "ok" });
  if (url.pathname === "/readyz") return json({ status: "ready" });
  if (url.pathname === "/internal/admin/revenuecat/status") {
    return json({ configured: true, projectId: "proj_test", baseUrl: "http://rc.test" });
  }
  if (url.pathname === "/internal/admin/providers") {
    return json({ items: [provider] });
  }
  if (url.pathname === "/internal/admin/providers/opencode/check") {
    return json(provider);
  }
  if (url.pathname === "/internal/admin/capabilities") {
    return json({ items: [capability] });
  }
  if (url.pathname === "/internal/admin/capabilities/chat.standard") {
    if (method === "PUT") return json({ ...capability, revision: 2 });
    return json(capability);
  }
  if (url.pathname === "/internal/admin/capabilities/chat.standard/toggle") {
    return json({ ...capability, enabled: false, revision: 2 });
  }
  if (url.pathname === "/internal/admin/capabilities/chat.standard/providers") {
    return json({ ...capability, revision: 2 });
  }
  if (url.pathname === "/internal/admin/capabilities/chat.standard/audit") {
    return json({ items: [auditEntry], nextCursor: "older" });
  }
  if (url.pathname === "/internal/admin/app-clients") {
    return json(method === "POST" ? appClient : { items: [appClient] });
  }
  if (url.pathname === "/internal/admin/app-clients/" + appClient.id) {
    if (method === "DELETE") return json({ deleted: true });
    return json(appClient);
  }
  if (url.pathname === "/internal/admin/app-clients/" + appClient.id + "/audit") {
    return json({ items: [appClientAuditEntry], nextCursor: "older" });
  }
  if (url.pathname === "/internal/admin/app-clients/" + appClient.id + "/activity") {
    return json({ items: [appClientActivityEntry], nextCursor: null });
  }
  if (url.pathname === "/internal/admin/app-clients/unknown-id/audit") {
    // The gateway mux answers unknown admin routes with plain text.
    return new Response("404 page not found\n", { status: 404 });
  }
  if (url.pathname === "/internal/admin/app-clients/" + appClient.id + "/key/rotate") {
    return json({ ...appClient, clientKey: "0123456789abcdef0123456789abcdef01234567" });
  }
  if (url.pathname === "/internal/admin/models") {
    return json({ items: [model] });
  }
  if (url.pathname === "/internal/admin/models/deepseek-v4.1-flash") {
    return json(model);
  }
  if (url.pathname === "/internal/admin/users") {
    return json({ items: [userSummary], nextCursor: null });
  }
  if (url.pathname === "/internal/admin/users/uid_test/ledger") {
    return json({ items: [ledgerEntry], nextCursor: null });
  }
  if (url.pathname === "/internal/admin/users/uid_test/usage") {
    return json({ items: [usageEvent], nextCursor: null });
  }
  if (url.pathname === "/internal/admin/users/uid_test/credits/grant") {
    return json({
      uid: "uid_test",
      amount: 15,
      requestId: "22222222-2222-4222-8222-222222222222",
      balanceAfter: 289,
      rcTxnId: "rc_test_2",
    });
  }
  if (url.pathname === "/internal/admin/cache/invalidate") {
    return json({ invalidatedAt: "2026-10-23T08:02:00Z", revision: 2 });
  }

  return json({ code: "NOT_FOUND", message: "not found" }, 404);
};

async function jsonBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("live-only BFF admin API", () => {
  let app: AppLike;

  beforeAll(async () => {
    vi.stubGlobal("fetch", fakeFetch);
    app = (await import("./app.js")).app;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    calls.length = 0;
  });

  it("probes the gateway and reports live mode", async () => {
    const health = await jsonBody<{ status: string; gateway: { readiness: string } }>(
      await app.request("/api/health"),
    );
    expect(health.status).toBe("ok");
    expect(health.gateway.readiness).toBe("ok");

    const meta = await jsonBody<{ adminApiMode: string; authMode: string }>(
      await app.request("/api/meta"),
    );
    expect(meta.adminApiMode).toBe("live");
    expect(meta.authMode).toBe("development");
  });

  it("reads capabilities and the direct detail route", async () => {
    const list = await jsonBody<{ items: Array<{ id: string }> }>(
      await app.request("/api/admin/capabilities"),
    );
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.id).toBe("chat.standard");

    const detail = await jsonBody<{ id: string; providers: unknown[] }>(
      await app.request("/api/admin/capabilities/chat.standard"),
    );
    expect(detail.id).toBe("chat.standard");
    expect(detail.providers).toHaveLength(1);
  });

  it("forwards mutations with the admin secret and actor", async () => {
    const response = await app.request("/api/admin/capabilities/chat.standard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Standard chat",
        streaming: "sse",
        supportsReasoning: false,
        supportsImage: true,
        costUnit: "turn",
        costCredits: 1,
        costPer: 1,
        limits: { maxInputChars: 16000 },
        fairUse: {},
        minAppVersion: null,
      }),
    });
    expect(response.status).toBe(200);
    const updateCall = calls.at(-1);
    expect(updateCall?.method).toBe("PUT");
    expect(updateCall?.headers.get("Authorization")).toBe("Bearer test-secret");
    expect(updateCall?.headers.get("X-Admin-Actor")).toBe("operator@test.local");
    expect(updateCall?.body).toContain('"display_name"');
  });

  it("reads audit, models, ledger, usage, RC status, and cache", async () => {
    const audit = await jsonBody<{ items: unknown[]; nextCursor: string | null }>(
      await app.request("/api/admin/capabilities/chat.standard/audit?limit=1"),
    );
    expect(audit.items).toHaveLength(1);
    expect(audit.nextCursor).toBe("older");

    expect(
      (await jsonBody<{ items: unknown[] }>(await app.request("/api/admin/models"))).items,
    ).toHaveLength(1);

    expect(
      (
        await jsonBody<{ items: unknown[] }>(
          await app.request("/api/admin/users/uid_test/ledger"),
        )
      ).items,
    ).toHaveLength(1);

    expect(
      (
        await jsonBody<{ items: unknown[] }>(
          await app.request("/api/admin/users/uid_test/usage"),
        )
      ).items,
    ).toHaveLength(1);

    const revenuecat = await jsonBody<{ configured: boolean; projectId: string }>(
      await app.request("/api/admin/revenuecat/status"),
    );
    expect(revenuecat.configured).toBe(true);
    expect(revenuecat.projectId).toBe("proj_test");

    const cache = await responseJson<{ revision: number }>(
      await app.request("/api/admin/cache/invalidate", { method: "POST" }),
    );
    expect(cache.revision).toBe(2);
  });

  it("lists providers with the persisted last check and probes one", async () => {
    const list = await jsonBody<{
      items: Array<{
        id: string;
        status: string;
        lastCheck: { status: string; checkedBy: string | null } | null;
      }>;
    }>(await app.request("/api/admin/providers"));
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.id).toBe("opencode");
    expect(list.items[0]?.status).toBe("healthy");
    expect(list.items[0]?.lastCheck?.status).toBe("healthy");
    expect(list.items[0]?.lastCheck?.checkedBy).toBe("operator@test.local");

    const checked = await jsonBody<{ id: string; status: string; latencyMs: number }>(
      await app.request("/api/admin/providers/opencode/check", { method: "POST" }),
    );
    expect(checked.id).toBe("opencode");
    expect(checked.status).toBe("healthy");
    expect(checked.latencyMs).toBe(42);
    expect(calls.at(-1)?.method).toBe("POST");
  });

  it("lists, reads, creates, and deletes app clients", async () => {
    const list = await jsonBody<{ items: Array<{ id: string }> }>(
      await app.request("/api/admin/app-clients"),
    );
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.id).toBe(appClient.id);

    const detail = await jsonBody<{
      slug: string;
      capabilities: unknown[];
      clientKeySha1?: string | null;
    }>(await app.request("/api/admin/app-clients/" + appClient.id));
    expect(detail.slug).toBe("memechat-android");
    expect(detail.capabilities).toHaveLength(1);
    expect(detail.clientKeySha1).toBe(appClient.clientKeySha1);

    const created = await app.request("/api/admin/app-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "MemeChat Android",
        slug: "memechat-android",
        platform: "android",
        description: "Primary Android client",
        enabled: true,
        capabilities: [
          {
            capabilityId: "chat.standard",
            modelId: "deepseek-v4.1-flash",
            enabled: true,
          },
        ],
      }),
    });
    expect(created.status).toBe(201);
    expect(calls.at(-1)?.body).toContain('"capability_id"');
    expect(calls.at(-1)?.headers.get("X-Admin-Actor")).toBe("operator@test.local");

    const rotated = await jsonBody<{ clientKey?: string }>(
      await app.request("/api/admin/app-clients/" + appClient.id + "/key/rotate", { method: "POST" }),
    );
    expect(rotated.clientKey).toHaveLength(40);

    const removed = await jsonBody<{ deleted: boolean }>(
      await app.request("/api/admin/app-clients/" + appClient.id, { method: "DELETE" }),
    );
    expect(removed.deleted).toBe(true);
  });

  it("proxies app client admin audit and user activity", async () => {
    const audit = await jsonBody<{
      items: Array<{ action: string }>;
      nextCursor: string | null;
    }>(
      await app.request("/api/admin/app-clients/" + appClient.id + "/audit?limit=10"),
    );
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]?.action).toBe("capability_granted");
    expect(audit.nextCursor).toBe("older");
    expect(calls.at(-1)?.path).toContain("/audit?limit=10");
    expect(calls.at(-1)?.headers.get("X-Admin-Actor")).toBe("operator@test.local");

    const activity = await jsonBody<{
      items: Array<{ uid: string; capability: string; status: string }>;
      nextCursor: string | null;
    }>(
      await app.request("/api/admin/app-clients/" + appClient.id + "/activity?limit=10"),
    );
    expect(activity.items).toHaveLength(1);
    expect(activity.items[0]?.uid).toBe("uid_test");
    expect(activity.items[0]?.capability).toBe("chat.standard");
    expect(activity.items[0]?.status).toBe("ok");
    expect(activity.nextCursor).toBeNull();
  });

  it("preserves an unimplemented gateway route as a 404", async () => {
    const response = await app.request("/api/admin/app-clients/unknown-id/audit");
    expect(response.status).toBe(404);
    const body = await jsonBody<{ code: string; message: string }>(response);
    expect(body.code).toBe("UPSTREAM_ERROR");
    expect(body.message).toContain("404 page not found");
  });

  it("lists the signed-in user directory with email and tier", async () => {
    const directory = await jsonBody<{
      items: Array<{ uid: string; email: string | null; tier: string }>;
      nextCursor: string | null;
    }>(
      await app.request(
        "/api/admin/users?limit=10&query=" + encodeURIComponent("user@example.test"),
      ),
    );
    expect(directory.items).toHaveLength(1);
    expect(directory.items[0]?.uid).toBe("uid_test");
    expect(directory.items[0]?.email).toBe("user@example.test");
    expect(directory.items[0]?.tier).toBe("ultra");
    expect(directory.nextCursor).toBeNull();
    expect(calls.at(-1)?.path).toContain(
      "query=" + encodeURIComponent("user@example.test"),
    );
    expect(calls.at(-1)?.method).toBe("GET");
  });

  it("grants credits through the live path", async () => {
    const response = await app.request("/api/admin/users/uid_test/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 15,
        reason: "test grant via live adapter",
        requestId: "22222222-2222-4222-8222-222222222222",
      }),
    });
    expect(response.status).toBe(200);
    const result = await jsonBody<{ balanceAfter: number; rcTxnId: string }>(response);
    expect(result.balanceAfter).toBe(289);
    expect(result.rcTxnId).toBe("rc_test_2");
    expect(calls.at(-1)?.body).toContain('"request_id"');
  });
});

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
