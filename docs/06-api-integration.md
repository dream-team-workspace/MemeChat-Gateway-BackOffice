# 06 — API integration contract

| Field | Value |
|---|---|
| Status | Proposed; upstream fields marked **assumed** must be confirmed |
| Frontend boundary | BFF `/api/*` only |
| Shared schemas | `shared/admin-api/schemas.ts` |
| Backend analysis | [02-backend-contract-analysis.md](02-backend-contract-analysis.md) |

## 1. Principles

1. **The browser never sees the gateway.** No direct `fetch` to the admin origin.
2. **One anti-corruption layer.** The BFF maps upstream casing, pagination, and errors into
   the canonical contract below.
3. **Validate at both edges.** BFF parses upstream; the client parses BFF responses. A schema
   failure is a contract bug, not a silent coercion.
4. **No optimistic money.** Grants and registry changes wait for the server.
5. **No generic proxy.** Explicit routes, methods, params, and Zod schemas.
6. **No invented endpoints.** Missing backend routes stay mock-only and blocked.
7. **Every request has an ID.** `X-Request-Id` is generated or propagated and shown on errors.

## 2. BFF endpoint catalog

### 2.1 Auth and meta

| Method | BFF path | Upstream | Auth | Notes |
|---|---|---|---|---|
| GET | `/api/health` | `GET /healthz`, `GET /readyz` | public | Liveness/readiness + console version; no secrets |
| GET | `/api/auth/login` | IdP | public | Sets state/nonce cookies, redirects |
| GET | `/api/auth/callback` | IdP | public | Verifies state, allowlist, mints session |
| POST | `/api/auth/logout` | IdP (optional) | session | Clears cookie, CSRF required |
| GET | `/api/auth/me` | none | session | Returns operator + environment |
| GET | `/api/meta` | none | public | App version, commit, environment |

### 2.2 Admin resources

| Method | BFF path | Upstream admin route | Success shape |
|---|---|---|---|
| GET | `/api/admin/capabilities` | `GET /internal/admin/capabilities` | `Capability[]` or `{items}` normalized |
| GET | `/api/admin/capabilities/:id` | list + find (or documented single route) | `Capability` |
| PUT | `/api/admin/capabilities/:id` | `PUT /internal/admin/capabilities/{id}` | `Capability` |
| POST | `/api/admin/capabilities/:id/toggle` | `POST .../toggle` | `Capability` |
| PUT | `/api/admin/capabilities/:id/providers` | `PUT .../providers` | `ProviderRoute[]` or `Capability` |
| GET | `/api/admin/capabilities/:id/audit` | `GET .../audit?limit=` | `{items,nextCursor}` |
| GET | `/api/admin/models` | `GET /internal/admin/models` | `Model[]` |
| PUT | `/api/admin/models/:id` | `PUT /internal/admin/models/{id}` | `Model` |
| POST | `/api/admin/cache/invalidate` | `POST .../cache/invalidate` | `{invalidatedAt, revision?}` |
| GET | `/api/admin/users/:uid/ledger` | `GET .../ledger?limit=&cursor=` | `{items,nextCursor}` |
| GET | `/api/admin/users/:uid/usage` | `GET .../usage?limit=&cursor=` | `{items,nextCursor}` |
| POST | `/api/admin/users/:uid/credits/grant` | `POST .../credits/grant` | `CreditGrantResult` |

**Assumption A1:** there is no documented single-capability GET. The BFF may either require
the backend to add one or fetch the list and find by ID. Prefer a backend GET; until then, the
list is small enough to find client-side, and the BFF returns 404 if absent.

**Assumption A2:** the audit route documents `?limit=50` but not a cursor. The BFF passes
`limit` and returns `nextCursor: null` unless the backend adds cursor support. The UI shows
"Most recent 50" in that case.

## 3. Canonical types

These are the frontend-facing shapes. They are camelCase, integer amounts, ISO-8601 UTC
timestamps, and opaque cursor strings.

~~~ts
export type IsoDateTime = string; // "2026-10-21T15:04:05Z"
export type Uid = string;

export type CapabilityKind = "chat" | "tts" | "stt" | "embeddings" | string;
export type StreamingMode = "sse" | "chunked-audio" | "none" | string;
export type CostUnit = "turn" | "chars" | "seconds" | "tokens" | string;

