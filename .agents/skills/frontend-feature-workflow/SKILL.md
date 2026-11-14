---
name: frontend-feature-workflow
description: Recipe for changing the React 19 console: feature slices, TanStack Router/Query modules, React Hook Form + Zod, loading/empty/error states, and semantic-token styling. Load for any src/ change.
---

# Frontend feature workflow

## Use this skill when

- Adding or changing a page, route, dialog, table, form, query, or mutation under `src/`.
- Deciding where a component/hook/helper belongs.
- Wiring a new BFF endpoint into the console.

Also read `.agents/skills/design-system/SKILL.md` for visual rules and
`.agents/skills/shared-contract/SKILL.md` when a payload changes.

## Feature anatomy

A domain is a vertical slice under `src/features/<domain>/`:

```text
features/providers/
├─ api/providers.api.ts        # apiRequest calls + Zod schemas + query-key factory
├─ queries/providers.queries.ts# queryOptions factories
├─ mutations/providers.mutations.ts # useMutation + precise invalidation
├─ components/                 # presentational dialogs/cards/rows (no fetching)
├─ hooks/                      # domain state machines (draft/save/error mapping)
├─ lib/                        # pure functions + colocated tests
├─ pages/                      # container pages: route params + query + states
└─ index.ts                    # public entry: pages only
```

- Only `index.ts` is public to the app layer. Other domains may not import this domain's
  internals. `overview` is the only composition domain.
- `api/` is the only place that calls `apiRequest`. Components never call `fetch`.
- `queries/` and `mutations/` own query keys and invalidation. Presentational components do not
  know keys.
- Put business logic in `hooks/` or `lib/`, not JSX. Pure logic gets a `*.test.ts` sibling.
- Do not add a domain per endpoint or per capability kind.

## Adding a screen (golden path)

1. Confirm the behavior in `docs/requirements/FR-*.md` or `docs/05-information-architecture.md`.
2. If the payload is new or changed, add/extend the shared schema first
   (`shared/admin-api/<resource>.ts`) and its test.
3. Add or extend the BFF route (`server/src/routes/<domain>.ts`) — see the BFF skill.
4. Add `features/<domain>/api/*.ts` with `apiRequest(path, schema, init)` and a `keys` factory.
5. Add `queries/*.queries.ts` with `queryOptions`; add `mutations/*.mutations.ts` when writing.
6. Declare the route in `src/app/router.tsx` with `lazyRouteComponent` and a named export.
7. Build the page in `pages/`: read route params, call `useQuery`, render loading/empty/error/
   data, compose domain components.
8. Add the nav entry in `src/components/layout/app-sidebar.tsx` only for a new top-level page.
9. Add tests (schema/unit; BFF contract if a server route changed) and update docs.

## Routing

All routes live in `src/app/router.tsx` (code-based routing; there is no `src/app/routes/`
directory yet).

```tsx
const ProvidersPage = lazyRouteComponent(
  () => import("@/features/providers"),
  "ProvidersPage",
);

const providersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/providers",
  component: ProvidersPage,
});
```

- `rootRoute` owns `notFoundComponent` + `errorComponent`; `appRoute` (`id: "app"`) guards
  every product route with `ensureSession()` and redirects to `/login`.
- Real URLs for tabs/sections: nested routes (`/users/$uid/ledger`, `/capabilities/$id/audit`)
  rather than local tab state when the section is deep-linkable.
- Redirects use `throw redirect({ to, params })` in `beforeLoad`.
- Route-level code splitting is mandatory: `lazyRouteComponent(() => import("@/features/…"),
  "ExportName")`; the shell stays in the initial bundle.
- There is no search-param validation in the current router. If you add filters/cursors to the
  URL, define a Zod schema and pass it as `validateSearch` (Zod 4 schemas work directly; the
  `@tanstack/zod-adapter` is not needed and not installed). Keep fallbacks via `.catch()` so a
  bad URL does not crash the route.
- Access identity is read with `useSession()` / `useAuth()` from `platform/auth`; pages do not
  fetch `/cdn-cgi/access` themselves.

## Server state (TanStack Query)

- Use the shared `queryClient` (`platform/query/client.ts`): `staleTime: 15_000`, `retry: 1`,
  no refetch on focus, mutations `retry: 0`. Override per query only with a reason.
- Define keys in the domain api module:

  ```ts
  export const providerKeys = {
    all: ["providers"] as const,
    detail: (id: string) => ["providers", id] as const,
    models: (id: string) => ["providers", id, "models"] as const,
  };
  ```

- Query options are factories returning `queryOptions({...})`; `enabled` is used for lazy tabs.
- Invalidate the smallest superset that is truly affected. Examples:
  - provider write → `providers` + detail + `abilities` + `["app-clients"]` (route rows show
    provider/model names);
  - app-client write → `["app-clients"]` + its detail prefix (`audit`/`activity` are nested);
  - credit grant → ledger prefix for that uid.
