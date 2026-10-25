# FR-019 — App client identity, access, and audit

| Field | Value |
|---|---|
| Status | In progress (SHA-1, audit, and activity read live; activity writer pending) |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend + gateway |
| Depends on | FR-002; gateway §2–§4 of [15-gateway-requests.md](../15-gateway-requests.md) |
| Source | [IA §4.5–§4.6](../05-information-architecture.md) |

> **Verified 2026-10-26:** `clientKeySha1` is live on the client payload; a no-op update
> produced an `updated` audit row with actor and safe before/after snapshots; the activity
> endpoint is live and returns an empty list because the gateway has no usage-event writer yet.
> The console shows the live SHA-1, the audit row, and an empty activity state.

## Intent

Make an app client’s detail page the single place to answer: what identity is deployed, what
the client may use, who changed it, and which users exercised it. The page must be safe with
an empty grant set and must not imply capabilities that are disabled.

## Scope

In scope:

- Client identity card with the persisted SHA-1 digest and a copy action.
- Capability map that lists **only enabled** capabilities; new clients start empty.
- “Add capability” dialog listing inactive capabilities and their routed models.
- “Admin audit” tab: immutable operator actions for this client.
- “User activity” tab: metadata-only requests authenticated by this client key.
- Cursor pagination and explicit empty/pending/error states for both tabs.
- Edit details, rotate key, delete unchanged.

Out of scope:

- Changing a client key outside create/rotate (plaintext is never recoverable).
- Editing audit or activity rows.
- Prompt/audio/image content.
- Per-client billing or rate-limit configuration.

## Behavior

1. The detail page has Access, Admin audit, and User activity tabs.
2. Access starts with the enabled rows only. With none, it shows “No capabilities enabled”
   and an Add capability action.
3. Add capability shows only inactive registry capabilities; at least one routed model is
   required before Add enables. Added rows stay local until Save.
4. Removing an enabled row removes it locally; the full matrix still carries disabled rows to
   the gateway on save.
5. Save is disabled when nothing changed and validates that every enabled row has a model.
6. The identity card shows `clientKeySha1` when the gateway returns it; otherwise the copy
   control is disabled with a short explanation. The plaintext key is only shown in the
   create/rotate dialog.
7. Admin audit and user activity load lazily when their tab is selected.
8. A missing gateway endpoint shows “not available from the gateway yet”, not an error toast.
9. If the client changes on the gateway while the page holds local edits, a reload notice
   appears; Reload client discards local edits and fetches the latest.

## Acceptance criteria

- [x] Only enabled capabilities appear in the map; a zero-grant client shows an empty state.
- [x] Add capability only lists inactive capabilities and requires a routed model.
- [x] Remove + Save sends the complete matrix with disabled rows preserved.
- [x] SHA-1 value renders and is copyable when present; the control is disabled otherwise.
- [x] Admin audit and user activity tables render fixture data and paginate.
- [x] Missing endpoints show a neutral pending state, and the rest of the page works.
- [x] Gateway returns `clientKeySha1` on list/get (verified live).
- [x] Gateway records and exposes client admin audit, including the actor (verified live).
- [x] Gateway exposes the activity read endpoint and the console shows an empty state when no
      rows exist.
- [ ] Gateway records `app_client_id` on authenticated usage events (blocked on the missing
      usage-event writer).
- [x] Audit/activity responses never include keys, secrets, or content.

The remaining activity-writer item is in
[15-gateway-requests.md §4](../15-gateway-requests.md#4-user-client-activity).

## Data and API

| Method | Path | Notes |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/app-clients...` | Existing; add `clientKeySha1` |
| GET | `/api/admin/app-clients/{id}/audit?limit=&cursor=` | Live |
| GET | `/api/admin/app-clients/{id}/activity?limit=&cursor=` | Live; rows pending writer |

Types: `AppClientAuditEntry`, `AppClientActivityEntry` in
[`shared/admin-api/app-clients.ts`](../../shared/admin-api/app-clients.ts).

## Security and audit

- SHA-1 is a fingerprint, not an authorization proof.
- Never return or log the plaintext client key after create/rotate.
- Admin audit is append-only; store safe before/after snapshots without key material.
- Activity is metadata only: UID, capability, model, status, credits, latency, time.
- UIDs and client ids are confidential; no analytics vendor receives them.

## Test notes

- BFF contract tests cover the new routes, query forwarding, actor header, and a plain-text
  404 from an unimplemented gateway route.
- Browser validation used fixtures for SHA-1/audit/activity tables and the real gateway for the
  pending state and add/remove flow.
- Gateway acceptance (done 2026-10-26): a no-op update produced an audit row; SHA-1 matched the
  stored digest. Still to test once the writer lands: one `/v1` request appears in activity.

## Traceability

[Gateway requests §2–§4](../15-gateway-requests.md) · [FR-016](FR-016-safe-mutation-protocol.md) ·
[NFR-007](NFR-007-observability-and-auditability.md) · [NFR-009](NFR-009-privacy-and-data-minimization.md)
