# MemeChat Gateway BackOffice

Internal operator console for the **MemeChat AI Gateway**. It gives the team a safe,
auditable UI over the gateway's backend-management API: capability registry, provider
routing, kill switches, model catalog, user ledger/usage, and credit grants.

> **Status: Phase 1 — UI template (mock auth).** The console runs locally with a responsive
> shell, login, theme switching, and dummy page content. The BFF, real admin API, test suite,
> and deployment workflows are not wired yet. Nothing is deployed.

- **Remote:** [dream-team-workspace/MemeChat-Gateway-BackOffice](https://github.com/dream-team-workspace/MemeChat-Gateway-BackOffice)
- **Gateway backend:** [MemeChat-Gateway](https://github.com/dream-team-workspace/MemeChat-Gateway) (source of truth for the admin API)
- **Local gateway checkout:** `/home/dani/GolandProjects/MemeChat-Gateway`
- **Working branch:** `feature/template` (branched from `master` at the planning baseline)

---

## What is implemented

- **Login** — split brand/operator panel on desktop, compact form on mobile, GitHub/Google
  provider buttons, demo mode, theme toggle.
- **Responsive app shell** — fixed sidebar on desktop, off-canvas drawer with focus trap on
  mobile, sticky top bar, skip link, environment badge.
- **Left-bottom settings** — Settings is pinned in the sidebar footer above the environment
  card and the operator menu.
- **Pages** — Overview, Capabilities, Models, Users, Operations, Settings. All content is
  dummy/template data; no gateway request is made.
- **Theme** — light/dark/system, persisted in `localStorage`, applied before first paint by
  `public/theme-init.js`.
- **Design system** — repo-owned primitives under `src/components/ui`, Tailwind v4 semantic
  tokens from [DESIGN.md](DESIGN.md), Open Sans variable, shadcn-style composition.
- **Quality checks** — `npm run build`, `npm run typecheck`; axe audit clean on core
  screens (light/dark/mobile); no horizontal overflow at 360/768/1024/1280/1440; mobile drawer
  focus trap verified.

### Routes

| Route | Page |
|---|---|
| `/login` | Sign in |
| `/` | Overview / dummy dashboard |
| `/capabilities` | Capability registry (filterable dummy table) |
| `/models` | Model catalog (searchable dummy table) |
| `/users` | UID lookup + recent lookups (mock) |
| `/operations` | Health, registry cache, environment |
| `/settings` | Appearance, account, environment |

Protected routes redirect to `/login` until the mock session exists. The mock session is
stored in `localStorage` under `bo-session`; sign out clears it.

---

## Local development

~~~bash
npm install
npm run dev          # Vite on http://localhost:5173
npm run build        # typecheck + production build
npm run typecheck    # TypeScript only
npm run preview      # preview the production build
~~~

This branch does not have a BFF or live API. The login buttons create a mock session and the
pages use static template data. Do not add secrets or point the browser at the gateway's
`/internal/admin/*` routes.

### Planned next

- Hono BFF with OIDC/session, CSRF, allowlist, and `X-Admin-Actor`.
- TanStack Query/Table + React Hook Form/Zod for the real admin contract.
- MSW fixtures, Vitest, Playwright, and CI.
- Docker + staging/production deployment.

See [docs/11-roadmap.md](docs/11-roadmap.md) and
[docs/10-ci-cd-and-environments.md](docs/10-ci-cd-and-environments.md).

---

## Branch model

| Branch | Purpose | Deploys to | Who merges |
|---|---|---|---|
| `master` | Production / deployment base. Protected. | Production server | Release PR from `development` only |
| `development` | Integration and staging. Protected. | Staging server | Feature/fix/chore PRs |
| `feature/*`, `fix/*`, `chore/*` | Short-lived work branches | — | Opened as PRs into `development` |
| `hotfix/*` | Urgent production fix, branched from `master` | Production after PR | PR into `master`, then back-merge into `development` |

No direct pushes to `master` or `development`. The full policy, required checks, and
deployment workflow are in [docs/10-ci-cd-and-environments.md](docs/10-ci-cd-and-environments.md).

The current template is intentionally scoped to its feature branch and is **not merged** into
`development` or `master`.

---

## Documentation map

Start with the [documentation index](docs/README.md).

| Document | What it answers |
|---|---|
| [DESIGN.md](DESIGN.md) | How the console looks, behaves, and stays consistent with shadcn/ui |
| [docs/00-project-brief.md](docs/00-project-brief.md) | Why this project exists, who uses it, what "done" means |
| [docs/01-product-scope.md](docs/01-product-scope.md) | In-scope capabilities, non-goals, personas, success metrics |
| [docs/02-backend-contract-analysis.md](docs/02-backend-contract-analysis.md) | What the gateway exposes today, what is missing, what we assume |
| [docs/03-architecture.md](docs/03-architecture.md) | Runtime topology, feature-based frontend, BFF, boundaries |
| [docs/04-tech-stack.md](docs/04-tech-stack.md) | Chosen libraries, versions, and rejected alternatives |
| [docs/05-information-architecture.md](docs/05-information-architecture.md) | Screens, routes, flows, and page-level behavior |
| [docs/06-api-integration.md](docs/06-api-integration.md) | BFF endpoints, canonical payloads, errors, pagination, caching |
| [docs/07-security-model.md](docs/07-security-model.md) | Threat model, operator auth, secret handling, CSRF/CSP |
| [docs/08-engineering-standards.md](docs/08-engineering-standards.md) | Folder rules, naming, state, forms, styling, review checklist |
| [docs/09-testing-strategy.md](docs/09-testing-strategy.md) | Test pyramid, fixtures, E2E paths, quality gates |
| [docs/10-ci-cd-and-environments.md](docs/10-ci-cd-and-environments.md) | Branches, GitHub Actions, servers, rollback |
| [docs/11-roadmap.md](docs/11-roadmap.md) | Phases, deliverables, exit criteria |
| [docs/12-risks-and-open-questions.md](docs/12-risks-and-open-questions.md) | Known unknowns and decisions needed before build |
| [docs/13-glossary.md](docs/13-glossary.md) | Domain vocabulary |
| [docs/requirements/README.md](docs/requirements/README.md) | One file per functional and non-functional requirement |
| [docs/adr/](docs/adr/) | Architecture decision records |

---

## Tech stack in the template

- **React 19 + TypeScript + Vite 8**
- **Tailwind CSS v4** with semantic CSS variables
- **TanStack Router** (code-based route tree)
- **repo-owned shadcn-style primitives** (CVA variants, `cn()`, `components/ui`)
- **Lucide React** icons, **Open Sans Variable** self-hosted
- **date/number formatting** via native `Intl`
- Mock auth and dummy data only; no state library or API client yet

The full target stack (BFF, Query/Table, RHF/Zod, Vitest/Playwright, Docker) is documented in
[docs/04-tech-stack.md](docs/04-tech-stack.md).

The non-negotiable security rule remains: **the browser never receives
`ADMIN_API_SECRET` or calls the gateway's `/internal/admin/*` routes directly.**

---

## Current repository state

- UI template implemented on `feature/template`.
- No BFF, live admin API integration, test suite, CI, or deployment configuration yet.
- The original bare TypeScript scaffold was replaced by the Vite app; `src/index.ts` no
  longer exists.
- Treat dummy data and mock auth as template-only. Do not ship them as production behavior.
- Read the relevant requirement file and [docs/03-architecture.md](docs/03-architecture.md)
  before adding real data flows.
