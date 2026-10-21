# NFR-006 — Testing and quality gates

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Engineering |
| Source | [Testing strategy](../09-testing-strategy.md) |

## Intent

Every merge is verified by automated checks that reflect the risk of an admin console: auth,
contract, money, routing, and destructive actions.

## Requirements

1. Unit/component tests with Vitest + Testing Library.
2. Contract tests parse every admin fixture/response with shared Zod schemas.
3. BFF integration tests cover auth, CSRF, allowlist, actor, errors, timeouts, body limits.
4. E2E covers critical flows (login, kill switch, capability edit, routing, models, ledger,
   usage, grant, cache, theme, 403/404).
5. Accessibility checks (axe) on core routes/dialogs.
6. Visual regression for stable screens (light/dark).
7. Performance budgets checked before release.
8. Coverage targets: 70% global, 80% shared/BFF gateway, 85% money/validation helpers.
9. Every bug fix adds a regression test.
10. Every new endpoint adds contract + BFF tests.
11. No flaky tests; quarantine with owner + deadline.
12. CI gates: lint, typecheck, unit/component/contract/BFF, build, E2E (Chromium PR), secret scan.

## Acceptance criteria

- [ ] CI blocks merge on any failed gate.
- [ ] Contract tests fail on field rename/type change.
- [ ] BFF tests cover 401/403/CSRF/allowlist/actor/error/timeout.
- [ ] E2E covers E1–E20 critical paths.
- [ ] axe has no serious/critical on core routes.
- [ ] Coverage meets targets or a waiver is recorded.
- [ ] A flaky test has an owner and ≤5 business-day deadline.
- [ ] Tests use fake UIDs and no production data.
- [ ] PRs include test evidence and a rollback note.

## Verification

- CI artifacts: test reports, coverage, Playwright traces, screenshots.
- Release checklist in docs/09.
- Quarterly test-suite review for slow/flaky tests.

## Exceptions

- Production E2E is read-only; mutations run on staging with a test UID.
- Visual tests may be skipped for a pure logic PR if no UI changed.

## Traceability

[Testing strategy](../09-testing-strategy.md) · [CI/CD §3](../10-ci-cd-and-environments.md) ·
[Requirements index](README.md)
