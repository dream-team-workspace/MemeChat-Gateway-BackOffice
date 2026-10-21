# MemeChat Gateway BackOffice

Internal operator console for the **MemeChat AI Gateway**. It gives the team a safe,
auditable UI over the gateway's backend-management API: capability registry, provider
routing, kill switches, model catalog, user ledger/usage, and credit grants.

> **Status: Phase 0 — planning.** This repository currently contains the planning corpus,
> not the application. The existing root TypeScript scaffold is a placeholder and is
> replaced in Phase 1. Nothing here is deployed yet.

- **Remote:** [dream-team-workspace/MemeChat-Gateway-BackOffice](https://github.com/dream-team-workspace/MemeChat-Gateway-BackOffice)
- **Gateway backend:** [MemeChat-Gateway](https://github.com/dream-team-workspace/MemeChat-Gateway) (the source of truth for the admin API)
- **Local gateway checkout:** `/home/dani/GolandProjects/MemeChat-Gateway`

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

## Target stack

- **React 19 + TypeScript + Vite** single-page application
- **shadcn/ui**, components copied into the repository and owned by us
- **Tailwind CSS v4** with semantic CSS variables
- **TanStack Router, Query, and Table**
- **React Hook Form + Zod** for forms and contract validation
- **Hono BFF** (Node) that holds the admin secret, authenticates operators, and attributes
  every mutation with `X-Admin-Actor`
- **Vitest + Testing Library + MSW + Playwright** for the test pyramid
- **Docker + GitHub Actions** for staging/production deployment

The full rationale is in [docs/04-tech-stack.md](docs/04-tech-stack.md). The one non-negotiable
security rule: **the browser never receives `ADMIN_API_SECRET` or calls the gateway's
`/internal/admin/*` routes directly.**

---

## Local development (planned for Phase 1)

~~~bash
npm install
npm run dev          # Vite web app
npm run dev:api      # Hono BFF on http://localhost:8787
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run lint
npm run typecheck
~~~

Local development uses the mock admin API by default, because the gateway's admin routes
are contract-planned but not implemented yet. See
[docs/02-backend-contract-analysis.md](docs/02-backend-contract-analysis.md) and
[docs/06-api-integration.md](docs/06-api-integration.md).

---

## Current repository state

- Planning documents and requirements only.
- No application, BFF, tests, CI, or deployment configuration yet.
- The existing `src/index.ts`, `package.json`, and `tsconfig.json` are the original bare
  TypeScript scaffold and are not the target architecture.
- Do not implement features before reading the relevant requirement file and
  [docs/03-architecture.md](docs/03-architecture.md).
