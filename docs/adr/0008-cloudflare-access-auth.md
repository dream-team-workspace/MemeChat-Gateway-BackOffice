# ADR-0008 — Cloudflare Access for operator authentication

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Frontend, security, operations
- **Supersedes:** The OIDC provider/session portion of ADR-0002 and FR-001

## Context

The console originally planned its own OIDC authorization-code flow, state/nonce/PKCE
cookies, an allowlist check, and an app-owned signed session cookie. The team already uses
Cloudflare Access for SSH (`admin.dream-team.works`), with an existing Zero Trust organization
(`rough-water-d6a6.cloudflareaccess.com`).

Maintaining a second identity integration would add an OIDC client secret, state/nonce/PKCE
handling, session-signing keys, and more security-critical code for no user benefit. The
console is an internal, same-origin static SPA; Access can authenticate users before the app
loads.

## Decision

Use **Cloudflare Access** as the operator authentication provider:

- A self-hosted Access application protects the console hostname.
- Access owns SSO/MFA, the allowlist policy, session duration, and the HttpOnly
  `CF_Authorization` cookie.
- The SPA reads the verified identity from `GET /cdn-cgi/access/get-identity`.
- Sign-out goes to `GET /cdn-cgi/access/logout`.
- The app does not implement OIDC, store identity tokens, or mint a session cookie.
- Local development uses `VITE_DEV_AUTH_EMAIL` only when `import.meta.env.DEV` is true;
  production builds always use Access.
- When the BFF lands, it validates `Cf-Access-Jwt-Assertion` (issuer, audience, JWKS, expiry)
  and uses the verified email for `X-Admin-Actor`. The BFF's CSRF, route allowlist, and secret
  isolation requirements remain unchanged.

The existing BFF decision (ADR-0002) remains: the browser never receives
`ADMIN_API_SECRET` and never calls the gateway admin origin.

## Consequences

Positive:

- No OIDC client secret, state/nonce/PKCE implementation, or session-signing key in this app.
- The same identity policy and MFA as SSH.
- Access handles login/logout and session revocation at the edge.
- The SPA has no token in JavaScript and no auth data in localStorage.

Negative:

- The console now depends on Cloudflare Access being correctly configured; a misconfigured
  hostname can leave the static origin reachable or cause a login loop.
- The origin must be tunnel-only (or validate the Access JWT itself).
- The BFF still needs JWT validation for defense in depth and for its own authorization.
- Access session duration and policy are configured outside the repository.

## Alternatives considered

- **Custom OIDC in the BFF:** more code, secrets, and failure modes; rejected.
- **Edge-only Access with no identity in the app:** simpler, but the console cannot show the
  operator or attribute future mutations; rejected. The app reads `get-identity`.
- **Static shared password:** no per-operator identity, no MFA; rejected.
- **SSH-only access:** not a browser login; rejected.

## Follow-up

- [x] Integrate Access identity into the SPA.
- [x] Add local development identity and production build guard.
- [ ] Create the `console.dream-team.works` Access application and tunnel public hostname.
- [ ] Add BFF JWT validation when the admin API lands.
- [ ] Add a staging Access application and smoke test.