- No global cache clear. No optimistic registry/money writes. Use `setQueryData` only with the
  authoritative server response (e.g. saved routes).
- Cursor pagination: each cursor is its own query key; use a `Newer/Older` control, not page
  numbers.

## Mutations and errors

- Mutations are pessimistic. Disable the submit/confirm control while pending; keep form state
  and the dialog open on failure.
- Map `ApiError` by `status`/`code`/`details`; show the request ID for unexpected failures.
  `isGatewayFeatureMissing(error)` distinguishes an unshipped gateway route (404/501/
  `NOT_IMPLEMENTED`) from a real error and should render `PendingGatewayState`.
- Domain error copy lives in `lib/<domain>-errors.ts` (see providers) and is unit-tested.
- Destructive/high-impact actions use `ConfirmDialog` with impact copy and an explicit verb
  label; never a bare "OK".

## Forms

The repo currently has two form styles; keep a form internally consistent and prefer the one
its sibling dialogs use.

1. **Controlled `useState` + schema.safeParse** — the common pattern in dialogs
   (`provider-form-dialog`, `grant-credits-dialog`, `model-form-dialog`). Parse on submit,
   set a form-level error, render `FormField` with `error`.
2. **React Hook Form + custom resolver** — used by
   `features/capabilities/components/capability-configuration-form.tsx` with
   `src/lib/zod-resolver.ts`. `@hookform/resolvers` is not installed; do not import it.

Rules for both:

- Reuse the shared contract schema (or a form schema that mirrors it) — do not duplicate rules.
- Visible label + `FormField`; error text is `role="alert"`; do not rely on color alone.
- Parse numbers/JSON at the edge (`JSON.parse` for config fields before `safeParse`).
- Keep unknown nested JSON keys when editing; do not silently drop them.
- Do not auto-save money or routing fields.

## UI states and composition

Use `src/components/common/async-state.tsx`:

| Component | Use |
|---|---|
| `LoadingRows` | table/list loading skeleton |
| `EmptyState` | valid request, no rows; one action max |
| `ErrorState` | query failure with optional retry |
| `PendingGatewayState` | gateway route not shipped yet (404/501) |

Every page needs loading, empty, and error states; where relevant also permission/offline.
Partial failures keep the loaded panels usable. Query errors render `ErrorState`; render bugs
are caught by the route `errorComponent` (`RouteError`). No blank screens, no alerts.

## Styling and accessibility

- Tailwind v4 utilities + semantic tokens only (`bg-background`, `text-muted-foreground`,
  `border-border`, `ring-ring`). No raw hex/oklch/arbitrary shadows in domain code.
- `cn()` for conditionals; CVA for variants (see `components/ui/button.tsx`).
- Repo primitives are hand-authored and must stay keyboard-operable. `Dialog` portals to
  `document.body` (the page uses animated transforms, which would otherwise clip fixed
  positioning); focus trap, Escape, restore-focus, and scroll lock are already implemented —
  preserve them when editing.
- Use `Tabs` compound primitives for local-state tabs; use nested routes when the tab is a
  deep-linkable section.
- Icons from `lucide-react`; decorative icons `aria-hidden`; icon-only buttons need
  `aria-label`. Minimum target 24×24, preferred 36×36.
- Tables: real `table`/`th` with scope, stable row keys (IDs, never indexes), tabular numerals
  for money counts, cursor pagination.
- Respect `prefers-reduced-motion`; `animate-in`/`animate-fade` are defined in `globals.css`.

## React 19 idioms

- `ref` is a normal prop; do not add `forwardRef`.
- Read context with `use(Context)` (see `Tabs`, `ThemeProvider`); do not add `useContext`.
- Do not copy server data into state with `useEffect`; derive it or select it in the query.
- `useEffect` is for external systems only. If lint complains about an effect dependency that
  is conceptually an event, `useEffectEvent` (React 19.2+) is available; use it deliberately.
- No `memo`/`useMemo` before profiling; do keep route option maps stable.
- StrictMode is on; effects must be idempotent and cleanup correctly.

## Validation checklist

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] New/changed page shows loading, empty, and error states.
- [ ] No raw `fetch`, no raw colors, no `any`.
- [ ] Keyboard path works; dialog focus/escape/restore verified.
- [ ] Light/dark checked for new visual states.
- [ ] Requirement/docs updated when behavior changed.

## References

- `docs/16-react-architecture.md` — composition rules and React 19 defaults.
- `docs/08-engineering-standards.md` — naming, imports, forms, error handling, anti-patterns.
- [references/patterns.md](references/patterns.md) — copyable code skeletons from this repo.
