# Gateway changes requested by the BackOffice

**Date:** 2026-10-25 · **Updated:** 2026-10-31
**Audience:** MemeChat Gateway backend team (repo: `dream-team-workspace/MemeChat-Gateway`)
**Status:** Implemented, deployment pending. User activity is now file-backed
(`MemeChat-Gateway/docs/20-file-user-activity.md`) instead of a high-volume SQL writer.
The remaining data-source gap is §1 verified email/RevenueCat tier.

> Hand this file to the gateway team unchanged. §0 is the work list, §6 is the exact JSON
> contract the console validates, §8 is the acceptance checklist, and §9 is the list of
> product/privacy decisions I still need answered.

## Implementation status — verified 2026-10-26

I applied `migrations/0004_backoffice_contract.sql`, rebuilt and restarted the local gateway,
and exercised each surface through the BFF and console.

| Item | Gateway status | Verified |
|---|---|---|
| §1 users directory read endpoint | Shipped | `GET /internal/admin/users` returns the signed-in account; `email: null`, `tier: "unknown"` until the write path lands |
| §1 email write path | **Not implemented** | Firebase auth returns only uid; no plaintext email stored |
| §1 RevenueCat tier sync | **Not implemented** | Tier is `unknown`; no entitlement mapping or write path |
| §2 `clientKeySha1` | Shipped | Live on list/get; digest matches `app_clients.client_key_hash` |
| §3 app-client audit | Shipped | A no-op PUT produced one `updated` row with actor and safe snapshots |
| §4 activity read endpoints | Implemented on `feat/file-user-activity`; deployment pending | App-client and user-scoped endpoints read daily JSONL files with an optional `date=dd_mm_yyyy` |
| §4 activity write path | Implemented on `feat/file-user-activity`; deployment pending | Middleware writes one metadata line after the handler; no DB write on the request path |
| §5 provider health persistence | Shipped | Probe wrote `provider_health`; `lastCheck` survived a gateway restart |

> **Deploy note:** apply `migrations/0004_backoffice_contract.sql` **before** deploying the
> gateway code. App-client create/update/rotate/delete insert the audit row in the same
> transaction, so the migration is required for those mutations to succeed.

The console shows the live SHA-1 digest and audit rows, and the provider list shows the
persisted check. The file-backed activity views add a date selector and render rows for the
selected day; the users directory still shows “Email not captured” / “Unknown” with a note
while the email/tier write path is absent.

### What is still needed before FR-018 and FR-019 can pass live

**A. Users email and tier (FR-018)**

1. **Decision (product/security):** may the gateway persist the verified Firebase email in
   `users.email`, or should it store something else (masked value, Firebase Admin lookup at
   read time)? Full email is what the directory is designed to show; see §9 for the privacy
   questions that must be answered first.
2. **Email write path:** the auth middleware currently discards everything but uid. Return the
   verified `email` and `email_verified` claims from the Firebase token (or resolve via Firebase
   Admin), then upsert `users.email` and `last_seen_at`. Do not persist unverified email.
   Existing users need a backfill via Firebase Admin or will populate on their next sign-in.
   Code-level notes: `internal/auth/firebase.go` returns only `token.UID`; `Verifier` should
   return an identity struct (uid, email, email_verified) and `internal/auth/auth.go` should
   carry it in context. There is currently **no users upsert anywhere**, so even
   `last_seen_at` only changes via the seed; add an upsert on authenticated requests. Throttle
   the `last_seen_at` write (for example only when older than 5 minutes) so public traffic does
   not write on every request.
3. **Tier source:** decide the RevenueCat entitlement/product → `pro` / `ultra` mapping. The
   console cannot infer it from credits. Implement the RC webhook (currently 501) or a bounded
   lazy refresh, write `users.tier` + `tier_checked_at`, and define what happens on
   cancellation, expiry, billing issue, and refund.
4. **Acceptance:** a signed-in test account shows a real email and `pro` or `ultra`; a second
   account with no subscription shows the agreed fallback (`free` or `unknown`).

**B. User-client activity (FR-019) — resolved by file-backed logging**

1. **Storage:** activity is written as `ACTIVITY_LOG_DIR/{uid}/{dd_mm_yyyy}.log`, one JSON
   object per line. There is no synchronous database insert on the request path.
2. **Scope:** the gateway exposes app-client-scoped and user-scoped read endpoints. Both accept
   `date=dd_mm_yyyy` and default to today.
