# 11 — Roadmap

| Field | Value |
|---|---|
| Status | Phase 0 complete; Phase 1 UI template in progress |
| Planning complete | 2026-10-21 |
| Current branch | `feature/template` |
| Delivery model | Vertical slices, each demoable |
| Estimates | Relative (S/M/L), not dates |

## 1. Phase overview

| Phase | Theme | Outcome | Depends on |
|---|---|---|---|
| 0 | Planning | This corpus, branches, ADRs | — |
| 1 | Foundation | App runs locally: shell, login, design system, mock API, CI | 0 |
| 2 | Registry | Capabilities, routing, kill switch, audit, models on mocks | 1 |
| 3 | Support | Users, ledger, usage, grants, dashboard on mocks | 1 |
| 4 | Integration | Real admin API, staging E2E, a11y/perf/security hardening | 2, 3 + backend |
| 5 | Launch | Production deploy, monitoring, training, rollback drill | 4 |
| 6 | Deferred | Ops jobs, RBAC, global audit, user directory, charts | 5 + backend |

## 2. Phase 0 — Planning (complete)

Deliverables:

- Product brief, scope, backend contract analysis.
- Architecture, stack, IA, API contract, security, testing, CI/CD.
- One file per FR/NFR, ADRs, risks, glossary.
- Git repository initialized with `master` and `development`.

Exit criteria:

- Requirements are reviewed and accepted (status changes from Proposed).
- Backend owner confirms or corrects the contract assumptions (especially grant and pagination).
- Design tokens and contrast overrides approved.
- Branch protection and environments are configured.

## 3. Phase 1 — Foundation (M, in progress)

Goal: a running shell with a real design system, a real BFF skeleton, and a mock contract.

**Implemented on feature/template (2026-10-21):**

- Vite + React 19 + TypeScript, Tailwind v4, semantic tokens, Open Sans.
- Code-based TanStack Router with protected routes and mock session.
- Login screen (desktop split / mobile form), mock SSO buttons, demo mode, theme toggle.
- Responsive app shell: desktop sidebar, mobile drawer with focus trap, sticky topbar,
  environment badge, skip link.
- Pinned Settings at the sidebar bottom, plus environment and operator menu.
- Dummy Overview, Capabilities, Models, Users, Operations, and Settings pages.
- Light/dark/system theme, persisted with no-flash boot script.
- Build and typecheck pass; axe clean on core screens; no overflow at 360–1440.

**Still required for Phase 1 exit:**

- BFF skeleton, session/OIDC interface, mock API store.
- Shared Zod schemas and MSW fixtures.
- ESLint/Prettier, Vitest/Playwright, and CI.
- Docker/deploy skeleton.

Deliverables:

1. **Scaffold**
   - Replace the bare TS scaffold with Vite + React + TS.
   - Tailwind v4, path aliases, ESLint/Prettier, Vitest, Playwright, MSW.
   - Scripts: `dev`, `dev:api`, `build`, `lint`, `typecheck`, `test`, `test:e2e`.
2. **Design system**
   - shadcn init + core primitives.
   - Apply DESIGN.md tokens, semantic extensions, light/dark boot.
   - Build common components: PageHeader, DataTable, ConfirmDialog, EmptyState, ErrorState,
     StatusBadge, CopyButton, JsonViewer, DiffView.
3. **BFF skeleton**
   - Hono app, config validation, health, security headers, request IDs, error envelope.
   - Mock mode with deterministic store; live mode adapter stub.
   - Session/OIDC interface with a local mock provider; dev bypass excluded from production.
4. **App shell**
   - Router, auth guard, sidebar/topbar, environment badge, 403/404/error routes.
   - Login page and session menu.
5. **Contract**
   - Shared Zod schemas for all admin entities.
   - MSW handlers + fixtures for every endpoint.
   - Contract tests.
6. **CI**
   - `ci.yml` with lint/typecheck/test/build/e2e.
   - Branch protection, Dependabot, secret scan.
7. **Deploy skeleton (no production)**
   - Dockerfile, compose, deploy script, staging workflow (can deploy a "hello" shell).

Exit criteria:

- `npm run dev` shows the shell; login/logout works with mock OIDC. **(done)**
- Design review passes light/dark, keyboard, axe. **(core screens done)**
- Every route renders loading/empty/error states with mock data. **(not yet)**
- CI is green on a PR to `development`. **(not yet)**
- No secret in the bundle scan. **(no secrets present; scan not automated yet)**

Demo: navigate the shell, switch theme, sign in/out, open empty pages with consistent states.

## 4. Phase 2 — Registry (L)

Goal: complete capability and model operations against mocks, ready for live integration.

Deliverables:

1. Capabilities list: search/filter/sort, disabled badges, counts, refresh.
2. Capability detail: summary, form, JSON editors, validation, dirty guard.
3. Review diff + save + revision/audit refresh; 409/422 handling.
4. Provider chain editor: add/remove/reorder, validation, atomic save.
5. Kill switch: reason, type-ID confirm, pending lock, disabled banner, audit.
6. Audit history: table, before/after/diff, limit handling.
7. Models: list, create/edit drawer, validation, duplicate sort warning.
8. Component/contract/BFF/E2E tests for all above.
9. Screenshots light/dark + a11y pass.

