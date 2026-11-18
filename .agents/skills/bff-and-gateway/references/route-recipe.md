# BFF route recipe

Skeletons mirror the current handlers. Keep imports and helper usage consistent with
`server/src/routes/providers.ts` and `server/src/routes/users.ts`.

## Domain router

```ts
// server/src/routes/widgets.ts
import { Hono } from "hono";

import {
  widgetDeleteSchema,
  widgetInputSchema,
  widgetListSchema,
  widgetSchema,
  widgetSummarySchema,
} from "../../../shared/admin-api/index.js";
import { adminFetch } from "../gateway/live.js";
import { camelize, listItems, toApiBody } from "../gateway/mappers.js";
import type { AppEnv } from "../types.js";
import { jsonBody, normalizePage, readPageQuery } from "./helpers.js";

const widgets = new Hono<AppEnv>();

widgets.get("/", async (c) => {
  const raw = await adminFetch("/internal/admin/widgets", c.get("actor"), {
    requestId: c.get("requestId"),
  });
  return c.json(widgetListSchema.parse({ items: listItems(camelize(raw)) }));
});

widgets.get("/:id", async (c) => {
  const raw = await adminFetch(
    "/internal/admin/widgets/" + encodeURIComponent(c.req.param("id")),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(widgetSchema.parse(camelize(raw)));
});

widgets.post("/", async (c) => {
  const input = await jsonBody(c, widgetInputSchema);
  const raw = await adminFetch("/internal/admin/widgets", c.get("actor"), {
    method: "POST",
    body: toApiBody(input),
    requestId: c.get("requestId"),
  });
  return c.json(widgetSchema.parse(camelize(raw)), 201);
});

widgets.put("/:id", async (c) => {
  const input = await jsonBody(c, widgetInputSchema);
  const raw = await adminFetch(
    "/internal/admin/widgets/" + encodeURIComponent(c.req.param("id")),
    c.get("actor"),
    {
      method: "PUT",
      body: toApiBody(input),
      requestId: c.get("requestId"),
    },
  );
  return c.json(widgetSchema.parse(camelize(raw)));
});

widgets.delete("/:id", async (c) => {
  const raw = await adminFetch(
    "/internal/admin/widgets/" + encodeURIComponent(c.req.param("id")),
    c.get("actor"),
    { method: "DELETE", requestId: c.get("requestId") },
  );
  return c.json(widgetDeleteSchema.parse(camelize(raw)));
});

export { widgets };
```

Register it once in `server/src/routes/admin.ts` (which already applies `authMiddleware`):

```ts
import { widgets } from "./widgets.js";
admin.route("/widgets", widgets);
```

## Paginated read

```ts
widgets.get("/:id/audit", async (c) => {
  const query = readPageQuery(c);
  const raw = await adminFetch(
    "/internal/admin/widgets/" +
      encodeURIComponent(c.req.param("id")) +
      "/audit?limit=" +
      String(query.limit) +
      (query.cursor ? "&cursor=" + encodeURIComponent(query.cursor) : ""),
    c.get("actor"),
    { requestId: c.get("requestId") },
  );
  return c.json(
    widgetAuditListSchema.parse(
      normalizePage(camelize(raw), widgetAuditEntrySchema),
    ),
  );
});
```

For `date=dd_mm_yyyy` filters use `readActivityQuery(c)` (it validates a real calendar date).
For a search term use `readUserQuery(c)`. For UID path params use `readUid(c)` (rejects
anything outside `[A-Za-z0-9_-]{1,128}`).

## Enriching an upstream error

The provider delete path demonstrates the pattern: only enrich a matching status, never replace
the gateway's original error if enrichment fails.

```ts
providers.delete("/:id", async (c) => {
  try {
    const raw = await adminFetch(providerPath(c.req.param("id")), c.get("actor"), {
      method: "DELETE",
      requestId: c.get("requestId"),
    });
    return c.json(providerDeleteSchema.parse(camelize(raw)));
  } catch (error) {
    throw await withProviderUsage(c, error, c.req.param("id"));
  }
});
```

`withProviderUsage` returns the original error unchanged unless it is a 409; on 409 it reads
`GET /internal/admin/app-clients` (best effort), collects route references, and rethrows
`new HttpError(409, code, message, { appClients })`.

## Contract test

`server/src/app.test.ts` stubs global `fetch` before importing `app`, records calls, and drives
the Hono app with `app.request`.

```ts
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

let app: AppLike;
const calls: Array<{ path: string; method: string; body?: string; headers: Headers }> = [];

const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  calls.push({
    path: url.pathname + url.search,
    method: init?.method ?? "GET",
    body: init?.body as string | undefined,
    headers: new Headers(init?.headers),
  });

  if (url.pathname === "/internal/admin/widgets") {
    return new Response(JSON.stringify({ items: [widget] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("404 page not found", { status: 404 }); // plain text on purpose
}) as typeof fetch;

beforeAll(async () => {
  vi.stubGlobal("fetch", fakeFetch);
  app = (await import("./app.js")).app; // env must be set first (vitest.config.ts)
});

afterAll(() => vi.unstubAllGlobals());
beforeEach(() => { calls.length = 0; });

it("forwards the widget mutation with the actor", async () => {
  const response = await app.request("/api/admin/widgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "W", enabled: true }),
  });
  expect(response.status).toBe(201);
  expect(calls.at(-1)?.method).toBe("POST");
  expect(calls.at(-1)?.body).toContain('"enabled":true');
  expect(calls.at(-1)?.headers.get("X-Admin-Actor")).toBe("operator@test.local");
  expect(calls.at(-1)?.headers.get("Authorization")).toBe("Bearer test-secret");
});
```

Add assertions for: path and query forwarding, 401/403 mapping, `VALIDATION_FAILED`, upstream
plain-text 404 preserved, cursor/date validation, and that a failed request did not call
upstream (e.g. invalid date asserts `calls` length unchanged).

## Checklist

- [ ] Route is explicit in `admin.ts`; no wildcard proxy.
- [ ] Request validated with a shared or local Zod schema before upstream.
- [ ] `toApiBody` for mutations; `camelize` + schema parse for reads.
- [ ] Status codes: 201 create, 200 otherwise, 204 only if truly bodyless (not used today).
- [ ] Errors are `HttpError` with a stable code; no upstream body leak.
- [ ] Contract test covers success + at least one error path.
- [ ] `docs/06-api-integration.md` updated for a new endpoint/payload.
