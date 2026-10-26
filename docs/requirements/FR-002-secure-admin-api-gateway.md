# FR-002 — Secure admin API gateway (BFF)

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1 |
| Owner | BFF |
| Depends on | FR-001 |

> **Update 2026-10-22:** Operator authentication is Cloudflare Access (ADR-0008). The BFF
> validates `Cf-Access-Jwt-Assertion` (issuer/audience/JWKS) and uses its verified `email` for
> `X-Admin-Actor`; it does not implement an OIDC login or an app-owned session cookie. CSRF,
> the route allowlist, secret isolation, and upstream normalization remain unchanged.
| Source | [API integration](../06-api-integration.md), [Security](../07-security-model.md) |

## Intent

Give the SPA a small, typed, same-origin API that can only call the exact admin operations it
needs, while keeping the admin secret and actor attribution server-side.

## Scope

In scope:

- Explicit method+path allowlist for all admin routes.
- Secret injection, actor attribution, request IDs.
- Upstream casing/pagination/error normalization.
- Body/param validation, timeouts, retries for reads only.
- CSRF/origin checks, security headers, rate limits.
- Mock/live mode switch (see FR-017).

Out of scope:

- Generic proxying of arbitrary paths.
- Direct browser access to the gateway.
- Gateway business validation (it remains authoritative).
- Job triggers with a different secret.

## User stories

- As the frontend, I call one stable `/api` contract and never handle the admin secret.
- As a security reviewer, I can enumerate every upstream call the BFF can make.
- As an operator, my mutations are attributed to me, not to a client-supplied header.
- As a support engineer, I see a safe error and a request ID when the gateway fails.

## Behavior

1. Every request gets/propagates `X-Request-Id`.
2. Non-GET requests require a valid session, Origin, and CSRF token.
3. The BFF matches the route against a static allowlist; unknown paths/methods never reach the
   gateway.
4. Path params and bodies are parsed with Zod; invalid input returns 400/422 before upstream.
5. The BFF calls `ADMIN_API_BASE_URL` with `Authorization: Bearer <secret>` and
   `X-Admin-Actor: <session.email>`.
6. Upstream JSON is parsed and mapped to the canonical camelCase contract; pagination is
   normalized to `{items,nextCursor}`.
7. Errors are normalized to `{code,message,requestId,details?}`; upstream bodies are not
   echoed.
8. Reads may retry once on network/5xx; mutations never auto-retry.
9. Responses include security headers; no secret or upstream host is exposed.

## Acceptance criteria

- [ ] The browser bundle, source maps, and network responses contain no admin secret.
- [ ] A direct `/api/admin/*` call without a session returns 401 and makes no upstream call.
- [ ] Unknown path/method returns 404/405 and makes no upstream call.
- [ ] Every mutating request sends `X-Admin-Actor` from the session; a browser-supplied actor
      is ignored/overwritten.
- [ ] Path params are validated; `../`, encoded slash, and oversized values are rejected.
- [ ] Body > 64 KiB is rejected before JSON parse.
- [ ] Unknown query params are rejected or ignored safely; only `limit`/`cursor` allowed.
- [ ] Upstream 401/403/5xx are mapped to safe codes; no upstream body/secret leaks.
- [ ] Response schema mismatch returns `CONTRACT_MISMATCH`, not partial data.
- [ ] GET retries once on network/5xx; mutations do not retry.
- [ ] Every response carries `X-Request-Id`; errors show it.
- [ ] Security headers (CSP/HSTS/nosniff/frame-ancestors) are present in production.

## Data and API

See [API integration §2](../06-api-integration.md) for the full route table.

~~~text
Browser → /api/auth/*, /api/admin/*
BFF     → /internal/admin/*, /healthz, /readyz
~~~

## UX notes

- Errors show a human message + request ID + retry (reads only).
- A 401 triggers one session refetch, then login redirect.
- A 403 shows the forbidden page; a 404 shows a resource empty state.
- Loading states are per panel, not full-page, when possible.

## Errors and edge cases

- Gateway unreachable → 502/504; do not log the user out.
- Gateway returns HTML/empty body → contract mismatch; log redacted.
- Cursor invalid → 400 `INVALID_CURSOR`.
- Session expires mid-mutation → 401; the mutation may or may not have applied. Do not retry
  blindly; refresh state.
- Timeout on grant → explicit "unknown result" UX; refresh ledger; retry with same requestId.

## Security and audit

- Allowlist reviewed with every route addition.
- No `set-cookie`/hop-by-hop header forwarding.
- Logs: method, route template, status, duration, actor hash, request ID; no bodies/UIDs.
- Rate limits: reads 120/min/session, mutations 30/min, grants 5/min, login 10/min/IP.
- CSRF: Origin + double-submit token; SameSite=Lax as defense in depth.

## Test notes

- BFF integration suite from [Testing §6](../09-testing-strategy.md).
- Secret scan of `dist/` and container.
- Header/CSP test in a browser.
- Contract tests for every route.

## Open questions

- Exact upstream casing/pagination (Q2, Q4).
- Whether single-capability GET exists (Q3).
- Gateway network allowlist (Q9).

## Traceability

[Architecture §6](../03-architecture.md) · [API](../06-api-integration.md) ·
[Security §6–§7](../07-security-model.md) · [Testing §6](../09-testing-strategy.md)
