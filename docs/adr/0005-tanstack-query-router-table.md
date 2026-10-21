# ADR-0005 — TanStack Router, Query, Table + RHF/Zod

- **Status:** Proposed
- **Date:** 2026-10-21
- **Deciders:** Frontend lead

## Context

The console needs typed routes/search params, server-state caching with precise invalidation,
data tables, and validated forms. The backend contract is still moving, so runtime validation
at the boundary matters.

## Decision

- **TanStack Router** for type-safe routes, validated search params, route guards, and lazy
  route modules.
- **TanStack Query** for all server state; no global store for API data.
- **TanStack Table** for headless tables with sorting/filtering/pagination.
- **React Hook Form + Zod** for forms and shared contract schemas.
- **Zustand** only for cross-cutting UI preferences (theme/sidebar).

## Consequences

Positive:

- Search params and route context are typed; filter state lives in the URL.
- Query keys and invalidation are explicit; no duplicate server state.
- Tables and forms are headless and fit the shadcn primitives.
- Zod schemas are shared with the BFF, catching contract drift.

Negative:

- TanStack Router has a learning curve and a generated route tree.
- Query requires discipline around keys/staleness; a bad key causes stale UI.
- No single "app store" to inspect; debugging spans Query devtools + router devtools.
- RHF/Zod adds schemas that must stay in sync with the API doc.

## Alternatives considered

- **React Router**: mature, but less type-safe search-param ergonomics; TanStack integrates
  cleanly with Query.
- **Redux Toolkit + RTK Query**: capable, but heavier ceremony and a global store we do not need.
- **SWR**: good, but Query's mutations/invalidation/devtools fit the admin workflow better.
- **Formik**: slower and less shadcn-native than RHF.
- **Yup**: Zod is already needed for API contracts; one schema library.

## Follow-up

- Add router/query devtools in development only.
- Document query-key factories and invalidation in docs/06.
- Add route-generation to CI (typecheck catches stale trees).
