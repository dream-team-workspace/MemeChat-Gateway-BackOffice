---
name: project-architecture
description: Map of the MemeChat Gateway BackOffice repo: runtime topology, directory ownership, dependency boundaries, commands, and where each concern lives. Load before adding files or planning a cross-cutting change.
---

# Project architecture

## Use this skill when

- You are new to the repository or returning after a context reset.
- You need to decide where a file belongs, or whether a change crosses a boundary.
- You are planning work that touches more than one of `src/`, `server/`, `shared/`, or docs.

Read the authoritative architecture in `docs/03-architecture.md`; this skill is the short,
operational map. Where they disagree, the doc and the code win over this skill.

## Stack at a glance

| Layer | Technology | Pinned version |
|---|---|---|
| Browser | React + React DOM | 19.3.1 |
| Build | Vite (+ `@tailwindcss/vite`) | 8.3.5 |
| Language | TypeScript (strict) | 6.0.3 |
| Styling | Tailwind CSS v4, CSS-first tokens | 4.3.3 |
| Routing | TanStack Router (code-based, lazy routes) | 1.170.45 |
| Server state | TanStack Query | 5.104.5 |
| Forms | React Hook Form + custom Zod resolver | 7.90.0 |
| Validation | Zod | 4.6.7 |
| BFF | Hono on Node (`@hono/node-server`) | 4.13.13 / 2.1.5 |
| Access JWT | jose | 6.2.13 |
| Tests | Vitest (node environment) | 5.0.5 |

No Next.js/SSR, no Redux, no Axios, no component library beyond the repo-owned primitives.
See `docs/04-tech-stack.md` for rationale and the rejected alternatives.

## Runtime topology

```text
Browser (React SPA, static assets)
  -> same-origin /api/* and /cdn-cgi/access/* only
Hono BFF on Node (:8787 locally)
  - Cloudflare Access JWT verification (production)
  - ADMIN_API_SECRET, X-Admin-Actor, X-Request-Id
  - explicit route allowlist, Zod validation, camelCase mapping
  - serves dist/ in production
Gateway (:8080 local, https://gateway.dream-team.works prod)
  /internal/admin/*  (Bearer admin secret)
  /healthz, /readyz
Postgres + RevenueCat (gateway-owned)
```

The browser never talks to the gateway and never sees the admin secret. The BFF is the only
component that holds the secret and sets the actor identity.

## Repository map

| Path | Owns | May import |
|---|---|---|
| `src/app/` | bootstrap, `router.tsx`, layouts, route error/404 | features' public `index.ts`, platform, components |
| `src/features/<domain>/` | one admin resource or operator journey (vertical slice) | own internals, `components/*`, `platform/*`, `shared/*`, `lib/*` |
| `src/platform/` | auth store, typed API client, Query client | `shared/*`, `lib/*` |
| `src/components/ui/` | repo-owned primitives (button, dialog, table, tabs…) | `lib/utils` only |
| `src/components/common/` | shared compositions: `PageHeader`, `AsyncState`, `ConfirmDialog`, `FormField` | ui, lib |
| `src/components/layout/` | sidebar, topbar | common, platform/auth |
| `src/lib/` | formatters, `cn`, theme, activity-date, feature flags | nothing domain-specific |
| `shared/admin-api/` | runtime-agnostic Zod contract, one file per resource | only `zod` |
| `server/src/` | Hono assembly, routes, gateway client/mappers, Access auth, errors | `shared/*`, Node |
| `docs/` | requirements, contract analysis, architecture, ADRs, plans | — |
| `deploy/` | systemd/SSH release runbook and examples | — |
| `public/llm/` | published gateway LLM docs served by the console | — |

Current implementation differs from the target tree in `docs/03-architecture.md`:

- All routes are declared in `src/app/router.tsx`; there is no `src/app/routes/` directory yet.
- `src/features/capabilities/` is flat-ish; `registry/routing/audit` subfolders were not created.
- Primitives in `src/components/ui/` are hand-authored on native HTML + React hooks. There is
  no Radix/Base UI dependency, even though `components.json` records the shadcn `base-nova`
  style. Do not assume a headless library is installed.
