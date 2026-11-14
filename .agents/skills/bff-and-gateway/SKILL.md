---
name: bff-and-gateway
description: How the Hono BFF talks to the gateway's /internal/admin API: explicit route recipe, Access actor auth, camelize/toApiBody mapping, pagination, error envelope, and live-only rules. Load for server/ or gateway-contract changes.
---

# BFF and gateway integration

## Use this skill when

- Adding or changing a route under `server/src/routes/`.
- Changing how a gateway payload is mapped or validated.
- A gateway field/endpoint is missing and the console needs a contract change.
- Debugging a live 4xx/5xx from `/api/admin/*`.

Companion skills: `shared-contract` for schemas, `testing-and-quality` for tests,
`project-architecture` for the runtime picture.

## Boundary rules

1. `server/` is the only component that holds `ADMIN_API_SECRET` and the only caller of
   `/internal/admin/*`. The browser never talks to the gateway.
2. Every route is explicit: method + path + Zod schema. There is no generic proxy and no
   catch-all under `/api/admin`.
3. The browser must not be able to set `X-Admin-Actor`; the BFF derives it from the verified
   Access identity (or the dev actor in development).
4. The runtime is live-only. No mock store, no fixture fallback, no synthesized data.
5. Required/optional fields are parsed with the shared schema; a mismatch is a bug, never a
   silent coercion.

## Adding a route (golden path)

1. Add/extend the shared schema in `shared/admin-api/<resource>.ts` (input + output +
   paginated variant if needed).
2. Add the handler in `server/src/routes/<domain>.ts` (one Hono instance per domain).
3. Register the domain under `server/src/routes/admin.ts` if it is new.
4. Map the upstream response: `camelize` → normalize page/list → parse with the shared schema.
5. Validate the request: `jsonBody(c, schema)`, `readPageQuery(c)`, `readUid(c)`, etc.
6. Forward with `adminFetch(path, c.get("actor"), { method, body: toApiBody(input),
   requestId: c.get("requestId") })`.
7. Add a BFF contract test in `server/src/app.test.ts` with a fake upstream `fetch` and assert
   the outgoing path/method/body/actor header plus the parsed response.
8. Update `docs/06-api-integration.md` and the requirement doc in the same PR.

Full skeletons: [references/route-recipe.md](references/route-recipe.md).

## Auth and actor

- `server/src/auth/access.ts`:
  - development: actor = `DEV_ACTOR_EMAIL` / `VITE_DEV_AUTH_EMAIL` fallback;
  - production: read `Cf-Access-Jwt-Assertion`, verify with `jose` (`createRemoteJWKSet` +
    `jwtVerify`, issuer `https://<team>`, audience `CF_ACCESS_AUD`), require `payload.email`;
  - production non-GET: `Origin` must equal `APP_ORIGIN`, else 403.
- `authMiddleware` sets `c.set("actor", { email })`; never read an actor from a request header.
- `adminFetch` sends `Authorization: Bearer <secret>`, `X-Admin-Actor: actor.email`,
  `X-Request-Id` when present, `User-Agent: memechat-backoffice-bff/<version>`, and a 10s
  timeout.
- Current gaps (planned, not implemented): double-submit CSRF token, rate limiting, pino
  structured logging. Do not claim they exist.

## Upstream mapping

`server/src/gateway/mappers.ts` is the anti-corruption layer:

- `camelize(value)` recursively converts snake_case → camelCase but **preserves the contents**
  of `limits`, `fair_use`/`fairUse`, `config`, `before_state`/`beforeState`,
  `after_state`/`afterState` so user JSON keys are not rewritten.
- `toApiBody(value)` converts canonical camelCase mutation bodies to the gateway's snake_case.
- `listItems(value)` extracts the first array found under `items`, `data`, `capabilities`,
  `models`, `ledger`, `usage`, or `audit`, or accepts a bare array.
- Always parse the mapped value with the shared schema before `c.json(...)`. Never return raw
  upstream objects, and never forward an upstream error body verbatim.

Pagination: the gateway returns `{items, nextCursor}` with an opaque cursor. BFF helpers
`readPageQuery` (limit 1–200, default 50; cursor ≤512 chars) and `normalizePage` produce the
canonical shape. User/app-client activity adds `date=dd_mm_yyyy` via `readActivityQuery`, which
validates a real calendar date; `readUserQuery` validates the users-directory search term.

## Error envelope

All API errors are `{ code, message, requestId?, details? }`:

| Case | Status | Code |
|---|---|---|
| Invalid JSON | 400 | `INVALID_REQUEST` |
| Invalid query/path whitelist | 400 | `INVALID_REQUEST` |
| Missing/invalid Access token | 401 | `UNAUTHENTICATED` |
| Origin mismatch | 403 | `FORBIDDEN` |
| Missing admin secret | 503 | `LIVE_NOT_CONFIGURED` |
| Gateway timeout (10s) | 504 | `TIMEOUT` |
| Gateway unreachable | 502 | `UPSTREAM_ERROR` |
| Gateway non-JSON success | 502 | `CONTRACT_MISMATCH` |
| Gateway error | upstream status | upstream `code` or `UPSTREAM_ERROR` |
| Zod request failure | 422 | `VALIDATION_FAILED` (+ `details.issues`) |
| Unhandled | 500 | `INTERNAL` (logged, no stack to client) |

Plain-text upstream 404s keep status 404 so the console can distinguish "route not shipped"
and show `PendingGatewayState`. Successful non-JSON responses are contract mismatches.

## Gateway contract essentials

Keep these in mind when changing payloads; full detail is in `docs/06-api-integration.md` and
`docs/15-gateway-requests.md`.

- **Providers**: list returns compact `ProviderStatus` (kind, key hint, health, compact models);
  detail returns full `Provider` (enabled, baseUrl, config, model catalog). Keys are write-only
  (`api_key`, `clear_api_key`); the plaintext never returns. `configured` + `hasApiKey` are
  derived by the BFF into `credentialState` (`ready` | `missing` | `unreadable`). A 409
  `PROVIDER_IN_USE` is enriched with referencing app clients from `GET /app-clients` because
  the gateway body omits them.
- **Provider health**: `provider_health` persists the last probe as `lastCheck`
  (`status`, `checkedAt`, `latencyMs`, `detail`, `checkedBy`). Current configuration still wins
  over historical health for display.
- **Abilities/routes**: an app client has at most one provider/model per coarse ability
  (`llm`, `tts`, `stt`, `embeddings`, `vector`). `routes` is authoritative; the legacy
  `capabilities` matrix is a rollout mirror. Save with `PUT /app-clients/:id/routes` and send
  only complete enabled rows. Metadata edits must include the current `routes` so the gateway
  does not re-derive them.
- **App-client identity**: `clientKeySha1` is the stored SHA-1 digest (not the key). The
  plaintext key is returned only once by create/rotate.
- **App-client audit**: append-only rows with actor, action, safe before/after snapshots.
- **Activity**: file-backed daily JSONL exposed as app-client-scoped and user-scoped pages with
  `date=dd_mm_yyyy` (default today). Rows are metadata-only; model is `null` and credits `0` in
  this version — do not display a cost estimate.
- **Users**: directory lists signed-in accounts with `email`/`tier`, but the gateway currently
  stores neither verified email nor RevenueCat tier (`null` / `unknown`). The console must show
  the gap honestly and must not infer a tier from credits. See FR-018.
- **Optional-for-rollout fields** (`clientKeySha1`, `routes`, `lastCheck`) are optional in the
  shared schemas so the console works against older gateway builds.

## When the gateway must change

Do not edit the gateway repository from this repo. Write the request in
`docs/15-gateway-requests.md` using its existing structure:

1. Why (what the console cannot do today).
2. Exact data model/SQL migration, additive first.
3. Exact JSON request/response contract with field names and types.
4. Write path, auth, pagination, retention/privacy constraints.
5. Deployment order and acceptance checklist.
6. Decisions the product/security side still owes.

The console must keep working while the gateway rolls out: optional schema fields, pending
states for 404/501, and no fake fallbacks.

## Security

- Never log request bodies, cookies, secrets, or raw UIDs. Log request ID, route template,
  status, and duration.
- Never expose the upstream error body or stack to the browser.
- Treat ledger/usage as confidential. No analytics vendor may receive rows.
- Rate limiting, CSRF tokens, and CSP are still planned; do not weaken the existing Access,
  Origin, allowlist, or secret-isolation controls while waiting for them.

## References

- `server/src/app.ts`, `server/src/routes/admin.ts`, `server/src/auth/access.ts`,
  `server/src/gateway/live.ts`, `server/src/gateway/mappers.ts`, `server/src/lib/errors.ts`.
- `docs/06-api-integration.md` — canonical endpoint catalog, payloads, errors, pagination.
- `docs/07-security-model.md` — auth, secrets, CSRF/CORS, logging.
- `docs/15-gateway-requests.md` — current gateway status and the next requested changes.
