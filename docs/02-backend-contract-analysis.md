# 02 — Backend contract analysis

| Field | Value |
|---|---|
| Analyzed checkout | `/home/dani/GolandProjects/MemeChat-Gateway` |
| Commit state | Working tree at analysis time |
| Date | 2026-10-21 |
| Backend sources | `docs/plan-ai-gateway.md`, `docs/phase-2/backend-management-plan.md`, `docs/phase-1/0001-baseline-report.md`, `cmd/gateway/routes.go` |
| Status | Contract-planned; **admin routes not implemented in the current checkout** |

## 1. Executive summary

The gateway documents a complete backend-management API under `/internal/admin/*`, but the
current checkout mounts only a subset of the app routes plus `/healthz` and two internal
placeholders. There is no admin sub-mux, no `AdminAuth` middleware, and no admin handler
package yet. The planning doc marks the admin surface as Phase A/B work.

Implication: **the backoffice cannot integrate against a live admin API today.** The frontend
must be built mock-first, behind a typed contract, and switched to the real API when the
backend routes land. This is a schedule dependency, not a reason to invent endpoints.

## 2. What exists today (verified)

From `cmd/gateway/routes.go`:

| Route | Status |
|---|---|
| `GET /healthz` | Live |
| `GET /v1/account` | Mounted, `501 NOT_IMPLEMENTED` |
| `GET /v1/capabilities` | Mounted, `501` |
| `POST /v1/chat/stream` | Mounted, `501` |
| `GET /v1/requests/{requestId}` | Mounted, `501` |
| `POST /v1/tts` | Mounted, `501` |
| `POST /v1/stt` | Implemented (Salad) |
| `POST /v1/feedback` | Mounted, `501` |
| `GET/PUT /v1/consent` | Mounted, `501` |
| `POST /internal/rc/webhook` | Mounted, `501` |
| `POST /internal/jobs/sweep` | Mounted, `501` |
| `/internal/admin/*` | **Not mounted** |
| `/readyz`, `/metrics` | Not mounted |

The backend's own docs state: "AdminAuth ... To build (Phase A)", and the admin route catalog
is a plan. The admin API is therefore a **contract**, not a running dependency.

## 3. Planned admin API surface

| Method & path | Purpose | UI use |
|---|---|---|
| `GET /internal/admin/capabilities` | All capabilities incl. disabled, ordered provider chains, revision | List + detail |
| `PUT /internal/admin/capabilities/{id}` | Upsert capability fields; bump revision; audit | Edit form |
| `POST /internal/admin/capabilities/{id}/toggle` | Fast kill switch `{enabled, reason}` | Kill switch |
| `PUT /internal/admin/capabilities/{id}/providers` | Atomically replace ordered chain | Routing editor |
| `GET /internal/admin/capabilities/{id}/audit` | Audit history, `changed_at DESC`, `?limit=50` | Audit panel |
| `GET /internal/admin/models` | App model catalog | Model list |
| `PUT /internal/admin/models/{id}` | Upsert model row | Model editor |
| `POST /internal/admin/cache/invalidate` | Reload in-memory registry snapshot | Operations |
| `GET /internal/admin/users/{uid}/ledger` | Ledger rows, keyset pagination | Ledger table |
| `GET /internal/admin/users/{uid}/usage` | Usage events, keyset pagination | Usage table |
| `POST /internal/admin/users/{uid}/credits/grant` | Positive CRD deposit via RevenueCat | Grant form |

### Auth and headers

- `Authorization: Bearer <ADMIN_API_SECRET>` (constant-time, fail-closed when unset).
- `X-Admin-Actor: <operator-id>` required on mutating requests; stored in
  `capability_audit.changed_by`.
- `X-Request-Id` is accepted by the gateway and echoed.
- No operator login, session, RBAC, or token exchange exists in the gateway.

### Data model the UI can rely on

- `capabilities`: id, kind, display_name, enabled, streaming, supports_reasoning,
  supports_image, cost_unit, cost_credits, cost_per, limits (jsonb), fair_use (jsonb),
  min_app_version, revision, timestamps.