export interface ProviderRoute {
  id: number | string;
  capabilityId: string;
  priority: number;
  provider: string;
  model: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface Capability {
  id: string;
  kind: CapabilityKind;
  displayName: string;
  enabled: boolean;
  streaming: StreamingMode;
  supportsReasoning: boolean;
  supportsImage: boolean;
  costUnit: CostUnit;
  costCredits: number;
  costPer: number;
  limits: Record<string, unknown>;
  fairUse: Record<string, unknown>;
  minAppVersion: string | null;
  revision: number;
  providers: ProviderRoute[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  tier: string;
  capabilityId: string | null;
  sortOrder: number;
  enabled: boolean;
  minAppVersion: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type LedgerState =
  | "PENDING_SPEND"
  | "RESERVED"
  | "COMMITTED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "EXPIRED"
  | "FAILED";

export interface LedgerEntry {
  id: number | string;
  uid: Uid;
  requestId: string;
  capability: string;
  capabilityRevision: number | null;
  state: LedgerState;
  reserved: number;
  committed: number | null;
  units: number | null;
  costUnit: string | null;
  unitAmount: number | null;
  rcTxnId: string | null;
  balanceAfter: number | null;
  spendAttempts: number;
  refundAttempts: number;
  refundedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type UsageStatus =
  | "ok"
  | "upstream_error"
  | "client_abort"
  | "insufficient_credits"
  | "fair_use"
  | string;

export interface UsageEvent {
  id: number | string;
  uid: Uid;
  requestId: string;
  capability: string;
  capabilityRevision: number | null;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  characters: number | null;
  audioSeconds: number | null;
  credits: number;
  status: UsageStatus;
  latencyMs: number | null;
  createdAt: IsoDateTime;
}

export interface AuditEntry {
  id: number | string;
  capabilityId: string;
  revision: number;
  action: string;
  changedBy: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  changedAt: IsoDateTime;
}

export interface CreditGrantInput {
  amount: number;
  reason: string;
  requestId: string;
}

export interface CreditGrantResult {
  uid: Uid;
  amount: number;
  requestId: string;
  balanceAfter?: number;
  rcTxnId?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface OperatorSession {
  sub: string;
  email: string;
  name: string;
  avatarUrl?: string;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  environment: "development" | "staging" | "production";
}
~~~

## 4. Upstream mapping

### 4.1 Casing

The gateway's Go/DB layer most likely emits snake_case (`display_name`, `cost_credits`).
The BFF maps to camelCase. If the gateway already emits camelCase, the mapper is
field-for-field and still validates. Feature code never branches on upstream casing.

### 4.2 Unknown fields

- Nested JSON (`limits`, `fair_use`, provider `config`) is passed through and preserved
  on edit.
- Unknown top-level fields are ignored by the UI. The BFF should merge the upstream resource
  with the client patch before PUT when the backend supports partial updates; otherwise the
  client sends the full known representation. This is gap G11 and must be confirmed.

### 4.3 List normalization

Upstream may return a bare array or an object. The BFF normalizes:

~~~json
{ "items": [], "nextCursor": null }
~~~

If the upstream uses `before`/`after` or a timestamp cursor, the BFF converts it to an
opaque string and returns it unchanged to the client. The client never constructs a cursor.

## 5. Pagination

- Query params: `limit` (default 50, max 200) and `cursor` (opaque, omitted for first page).
- Response: `{ items, nextCursor }`.
- The UI keeps a stack of cursors to implement "Newer"; "Older" follows `nextCursor`.
- No offset/page numbers. No total count unless the backend provides one.
- Changing filters resets the cursor.
- A malformed/expired cursor returns 400 `INVALID_CURSOR`; the UI offers "Start over".

## 6. Errors

### 6.1 Envelope

~~~json
{
  "code": "INVALID_REQUEST",
  "message": "costCredits must be greater than 0",
  "requestId": "5f2c6f0e-...",
  "details": { "field": "costCredits" }
}
~~~

The BFF preserves the envelope. If the upstream shape differs, the BFF normalizes. The client
never renders a raw upstream body.

### 6.2 Codes

| HTTP | Code | UI behavior |
|---|---|---|
| 400 | `INVALID_REQUEST` | Inline form errors where `details.field` exists; otherwise form-level error |
| 400 | `INVALID_CURSOR` | Reset pagination; keep filters |
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` | One session refetch, then redirect to login with returnTo |
| 403 | `FORBIDDEN` | Forbidden page or action-disabled message |
| 404 | `NOT_FOUND` | Resource empty state with back link |
| 409 | `CONFLICT` / `REVISION_MISMATCH` | "Someone else changed this"; reload latest, preserve draft |
| 422 | `VALIDATION_FAILED` | Field errors; scroll to first; keep form |
| 429 | `RATE_LIMITED` | Show retry-after countdown; do not auto-retry mutations |
| 502 | `UPSTREAM_ERROR` | "Gateway returned an error"; request ID; retry reads only |
| 503 | `CAPABILITY_DISABLED` | Contextual message; not a crash |
| 504 | `TIMEOUT` | Request ID; retry reads; for mutations, verify state before retrying |
| 500 | `INTERNAL` | Generic message + request ID; report |
| — | `NETWORK_ERROR` | Offline/connection message; retry reads |
| — | `CONTRACT_MISMATCH` | "Unexpected response"; request ID; report; do not render partial data |

For a mutation timeout, the UI must not automatically retry. It should say "We don't know
whether this succeeded" and offer **Refresh** first; for grants, offer "Retry with same
request ID" only after the user confirms.

## 7. Query keys and cache policy

~~~ts
const keys = {
  session: ["session"] as const,
  meta: ["meta"] as const,
  capabilities: ["capabilities"] as const,
  capability: (id: string) => ["capabilities", id] as const,
  capabilityAudit: (id: string, limit: number) => ["capabilities", id, "audit", limit] as const,
  models: ["models"] as const,
  ledger: (uid: string, cursor: string | null, limit: number) =>
    ["users", uid, "ledger", cursor, limit] as const,
  usage: (uid: string, cursor: string | null, limit: number) =>
    ["users", uid, "usage", cursor, limit] as const,
};
~~~

| Query | staleTime | refetchOnWindowFocus | Notes |
|---|---|---|---|
| session | 60s | true | 401 triggers refetch |
| meta | 5m | false | version/env |
| capabilities | 30s | true | full list |
| capability | 15s | true | detail |
| audit | 10s | false | explicit refresh |
| models | 60s | true | full list |
| ledger | 15s | false | append-only-ish; explicit refresh |
| usage | 30s | false | metadata |
| health | 15s | true | dashboard only |

Retries:

- Queries: 2 retries on network/5xx with jitter; no retry on 4xx.
- Mutations: 0 automatic retries.
- Grant user retry: same `requestId`, explicit.

## 8. Mutation protocol

### 8.1 Capability PUT

Request body (canonical, full representation of editable fields):

~~~json
{
  "displayName": "Premium chat",
  "streaming": "sse",
  "supportsReasoning": true,
  "supportsImage": true,
  "costUnit": "turn",
  "costCredits": 5,
  "costPer": 1,
  "limits": { "maxOutputTokens": 4096 },
  "fairUse": { "cap": 100, "window": "day" },
  "minAppVersion": "2.4.0"
}
~~~

- Do not send `enabled` through this form; use the toggle.
- Do not send `id`, `revision`, or `providers` in the body.
- `costCredits` and `costPer` are integers > 0.
- Headers: `X-CSRF-Token`, `X-Request-Id`.
- On success, refetch capability + audit.

### 8.2 Toggle

~~~json
{ "enabled": false, "reason": "OpenAI 5xx spike; kill switch" }
~~~

- Reason required for both directions.
- On success, refetch capability + audit + list.
- Do not optimistically flip the switch.

### 8.3 Providers PUT

~~~json
{
  "providers": [
    { "priority": 1, "provider": "opencode", "model": "deepseek-v4.1-flash", "enabled": true, "config": {} },
    { "priority": 2, "provider": "openai", "model": "gpt-5-mini", "enabled": true, "config": {} }
  ]
}
~~~

- The exact envelope is **assumed**; confirm whether the backend expects an array or an object.
- Priorities normalized to 1..n; at least one enabled.
- Atomic replace; no partial saves.
- On success, refetch capability + audit.

### 8.4 Model PUT

~~~json
{
  "displayName": "DeepSeek V4 Flash",
  "tier": "standard",
  "capabilityId": "chat.standard",
  "sortOrder": 10,
  "enabled": true,
  "minAppVersion": null
}
~~~

- `id` is the path key; not editable after creation.
- Upsert semantics; no delete.

### 8.5 Credit grant

~~~json
{ "amount": 30, "reason": "Support: duplicate charge on 2026-10-20", "requestId": "b1e..." }
~~~

- Amount is a positive integer; UI warns above 1,000 (no hard cap unless backend defines one).
- Reason 10–500 chars.
- `requestId` is a UUID generated when the dialog opens; reused on retry.
- Send `X-Request-Id: <requestId>` as well.
- Response may include `balanceAfter` and `rcTxnId`; display when present, do not invent.

## 9. Headers, timeouts, retries

### 9.1 Browser → BFF

| Header | Rule |
|---|---|
| `Cookie: __Host-bo_session` | HttpOnly, Secure, SameSite=Lax |
| `X-CSRF-Token` | Required on POST/PUT/DELETE; double-submit |
| `X-Request-Id` | UUID generated per request |
| `Content-Type: application/json` | Mutations |
| `Accept: application/json` | All API |

### 9.2 BFF → gateway

| Header | Rule |
|---|---|
| `Authorization: Bearer <ADMIN_API_SECRET>` | Never logged/returned |
| `X-Admin-Actor: <session.email>` | Mutations; also safe on reads if supported |
| `X-Request-Id` | Same as browser request |
| `User-Agent: memechat-backoffice-bff/<version>` | Observability |
| `Content-Type` | JSON |

Timeouts:

- Reads: 10s.
- Mutations: 15s.
- Health: 3s.
- Body limit: 64 KiB (matches the admin API's 64 KiB cap).
- No streaming in the admin API.

Retries:

- BFF: GET only, one retry on network/5xx with 100–300ms jitter; never PUT/POST.
- Gateway admin mutations are not assumed idempotent except grants (requestId) and PUT
  (full-state upsert, but still not auto-retried).

## 10. Security and allowlist

- Explicit path allowlist; reject any method/path not in the table.
- Path parameter validation:
  - capability/model ID: `^[a-z0-9][a-z0-9._-]{0,63}$` (adjust if the backend allows uppercase).
  - UID: `^[A-Za-z0-9_-]{1,128}$`.
  - Cursor: max 512 chars, URL-safe; opaque.
- Query params: only `limit`, `cursor`, `refresh` (if supported). Reject unknown params
  (or ignore with a warning in dev).
- Body: parse with Zod, reject unknown keys for mutations (prevents accidental field injection).
- Response: strip `set-cookie`, `server`, and any hop-by-hop headers.
- Logs: method, path template, status, duration, request ID, actor hash. Never bodies, cookies,
  secrets, or raw UIDs.

## 11. Mock mode

- Browser dev uses MSW with fixtures for all endpoints and error codes.
- BFF mock mode uses an in-memory store seeded deterministically; E2E uses it for login and
  all admin flows.
- Mock mode is rejected when `NODE_ENV=production` or `VITE_APP_ENV=production`.
- The mock store must cover:
  - two capabilities (one disabled), three provider routes, one model;
  - a ledger with `COMMITTED`, `REFUNDED`, and `PENDING_SPEND` rows;
  - usage with `ok` and `upstream_error`;
  - an audit history with before/after states;
  - error toggles for 401/403/409/422/429/500/timeout.
- Fixtures live in `tests/fixtures` and are reused by unit, BFF, and E2E tests.

## 12. Contract change process

1. Backend publishes a schema change.
2. Update `shared/admin-api/schemas.ts` and this document.
3. Update BFF mappers; add a contract test with the new fixture.
4. Update feature code only after the schema change is green.
5. Note breaking changes in the PR and in the roadmap risks.

## 13. Open questions to resolve with the backend

1. Exact admin JSON field names/casing.
2. Single-capability GET availability.
3. Pagination params and response shape for ledger/usage/audit.
4. Grant request/response fields and idempotency replay behavior.
5. Capability PUT: full replacement or partial merge? Is `revision` accepted for optimistic
   concurrency?
6. Providers PUT envelope and validation errors (index-based?).
7. Toggle response body.
8. Error envelope and whether `details.field` is provided.
9. Rate limits on admin routes.
10. Staging base URL, admin secret, and network access.
