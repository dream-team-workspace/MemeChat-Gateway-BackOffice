# 09 — Testing strategy

| Field | Value |
|---|---|
| Status | Proposed |
| Tools | Vitest, Testing Library, MSW, Playwright, axe |
| Gate | CI must be green before merge |

## 1. Goals

- Catch contract drift before an operator sees it.
- Prove the dangerous paths: kill switch, routing replace, credit grant, session expiry.
- Keep tests fast enough to run on every PR.
- Make failures diagnosable (request IDs, traces, fixtures).
- Do not chase a coverage number at the expense of money-path tests.

## 2. Test pyramid

| Layer | Tool | Scope | Speed | Runs |
|---|---|---|---|---|
| Unit | Vitest | pure functions, schemas, formatters, guards | ms | every change |
| Component | Vitest + Testing Library | feature components, forms, tables, dialogs | fast | every change |
| Contract | Vitest + Zod + fixtures | every admin payload/error parses and maps | ms | every change |
| BFF integration | Vitest + Hono `app.request` + fetch stub | auth, CSRF, allowlist, headers, mapping, errors | fast | every change |
| E2E | Playwright | real browser, real BFF + gateway, critical flows | slower | every PR + deploy |
| Visual | Playwright screenshots | key screens light/dark | slower | PR for UI + nightly |
| Accessibility | axe-core / @axe-core/playwright | core routes and dialogs | fast | every PR |
| Performance | Lighthouse CI | Overview/Capabilities budgets | slower | nightly/release |

## 3. Unit tests

Cover:

- credit/number formatters and integer validation
- date/time formatting and relative time
- UID/capability/model ID validators
- diff generation for capability changes
- JSON editor parsing/serialization
- query-key factories (shape stability)
- error mapping from `ApiError` to form/toast
- schema parsing for every canonical type
- route search-param parsing and fallback
- permission/allowlist display logic (future)

Rules:

- No network; pure inputs/outputs.
- No snapshots for business logic; assert behavior.
- Table-driven cases for edge values (0, negative, huge, NaN, whitespace, Unicode).
- Test names describe the behavior, not the function name.

## 4. Component tests

Use Testing Library with user-event and MSW.

Critical components:

- Capability table: loading, empty, error, filters, disabled badge, row navigation.
- Capability form: validation, dirty state, JSON errors, review diff, 409/422 handling.
- Provider chain editor: add/remove/reorder, last-enabled guard, invalid JSON.
- Kill switch dialog: required reason, type-ID confirmation, pending lock, failure keeps open.
- Grant dialog: amount/reason validation, requestId reuse, pending lock, timeout message.
- Ledger/usage tables: pagination, state badges, row detail, empty.
- Error state: request ID, retry.
- Theme toggle: persisted preference, no flash (E2E).

Rules:

- Query by role/label/text, not test IDs, unless no accessible query exists.
- No shallow rendering.
- Assert user-visible behavior, not implementation details.
- MSW handlers reset between tests; no shared mutable state.
- Run axe on rendered output for new components.

## 5. Contract tests

Every fixture and real response must parse with the shared Zod schema.

- Fixtures for: capability list/detail, providers (including persisted `lastCheck`), models,
  audit, app clients (including `clientKeySha1`), app-client audit/activity, signed-in user
  directory, ledger states (all seven), usage statuses, grant success/error, error envelope.
- Golden files for upstream snake_case → canonical camelCase.
- Negative fixtures: missing fields, wrong types, unknown enum values (should fail or map to
  `unknown` deliberately).
- Pagination fixtures: first page, next page, last page, expired cursor.
- Error fixtures: 400/401/403/404/409/422/429/500/502/504 + malformed body.
- Contract tests must fail loudly on a field rename, not silently drop data.

## 6. BFF integration tests

Use Hono `app.request`; no real network. Stub `fetch` with a test-only upstream gateway.

Cases:

- Unauthenticated `/api/admin/*` → 401.
- Invalid/expired session → 401 + no upstream call.
- Non-allowlisted user → 403.
- CSRF missing/mismatched Origin/token → 403.
- Unknown path/method → 404/405 without upstream call.
- Path param injection (`../`, encoded slash, huge input) → 400.
- Upstream 401/403/5xx mapped safely; no secret in body.
- A plain-text 404 from an unimplemented gateway route keeps status 404 so the console can show
  a pending state instead of a contract error.
- `X-Admin-Actor` is overwritten from session, never from the browser.
- Request ID is propagated/generated and returned.
- GET retry policy; mutation no-retry.
- Timeout maps to 504.
- Body > 64 KiB → 413/422.
- Response schema mismatch → 502 `CONTRACT_MISMATCH` (no partial data).
- Static SPA fallback does not swallow `/api` 404s.
- Security headers present.

## 7. E2E scenarios

Contract tests use a fetch-level fake gateway on every PR; E2E runs against the real local
gateway and staging on deploy. There is no runtime mock mode.

| # | Scenario | Assertions |
|---|---|---|
| E1 | Login via Cloudflare Access | Verified identity loaded; protected shell visible |
| E2 | Non-allowlisted login | Access denied page; no session |
| E3 | Session expiry during a read | Redirect to login with returnTo; after login, back to page |
| E4 | Capabilities list/search/filter | URL updates; filtered rows; empty state; refresh |
| E5 | Capability edit + review + save | Diff shown; PUT called; revision/toast; audit link |
| E6 | Capability save conflict | 409 dialog; draft preserved; reload latest |
| E7 | Kill switch disable | Reason + type-ID; pending; disabled banner; audit entry |
| E8 | Kill switch re-enable | Default button (not red); reason; enabled badge |
| E9 | Provider reorder + last-enabled guard | Order normalized; blocked when none enabled; audit |
| E10 | Model create/edit | Upsert; list refresh; duplicate sort warning |
| E11 | User lookup + ledger | Exact UID; internal states; pagination; row detail |
| E12 | Usage tab | Metadata only; no content fields; pagination |
| E13 | Grant success | Confirm; requestId; ledger refresh; balance if returned |
| E14 | Grant timeout + retry | Same requestId; no duplicate; clear message |
| E15 | Cache invalidate | Confirm; success timestamp; refetch |
| E16 | Theme light/dark/system | Persisted; no flash; contrast screenshots |
| E17 | 403/404/route error | Correct page; request ID; home/retry |
| E18 | Keyboard-only kill switch | Focus order; Escape; no trap |
| E19 | Mobile viewport | Sidebar sheet; kill switch reachable; table scroll |
| E20 | Offline/read failure | Banner; no crash; retry works |

Rules:

- Use accessible selectors.
- No arbitrary sleeps; wait for network/UI state.
- Each contract test owns its fetch fixture; E2E uses an isolated seeded gateway.
- Capture trace/screenshot/video on failure.
- Tag tests (@`smoke`, @`critical`) for selective runs.

## 8. Visual regression

- Screenshot Overview, Capabilities list, Capability detail (clean + dirty), Kill switch dialog,
  Models, User ledger, Grant dialog, 404, light and dark.
- Deterministic data, fixed viewport (1440×900 and 390×844), disable animations via
  `prefers-reduced-motion`.
- Review diffs manually; do not auto-accept.
- Store baselines in the repo or a dedicated artifact store; update only with a design review.

## 9. Accessibility tests

- axe on every core route and dialog (light/dark).
- Keyboard-only E2E for kill switch, form save, dialog close, table row actions.
- Focus restoration after dialog close.
- Screen-reader labels for icon-only buttons and status badges.
- Contrast is enforced by the token contract; add a token contrast unit test.
- Target: WCAG 2.2 AA; no serious/critical axe violations.

## 10. Performance tests

Budgets:

- Initial JS ≤ 250 KB gzipped; route chunk ≤ 100 KB.
- LCP ≤ 2.5s on a simulated Fast 3G/4× CPU for Overview (internal tool, not public web).
- Table interaction ≤ 100ms for 200 rows.
- No layout shift from fonts/skeletons (CLS < 0.1).

