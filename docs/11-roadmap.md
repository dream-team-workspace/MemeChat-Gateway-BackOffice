# 11 — Roadmap

| Field | Value |
|---|---|
| Status | Phase 0 complete; Phase 1 console + live gateway integration implemented |
| Planning complete | 2026-10-21 |
| Current branch | `feature/implementation` |
| Delivery model | Vertical slices, each demoable |
| Estimates | Relative (S/M/L), not dates |

## 1. Phase overview

| Phase | Theme | Outcome | Depends on |
|---|---|---|---|
| 0 | Planning | This corpus, branches, ADRs | — |
| 1 | Foundation | App runs locally: shell, login, design system, live admin API, CI | 0 |
| 2 | Registry | Capabilities, routing, kill switch, audit, models against the live gateway | 1 |
| 3 | Support | Users, ledger, usage, grants, dashboard against the live gateway | 1 |
| 4 | Integration | Real admin API, staging E2E, a11y/perf/security hardening | 2, 3 + backend |
| 5 | Launch | Production deploy, monitoring, training, rollback drill | 4 |
| 6 | Deferred | Ops jobs, RBAC, global audit, charts | 5 + backend |

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

Goal: a running shell with a real design system and a live gateway-backed BFF.

**Implemented on feature/implementation (2026-10-21 → 2026-10-23):**

- Vite + React 19 + TypeScript, Tailwind v4, semantic tokens, Open Sans.
- Code-based TanStack Router with protected routes and async Cloudflare Access session guards.
- Login screen (desktop split / mobile form) with Cloudflare Access fallback, theme toggle.
- Responsive app shell: desktop sidebar, mobile drawer with focus trap, sticky topbar,
  environment badge, skip link.
- Pinned Settings at the sidebar bottom, plus environment and operator menu.
- Domain-oriented Overview, Capabilities (list/configuration/routing/audit/kill switch),
  Models, Users (lookup/ledger/usage/grant), Operations, and Settings pages.
- Hono BFF with Cloudflare Access JWT validation, live gateway proxy, request IDs, security
  headers, and static serving.
- Gateway admin API implemented in the local working tree (capabilities, routing, kill switch,
  audit, models, cache, ledger, usage, grants) and verified through live mode.
- Shared Zod admin contract and TanStack Query/typed API client used by browser and BFF.
- Light/dark/system theme, persisted with no-flash boot script.
- Build and typecheck pass; axe clean on core screens; no overflow at 360–1440.
- ESLint 10 + typescript-eslint; `npm run lint` clean; 6 Vitest live-adapter contract tests pass.
- GitHub Actions CI: lint on PRs, clean build on pushes, gated deploy placeholder on master.

**Still required for Phase 1 exit:**

- MSW fixtures and Playwright/component tests; Vitest BFF tests are in place.
- Boundary lint and the final capability component subfolders.
- Publish/review the gateway admin changes and verify staging contracts.
- Configure RevenueCat production credentials; grants are live external mutations.
- Docker/deploy skeleton and a real CI deploy step.

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
3. **BFF**
   - Hono app, config validation, health, security headers, request IDs, error envelope. **(done)**
   - Live admin API proxy with required admin secret and actor. **(done; verified)**
   - Access JWT validation interface with a local dev identity; production always uses Access. **(done)**
4. **App shell**
   - Router, auth guard, sidebar/topbar, environment badge, 403/404/error routes.
   - Login page and session menu.
5. **Contract**
   - Shared Zod schemas for all admin entities. **(done)**
   - MSW handlers + fixtures for every endpoint. **(pending)**
   - Contract tests. **(live BFF adapter tests done; component fixtures pending)**
6. **CI**
   - `ci.yml` with lint on PRs and clean build on pushes. **(done)**
   - Branch protection, Dependabot, secret scan, E2E. **(pending)**
   - Production deploy job gated by `DEPLOY_ENABLED`; placeholder until server setup. **(pending)**
7. **Deploy skeleton (no production)**
   - Dockerfile, compose, deploy script, staging workflow (can deploy a "hello" shell).

Exit criteria:

- `npm run dev` shows the shell; login/logout works with Cloudflare Access. **(Access flow done; dashboard app/policy pending)**
- Design review passes light/dark, keyboard, axe. **(core screens done)**
- Every route renders loading/empty/error states with real gateway data. **(core routes done)**
- CI workflow is present; local lint/build pass. GitHub Actions execution is pending the
  branch being pushed and a PR being opened. **(workflow added)**
- No secret in the bundle scan. **(no secrets present; scan not automated yet)**

Demo: navigate the shell, switch theme, sign in/out, open empty pages with consistent states.

## 4. Phase 2 — Registry (L)

Goal: complete capability and model operations against the live gateway.

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

- All FR-003..FR-008 acceptance criteria pass against the live gateway.
- E2E: E4–E10 green in Chromium (WebKit at least once).
- Kill switch < 15s in the E2E trace.
- No optimistic money/registry writes.
- The admin contract is signed off by the backend owner.

Demo: disable a capability, re-enable it, change a cost with a diff, reorder providers, edit a
model, inspect audit.

## 5. Phase 3 — Support (M/L)

Goal: support and money flows against the live gateway.

Deliverables:

1. User directory plus exact-UID lookup; email/tier write path follows the gateway decision.
2. User detail: latest-known balance, ledger table (all internal states), cursor pagination.
3. Usage tab: metadata table, statuses, pagination, detail sheet.
4. Grant dialog: amount/reason/requestId, confirm, pending, timeout/retry semantics.
5. Overview dashboard: real counts (capabilities, models, integrated clients), health; no
   quick-actions card and no fake charts.
6. Operations: environment, health, cache invalidate.
7. Settings: appearance/session/about.
8. Tests: money-path E2E, timeout/retry, empty/error states.

Exit criteria:

- FR-009..FR-012 pass against the live gateway.
- E2E: E11–E15 green.
- Grant duplicate/timeout tests prove requestId reuse.
- Dashboard has no invented metrics; partial failure is graceful.

Demo: UID → ledger → usage → grant → ledger refresh; cache invalidate; dashboard.

## 6. Phase 4 — Integration and hardening (L)

Goal: harden the live admin integration on staging and pass release gates.

Preconditions:

- Backend implements `/internal/admin/*` with AdminAuth + actor.
- Exact schemas/pagination/grant contract confirmed.
- Staging gateway + admin secret + network access.
- Cloudflare Access staging application + policy.

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

1. Production Access application + policy; production admin secret; network allowlist.
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
| User directory email/tier | Gateway read endpoint live; email/tier write path pending ([15-gateway-requests](15-gateway-requests.md)) | Decide privacy + RevenueCat tier mapping; implement write path |
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
Access app/policy ─┘

Phase 1 ──► Phase 2 ──► Phase 4
       └──► Phase 3 ──► Phase 4
~~~

Live integration is complete; staging hardening and deployment remain. Integration cannot start
until the admin routes and exact contract exist.

## 10. Work sizing

| Item | Size |
|---|---|
| Scaffold + CI | M |
| Design system + shell | M |
| BFF + live admin integration | M |
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
| G2 | Approve admin contract (fields, errors, pagination) | Backend + frontend |
| G3 | Approve live cutover on staging | Backend + QA |
| G4 | Approve production release | Engineering + operations |
| G5 | Approve deferred items | Product |
