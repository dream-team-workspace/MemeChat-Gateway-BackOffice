# ADR-0001 — Vite + React single-page application

- **Status:** Proposed
- **Date:** 2026-10-21
- **Deciders:** Frontend/backend leads

## Context

The BackOffice is an internal, authenticated operator console. It has no SEO, public
marketing, or server-rendered content requirement. The gateway already exposes an HTTP admin
API, and the browser must not hold its secret. The team wants a React UI with a fast local
feedback loop and a static deployable artifact.

## Decision

Use **React 19 + TypeScript + Vite** as a client-side SPA. Do not use Next.js/Remix/TanStack
Start. The SPA is served by the Hono BFF in production and by Vite in development.

## Consequences

Positive:

- Fast HMR and a small operational surface (static assets + one Node process).
- No SSR/streaming/hydration complexity.
- The BFF boundary is explicit, not hidden in server components.
- Easy to host behind any reverse proxy or CDN later.

Negative:

- No server rendering; first paint depends on the JS bundle. Mitigate with route splitting,
  a small initial bundle, and skeletons.
- Auth must be handled by the BFF, not by a framework.
- Deep links require SPA fallback configuration (implemented in the BFF).

## Alternatives considered

- **Next.js**: server components/API routes are capable, but the app does not need SSR/SEO and
  the BFF must exist anyway to hold the admin secret. Heavier runtime and framework coupling.
- **Remix/TanStack Start**: same reasoning; more framework surface than the product needs.
- **Create React App**: deprecated tooling; no reason to start there.

## Follow-up

- Set bundle budgets (NFR-003).
- Add SPA fallback + cache headers in the BFF.
- Revisit only if a public, SEO-sensitive surface appears.
