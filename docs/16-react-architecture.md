# 16 — React architecture and composition

| Field | Value |
|---|---|
| Status | Living guidance; adopted 2026-11-07 |
| Scope | Browser application under `src/` |
| Sources | [React Patterns](https://mcpmarket.com/tools/skills/react-architecture-patterns-2), [Vercel composition patterns](https://agenticskills.io/skills/composition-patterns), [React architecture guide](https://medium.com/@ashwathvia/react-architecture-a-practical-guide-for-senior-frontend-developers-b5d83bd0ac07) |
| Related | [03-architecture.md](03-architecture.md), [08-engineering-standards.md](08-engineering-standards.md) |

## 1. Rules this repository follows

1. **Feature slices own their behavior.** `src/features/<domain>` contains pages, components,
   hooks, API, queries, and mutations. A feature exports a small public surface from
   `index.ts`; other features do not import its internals.
2. **Pages are containers.** A page reads route params, composes feature components, and
   chooses loading/empty/error states. It does not own mutation payloads or cache keys.
3. **Presentational components receive data and callbacks.** `ProviderCard`, `RouteRow`,
   and `ProviderUsageList` do not fetch. Formatting and status copy live in
   `features/*/lib`.
4. **Business logic lives outside JSX.** Route draft state, save/422/404 handling, and
   provider credential derivation live in hooks or `lib`. Provider credential state is
   derived once in the BFF and carried on the wire as `credentialState`.
5. **Server state is TanStack Query.** No `useEffect` fetch loops, no global store for
   server data, no duplicated derived state. Mutations are pessimistic and invalidate
   explicit query keys.
6. **Local UI state is `useState`.** Dialog visibility, selected tab, copy feedback, and
   draft form fields stay local. Shared state is lifted only when siblings need it.
7. **Composition over boolean modes.** Prefer explicit variants and compound components to
   accumulating `isX`/`showY` props. `Tabs` is a compound primitive; `ConfirmDialog`
   takes an explicit `variant` instead of a destructive boolean.
8. **React 19 APIs are the default.** `ref` is a normal prop on UI primitives; context is
   read with `use()`; do not add `forwardRef` or `useContext` to new code.
9. **Error boundaries are structural.** The root and app routes render `RouteError`;
   query failures use `ErrorState` with retry. A feature bug must not blank the shell.
10. **Test behavior, not internals.** Pure status/error mapping and route draft logic are
    unit-tested; BFF contract tests cover casing, error codes, and key redaction.

## 2. Where each pattern lives

| Pattern | Location | Why |
|---|---|---|
| Feature slice + public index | `src/features/providers`, `abilities`, `app-clients` | discoverable ownership |
| Container page | `pages/*-page.tsx` | route/data composition |
| Presentational card/row | `components/provider-card.tsx`, `route-row.tsx` | reusable, no fetching |
| Domain hook | `hooks/use-route-editor.ts` | draft + mutation + error mapping |
| Pure domain logic | `lib/provider-status.ts`, `lib/route-errors.ts` | testable, no React |
| Compound component | `components/ui/tabs.tsx` | shared context, keyboard support |
| Confirmation shell | `components/common/confirm-dialog.tsx` | one destructive-action pattern |
| Route-level code splitting | `app/router.tsx` (`lazyRouteComponent`) | keep the shell small; one chunk per feature |
| Route error boundary | `app/route-error.tsx` | isolate render failures |
| Derived contract value | `shared/admin-api/common.ts` (`deriveCredentialState`) | server and browser agree |

## 3. What not to do

- Do not add a boolean prop for every visual variant; add a component variant or compose
  children.
- Do not put fetch, mutation, or cache-key logic in a presentational component.
- Do not use `useEffect` to copy server data into local state; derive it during render or
  select it in the query.
- Do not use an array index as a key for provider/model/route rows; use the stable ID.
- Do not optimize with `memo`/`useMemo` before profiling; do keep expensive route-option
  maps memoized.
- Do not make a tab an unaddressable local flag when it represents a domain section; keep
  the section state explicit and accessible. (URL-backed tabs are the next step when the
  router search schema is extended.)

## 4. Checklist for a new screen

- [ ] Loading, empty, and error states are present.
- [ ] The page uses a domain query and a domain mutation; no raw `fetch`.
- [ ] Tables/rows have stable keys and accessible labels.
- [ ] Destructive actions use `ConfirmDialog`; forms keep state on failure.
- [ ] Error codes map to the relevant field/row, not a toast alone.
- [ ] A render failure is caught by `RouteError`.
- [ ] The behavior has a pure unit test or a BFF contract test.
