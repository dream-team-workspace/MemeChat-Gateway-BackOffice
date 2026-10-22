# MemeChat Gateway BackOffice

Internal operator console for the **MemeChat AI Gateway**. It gives the team a safe,
auditable UI over the gateway's backend-management API: capability registry, provider
routing, kill switches, model catalog, user ledger/usage, and credit grants.

> **Status: Phase 1 — UI template with Cloudflare Access login.** The console runs locally
> with a responsive shell, real Access identity when deployed behind Zero Trust, theme
> switching, and dummy page content. CI runs lint on PRs and a clean build on pushes; the
> BFF, real admin API, test suite, and production deployment are not wired yet.

- **Remote:** [dream-team-workspace/MemeChat-Gateway-BackOffice](https://github.com/dream-team-workspace/MemeChat-Gateway-BackOffice)
- **Gateway backend:** [MemeChat-Gateway](https://github.com/dream-team-workspace/MemeChat-Gateway) (source of truth for the admin API)
- **Local gateway checkout:** `/home/dani/GolandProjects/MemeChat-Gateway`
- **Working branch:** `feature/template` (branched from `master` at the planning baseline)

---

## What is implemented

- **Login** — split brand/operator panel on desktop, compact form on mobile. Cloudflare
  Access handles SSO/MFA and the session; the console reads the verified operator from
  `/cdn-cgi/access/get-identity` and signs out through `/cdn-cgi/access/logout`.
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

Protected routes wait for the Cloudflare Access identity and redirect to `/login` when it is
missing. Authentication data is not stored in `localStorage`; Access uses an HttpOnly cookie.
Local `npm run dev` uses `VITE_DEV_AUTH_EMAIL` because Access is not in front of localhost.

---

## Local development

~~~bash
npm install
npm run dev          # Vite on http://localhost:5173
npm run lint         # ESLint (CI check on pull requests)
npm run build        # typecheck + production build
npm run typecheck    # TypeScript only
npm run preview      # preview the production build
~~~

This branch does not have a BFF or live API. Page data is static. The browser never points at
the gateway's `/internal/admin/*` routes and never receives the admin secret.

Cloudflare setup (tunnel hostname, Access application, policy, and verification) is documented
in [docs/14-cloudflare-access.md](docs/14-cloudflare-access.md).

### Planned next

- Hono BFF that validates `Cf-Access-Jwt-Assertion`, enforces CSRF, and sets
  `X-Admin-Actor` from the Access identity.
- TanStack Query/Table + React Hook Form/Zod for the real admin contract.
- MSW fixtures, Vitest, and Playwright.
- Docker + staging/production deployment.

See [docs/11-roadmap.md](docs/11-roadmap.md) and
[docs/10-ci-cd-and-environments.md](docs/10-ci-cd-and-environments.md).

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) implements the first CI slice:

| Trigger | What runs |
|---|---|
| Pull request → `development` or `master` | `Lint` (`npm run lint`) |
| Push → `development` | `Build` (`rm -rf dist` + `npm ci` + `npm run build`) |
| Push → `master` | `Build`, then gated `Deploy production` |

The build job deliberately does **not** upload artifacts or use `actions/cache`; it only
fails the workflow if the production build fails. The production deploy job is skipped until
the repository variable `DEPLOY_ENABLED` is set to `true`; its step is still a placeholder
and deployment setup is pending.

The required status check for PRs is **`Lint`**. See
[docs/10-ci-cd-and-environments.md](docs/10-ci-cd-and-environments.md).

---

## Branch model

| Branch | Purpose | Deploys to | Who merges |
|---|---|---|---|
| `master` | Production / deployment base. Protected. | Gated production deploy (pending setup) | Release PR from `development` only |
| `development` | Integration branch. Protected. | Build check only (staging deploy later) | Feature/fix/chore PRs |
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
| [docs/14-cloudflare-access.md](docs/14-cloudflare-access.md) | Cloudflare Access login, tunnel hostname, policy, and validation |
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
- Cloudflare Access identity; dummy data only; no state library or API client yet

The full target stack (BFF, Query/Table, RHF/Zod, Vitest/Playwright, Docker) is documented in
[docs/04-tech-stack.md](docs/04-tech-stack.md).

The non-negotiable security rule remains: **the browser never receives
`ADMIN_API_SECRET` or calls the gateway's `/internal/admin/*` routes directly.**

---

## Current repository state

- UI template implemented on `feature/template`.
- CI is implemented for lint/build; the deployment step is intentionally gated and not set up.
- No BFF, live admin API integration, or automated test suite yet.
- The original bare TypeScript scaffold was replaced by the Vite app; `src/index.ts` no
  longer exists.
- Treat dummy page data as template-only. Access login is real when the hostname is behind
  Cloudflare Access; local dev uses a compile-time-only development identity.
- Read the relevant requirement file and [docs/03-architecture.md](docs/03-architecture.md)
  before adding real data flows.
