# FR-020 — Provider health persistence

| Field | Value |
|---|---|
| Status | Implemented (verified 2026-10-26) |
| Priority | Should |
| Phase | 3 |
| Owner | Frontend + gateway |
| Depends on | FR-002; gateway §5 of [15-gateway-requests.md](../15-gateway-requests.md) |
| Source | [IA §4.7](../05-information-architecture.md) |

> **Verified 2026-10-26:** a probe wrote `provider_health`; `lastCheck` survived a gateway
> restart and the console rendered the persisted status, time, actor, latency, and detail.

## Intent

The Providers screen should show the last known health of each external service after a
console reload or gateway restart, not only the result of a probe in the current browser
session. Configuration state and historical probe state stay distinct.

## Scope

In scope:

- Persist the latest probe result per provider (status, latency, detail, checked-at, actor).
- Return it on the provider list and on the check response as `lastCheck`.
- Show the persisted status badge, timestamp, actor, latency, and safe detail.
- If no persisted check exists, show “Never checked”; if only a session result exists, label
  it “this session only”.

Out of scope:

- Health history charts or trend analysis.
- Scheduled probes (unless separately agreed; then rate-limit and mark `scheduler`).
- Verifying credentials beyond the existing safe probes.
- Any secret or response-body storage.

## Behavior

1. `GET /api/admin/providers` returns each provider with `lastCheck` or `null`.
2. The card badge reflects `lastCheck.status` when present; otherwise the configuration
   status (`Configured`, `Misconfigured`, etc.).
3. “Last check” shows the persisted time, latency, and `checkedBy` when available.
4. `POST /api/admin/providers/{id}/check` persists the result and returns the same object with
   the fresh `lastCheck`; the console updates the cached list from that response.
5. A persisted “healthy” is labeled with its timestamp so operators can judge staleness.
6. Missing persistence is visible (“this session only — the gateway has not persisted probe
   results yet”), not silently implied.

## Acceptance criteria

- [x] The provider card renders `lastCheck` status, time, actor, latency, and detail.
- [x] The badge prefers the persisted health state over the configured state.
- [x] Without `lastCheck`, a live check is labeled session-only.
- [x] The UI still renders when the field is absent (older gateway).
- [x] Gateway writes every probe result to the database with the actor.
- [x] Gateway returns `lastCheck` from the provider list after a restart.
- [x] Probe detail contains no credentials or response bodies.

Gateway acceptance satisfied by [15-gateway-requests.md §5](../15-gateway-requests.md#5-provider-health-persistence).

## Data and API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/providers` | Existing; add `lastCheck` |
| POST | `/api/admin/providers/{id}/check` | Existing; persist and return `lastCheck` |

`ProviderHealth` is defined in [`shared/admin-api/common.ts`](../../shared/admin-api/common.ts).

## Security and audit

- Store only the already-sanitized status/detail; never headers, keys, or bodies.
- `checkedBy` is an operator email; admin-only and excluded from logs.
- A scheduled probe would need its own actor label and rate limits.

## Test notes

- BFF contract test parses `lastCheck` on list and check responses.
- Browser: live probe shows the session-only note against the current gateway.
- Gateway acceptance (done 2026-10-26): checked OpenCode, restarted the gateway, reloaded the
  console, and confirmed the same timestamp, status, actor, and detail.

## Traceability

[Gateway request §5](../15-gateway-requests.md#5-provider-health-persistence) ·
[NFR-007](NFR-007-observability-and-auditability.md)
