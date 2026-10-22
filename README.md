# MemeChat Gateway BackOffice

Internal operator console for the **MemeChat AI Gateway**. It gives the team a safe,
auditable UI over the gateway's backend-management surface: capability registry, provider
routing, kill switches, model catalog, user ledger/usage, credit grants, and system operations.

> **Status: Phase 1 — operator console with a mock BFF.** The domain-oriented React UI,
> Cloudflare Access login, shared Zod contract, and Hono BFF are implemented. The BFF defaults
> to a deterministic mock admin store; live mode is present but the gateway admin API is still
> contract-planned. Test suite and CI lint/build exist; production deployment is not set up.

- **Remote:** [dream-team-workspace/MemeChat-Gateway-BackOffice](https://github.com/dream-team-workspace/MemeChat-Gateway-BackOffice)
- **Gateway backend:** [MemeChat-Gateway](https://github.com/dream-team-workspace/MemeChat-Gateway) (source of truth for the admin API)
- **Local gateway checkout:** `/home/dani/GolandProjects/MemeChat-Gateway`
- **Working branch:** `feature/implementation`

---

## What is implemented

- **Cloudflare Access login** — identity is read from `/cdn-cgi/access/get-identity`;
  sign-out uses `/cdn-cgi/access/logout`. Local dev uses `VITE_DEV_AUTH_EMAIL`.
- **Domain-oriented UI** — overview, capabilities (list, configuration, routing, audit,
  kill switch), models (create/edit), users (lookup, ledger, usage, grant), operations
  (health, cache invalidation), and settings.
- **BFF** — Hono on Node, Cloudflare Access JWT validation in production, deterministic mock
  admin store in development, live gateway proxy skeleton, request IDs, error envelope,
  origin checks, security headers, static serving, and graceful shutdown.
- **Shared contract** — Zod schemas and inferred types for capabilities, models, users,
  ledger, usage, audit, grants, health, and meta, used by both the browser and the BFF.
- **Data layer** — typed fetch client, TanStack Query cache, query keys, mutations, and
  precise invalidation.
- **Forms** — React Hook Form + Zod validation for capability edits; dialogs for kill switch,
  models, and credit grants.
- **Tests** — Vitest contract tests for the BFF mock API, including idempotent grants.
- **Design system** — repo-owned shadcn-style primitives, semantic tokens, Light/Dark/System,
  responsive shell, mobile drawer focus trap, axe-clean core screens.
- **CI** — lint on PRs, clean build on pushes, gated production deploy placeholder.

### Routes

| Route | Page |
|---|---|
| `/login` | Cloudflare Access fallback |
| `/` | Overview |
| `/capabilities` | Capability registry |
| `/capabilities/:capabilityId` | Capability overview/configuration |
| `/capabilities/:capabilityId/routing` | Provider routing |
| `/capabilities/:capabilityId/audit` | Capability audit |
| `/models` | Model catalog |
| `/users` | UID lookup |
| `/users/:uid/ledger` | Credit ledger |
| `/users/:uid/usage` | Usage events |
| `/operations` | Health and registry operations |
| `/settings` | Appearance and account |

Protected routes use the Access identity guard and redirect to `/login` when unauthenticated.
The BFF derives the future `X-Admin-Actor` from the verified Access JWT; it never trusts a
browser-supplied actor.

---

## Local development

~~~bash
npm install
npm run dev          # Vite (5173) + BFF (8787), mock admin store by default
npm run lint         # ESLint; CI PR check
npm run test         # Vitest BFF contract tests
npm run typecheck    # web + BFF
npm run build        # typecheck + Vite build + server build
npm start            # serve dist + /api from the built BFF
~~~

`npm run dev` starts both processes via `concurrently`. Vite proxies `/api` to the BFF.
`npm run preview` serves only the static Vite build; use `npm start` when you need the API.

### BFF modes

| Mode | When | Behavior |
|---|---|---|
| `mock` | Development default | Deterministic in-memory capabilities, models, ledger, usage, audit, grants |
| `live` | `ADMIN_API_MODE=live` | Proxies `/internal/admin/*`, injects the admin secret, maps snake_case, validates the contract |

Production startup fails if `ADMIN_API_MODE` is not `live`, or if
`ADMIN_API_SECRET`/`CF_ACCESS_AUD` are missing. The mock store is never enabled in
production.

See [.env.example](.env.example) for the full local matrix. Do not commit `.env`.

---

## Domain structure

~~~text
src/
  app/                 router, layouts, guards
  features/
    overview/          composition only
    capabilities/      api, queries, mutations, components, pages
    models/            api, queries, mutations, components, pages
    users/             api, queries, mutations, components, pages
    operations/        health, cache, future jobs
    settings/          local preferences
  platform/            auth, typed API client, Query client, config
  components/          ui primitives, common compositions, layout
  lib/                 formatting, cn, zod resolver
shared/admin-api/      canonical contract for browser + BFF
server/                Hono BFF, mock store, gateway proxy, Access auth
~~~

Capability kinds are data, not domains. Routing/audit are subfeatures of capabilities;
ledger/usage/grant are subfeatures of users. See [docs/03-architecture.md](docs/03-architecture.md).

---

## What remains

- Connect **live** mode to the real gateway admin API once it is implemented and confirm the
  exact admin JSON/pagination/grant contracts.
- Add Playwright E2E, MSW fixtures, and cover the remaining UI mutation paths.
- Add boundary lint and the remaining cleanup/golden tests.
- Implement production deployment (server, Docker/static serving, `DEPLOY_ENABLED`).
- Wire the production Access application/tunnel as described in
  [docs/14-cloudflare-access.md](docs/14-cloudflare-access.md).

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Trigger | What runs |
|---|---|
| PR → `development` or `master` | `Lint` (`npm run lint`) |
| Push → `development` | `Build` (clean `dist` + web/server build, no artifacts) |
| Push → `master` | `Build`, then gated `Deploy production` |

The deploy job is skipped until `DEPLOY_ENABLED=true` and the placeholder is replaced with
real deploy steps. Tests are available via `npm test` but are not yet a CI gate.

---

## Documentation

Start with the [documentation index](docs/README.md).

| Document | What it answers |
|---|---|
| [DESIGN.md](DESIGN.md) | Visual system and shadcn principles |
| [docs/02-backend-contract-analysis.md](docs/02-backend-contract-analysis.md) | Gateway/admin contract and gaps |
| [docs/03-architecture.md](docs/03-architecture.md) | Domain architecture, BFF, boundaries |
| [docs/04-tech-stack.md](docs/04-tech-stack.md) | Stack and rationale |
| [docs/05-information-architecture.md](docs/05-information-architecture.md) | Screens and nested routes |
| [docs/06-api-integration.md](docs/06-api-integration.md) | Canonical payloads/errors/pagination |
| [docs/07-security-model.md](docs/07-security-model.md) | Threat model and Access/JWT model |
| [docs/08-engineering-standards.md](docs/08-engineering-standards.md) | Folder and code rules |
| [docs/10-ci-cd-and-environments.md](docs/10-ci-cd-and-environments.md) | CI, branches, deployment |
| [docs/11-roadmap.md](docs/11-roadmap.md) | Phases and remaining work |
| [docs/14-cloudflare-access.md](docs/14-cloudflare-access.md) | Access/tunnel setup |
| [docs/requirements/README.md](docs/requirements/README.md) | Requirement index |

---

## Security boundary

The browser never receives `ADMIN_API_SECRET`, `INTERNAL_API_SECRET`, Access validation
secrets, or raw session tokens, and it never calls the gateway's `/internal/admin/*` routes
directly. The BFF is the only admin-secret holder and the only place that sets
`X-Admin-Actor`.
