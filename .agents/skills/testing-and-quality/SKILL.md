---
name: testing-and-quality
description: How this repo verifies changes: Vitest 5 node tests, BFF contract tests against a fake upstream, unit-test conventions, current gaps (no E2E/component setup), CI gates, and the definition of done. Load before claiming work is complete.
---

# Testing and quality

## Use this skill when

- Adding a route, mapper, schema, pure helper, or bug fix.
- Deciding what test to write and where it goes.
- Before reporting a change as complete.

`docs/09-testing-strategy.md` is the long-term strategy; this skill describes what actually
runs today, plus the rules to follow when extending it.

## What runs today

| Layer | Status | Where |
|---|---|---|
| Pure unit tests | run | `src/features/*/lib/*.test.ts`, `src/features/*/hooks/*.test.ts`, `shared/**/*.test.ts` |
| Shared-schema tests | run | `shared/admin-api/capabilities.test.ts` |
| BFF contract/integration tests | run | `server/src/app.test.ts` (Hono `app.request` + fake global `fetch`) |
| Component tests (Testing Library) | **not configured** | jsdom + Testing Library are installed, but `vitest.config.ts` uses `environment: "node"` and includes only `*.test.ts` |
| E2E (Playwright) | **not installed** | planned |
| MSW / axe / visual regression | **not installed** | planned |

Do not claim E2E, axe, or component-test coverage that does not exist. If you add a tool,
update `vitest.config.ts`, `package.json`, `docs/09-testing-strategy.md`, and CI in the same
change.

## Commands

```bash
npm run lint       # ESLint (PR gate)
npm run typecheck  # tsc --noEmit for web + server
npm test           # vitest run
npm run build      # typecheck + Vite build + server build
```

`vitest.config.ts` sets `NODE_ENV=test`, `APP_ENV=development`, a fake
`ADMIN_API_BASE_URL=http://gateway.test`, `ADMIN_API_SECRET=test-secret`, and
`DEV_ACTOR_EMAIL=operator@test.local`. It also sets `restoreMocks: true`. Vitest 5 clears mock
history between tests by default (`clearMocks: true`) — do not rely on call history leaking
between tests.

## BFF contract tests

Pattern in `server/src/app.test.ts`:

1. Define a fake `fetch` that records `{path, method, body, headers}` into a module-level
   `calls` array and returns deterministic JSON per route.
2. `beforeAll`: `vi.stubGlobal("fetch", fakeFetch)` **then** dynamically `await import("./app.js")`
   so the app sees the stub and the test env.
3. `afterAll`: `vi.unstubAllGlobals()`; `beforeEach`: `calls.length = 0`.
4. Drive the app with `await app.request("/api/...")` and parse with a `jsonBody<T>` helper.

Assert both sides of the boundary:

- outbound: path + query, method, JSON body (snake_case), `X-Admin-Actor`, `Authorization`,
  `X-Request-Id` propagation;
- inbound: status, code/message, canonical camelCase shape, pagination normalization;
- negative paths: 401/403/404/409/422/502/504, plain-text upstream 404 preserved, invalid
  activity date rejected **before** calling upstream (assert `calls.length === 0`),
  secrets/plaintext keys never in a response.

## Unit tests

- Colocate as `*.test.ts` next to the module (not `src/**/*.test.tsx` today).
- Test behavior, not implementation; table-driven cases for empty/negative/huge/whitespace.
- Pure functions in `features/*/lib` and `hooks` are the main targets: status/label mapping,
  route draft equality/completeness, error mapping, date parsing, formatters.
- Schema tests: every canonical fixture parses; invalid enum/missing required fails; legacy
  payloads without rollout-optional fields still parse; pagination cursor edges.
- No snapshots for business logic; no network in pure tests.

## Adding a test for a change

| Change | Required test |
|---|---|
| New BFF route | contract test: success + at least one error path + actor header |
| New/changed schema | valid parse + invalid/edge parse; legacy payload compatibility |
| New pure helper/hook logic | unit test, colocated |
| Bug fix | regression test that fails before the fix |
| New page/UI | manual browser validation today; note the gap and consider a component-test setup as a separate change |

## CI gates (actual)

`.github/workflows/ci.yml`:

| Trigger | Job |
|---|---|
| PR → `development`/`master` | `Lint` only (required check) |
| Push → `development` | clean `npm run build` (no artifacts) |
| Push → `master` | build, prune, package, SSH deploy, health check |

Tests/typecheck are **not yet CI gates** even though they should be. Run them locally before
asking for review; do not weaken them to make a change pass.

## Definition of done (repo policy)

A change is done when:

- [ ] Acceptance criteria in the requirement file pass.
- [ ] Unit/contract tests cover new logic and error paths (or the gap is explicitly stated).
- [ ] BFF contract test covers new/changed endpoints.
- [ ] Loading/empty/error states handled; no secrets or raw UIDs in logs/responses.
- [ ] Docs updated (requirement, API/architecture/design as needed).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- [ ] Rollback/flag considered for risky behavior.

See `docs/08-engineering-standards.md` §14 and `docs/09-testing-strategy.md` for the full
checklist and future gates.

## Flake and coverage policy

- A flaky test is a bug: fix or quarantine with an owner/deadline; no retries to hide it in PR CI.
- Coverage targets are signals, not a gate for UI glue (`docs/09-testing-strategy.md` §11).
- Every new endpoint adds a contract + BFF test; every destructive action eventually needs E2E.

## References

- `vitest.config.ts`, `server/src/app.test.ts`, `shared/admin-api/capabilities.test.ts`.
- `docs/09-testing-strategy.md` — pyramid, E2E scenarios, fixtures, future gates.
- `docs/08-engineering-standards.md` §14 — definition of done.