Tools: Lighthouse CI, bundle analyzer, Playwright performance marks. Run nightly/release;
block a release on a >20% regression without justification.

## 11. Coverage

- Global line coverage target: 70% (warning), 80% for `shared/` and `server/src/gateway`,
  85% for money/validation helpers.
- Coverage is a signal, not a gate for UI glue. Do not write meaningless tests to hit a number.
- Every bug fix adds a regression test.
- Every new endpoint adds a contract + BFF test.
- Every new destructive action adds an E2E test.

## 12. Test data and doubles

- Fixtures in `tests/fixtures` are deterministic and reused across unit, BFF, and E2E.
- UIDs are fake (`test_uid_...`), never real customer IDs.
- No production data in tests or screenshots.
- MSW handlers implement the canonical contract, not the upstream shape.
- The fetch-level test double supports per-test responses and error injection; no runtime store exists.
- Fixtures include disabled/empty/error/edge cases, not only happy paths.

## 13. CI gates

Required for merge:

1. `npm run lint`
2. `npm run typecheck` (web + server + shared)
3. `npm run test -- --run` (unit/component/contract/BFF)
4. `npm run build` (web + server)
5. `npm run test:e2e -- --project=chromium` (real gateway)
6. Secret scan + dependency audit

Nightly/release:

- Full Playwright matrix (Chromium, WebKit, Firefox).
- Visual regression.
- Lighthouse CI.
- Staging smoke against the real gateway.
- Container scan.

## 14. Flake policy

- A flaky test is a bug; quarantine with an owner and a deadline (≤ 5 business days).
- No retries to hide flakiness in PR CI; retries allowed only in nightly with a report.
- Prefer deterministic waits over timeouts.
- Control time where relevant; do not depend on wall-clock boundaries.
- Fix or delete a test that cannot be made deterministic; do not normalize failure.

## 15. Environments

| Environment | Data | Auth | Purpose |
|---|---|---|---|
| Local | Real gateway + Postgres | Dev identity (`VITE_DEV_AUTH_EMAIL`) | Fast iteration |
| CI | Fetch-level fake gateway (contract tests only) | Dev identity | PR gates |
| Staging | Real gateway staging DB | Staging Access app | Integration + smoke |
| Production | Real | Production Access app | Smoke only (read-only unless approved) |

Production E2E must not mutate real capabilities or grant credits without an explicit,
approved test plan. Prefer read-only smoke + synthetic staging mutations.

## 16. Security tests

- BFF: 401/403/CSRF/allowlist/SSRF/body-limit cases (see §6).
- Browser: secret scan of `dist/`; CSP header test; cookie flag test.
- Grant: duplicate requestId replay; timeout retry; double-click.
- Audit: browser-supplied actor ignored.
- Dependency/image scan in CI.
- Optional: ZAP baseline against staging (authenticated scope).

## 17. Manual QA checklist (release)

- [ ] Login/logout/session expiry.
- [ ] Kill switch disable + re-enable on staging.
- [ ] Capability edit with diff and audit.
- [ ] Provider reorder and validation.
- [ ] Model edit.
- [ ] Ledger/usage pagination and empty states.
- [ ] Grant on staging with a test UID; verify ledger.
- [ ] Cache invalidate.
- [ ] Light/dark and 360/768/1440.
- [ ] Keyboard-only critical paths.
- [ ] Error states (stop gateway or upstream 5xx).
- [ ] No console errors; no secret in network.
- [ ] Rollback rehearsal.

## 18. Exit criteria by phase

| Phase | Test exit |
|---|---|
| S1 scaffold | Lint/typecheck/build; login + shell E2E against the gateway |
| S2 registry | Component + BFF + E2E for capabilities/routing/kill switch/models |
| S3 support | E2E for lookup/ledger/usage/grant; money-path tests |
| S4 integration | Contract tests against staging; full E2E; a11y/perf pass |
| S5 production | Smoke, rollback rehearsal, security checklist |