- TanStack Table, sonner, Zustand, pino, MSW, and Playwright are named in planning docs but are
  **not installed**. Do not import them without adding the dependency and updating docs.

## Domains

| Domain | Purpose |
|---|---|
| `features/overview` | composition-only landing page; may consume public summary hooks |
| `features/abilities` | five-ability catalog and detail; ability → provider → model availability |
| `features/capabilities` | legacy cost/limits profiles, kill switch, capability audit |
| `features/app-clients` | app-client identity, Access routes, admin audit, user activity |
| `features/providers` | provider CRUD, write-only API keys, model catalog, health |
| `features/models` | legacy app-picker model catalog |
| `features/users` | signed-in directory, ledger, usage, activity, credit grant, RevenueCat status |
| `features/operations` | gateway health, cache invalidation, environment details |
| `features/settings` | appearance, session identity, sign-out |
| `platform/auth` | Access identity, development identity, sign-in/out |
| `platform/api` | typed `apiRequest`, `ApiError`, feature-missing detection |
| `platform/query` | shared `QueryClient` defaults |

Rules: a domain exports only pages (and deliberate public hooks) from `index.ts`; no domain
imports another domain's internals; overview is the only composition domain; a new provider,
model, or ability kind is data, not a new domain. Boundary rules are documented in
`docs/03-architecture.md` §5 and `docs/08-engineering-standards.md`; `eslint-plugin-boundaries`
is not installed yet, so reviewers enforce them.

## Data flow

Read: route `beforeLoad` ensures an Access session → domain page calls a query hook →
`apiRequest` → BFF validates the Access actor and fetches the gateway → BFF camelizes,
normalizes, and Zod-parses → browser Zod-parses again → Query caches → page renders
loading/empty/error/data.

Mutation: form validates with Zod → confirmation where destructive → mutation → BFF validates
body, converts to snake_case, injects `X-Admin-Actor` → gateway → success response replaces
cache and invalidates precise keys. No optimistic writes on registry or money paths.

## Commands and environment

```bash
npm install
npm run dev        # Vite :5173 + BFF :8787 (needs a gateway at :8080)
npm run dev:web
npm run dev:api
npm run lint       # ESLint; CI PR gate
npm run typecheck  # web + BFF
npm test           # Vitest (BFF contract + unit)
npm run build      # typecheck + Vite build + BFF build
npm start          # serve dist/ + API from the built BFF
```

Local live mode requires `ADMIN_API_SECRET` and a gateway:

```bash
ADMIN_API_BASE_URL=http://127.0.0.1:8080 ADMIN_API_SECRET=... npm run dev
```

Local auth uses `VITE_DEV_AUTH_EMAIL` / `DEV_ACTOR_EMAIL`. Production requires
`CF_ACCESS_AUD` and validates `Cf-Access-Jwt-Assertion` with jose. See
`docs/14-cloudflare-access.md` and `deploy/README.md`.

## Non-negotiables

1. Browser data goes through `platform/api` + TanStack Query; no `fetch` in components/pages.
2. `server/` is the only admin-secret holder and the only caller of `/internal/admin/*`.
3. `shared/admin-api` stays runtime-agnostic (no React, DOM, or Node imports).
4. The runtime is live-only: no mock store, no fixture fallback, no invented endpoints/data.
5. New API surface is explicit (method + path + Zod schema). No catch-all proxy.
6. `master` deploys production; `development` is the integration branch. Never push to
   `master`; feature PRs target `development`.
7. Behavior changes update the matching requirement doc in the same PR.

## References

- `docs/03-architecture.md` — authoritative domain/BFF design.
- `docs/04-tech-stack.md` — versions, rationale, rejected alternatives.
- `docs/08-engineering-standards.md` — folder/import/style rules.
- [references/topology.md](references/topology.md) — request pipeline, env matrix, deploy topology.
- `.agents/skills/frontend-feature-workflow/SKILL.md` — how to add a screen.
- `.agents/skills/bff-and-gateway/SKILL.md` — how to add or change a BFF route.