3. **Fields:** uid, app-client id/slug, request id, method, path, capability, HTTP status,
   latency, and timestamp. Request bodies, message text, audio, keys, and auth headers are not
   stored. `model` is null and `credits` is 0 in the console contract for this version.
4. **Acceptance:** one authenticated `/v1` request appears in the app-client activity view for
   that day and in the user's activity tab. The console exposes both with a date selector.

Everything else in §6 is already satisfied by the live gateway.

This document is the hand-off for the gateway work the operator console depends on. The
BackOffice is **live-only**: every screen calls `/internal/admin/*` through the BFF, and there
is no mock store. The shipped endpoints are consumed live. The only degraded display is
email/tier shown as null/unknown; file-backed activity is available once the gateway branch is
deployed. A console release is not required when the email/tier write path lands, provided the
JSON matches §6.

The changes are **additive**. Existing fields, routes, and clients must keep working.

---

## 0. Summary

| # | BackOffice surface | Gateway status |
|---|---|---|
| 1 | Users directory (email, tier) | Read endpoint shipped; **email/tier write path pending** |
| 2 | App client detail (`clientKeySha1`) | **Shipped and verified** |
| 3 | App client audit | **Shipped and verified** |
| 4 | User-client and per-user activity | **File-backed implementation ready; deployment pending** |
| 5 | Provider health persistence | **Shipped and verified across restart** |

Suggested rollout order: **5 → 2 → 1 → 3 → 4**. §5 is independent; §1 needs a privacy decision;
§4 has the highest write volume.

### Existing conventions the BackOffice already relies on

- Admin routes require `Authorization: Bearer <BACKOFFICE_API_KEY>`.
- Mutating admin routes require `X-Admin-Actor`; the BFF sets it from the verified operator.
- Keyset pagination: `?limit=&cursor=`; `limit` default 50, max 200; response
  `{ "items": [...], "nextCursor": "opaque" | null }`.
- Timestamps are RFC 3339 with an offset (the gateway currently emits `+07:00`); `null` is
  explicit for absent values.
- Errors use the existing envelope:
  `{ "code": "NOT_FOUND", "message": "..." }`.
- No endpoint below may return app-client keys, provider secrets, tokens, prompt text, or
  message content.

---

## 1. Users directory

> **Current status:** the schema and `GET /internal/admin/users` are live. Email is stored as
> `null` and tier as `unknown`; the write path in “Write path” and “Tier source of truth”
> below is still the blocker for the full screen.

### Why

The console must list MemeChat accounts that have signed in, with the email and subscription
tier (Pro / Ultra), while keeping the existing exact Firebase-UID lookup. The gateway stores
only `uid`, `email_hash`, `created_at`, and `last_seen_at` today, so the console cannot show
email or tier.

### Data model

```sql
alter table users add column if not exists email text;
alter table users add column if not exists tier text not null default 'unknown';
alter table users add column if not exists tier_checked_at timestamptz;

alter table users drop constraint if exists users_tier_check;
alter table users add constraint users_tier_check
  check (tier in ('free', 'pro', 'ultra', 'unknown'));

create index if not exists users_email_lower_idx on users (lower(email));
create index if not exists users_last_seen_idx
  on users (last_seen_at desc nulls last);
```

Notes:

- Keep `email_hash`. It is useful for lookup without exposing the address; it is **not** a
  substitute for the display email.
- `tier = 'unknown'` means “not resolved yet”. Do not infer a tier from credit balance,
  capability usage, or model choice.
- Existing rows cannot be backfilled from `email_hash`. They stay `email = null` /
  `tier = 'unknown'` until the user authenticates again (or until a deliberate, audited
  Firebase Admin backfill is run).
- Store the email exactly as the verified Firebase claim provides it (trim, lowercase for
  comparison if you prefer, but return a display form). Recommend persisting only when
  `email_verified` is true; otherwise store `null`.

### Write path

After Firebase token verification, upsert the account. Sketch:

```sql
update users
   set email = coalesce($email, email),
       last_seen_at = now()
 where uid = $uid;
-- insert the row first if it does not exist
```

Do not resurrect a soft-deleted account from a token refresh without an explicit business
decision. User search/listing must exclude `deleted_at is not null`.

### Tier source of truth

RevenueCat entitlements, not the gateway credit ledger:

- `pro` and `ultra` are the only paid tiers the console displays; `free`/`unknown` are
  fallbacks.
- Preferred: handle `POST /internal/rc/webhook` events (`INITIAL_PURCHASE`, `RENEWAL`,
  `PRODUCT_CHANGE`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `REFUND`) and update
  `users.tier` + `tier_checked_at`.