- `capability_providers`: id, capability_id, priority (>0, unique per capability), provider,
  model, enabled, config (jsonb).
- `models`: id, display_name, tier, capability_id (nullable), sort_order, enabled,
  min_app_version, timestamps.
- `capability_audit`: id, capability_id, revision, action, changed_by, before_state,
  after_state, changed_at. Append-only, no FK (survives capability deletion).
- `credit_ledger`: internal states `PENDING_SPEND`, `RESERVED`, `COMMITTED`,
  `REFUND_PENDING`, `REFUNDED`, `EXPIRED`, `FAILED`; integer credits; `(uid, request_id)`
  unique; keyset index `(uid, created_at DESC)`.
- `usage_events`: metadata only (no content); keyset index `(uid, created_at DESC)`.

## 4. Contract gaps and ambiguities

These are blockers or assumptions, not implementation details.

| # | Gap | Impact | Proposed handling |
|---|---|---|---|
| G1 | Admin routes/auth not implemented | No live integration | Mock-first; feature flag; staging integration when backend lands |
| G2 | Exact JSON casing/field names unspecified | Mapping bugs | BFF anti-corruption layer; Zod parse; confirm with backend |
| G3 | Pagination query/response shape unspecified | Table paging may be wrong | Assume `?limit=&cursor=`; BFF normalizes to `{items,nextCursor}`; confirm |
| G4 | Credit grant request/response fields unspecified | Money flow risk | Propose `{amount, reason, requestId}`; confirm; never guess silently |
| G5 | No user list/search or user summary | Dashboard/support cannot browse users | Exact-UID lookup only; request an endpoint |
| G6 | No global audit/activity endpoint | No cross-capability timeline | Per-capability audit only; defer |
| G7 | No aggregate usage/metrics endpoint | Dashboard would be fake | Show counts derived from capabilities/models + health; no invented metrics |
| G8 | No delete endpoints for capabilities/models | UI must not imply deletion | Upsert + disable only |
| G9 | No model audit trail documented | Model changes less attributable | Show actor in UI; request backend audit parity |
| G10 | Provider adapter names are server-side | UI cannot offer a definitive enum | Free text + suggestions from existing chains; helper text |
| G11 | `PUT` upsert semantics (partial vs full) unspecified | Accidental field reset | Send full representation; preserve unknown fields; confirm |
| G12 | Toggle has no optimistic-concurrency token | Race with another operator | Refetch after; show revision/updated time; no blind overwrite |
| G13 | `ADMIN_API_SECRET` is all-or-nothing | No least privilege / per-operator scopes | BFF Access JWT + policy; request scoped tokens/RBAC later |
| G14 | Admin API may be publicly reachable | Secret + network exposure | TLS, firewall allowlist BFF→gateway, rotate secret |
| G15 | No CORS policy for admin routes | Browser direct calls impossible/unsafe | BFF same-origin; never expose admin API to browser |
| G16 | Error envelope for admin routes not explicitly stated | Inconsistent client errors | Assume same `{code,message,requestId,details}`; BFF normalizes |

## 5. Proposed canonical admin contract (frontend-side)

The BFF normalizes upstream data to **camelCase** and a stable envelope. If the gateway
already returns camelCase, the adapter is a pass-through with validation.

### 5.1 Headers

| Direction | Header | Rule |
|---|---|---|
| BFF → gateway | `Authorization: Bearer <ADMIN_API_SECRET>` | Server only |
| BFF → gateway | `X-Admin-Actor: <session.email>` | Every mutating request |
| BFF → gateway | `X-Request-Id: <uuid>` | Generated or propagated |
| Browser → BFF | `Cookie: CF_Authorization=...` | Cloudflare Access cookie; HttpOnly, Secure |
| Browser → BFF | `X-CSRF-Token` | Required on non-GET |
| Browser → BFF | `Origin` | Validated against `APP_ORIGIN` |

### 5.2 Envelope

Success: HTTP 2xx with the resource or `{ items, nextCursor }` for lists.

Error:

~~~json
{
  "code": "INVALID_REQUEST",
  "message": "costCredits must be greater than 0",
  "requestId": "5f2c...",
  "details": { "field": "costCredits" }
}
~~~

