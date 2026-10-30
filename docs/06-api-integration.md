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
6. **No invented endpoints.** Missing backend routes are blocked; no runtime mock fallback exists.
7. **Every request has an ID.** `X-Request-Id` is generated or propagated and shown on errors.

## 2. BFF endpoint catalog

### 2.1 Auth and meta

| Method | BFF path | Upstream | Auth | Notes |
|---|---|---|---|---|
| GET | `/api/health` | `GET /healthz`, `GET /readyz` | public | Liveness/readiness + console version; no secrets |
| GET | `/api/meta` | none | public | App version, commit, environment. No identity. |

Cloudflare Access handles login/logout at the edge; these are **not** BFF routes:

| Method | Edge path | Auth | Notes |
|---|---|---|---|
| GET | `/cdn-cgi/access/get-identity` | Access cookie | Verified email/name/idp/iat; 401/opaque redirect means unauthenticated |
| GET | `/cdn-cgi/access/logout` | Access cookie | Clears the Access session |

The BFF validates `Cf-Access-Jwt-Assertion` on every `/api/admin/*` request; it does not mint
an app-owned login session.

### 2.2 Admin resources

| Method | BFF path | Upstream admin route | Success shape |
|---|---|---|---|
| GET | `/api/admin/capabilities` | `GET /internal/admin/capabilities` | `Capability[]` or `{items}` normalized |
| GET | `/api/admin/capabilities/:id` | list + find (or documented single route) | `Capability` |
| PUT | `/api/admin/capabilities/:id` | `PUT /internal/admin/capabilities/{id}` | `Capability` |
| POST | `/api/admin/capabilities/:id/toggle` | `POST .../toggle` | `Capability` |
| PUT | `/api/admin/capabilities/:id/providers` | `PUT .../providers` | `ProviderRoute[]` or `Capability` |
| GET | `/api/admin/capabilities/:id/audit` | `GET .../audit?limit=&cursor=` | `{items,nextCursor}` |
| GET | `/api/admin/app-clients` | `GET /internal/admin/app-clients` | `{items: AppClient[]}` |
| POST | `/api/admin/app-clients` | `POST /internal/admin/app-clients` | `AppClient` |
| GET | `/api/admin/app-clients/:id` | `GET .../app-clients/{id}` | `AppClient` |
| PUT | `/api/admin/app-clients/:id` | `PUT .../app-clients/{id}` | `AppClient` |
| DELETE | `/api/admin/app-clients/:id` | `DELETE .../app-clients/{id}` | `{deleted}` |
| POST | `/api/admin/app-clients/:id/key/rotate` | `POST .../app-clients/{id}/key/rotate` | `AppClient` with one-time `clientKey` |
| GET | `/api/admin/app-clients/:id/audit` | `GET .../app-clients/{id}/audit?limit=&cursor=` | `{items,nextCursor}` |
| GET | `/api/admin/app-clients/:id/activity` | `GET .../app-clients/{id}/activity?limit=&cursor=&date=dd_mm_yyyy` | `{items,nextCursor}` |
| GET | `/api/admin/models` | `GET /internal/admin/models` | `Model[]` |
| PUT | `/api/admin/models/:id` | `PUT /internal/admin/models/{id}` | `Model` |
| POST | `/api/admin/cache/invalidate` | `POST .../cache/invalidate` | `{invalidatedAt, revision?}` |
| GET | `/api/admin/users` | `GET ...?limit=&cursor=&query=` | `{items: UserSummary[], nextCursor}` |
| GET | `/api/admin/users/:uid/ledger` | `GET .../ledger?limit=&cursor=` | `{items,nextCursor}` |
| GET | `/api/admin/users/:uid/usage` | `GET .../usage?limit=&cursor=` | `{items,nextCursor}` |
| GET | `/api/admin/users/:uid/activity` | `GET .../activity?limit=&cursor=&date=dd_mm_yyyy` | `{items,nextCursor}` |
| POST | `/api/admin/users/:uid/credits/grant` | `POST .../credits/grant` | `CreditGrantResult` |
| GET | `/api/admin/revenuecat/status` | `GET /internal/admin/revenuecat/status` | `RevenueCatStatus` (no secret) |
| GET | `/api/admin/providers` | `GET /internal/admin/providers` | `{items: ProviderStatus[]}` |
| POST | `/api/admin/providers/:id/check` | `POST .../providers/:id/check` | `ProviderStatus` |