- Acceptable interim: refresh on authentication or on admin list when
  `tier_checked_at` is older than a short TTL, so the directory is not a stale RC mirror.
- Add `tier_checked_at` (shown above) so stale/unknown can be reasoned about.
- Never return the RevenueCat secret or raw webhook payload to the console.

### Endpoint

```
GET /internal/admin/users?limit=50&cursor=opaque&query=ada%40example.com
```

- `query` is optional. Match case-insensitively against email substring, and exact/prefix
  against `uid`. Empty query returns all signed-in users.
- Return only `deleted_at is null` **and** `last_seen_at is not null` (the user has logged in).
- Order by `last_seen_at desc nulls last, uid`; cursor is a stable keyset over that order.
- Do not log the raw `query`, `email`, or returned rows.

Response:

```json
{
  "items": [
    {
      "uid": "uid_7f3a9c21",
      "email": "ada@example.com",
      "tier": "ultra",
      "lastSeenAt": "2026-10-25T09:05:00+07:00",
      "createdAt": "2026-10-20T08:00:00+07:00"
    }
  ],
  "nextCursor": null
}
```

Fields are required (`email` may be `null`, `lastSeenAt` may be `null` only if an account row
exists without a recorded sign-in; the contract accepts `null`). `tier` must be one of
`free | pro | ultra | unknown`.

### Privacy and security concerns

- Email is PII. Justify the retention period, restrict access to admins, and never emit it in
  gateway logs, metrics, traces, error messages, or analytics. The BFF already avoids body
  logging; the gateway must do the same for the search query.
- Consider database-at-rest encryption or column-level access controls. The console only needs
  display and search, not export.
- Tier is billing-adjacent. Do not expose RC customer ids, transactions, or entitlement ids in
  this endpoint.
- Decide whether operators may search by **partial** email. Substring search is convenient but
  makes enumeration easier; an admin-only endpoint plus rate limits are the minimum. An exact
  match mode is acceptable if you prefer.

### Acceptance

```bash
curl -sS -H "Authorization: Bearer $BACKOFFICE_API_KEY" \
  "http://127.0.0.1:8080/internal/admin/users?limit=10"
curl -sS -H "Authorization: Bearer $BACKOFFICE_API_KEY" \
  "http://127.0.0.1:8080/internal/admin/users?limit=10&query=ada%40example.com"
```

- Unknown `limit`/`cursor` values are rejected with the normal error envelope.
- A non-admin caller receives 401/403, not a partial list.
- A user who has never signed in is absent.

---

## 2. App client SHA-1 identity

### Why

The console offers **Copy SHA-1** on the client detail page so an operator can verify which
identity key is deployed without ever seeing the plaintext again. The digest is already stored
in `app_clients.client_key_hash`; it is simply not selected or returned.

### Change

- Select `client_key_hash` in `Store.AppClients`, `Store.AppClient`, and the mutation result
  reads.
- Add one JSON field to every app-client response (list, get, create, update, rotate key):

```json
{ "clientKeySha1": "0123456789abcdef0123456789abcdef01234567" }
```

- The value is the lowercase 40-hex digest, or `null` when no key has been issued.
- Keep returning `clientKey` (plaintext) **only** from create and rotate-key responses.
  Never from list/get/update.
- No migration is required.

### Concerns

- SHA-1 is a fingerprint here, not a security proof. Do not use it to authorize requests or
  claim collision resistance. If the key format ever changes, consider HMAC-SHA-256 for
  storage and keep a `key_algorithm` marker.
- The digest is still access-controlled data. Do not log it with the client key or include it
  in error responses.
- Console behavior: the field is optional in the shared schema for the rollout window. Once
  present, the copy button enables automatically.

---

## 3. App client admin audit

### Why

Operators need an immutable record of what an admin did to a client: create, edit, key rotation,
enable/disable, capability grants/revocations, and deletion. The capability registry already has
`capability_audit`; app clients have only `created_by` / `updated_by` columns and no history.

### Table

```sql
create table if not exists app_client_audit (
  id             bigserial primary key,
  app_client_id  uuid        not null,
  app_client_slug text       not null,
  action         text        not null,
  changed_by     text,
  before_state   jsonb,
  after_state    jsonb,
  changed_at     timestamptz not null default now()
);

create index if not exists app_client_audit_client_idx
  on app_client_audit (app_client_id, id desc);
```

Deliberate choices:

