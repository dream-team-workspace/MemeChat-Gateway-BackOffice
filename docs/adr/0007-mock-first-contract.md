# ADR-0007 — Mock-first contract until the admin API lands

- **Status:** Superseded 2026-10-24 — the gateway admin API is live and the console is live-only
- **Date:** 2026-10-21
- **Deciders:** Frontend/backend

## Context

The gateway documents `/internal/admin/*` but the current backend checkout does not mount
those routes. The exact JSON field names, pagination, and grant response are not specified.
Waiting for the backend would idle the frontend; inventing endpoints would create rework and
false confidence.

## Decision

Build against a **shared, versioned mock contract**:

- `shared/admin-api/schemas.ts` defines canonical Zod schemas and types.
- MSW/BFF mock mode implements every route, success and error.
- The BFF maps live upstream responses into the same canonical contract.
- A feature is only marked integrated when it passes contract tests against staging.
- Missing backend routes stay mock-only and are listed as blocked, never invented.

## Consequences

Positive:

- UI, tests, and docs can proceed before the backend is ready.
- The contract is explicit and reviewable; mismatches surface early.
- The same fixtures drive unit, BFF, and E2E tests.
- Live cutover is per route, behind a flag, with a rollback path.

Negative:

- The mock can drift from the real API if not reviewed.
- Two modes (mock/live) add configuration and test matrix.
- Mock success can create false confidence; staging contract tests are mandatory.
- Some UI decisions may need revision when the real response shape lands.

## Alternatives considered

- **Wait for backend**: wastes parallel time; no design feedback.
- **Directly code against guessed upstream shapes**: couples UI to unstable fields; rework.
- **Generate a client from an OpenAPI spec**: ideal, but no spec exists yet. Revisit when the
  backend publishes one.

## Follow-up

- Backend owner reviews the canonical contract at G2.
- Add contract tests to CI.
- Track resolved assumptions in docs/02 and docs/12.
