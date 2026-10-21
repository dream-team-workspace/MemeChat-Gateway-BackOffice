# ADR-0002 — BFF owns the admin secret and operator identity

- **Status:** Proposed
- **Date:** 2026-10-21
- **Deciders:** Frontend/backend/security

## Context

The gateway's admin API authenticates with a single bearer secret and expects an
`X-Admin-Actor` header. Browsers cannot keep a secret, the admin API has no CORS/browser
session model, and the gateway has no operator login. A direct browser call would either
expose the secret or require a static header injection with no per-operator identity.

## Decision

Add a **Backend-for-Frontend** (Hono on Node) that:

- authenticates operators with OIDC and an allowlist,
- keeps `ADMIN_API_SECRET` server-side,
- exposes only explicit, schema-validated routes,
- injects the secret and `X-Admin-Actor`,
- normalizes the contract and errors,
- serves the SPA in production.

The browser only calls same-origin `/api/*`.

## Consequences

Positive:

- The secret never reaches the browser or source maps.
- Every mutation has a real actor and a request ID.
- The BFF is a narrow, testable choke point for auth, rate limits, CSRF, and logging.
- Upstream contract changes are absorbed in one adapter layer.

Negative:

- One more runtime to deploy, monitor, and secure.
- Adds latency (one extra hop), negligible on the same network.
- The BFF becomes security-critical; it needs tests, review, and rotation runbooks.
- Still limited by the gateway's shared-secret model (no true per-operator scopes).

## Alternatives considered

- **Browser → gateway directly**: secret exposure, no actor, no CORS/session.
- **Nginx/Caddy injects a static header**: no operator identity/session; an unauthenticated
  admin proxy.
- **Serverless functions**: viable, but adds vendor lock-in and cold starts; a Node container
  is simpler for this team/server.
- **Next.js API routes**: would combine SPA and BFF, but the SPA decision (ADR-0001) keeps them
  separate and testable.

## Follow-up

- Threat model and security checklist (docs/07).
- CSRF/session/allowlist tests (docs/09).
- Secret rotation runbook (docs/10).
- Network allowlist BFF → gateway.