- No foreign key. The audit must survive client deletion; store the slug snapshot.
- `before_state`/`after_state` contain only safe fields: `name`, `slug`, `platform`,
  `description`, `enabled`, and the capability matrix (`capabilityId`, `modelId`, `enabled`).
  **Never** store `clientKey`, `clientKeySha1`, headers, or the raw request body.
- Use one transaction for the mutation and the audit insert.

### Action names

Use stable, lowercase values; the console renders them verbatim:

`created`, `updated`, `key_rotated`, `deleted`, and optionally `enabled`, `disabled`,
`capability_granted`, `capability_revoked`, `capability_model_changed`.

`changed_by` comes from `X-Admin-Actor`. If it is missing on a mutation, reject the request
before writing (the existing middleware already enforces this).

### Endpoint

```
GET /internal/admin/app-clients/{id}/audit?limit=50&cursor=opaque
```

- 404 if the client does not exist (including after deletion).
- Newest first; keyset on `id desc`.
- `nextCursor` is opaque; `null` at the end.

```json
{
  "items": [
    {
      "id": 7,
      "appClientId": "b9c5a9b2-8a4d-4ac3-8875-9ff646ab1e0e",
      "action": "capability_granted",
      "changedBy": "operator@dream-team.works",
      "beforeState": { "enabled": false, "modelId": null },
      "afterState": { "enabled": true, "modelId": "deepseek-v4.1-flash" },
      "changedAt": "2026-10-25T09:00:00+07:00"
    }
  ],
  "nextCursor": null
}
```

### Retention and concerns

- Decide retention (suggest 24 months) and implement a purge job; do not grow forever.
- `changed_by` is an email: PII-like. Keep it admin-only and out of logs.
- Audit rows are append-only. Do not expose an update/delete endpoint.
- If key rotation is recorded, log the event and timestamp only — not the key or digest.

---

## 4. User-client activity

> **Current status (2026-10-31):** superseded by the file-backed implementation in the gateway
> repo (`docs/20-file-user-activity.md`). The SQL design below is retained as history; do not
> implement both. The console consumes `GET .../app-clients/{id}/activity` and
> `GET .../users/{uid}/activity`, each with an optional `date=dd_mm_yyyy`.

### Why

The console must show which signed-in users actually used a client identity, for support and
abuse investigations. Today `usage_events` records `uid` and capability but not which
`app_client` authenticated the request, so the console cannot answer “what has this client
been used for?”.

### Data model (recommended: extend `usage_events`)

```sql
alter table usage_events
  add column if not exists app_client_id uuid;

create index if not exists usage_events_app_client_idx
  on usage_events (app_client_id, id desc);
```

- Keep the existing indexes; the endpoint is scoped by client and ordered newest first.
- If you prefer a separate table, keep the same response fields and ordering. The console
  contract does not expose the storage choice.
- `app_client_id` is `null` for requests that did not present `X-App-Client-Key`
  (`APP_CLIENT_AUTH=optional/off`) or where the header was invalid and the request was
  rejected before a usage row was written.
- Do not cascade-delete history when a client is removed; `on delete set null` is acceptable,
  but the console can only navigate a live client. A slug snapshot column is optional.

### Write path

When app-client authentication succeeds, attach the resolved client id to the request context
and write it on the same usage event. Do not add a second synchronous insert per request.

If you also want rejected/denied requests in this view, add a small `app_client_access_events`
table later; it is **not** required for the first version of this screen. The current UI text is
“requests authenticated with this client key”.

### Endpoint

```
GET /internal/admin/app-clients/{id}/activity?limit=50&cursor=opaque&date=dd_mm_yyyy
GET /internal/admin/users/{uid}/activity?limit=50&cursor=opaque&date=dd_mm_yyyy
```

- 404 if the app client does not exist.
- Newest first; opaque offset cursor; `date` defaults to today.
- Metadata only: no prompt, image, audio, or message text.

```json
{
  "items": [
    {
      "id": 11,
      "appClientId": "b9c5a9b2-8a4d-4ac3-8875-9ff646ab1e0e",
      "uid": "uid_7f3a9c21",
      "requestId": "9cde27e0-9a6b-4c9e-bdf4-7f2c1a4f3e21",
      "capability": "chat.standard",
      "model": null,
      "status": "ok",
      "credits": 0,
      "latencyMs": 840,
      "createdAt": "2026-10-25T09:05:00+07:00"
    }
  ],
  "nextCursor": null
}
```

`model` is nullable and `credits` is 0 in the file-backed version; `latencyMs` is recorded.