Exit criteria:

- All FR-003..FR-008 acceptance criteria pass on mocks.
- E2E: E4–E10 green in Chromium (WebKit at least once).
- Kill switch < 15s in the E2E trace.
- No optimistic money/registry writes.
- The mock contract is signed off by the backend owner.

Demo: disable a capability, re-enable it, change a cost with a diff, reorder providers, edit a
model, inspect audit.

## 5. Phase 3 — Support (M/L)

Goal: support and money flows on mocks.

Deliverables:

1. User lookup page + UID validation.
2. User detail: latest-known balance, ledger table (all internal states), cursor pagination.
3. Usage tab: metadata table, statuses, pagination, detail sheet.
4. Grant dialog: amount/reason/requestId, confirm, pending, timeout/retry semantics.
5. Overview dashboard: real counts, health, quick actions; no fake charts.
6. Operations: environment, health, cache invalidate.
7. Settings: appearance/session/about.
8. Tests: money-path E2E, timeout/retry, empty/error states.

Exit criteria:

- FR-009..FR-012 pass on mocks.
- E2E: E11–E15 green.
- Grant duplicate/timeout tests prove requestId reuse.
- Dashboard has no invented metrics; partial failure is graceful.

Demo: UID → ledger → usage → grant → ledger refresh; cache invalidate; dashboard.

## 6. Phase 4 — Integration and hardening (L)

Goal: replace mocks with the real admin API on staging and pass release gates.

Preconditions:

- Backend implements `/internal/admin/*` with AdminAuth + actor.
- Exact schemas/pagination/grant contract confirmed.
- Staging gateway + admin secret + network access.
- OIDC staging app + allowlist.

Deliverables:

1. Live BFF adapter: casing, pagination, errors, timeouts; feature flag cutover per route.
2. Contract tests against staging; fix mismatches; document assumptions resolved.
3. Full E2E on staging (read + controlled mutations with a test UID/capability).
4. Security review: secret isolation, CSRF, allowlist, headers, logs, rotation drill.
5. A11y audit: axe + manual keyboard/screen-reader pass.
6. Performance: Lighthouse budgets, bundle analysis, table performance.
7. Observability: structured logs, request IDs, error reporting decision/integration.
8. Runbooks: deploy, rollback, secret rotation, operator revocation, outage.

Exit criteria:

- Live reads and mutations work on staging.
- No P0/P1 security findings; no serious/critical axe issues.
- Performance budgets met or waivers approved.
- Rollback drill < 5 minutes.
- Production readiness review signed off.

## 7. Phase 5 — Launch (S/M)

Goal: production release with operational confidence.

Deliverables:

1. Production OIDC app + allowlist; production admin secret; network allowlist.
2. Production deploy workflow + environment approval.
3. Production smoke (read-only) + on-call owner.
4. Operator training: kill switch, cost changes, grants, what not to do.
5. Launch checklist and post-launch review.
6. Tag `v1.0.0`.

Exit criteria:

- Production health/smoke green.
- At least two operators complete a staging drill.
- Incident/rollback contacts documented.
- No open P0/P1 risks.

## 8. Phase 6 — Deferred (not v1)

| Item | Blocker | Trigger |
|---|---|---|
| Ops job console (sweep/export/retention) | Separate `INTERNAL_API_SECRET`; no admin-scoped job route | Backend adds admin-scoped jobs or a job service |
| Global audit feed | No global audit endpoint | Backend adds paginated audit |
| User directory/search | No user list endpoint | Backend adds search |
| RBAC / scoped tokens | Shared admin secret | Team grows or compliance requires |
| Charts/analytics | No aggregate endpoint | Backend adds stats; define honest metrics |
| Bulk actions | No bulk API | Repeated operator demand |
| CSV export | No export API; PII review | Compliance/support need |
| Storybook/visual docs | Not needed to ship | Design system grows beyond ~30 components |
| i18n | English-only team | Localization requirement |

## 9. Critical path

~~~text
Backend admin API ─┐
Exact schemas ─────┼──► Phase 4 integration ──► Phase 5 launch
Staging gateway ───┤
OIDC app/allowlist ┘

Phase 1 ──► Phase 2 ──► Phase 4
       └──► Phase 3 ──► Phase 4
~~~

Phase 1/2/3 can proceed on mocks while the backend is unfinished. Integration cannot start
until the admin routes and exact contract exist.

## 10. Work sizing

| Item | Size |
|---|---|
| Scaffold + CI | M |
| Design system + shell | M |
| BFF skeleton + mock contract | M |
| Capabilities + routing | L |
| Kill switch + audit | M |
| Models | S/M |
| Users + ledger/usage | M |
| Grant | M (money-path tests) |
| Dashboard + ops + settings | S/M |
| Integration + hardening | L |
| Launch | S/M |

Sizes are relative and include tests/docs, not just UI.

## 11. Decision gates

| Gate | Decision | Owner |
|---|---|---|
| G0 | Accept requirements/design/contract assumptions | Product + backend |
| G1 | Approve stack and repo layout | Engineering |
| G2 | Approve mock contract (fields, errors, pagination) | Backend + frontend |
| G3 | Approve live cutover on staging | Backend + QA |
| G4 | Approve production release | Engineering + operations |
| G5 | Approve deferred items | Product |
