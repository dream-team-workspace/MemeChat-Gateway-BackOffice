# 02 — Backend contract analysis

| Field | Value |
|---|---|
| Analyzed checkout | `/home/dani/GolandProjects/MemeChat-Gateway` |
| Commit state | Working tree at analysis time |
| Date | 2026-10-21 (re-checked 2026-10-23) |
| Backend sources | `docs/plan-ai-gateway.md`, `docs/phase-2/backend-management-plan.md`, `docs/phase-1/0001-baseline-report.md`, `cmd/gateway/routes.go` |
| Status | Admin API **implemented in the gateway working tree** and verified live on 2026-10-23 |

## 1. Executive summary

The gateway documents a complete backend-management API under `/internal/admin/*`. That API is
now implemented in the local gateway working tree: an admin sub-mux, constant-time
`AdminAuth`, `X-Admin-Actor` enforcement, Postgres-backed capability/model/audit/ledger
handlers, and RevenueCat-backed grants. The BFF has been exercised in `live` mode against it.

The backoffice is now **live-only**: it requires `ADMIN_API_SECRET` and forwards every read and
mutation to the gateway. There is no runtime mock store or fixture fallback.

## 2. What exists today (verified)

From `cmd/gateway/routes.go`:

| Route | Status |
|---|---|
| `GET /healthz` | Live |
| `GET /v1/account` | Mounted, `501 NOT_IMPLEMENTED` |
| `GET /v1/capabilities` | Mounted, `501` |
| `POST /v1/chat/stream` | Mounted, `501` |
| `GET /v1/requests/{requestId}` | Mounted, `501` |
| `POST /v1/tts` | Implemented (Kokoro streaming) |
| `POST /v1/stt` | Implemented (Salad) |
| `POST /v1/embeddings` | Implemented (Voyage) |
| `POST /v1/feedback` | Mounted, `501` |
| `GET/PUT /v1/consent` | Mounted, `501` |
| `POST /internal/rc/webhook` | Mounted, `501` |
| `POST /internal/jobs/sweep` | Mounted, `501` |
| `/internal/admin/*` | Mounted (Postgres-backed admin API) |
| `/readyz` | Mounted (Postgres ping) |
| `/metrics` | Not mounted |

**2026-10-23 re-check:** the gateway serves TTS, STT, and embeddings; the Phase 2 seed defines
eight capabilities (chat.standard, chat.premium, tts, stt, and four embeddings profiles). The
admin routes are now mounted in `cmd/gateway/routes.go`, `/readyz` checks Postgres, and the
BFF live path was verified end-to-end. The local registry seed and model catalog contain the
same rows; the console reads them from Postgres.

## 3. Admin API surface (implemented)

| Method & path | Purpose | UI use |
|---|---|---|
| `GET /internal/admin/capabilities` | All capabilities incl. disabled, ordered provider chains, revision | List + detail |
| `PUT /internal/admin/capabilities/{id}` | Upsert capability fields; bump revision; audit | Edit form |
| `POST /internal/admin/capabilities/{id}/toggle` | Fast kill switch `{enabled, reason}` | Kill switch |
| `PUT /internal/admin/capabilities/{id}/providers` | Atomically replace ordered chain | Routing editor |
| `GET /internal/admin/capabilities/{id}/audit` | Audit history, `changed_at DESC`, `?limit=&cursor=` keyset | Audit panel |
| `GET /internal/admin/models` | App model catalog | Model list |
| `PUT /internal/admin/models/{id}` | Upsert model row | Model editor |
| `POST /internal/admin/cache/invalidate` | Reload in-memory registry snapshot | Operations |
| `GET /internal/admin/revenuecat/status` | Non-secret RC configuration status | Operations + grant gating |
| `GET /internal/admin/providers` | Provider configuration projection | Providers page |
| `POST /internal/admin/providers/{id}/check` | Safe provider health probe | Providers page |
| `GET /internal/admin/users/{uid}/ledger` | Ledger rows, keyset pagination | Ledger table |
| `GET /internal/admin/users/{uid}/usage` | Usage events, keyset pagination | Usage table |
| `POST /internal/admin/users/{uid}/credits/grant` | Positive CRD deposit via RevenueCat | Grant form |

### Auth and headers

- `Authorization: Bearer <BACKOFFICE_API_KEY>` (64 hex, constant-time, fail-closed when
  unset). The BFF’s `ADMIN_API_SECRET` holds the same value.
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
| G1 | **Resolved 2026-10-23** — admin routes/auth implemented and live-verified | Live integration unblocked | Publish/review the gateway changes; confirm staging |
| G2 | **Resolved 2026-10-23** — gateway emits canonical camelCase and accepts snake_case mutations; verified live | Mapping bugs | Keep BFF Zod validation + contract tests |
| G3 | **Resolved 2026-10-23** — opaque `(timestamp,id)` cursor and `{items,nextCursor}` verified live | Table paging | Keep keyset indexes; test pagination |
| G4 | **Verified against a local RC stub 2026-10-23** — request/response contract works; production RC credentials still required | Money flow risk | Configure RC secrets in staging; never expose them to the browser |
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

1. **Live gateway only.** The BFF forwards every request to `/internal/admin/*`; there is no
   runtime mock mode. Tests use a fetch-level gateway fixture, never the production code path.
2. **Contract tests.** Zod schemas parse every upstream response; failures are loud, not
   silently coerced.
3. **BFF adapter.** One module owns upstream mapping (casing, pagination, error normalization).
   Feature code never sees an upstream shape.
4. **No mode flag.** `ADMIN_API_SECRET` is required at startup in every environment; production
   also requires `CF_ACCESS_AUD`. The UI has no mock/live switch.
5. **Mutations.** Registry, kill switch, and grants are pessimistic and audited; a successful
   RC grant is the reachability check.
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

### BackOffice additions (implemented 2026-10-31)

**Update 2026-10-31:** the gateway shipped the five BackOffice additions: the users directory
read endpoint, `clientKeySha1`, app-client admin audit, activity read endpoints, and persisted
provider health. User activity is file-backed (daily JSONL per uid), with app-client-scoped and
user-scoped reads and an optional `date=dd_mm_yyyy` filter. The console exposes an Activity tab
on both the app-client detail and user detail pages.

One data-source gap remains and is not a console bug:

- `users.email` stays `null` because Firebase auth currently returns only uid, and `users.tier`
  stays `unknown` until the RevenueCat entitlement mapping is decided. The directory shows
  “Email not captured” / “Unknown” with a note.

File-based activity does not include model or credit cost yet; the console omits the cost
estimate rather than showing a misleading zero. The remaining gateway work, privacy decisions,
and acceptance checks are in [15-gateway-requests.md](15-gateway-requests.md).

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