### Concerns

- This is the highest-volume addition. Index first, then ship; paginate and cap the page size.
- UID + client id + timestamp is activity metadata. Confirm the retention period (suggest
  90–180 days) and that support access is audited.
- Never store or return the presented key, even hashed, in this table.
- If usage rows are written only after a successful call, failures will not appear. State that
  explicitly in the UI copy or add the reject-event table later.
- Do not log the `X-App-Client-Key` header. The lookup already uses the digest.

---

## 5. Provider health persistence

### Why

The Providers screen should show the last checked state and health status after a restart, not
lose it when the console tab closes. Today `POST .../check` returns a status but nothing is
stored, and `GET /internal/admin/providers` reconstructs configuration only.

### Table

```sql
create table if not exists provider_health (
  provider_id  text        primary key,
  status       text        not null,
  latency_ms   integer,
  detail       text        not null default '',
  checked_at   timestamptz not null,
  checked_by   text,
  constraint provider_health_status_check check (
    status in ('configured','unconfigured','misconfigured','healthy','reachable','degraded','unreachable')
  )
);
```

Latest-only is enough for the console. If you want trend data later, add an append-only history
table; do not overload this one.

### Write path

After a probe completes (including “unconfigured” early returns, if you want those saved), upsert
one row in the same handler:

```sql
insert into provider_health (provider_id, status, latency_ms, detail, checked_at, checked_by)
values ($1, $2, $3, $4, now(), $5)
on conflict (provider_id) do update set
  status = excluded.status,
  latency_ms = excluded.latency_ms,
  detail = excluded.detail,
  checked_at = excluded.checked_at,
  checked_by = excluded.checked_by;
```

- `checked_by` is the admin actor from `X-Admin-Actor`.
- `detail` must remain the safe, already-sanitized probe message. Never persist credentials,
  authorization headers, or response bodies.
- Last write wins. A probe that times out can still record its error state; that is useful.

### Read path

- `GET /internal/admin/providers` joins the table and includes the object below for each
  provider. `null` when never checked.
- `POST /internal/admin/providers/{id}/check` returns the same provider object **with** the
  freshly written `lastCheck`, so the console can update without a second round trip.
- Keep the existing `status`, `detail`, `latencyMs`, and `checkedAt` semantics for current
  configuration. `lastCheck.status` is the historical probe result, not the configured state.

```json
{
  "lastCheck": {
    "status": "healthy",
    "checkedAt": "2026-10-25T09:10:00+07:00",
    "latencyMs": 853,
    "detail": "Authenticated OpenCode models request succeeded (HTTP 200).",
    "checkedBy": "operator@dream-team.works"
  }
}
```

### Concerns

- A persisted “healthy” is not a liveness guarantee. The console shows the timestamp so
  operators can judge staleness; consider adding a “stale after 24h” badge later.
- Multiply scheduled checks carefully. A persisted row makes an automatic sweeper attractive,
  but it can wake scaled-to-zero providers and costs money; if added, rate-limit per provider
  and record `checked_by = "scheduler"`.
- Multi-instance gateways must read/write Postgres, not local state.
- Probe results are per provider, not per capability route.

---

## 6. Exact BackOffice contract

These are the Zod schemas the BFF validates. Any mismatch becomes a `CONTRACT_MISMATCH` error in
the console.

### App client (addition only)

```ts
clientKeySha1?: string | null   // lowercase 40-hex SHA-1 digest; null when no key
```

### App client audit

```ts
type AppClientAuditEntry = {
  id: number | string;
  appClientId: string;
  action: string;
  changedBy: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  changedAt: string;
};
type AppClientAuditList = { items: AppClientAuditEntry[]; nextCursor: string | null };
```

### App client activity

```ts
type AppClientActivityEntry = {
  id: number | string;
  appClientId: string;
  uid: string;
  requestId: string;
  capability: string;
  model: string | null;
  status: string;
  credits: number;
  latencyMs: number | null;
  createdAt: string;
};
type AppClientActivityList = { items: AppClientActivityEntry[]; nextCursor: string | null };
```

### User directory

```ts
type UserTier = "free" | "pro" | "ultra" | "unknown";
type UserSummary = {
  uid: string;
  email: string | null;
  tier: UserTier;
  lastSeenAt: string | null;
  createdAt: string;
};
type UserList = { items: UserSummary[]; nextCursor: string | null };
```

### Provider last check