`AppClient.capabilities` is the complete matrix, one row per registry capability:
`{capabilityId, capabilityName, kind, modelId, enabled}`. A create/update body replaces the
whole matrix; an enabled row must reference a model present in `capability_providers` for that
capability. Unknown capabilities, duplicate rows, and unmodeled enabled rows return 422.
`requireFirebaseUid` (gateway input `require_firebase_uid`) is part of the app-client
create/update body. When true, `/v1` requires the app-asserted `X-Firebase-Uid` header;
when false, the header is optional context.

Create and rotate responses include a one-time `clientKey` (40 lowercase hex). List/get return
only `keyRotatedAt`; the plaintext key is never recoverable. The app authenticates
`/v1/*` with `X-App-Client-Key: <key>`. `APP_CLIENT_AUTH=required` rejects missing or unknown
keys with 401; an enabled client is still rejected for an unmapped capability with 403
`CAPABILITY_NOT_IN_PLAN`. Rotation invalidates the previous key immediately.

`ProviderStatus.models` is an array of `{id, displayName?, capability, default?}`.
Capabilities are the deduplicated capability IDs derived from those models. The active
`model` must exist in `models`; otherwise the gateway falls back to `default`, sets
`modelValid: false`, reports `status: "misconfigured"`, and `check` does not probe it.

**A1 (resolved 2026-10-23):** the gateway now exposes
`GET /internal/admin/capabilities/{id}`. The BFF still lists and finds for the detail view so it
works with older gateway builds; the direct route is available for future use.

**A2 (verified live 2026-10-23):** `capability_audit`, `credit_ledger`, and `usage_events` use
keyset pagination. The gateway emits an opaque cursor; the BFF passes `limit` and `cursor` and
normalizes `{items,nextCursor}`. The audit page supports "Load older".

**Gateway live (2026-10-31):** user activity is file-backed. `GET .../app-clients/{id}/activity`
and `GET .../users/{uid}/activity` read daily JSONL files and accept `date=dd_mm_yyyy`
(default: today). Rows are metadata only; `model` is null and `credits` is 0 in this version.
The console offers a date selector on both views and does not display a cost estimate.
Email/tier still have no write path (directory shows null/unknown). Exact SQL, payloads,
privacy notes, and the remaining acceptance checks are in
[15-gateway-requests.md](15-gateway-requests.md).

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
  capabilityAudit: (id: string, cursor: string | null) =>
    ["capabilities", id, "audit", cursor] as const,
  revenueCatStatus: ["revenuecat", "status"] as const,
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
| `Cookie: CF_Authorization` | Cloudflare Access cookie; HttpOnly, Secure |
| `X-CSRF-Token` | Required on POST/PUT/DELETE; double-submit |
| `X-Request-Id` | UUID generated per request |
| `Content-Type: application/json` | Mutations |
| `Accept: application/json` | All API |

### 9.2 BFF → gateway

| Header | Rule |
|---|---|
| `Authorization: Bearer <BACKOFFICE_API_KEY>` | 64-hex gateway key; BFF env name is `ADMIN_API_SECRET`; never logged/returned |
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

## 11. Live-only mode

- The browser and BFF always use the gateway. There is no runtime MSW/mock store and no
  mock/live switch.
- The BFF requires `ADMIN_API_SECRET` at startup; if the gateway is unavailable, screens show
  error states without substituting fixtures.
- Contract tests use a fetch-level fake upstream gateway; it is test-only and is never imported
  by the server runtime.
- The local seed at `MemeChat-Gateway/seed/registry.sql` is real Postgres data for demo and
  verification, not in-memory mock state.

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
