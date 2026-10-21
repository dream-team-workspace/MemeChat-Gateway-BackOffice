# 08 — Engineering standards

| Field | Value |
|---|---|
| Status | Proposed |
| Applies to | `src/`, `server/`, `shared/`, tests, docs |
| Enforced by | TypeScript, ESLint, Prettier, Vitest, CI |

## 1. Language and types

- TypeScript strict mode, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` where practical.
- No `any`. Use `unknown` + a schema/guard at boundaries.
- Prefer `type` for data shapes and `interface` for extension points; be consistent.
- Use type-only imports (`import type`).
- No enums; use string unions or `as const` objects.
- Dates cross boundaries as ISO strings; convert at the edge. No Date objects in query keys.
- Money/credit amounts are integers. Never use floating point for credits.
- IDs are strings; ledger IDs may be numbers but are treated as opaque strings in the UI.

## 2. File and symbol naming

| Kind | Convention | Example |
|---|---|---|
| React component file | kebab-case | `capability-table.tsx` |
| Component symbol | PascalCase | `CapabilityTable` |
| Hook | `use-*.ts` / `useX` | `use-capability-filters.ts` |
| API module | `<feature>.api.ts` | `capabilities.api.ts` |
| Query/mutation module | `<feature>.queries.ts` | `capabilities.queries.ts` |
| Zod schema | `<feature>.schemas.ts` or `schemas.ts` | `capability-form-schema.ts` |
| Utility | kebab-case | `format-credits.ts` |
| Test | `*.test.ts(x)` next to unit | `capability-table.test.tsx` |
| E2E | `*.spec.ts` under `tests/e2e` | `kill-switch.spec.ts` |
| Route file | TanStack file route | `capabilities.$capabilityId.tsx` |

No `index.ts` barrels inside feature internals except the feature's public entry point. Barrel
files can defeat tree-shaking and hide dependency cycles.

## 3. Folder rules

- `src/app` — bootstrapping, providers, router, shell; no business logic.
- `src/routes` — thin route adapters; no fetch, no forms, no mapping.
- `src/features/<name>` — vertical slice; private internals; public `index.ts`.
- `src/components/ui` — shadcn primitives; local patches documented.
- `src/components/common` — cross-feature compositions.
- `src/components/layout` — shell-level layout.
- `src/lib` — runtime-agnostic browser utilities.
- `shared` — Zod/types/endpoints for both runtimes; no React/DOM/Node.
- `server` — BFF; may import `shared`; must not import `src`.

Cross-feature imports are forbidden. If two features need the same thing, lift it to
`components/common` or `shared`.

## 4. Imports and aliases

- @`/*` → `src/*`.
- `#shared/*` or `shared/*` → `shared/*` (pick one and enforce it; this document uses
  `shared/*` in prose).
- `#server/*` → `server/src/*` for server-internal imports.
- Import order: Node/built-ins, external, shared, @`/`, relative; blank line between groups.
- No deep relative climbs (`../../../`); use aliases.
- No circular imports; ESLint `import/no-cycle` (or equivalent) is a CI failure.

## 5. Feature module contract

Every feature exports only what routes/app need:

~~~ts
// features/capabilities/index.ts
export { CapabilitiesPage } from "./pages/capabilities-page";
export { CapabilityDetailPage } from "./pages/capability-detail-page";
export { CapabilityAuditPage } from "./pages/capability-audit-page";
~~~

- Do not export internal components "just in case".
- Do not export query keys; keep them in the API module.
- Tests may import internals directly within the feature.

## 6. Server state

- TanStack Query owns all server data.
- Query keys are typed factories in the feature API module.
- Query functions return parsed, typed data; never raw `Response`.
- Components do not call `fetch`.
- Mutations invalidate precise keys; no global clear.
- No optimistic updates for registry or money mutations.
- Reads may retry; mutations may not (except explicit grant retry with the same requestId).
- Keep `staleTime` and refetch behavior in the query options, not in components.
- Use `placeholderData` only when it cannot be mistaken for fresh data (e.g., pagination).

## 7. URL state

- Filters, search, tabs, and cursors live in search params.
- Validate with a Zod schema in the route; invalid values fall back to defaults.
- Use `replace` for typing/filter changes to avoid history spam; use `push` for navigation.
- Never store secrets, UIDs, or ledger data in the URL beyond the route's `:uid`.

## 8. Forms

- React Hook Form + Zod resolver; one schema per form.
- The schema mirrors the API contract; server errors map to fields via `details.field`.
- Labels are visible and associated; help text uses `aria-describedby`.
- Disable submit only for invalid/pending, never silently.
- Dirty forms guard navigation and browser unload.
- Destructive/high-impact forms use a confirmation step with a diff.
- Never auto-save money/routing fields.
- Normalize numbers at the edge: input strings → integers; reject NaN/Infinity.
- Preserve unknown nested JSON keys when editing.

## 9. Styling

- Tailwind utilities + semantic tokens only.
- `cn()` for conditional classes; CVA for variants.
- No raw hex/oklch in feature code; no arbitrary shadows.
- Follow [DESIGN.md](../DESIGN.md); do not fork shared components per page.
- Responsive classes are mobile-first; test 360/768/1024/1440.
- No inline styles except dynamic values that cannot be expressed as classes (and even then,
  prefer CSS variables).
- Icons from lucide-react; decorative icons `aria-hidden`.
- Every new visual state needs light/dark screenshots in the PR.

## 10. Accessibility

- Semantic HTML first; `button` for actions, `a` for navigation.
- Every input has a label; errors are associated; required fields are marked in text.
- Focus is visible and managed in dialogs/sheets.
- No keyboard traps; Escape closes unless a request is pending.
- Status is not color-only.
- Tables have `th` with scope, captions where useful, and accessible row actions.
- Toasts use live regions; errors use `role="alert"`.
- Respect `prefers-reduced-motion`.
- Run axe on new/changed pages; fix serious/critical issues.

## 11. Error handling

- API errors are typed `ApiError` with code/status/requestId/details.
- Never swallow an error; either render it, map it to a field, or report it.
- Error boundaries at root and route level.
- No `alert()`. Use inline errors, dialogs, or toasts.
- Do not show stack traces or upstream bodies in production.
- Include the request ID in every user-visible error.
- Log once at the boundary; do not double-log in component and API layers.

## 12. Logging and observability

- Browser: no console logging of payloads or tokens in production. A small logger wrapper
  forwards redacted errors to the error reporter when configured.
- BFF: structured JSON logs with request ID, route template, status, duration, actor hash.
  Never bodies, cookies, secrets, or raw UIDs.
- Metrics (when added): request count/latency by route template, upstream status, schema
  failures, login failures. No UID labels.
- Health endpoints must not leak config.

## 13. Git and pull requests

- Branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`, `ci:`).
- PRs target `development` (features/fixes) or `master` (release/hotfix only).
- Squash merge; the PR title becomes the commit subject.
- Keep PRs reviewable (< ~400 changed lines where possible); split refactors from behavior.
- Include: what/why, screenshots (UI), test evidence, risk, rollback.
- No secrets, generated build output, or IDE files.
- Update docs/requirements in the same PR as behavior changes.

## 14. Definition of Done

A change is done when:

- [ ] Acceptance criteria in the requirement file pass.
- [ ] Unit/component tests cover new logic and error paths.
- [ ] BFF contract test covers new/changed endpoints.
- [ ] E2E covers the user-visible critical path (or a documented reason it cannot).
- [ ] Accessibility: axe clean for changed pages; keyboard path verified.
- [ ] Light/dark screenshots attached (UI changes).
- [ ] Loading/empty/error/offline states handled.
- [ ] No secrets/log leaks; request ID surfaced.
- [ ] Docs updated (requirement, API, architecture/design as needed).
- [ ] CI green: lint, typecheck, test, build, e2e.
- [ ] Rollback considered (feature flag/env/config).

## 15. Performance guidelines

- Route-level code splitting; no giant shared barrel.
- Initial JS ≤ 250 KB gzipped; route chunk ≤ 100 KB.
- Tables: paginate server-side; virtualize only if a page exceeds ~200 rows.
- Avoid re-rendering entire tables on filter keystrokes; debounce search 200–300ms.
- Images: none in v1 beyond an avatar; use width/height to prevent CLS.
- Fonts: self-hosted, subset, preload only used weights.
- Do not add a chart/editor library without a measured need and a bundle budget.
- Measure with Lighthouse CI on Overview and Capabilities before release.

## 16. Documentation

- Requirement file per behavior.
- API change → `docs/06-api-integration.md` + shared schema.
- Architecture change → ADR + `docs/03-architecture.md`.
- Visual/token change → `DESIGN.md` + screenshots + contrast check.
- Deployment/secret change → `docs/10-ci-cd-and-environments.md` + runbook.
- Keep docs ASCII-friendly; no screenshots as the only source of truth.

## 17. Anti-patterns (banned)

- `fetch` in a component or route file.
- `any` or unchecked JSON casts at a boundary.
- Raw colors, arbitrary shadows, or a second icon set.
- Generic admin proxy or user-supplied upstream URL.
- Optimistic credit/registry mutation.
- Retrying a non-idempotent mutation automatically.
- Storing tokens/UIDs in localStorage.
- Logging request bodies, cookies, or secrets.
- Disabling lint rules inline without a comment and a follow-up.
- Adding a dependency for a one-line utility.
- Creating a shared abstraction before the third use case.