The frontend never displays a raw upstream body. The BFF may pass through the documented
error code/message but strips provider details and secrets.

### 5.3 Assumed field names (to confirm)

| Entity | Assumed camelCase fields |
|---|---|
| Capability | `id, kind, displayName, enabled, streaming, supportsReasoning, supportsImage, costUnit, costCredits, costPer, limits, fairUse, minAppVersion, revision, providers, createdAt, updatedAt` |
| Provider route | `id, capabilityId, priority, provider, model, enabled, config` |
| Model | `id, displayName, tier, capabilityId, sortOrder, enabled, minAppVersion, createdAt, updatedAt` |
| Audit | `id, capabilityId, revision, action, changedBy, beforeState, afterState, changedAt` |
| Ledger | `id, uid, requestId, capability, capabilityRevision, state, reserved, committed, units, costUnit, unitAmount, rcTxnId, balanceAfter, spendAttempts, refundAttempts, refundedAt, createdAt, updatedAt` |
| Usage | `id, uid, requestId, capability, capabilityRevision, provider, model, inputTokens, outputTokens, characters, audioSeconds, credits, status, latencyMs, createdAt` |
| Grant | `amount, reason, requestId` → response `{ uid, amount, requestId, balanceAfter?, rcTxnId? }` |

## 6. Integration strategy

1. **Mock now.** MSW handlers implement the canonical contract with realistic fixtures for
   every route and error code.
2. **Contract tests.** Zod schemas parse every fixture and every real response; failures are
   loud, not silently coerced.
3. **BFF adapter.** One module owns upstream mapping (casing, pagination, error normalization).
   Feature code never sees an upstream shape.
4. **Feature flag.** `VITE_ADMIN_API_MODE=mock|live` (build-time) and a BFF `ADMIN_API_MODE`
   (runtime). Production must be `live`; mock mode is rejected at startup in production.
5. **Pilot route.** Integrate `GET /capabilities` first, then reads, then mutations. Do not
   cut over grants until idempotency behavior is verified end-to-end.
6. **Contract change log.** Any backend schema change updates `docs/06-api-integration.md`
   and the shared Zod schema in the same PR.

## 7. Backend requests (prioritized)

### P0 — unblock integration

- Implement `/internal/admin/*` with `AdminAuth` and `X-Admin-Actor`.
- Publish exact JSON examples for every admin route, including error envelopes.
- Define keyset pagination parameters and response shape for ledger/usage/audit.
- Define the credit-grant request/response and idempotency replay behavior.
- Provide a staging admin secret and a reachable staging gateway.

### P1 — make the console excellent

- `GET /internal/admin/users/{uid}` summary (balance, plan, last seen, deleted state).
- `GET /internal/admin/audit?limit=&cursor=` global audit (optional).
- `GET /internal/admin/stats` aggregate counts/health (optional; otherwise no chart).
- Model audit parity with capabilities.
- Scoped operator tokens or RBAC instead of one shared secret.
- IP allowlist or private networking for admin routes.

### P2 — later

- Job trigger endpoints behind an admin-scoped token.
- Capability/model soft-delete.
- Bulk operations.
- Export endpoints.

## 8. Security and privacy notes

- The admin secret is a **server-side bearer credential**. It must never be embedded in the
  SPA, source maps, error reports, or logs.
- `X-Admin-Actor` is only as trustworthy as the BFF's authentication. Do not let the browser
  set it directly.
- Ledger/usage contain UIDs and billing metadata. Treat them as confidential; no analytics
  vendor receives raw rows.
- The gateway stores no prompt/image/audio content; the console must not create a shadow copy.
- Admin API errors can contain internal identifiers. The BFF logs a redacted code/request ID
  and returns a safe message.

## 9. Sources

- `docs/plan-ai-gateway.md` §6.2, §6.13, §8, §9.
- `docs/phase-2/backend-management-plan.md` §2–§5.
- `docs/phase-1/0001-baseline-report.md` (schema and indexes).
- `cmd/gateway/routes.go` (actual mounted routes at analysis time).
- `docs/plan-ai-gateway-go-architecture.md` P20, P14, P7.
