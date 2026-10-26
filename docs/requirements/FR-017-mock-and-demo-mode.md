# FR-017 — Mock and demo mode

> **Superseded 2026-10-24.** The backoffice is live-only against the gateway admin API. The
> mock store and runtime mode switch were removed; contract tests use a fetch-level test
> double only. This requirement is retained as planning history.

| Field | Value |
|---|---|
| Status | Superseded |
| Priority | Must (development) |
| Phase | 1 |
| Owner | Frontend + BFF |
| Depends on | FR-002 |
| Source | [ADR-0007](../adr/0007-mock-first-contract.md), [Testing](../09-testing-strategy.md) |

## Intent

Let the team build and test the entire console while the gateway's admin API is unfinished,
without inventing a divergent production behavior.

## Scope

In scope:

- MSW handlers for browser/unit/component tests.
- BFF mock mode with an in-memory store for E2E and local development.
- Deterministic fixtures covering success/empty/error/edge cases.
- Error/latency injection.
- Hard production guards.

Out of scope:

- A public demo deployment.
- Persisting mock data across restarts (unless explicitly seeded).
- Simulating RevenueCat end-to-end (only the admin responses).

## User stories

- As a frontend developer, I can run the app without the gateway.
- As a tester, I can reproduce 409/422/429/timeout states deterministically.
- As a reviewer, I can see the canonical contract exercised by every screen.
- As security, I can be sure mock mode cannot run in production.

## Behavior

1. Local dev uses Vite + MSW or BFF mock mode (one documented default).
2. Mock mode implements every BFF route, including auth and health.
3. Seed data: two capabilities (one disabled), three provider routes, two models, ledger rows
   with COMMITTED/REFUNDED/PENDING_SPEND, usage rows with ok/upstream_error, audit entries.
4. Error injection via dev-only query/header/seed control; no production path.
5. The mock store resets between tests; seed is deterministic.
6. Responses are validated by the same shared Zod schemas as live responses.
7. Mock mode is rejected when `NODE_ENV=production` or `VITE_APP_ENV=production`; the BFF
   exits with a clear error.
8. The UI shows a visible "Mock data" banner in non-test local mode.

## Acceptance criteria

- [ ] Every screen can be exercised with mock data, including empty/error states.
- [ ] Mock responses validate against the shared schemas.
- [ ] Deterministic seed; tests can reset state.
- [ ] Error/latency injection is dev-only and documented.
- [ ] Production startup rejects mock mode; build fails if the client flag is on.
- [ ] Mock mode requires no admin secret and no live gateway.
- [ ] Mock fixtures are reused by unit, BFF, and E2E tests.
- [ ] No real customer data in fixtures.
- [ ] Switching mock → live is a config change, not a code rewrite.

## Data and API

Mock routes mirror [API §2](../06-api-integration.md). The mock store lives in
`server/src/mock/` (or `tests/fixtures` + a store adapter) and is imported only by dev/test
entry points.

## UX notes

- Local banner: "Mock data — not connected to the gateway" with the environment.
- Do not show the banner in E2E screenshots unless the test expects it.
- Error injection should be discoverable via a dev-only page or documented env var, not hidden.

## Errors and edge cases

- Mock handler missing → 501 with a clear developer message; fail tests.
- Schema drift between fixture and mock response → contract test fails.
- Mock state leakage between tests → reset per test; use isolated IDs.
- Production flag on mock → startup failure, not a silent fallback.

## Security and audit

- Mock mode cannot be enabled in production (multiple guards).
- No real secrets/UIDs in fixtures.
- Mock auth must not accept real tokens.
- Error injection endpoints are absent in production builds.

## Test notes

- Contract tests run against fixtures.
- E2E uses BFF mock mode for all flows.
- Historical: the live-only runtime has no mode flag; the BFF requires `ADMIN_API_SECRET`.
- Unit test the production guard.

## Open questions

- Should the default local mode be MSW-only or BFF mock? (Proposed: BFF mock for parity, MSW for
  component tests.)
- Do we need a seeded "demo" URL for stakeholders? (Optional; not public.)

## Traceability

[ADR-0007](../adr/0007-mock-first-contract.md) · [Testing §12](../09-testing-strategy.md) ·
[API §11](../06-api-integration.md)
