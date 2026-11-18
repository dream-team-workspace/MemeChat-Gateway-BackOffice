# FR-019 — App client identity, access, and audit

| Field | Value |
|---|---|
| Status | Implemented (gateway activity + routing branches deployment pending) |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend + gateway |
| Depends on | FR-002, FR-021, FR-022; gateway §§2–4 of [15-gateway-requests.md](../15-gateway-requests.md) |
| Source | [IA §4.5.1](../05-information-architecture.md) |

> **Verified 2026-10-31:** `clientKeySha1` is live on the client payload; a no-op update
> produced an `updated` audit row with actor and safe before/after snapshots. Activity is
> file-backed: the console has a date selector and reads both app-client-scoped and
> user-scoped daily files. **2026-11-04:** the Access tab now saves ability routes; the
> legacy capability matrix remains a read-only fallback until the routing gateway is deployed.

## Intent

Make an app client’s detail page the single place to answer: what identity is deployed, what
the client may use, who changed it, and which users exercised it. The page must be safe with
an empty route set and must not imply abilities that are disabled or unrouted.

## Scope

In scope:

- Client identity card with the persisted SHA-1 digest and a copy action.
- Access tab: one provider and model per ability, fixed row order, route-only save.
- Provider key/health warning; link to the provider detail.
- “Admin audit” tab: immutable operator actions for this client.
- “User activity” tab: metadata-only requests authenticated by this client key.
- Date filter (`dd_mm_yyyy`) and cursor pagination with explicit empty/pending/error states.
- A matching Activity tab on the user detail page, scoped to that UID.
- Edit details, prepare and activate a new key, cancel a pending rotation, and delete clients.
- Read-only legacy capability matrix when the gateway has no `routes` or the rollout flag is off.

Out of scope:

- Changing a client key outside create/rotate (plaintext is never recoverable).
- Editing audit or activity rows.
- Prompt/audio/image content.
- Per-client billing or rate-limit configuration.

## Behavior

1. The detail page has Access, Admin audit, and User activity tabs.
2. Access shows the supported abilities in fixed order (`llm`, `tts`, `stt`, `embeddings`,
   `vector`, `search`), including unrouted rows. Web search depends on gateway support. Provider choices are filtered by kind; model choices
   by provider + ability + enabled.
3. Changing provider resets the model to the first enabled model. Remove clears a row.
   Save sends only complete routes. An incomplete row blocks Save with a row error.
4. A selected provider with `configured: false` shows an amber warning and a provider link;
   Save remains enabled. A provider with no model shows an “Add a model” link.
5. Save calls `PUT /api/admin/app-clients/:id/routes` with the complete enabled set. On
   success, replace the client query data, reset the baseline, and show `Routes saved`.
6. On 422, keep the draft and map the message to the affected ability row. On 409, show
   `Reload client`; reloading replaces the draft with the gateway response.
7. External route changes are detected by comparing route tuples, not `updatedAt`. Metadata
   edits preserve routes by sending the current set.
8. The identity card shows `clientKeySha1` as the SHA-1 fingerprint. The copy control is
   disabled when the fingerprint is absent. Manage app-client key opens the preparation dialog.
   Preparation reveals a copyable key while the previous one remains active. Activation
   refreshes the fingerprint while keeping the issued key available to publish in
   `online_gateway_api_key`. A lost preparation response can be recovered by discarding the
   pending operation and preparing a fresh key.
9. Admin audit and user activity load lazily when their tab is selected. Activity defaults to
   today and reloads when the selected date changes.
10. If a gateway response has no `routes`, Access shows a read-only legacy capability matrix
    with the migration banner; the editor is disabled.

## Acceptance criteria

- [x] Access lists the supported abilities, including unrouted rows.
- [x] Provider/model options are filtered; changing provider resets the model.
- [x] Save sends only complete enabled routes; removed abilities are omitted.
- [x] Missing provider key warns without blocking Save.
- [x] SHA-1 fingerprint renders and is copyable when present.
- [x] Prepare displays the issued key and permits explicit activation or discard.
- [x] Activation refreshes the fingerprint and retains the exact issued key until the dialog closes.
- [x] Admin audit and user activity tables render fixture data and paginate.
- [x] Missing endpoints show a neutral pending state, and the rest of the page works.
- [x] Gateway returns `clientKeySha1` on list/get (verified live).
- [x] Gateway records and exposes client admin audit, including the actor (verified live).
- [x] Gateway exposes app-client and user-scoped activity read endpoints, and the console
      renders dated rows and paginates.
- [x] Gateway writes metadata-only daily activity records after authenticated `/v1` requests
      (branch implemented; deployment pending).
- [x] Legacy clients without `routes` remain readable; the editor is disabled with a banner.
- [x] Audit/activity responses never include keys, secrets, or content.
- [x] Activity does not display a cost estimate; file-backed records have `credits: 0` and
      `model: null` until the gateway adds those fields.

## Data and API

| Method | Path | Notes |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/app-clients...` | Identity; create/update accepts `routes` |
| PUT | `/api/admin/app-clients/{id}/routes` | Replace the complete ability route set |
| GET | `/api/admin/app-clients/{id}/audit?limit=&cursor=` | Live |
| GET | `/api/admin/app-clients/{id}/activity?limit=&cursor=&date=dd_mm_yyyy` | File-backed; date defaults to today |
| GET | `/api/admin/users/{uid}/activity?limit=&cursor=&date=dd_mm_yyyy` | File-backed; user tab |

Types: `AppClientRoute`, `AppClientRouteInput`, `AppClientAuditEntry`,
`AppClientActivityEntry` in [`shared/admin-api/app-clients.ts`](../../shared/admin-api/app-clients.ts).

## Security and audit

- SHA-1 is a fingerprint, not an authorization proof.
- Reveal plaintext on create or prepare. Keep the prepared key in transient dialog state and exclude it from caches and logs.
- Admin audit is append-only; store safe before/after snapshots without key material.
- Activity is metadata only: UID, app-client id, capability, HTTP status, latency, request id, time.
  Model and credit cost are not captured in the file-backed version, so the console does not show
  a cost estimate.
- UIDs and client ids are confidential; no analytics vendor receives them.

## Test notes

- BFF contract tests cover client CRUD, routes PUT forwarding, actor header, audit/activity
  query forwarding, and a plain-text 404 from an unimplemented gateway route.
- Unit tests cover route draft equality/completeness and metadata route preservation.
- Browser validation used a local fake gateway for five route rows, provider filtering,
  missing-key warning, route save, date selector, and empty/pending states.
- Gateway acceptance (done 2026-10-31 on the feature branch): one `/v1` request is written to
  `ACTIVITY_LOG_DIR/{uid}/{dd_mm_yyyy}.log` and both read endpoints return it. Production
  deployment is still pending.

## Traceability

[Gateway requests §2–§4](../15-gateway-requests.md) · [FR-016](FR-016-safe-mutation-protocol.md) ·
[FR-022](FR-022-ability-routes.md) · [NFR-007](NFR-007-observability-and-auditability.md) ·
[NFR-009](NFR-009-privacy-and-data-minimization.md)
