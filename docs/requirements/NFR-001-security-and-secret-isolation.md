# NFR-001 — Security and secret isolation

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Security/BFF |
| Source | [Security model](../07-security-model.md) |

## Intent

The console must not become the weakest link to production admin power. Secrets stay server-side,
operators are authenticated, mutations are attributed, and the attack surface is enumerable.

## Requirements

1. `ADMIN_API_SECRET`, Cloudflare Access validation config, and SSH keys never exist in
   the browser, source maps, client bundles, or public build artifacts. Identity is provided
   by Access; the app has no OIDC client secret or app-owned session secret.
2. The browser never calls the gateway admin origin.
3. All `/api/admin/*` routes require a valid session and CSRF on non-GET.
4. The BFF allowlist is explicit; no generic proxy, user-supplied URL, or method passthrough.
5. Every mutation carries `X-Admin-Actor` from the session; client-supplied actor headers are
   ignored.
6. The operator session is the Cloudflare Access `CF_Authorization` cookie (HttpOnly, Secure).
   The app does not mint a session cookie.
7. The Access allowlist policy and session duration are configured in Cloudflare; the BFF
   validates `Cf-Access-Jwt-Assertion` when it lands.
8. CSP, HSTS, nosniff, frame-ancestors, and referrer policy are set in production.
9. No XSS sink: no `dangerouslySetInnerHTML`; JSON is rendered as text.
10. Body/param limits and timeouts bound every upstream call.
11. Secrets are rotatable without a code change; a runbook exists.
12. Logs/error reports exclude secrets, bodies, cookies, raw UIDs, and tokens.
13. Dependency and image scanning gate releases.

## Acceptance criteria

- [ ] Secret scan of `dist/`, source maps, image layers, and logs finds no secret.
- [ ] Direct BFF admin calls without a session return 401; no upstream call.
- [ ] CSRF missing/incorrect Origin/token is rejected.
- [ ] Allowlisted/denied Access cases behave correctly.
- [ ] Actor header is server-derived; browser spoofing is ignored.
- [ ] Cookie flags verified in a browser.
- [ ] CSP/headers verified in production.
- [ ] Route allowlist is the only way to reach the gateway.
- [ ] Grant timeout/idempotency behavior verified.
- [ ] Rotation drill completed in staging.

## Verification

- Automated: BFF integration suite, secret scan, header test, dependency/image scan.
- Manual: DevTools network/bundle review, cookie inspection, CSP report check.
- Review: threat model sign-off, allowlist review.

## Residual risks

- Shared admin secret has no per-operator scopes.
- Stateless session revocation is global.
- Public admin API exposure unless firewalled.

## Traceability

[Security §3–§14](../07-security-model.md) · [FR-002](FR-002-secure-admin-api-gateway.md) ·
[FR-016](FR-016-safe-mutation-protocol.md)