```ts
type ProviderHealth = {
  status: "configured" | "unconfigured" | "misconfigured" | "healthy" |
          "reachable" | "degraded" | "unreachable";
  checkedAt: string;
  latencyMs: number | null;
  detail: string;
  checkedBy: string | null;
};
// on ProviderStatus:
lastCheck?: ProviderHealth | null;
```

### Routes to mount

```text
GET  /internal/admin/users
GET  /internal/admin/app-clients/{id}/audit
GET  /internal/admin/app-clients/{id}/activity
POST /internal/admin/providers/{id}/check   (existing route; add persistence)
GET  /internal/admin/providers              (existing route; add lastCheck)
```

All of these are under the existing `AdminAuth` middleware.

---

## 7. Rollout and compatibility

Shipped on 2026-10-26: **§5**, **§2**, **§3**, the §4 read endpoint, and the §1 read endpoint.
Still outstanding: the §1 email/tier write path and the §4 usage-event writer (see the status
block at the top).

BackOffice compatibility (verified):

- `clientKeySha1` and `lastCheck` are optional in the console contract. A gateway without them
  degrades gracefully; extra fields are ignored by Zod.
- If any of the new routes is absent, the console shows a “gateway support pending” state
  (neutral, not an error) and the rest of the page works. With the current gateway they are
  live.
- The users screen keeps exact-UID lookup working regardless of the directory.
- No console environment variable, migration, or redeploy is needed for the shipped fields.

Do **not**:

- Rename or remove existing fields while making these additions.
- Return plaintext client keys from list/get/update.
- Put provider secrets, raw emails, app-client keys, or prompt content in logs.
- Change pagination shape for other admin lists.

---

## 8. Acceptance checklist

Verified on 2026-10-26 for the shipped endpoints:

- [x] Bearer auth required; unauthenticated requests are rejected.
- [x] Mutations require `X-Admin-Actor` and record it in app-client audit.
- [x] Responses parse against the shapes in §6; `null` is explicit.
- [x] `limit`/`cursor` behave as keyset pagination; unknown client returns 404.
- [x] No secret, key, token, prompt, or message content appears in a response or a log.
- [x] New tables have the documented indexes.
- [x] A local curl smoke test passes with the seeded registry and one signed-in account.

Still open:

- [ ] Retention/purge jobs for app-client audit and usage activity.
- [ ] Sign-in write path for verified email and RevenueCat tier.
- [x] File-backed activity writer and app-client/user read endpoints (gateway branch ready).
- [ ] Deploy the gateway activity branch and verify one `/v1` request in both console views.
- [ ] Retention/purge job for daily activity files.

Re-run the BackOffice checks after the remaining write paths land:

```bash
cd /home/dani/WebstormProjects/gateway-backoffice
npm test           # BFF contract tests (fixtures already cover the new shapes)
npm run dev        # console :5173, BFF :8787
```

Then verify in the console:

1. **Users** lists a signed-in account with a real email and Pro/Ultra tier; ID lookup still
   navigates to the ledger; email search filters without leaking the query to logs.
2. **App client detail** shows the SHA-1 digest and the copy button works. — verified
3. **Admin audit** lists mutations and supports “Load older”. — verified; **User activity**
   lists rows once the writer lands.
4. **Providers** shows the last check after a restart. — verified

---

## 9. Open questions for the gateway/product teams

1. **Email storage (blocking §1):** store the verified Firebase email in `users.email`
   (recommended for the requested directory), or return a masked value / resolve via Firebase
   Admin at read time? If stored, define encryption, access, and retention. Unverified emails
   should stay `null`.
2. **RevenueCat mapping (blocking §1):** supply the exact entitlement/product identifiers for
   `pro` and `ultra`, and specify cancellation/expiry/billing-issue/refund transitions. Proposed
   mapping: entitlement `pro` → `pro`, `ultra` → `ultra`, no entitlement → `free`; while a
   paid entitlement is active after cancellation, keep the paid tier until expiry.
3. **Soft-deleted users:** hide them (current behavior) unless support needs a status filter.
4. **Activity retention (blocking §4 operations):** propose 90–180 days for UID + client +
   capability rows; audit 24 months. Confirm with privacy.
5. **Provider checks:** latest-only is enough for the console; scheduled probes/history are
   optional and would need rate limits.
6. **Admin audit scope:** mutations only is enough; reading client details does not need to be
   audited.

Until these are answered, the BackOffice defaults are: no guessed email or tier (`null` /
`unknown`), deleted users hidden, file-backed activity for the selected day, and mutations
audited only.
