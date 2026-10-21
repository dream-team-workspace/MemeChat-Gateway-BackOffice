# AGENTS.md

## Repo status

- **Phase 0 planning.** This repository contains the planning corpus for the MemeChat Gateway
  BackOffice, not the application. Read `README.md`, `DESIGN.md`, and `docs/README.md` first.
- The root `src/index.ts`, `package.json`, and `tsconfig.json` are the original bare
  TypeScript scaffold. They are **not** the target app and will be replaced in Phase 1.
- There is no BFF, test suite, CI, or deployment configuration yet. Do not assume they exist.

## Sources of truth

1. `docs/requirements/` — one file per functional/non-functional requirement; acceptance
   criteria are authoritative for behavior.
2. `DESIGN.md` — visual system, shadcn principles, theme tokens, accessibility overrides.
3. `docs/03-architecture.md` — runtime topology, feature boundaries, BFF responsibilities.
4. `docs/02-backend-contract-analysis.md` — what the gateway actually exposes and what is
   still contract-planned.
5. `docs/06-api-integration.md` — canonical BFF payloads and error handling.
6. `docs/10-ci-cd-and-environments.md` — branch and deployment policy.

Where docs disagree, the requirement file wins for behavior, `DESIGN.md` wins for visuals,
and `docs/03-architecture.md` wins for structure. Record the conflict and fix the docs.

## Current commands

The scaffold still supports only:

- `npm install` — required first; no lockfile is committed.
- `npm run build` — runs `tsc` and emits `dist/`.

Do not search for test/lint/dev scripts yet; they are planned in Phase 1 and documented in
`docs/04-tech-stack.md`. Do not add app code without a requirement file and an architecture
decision.

## Branch and change policy

- `master` = production deployment branch. Never push directly.
- `development` = integration/staging branch. Feature PRs target it.
- Work branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
- Conventional Commits, squash merge, one logical change per PR.
- Never commit secrets, `.env` files, session data, or customer identifiers.

## Boundaries

- This repo is the **web console + BFF** only. The Go gateway lives in a separate repository;
  do not implement gateway behavior here.
- The browser must never receive `ADMIN_API_SECRET`, `INTERNAL_API_SECRET`, OIDC client
  secrets, or raw session tokens.
- Do not invent admin API endpoints, response fields, or metrics. If the contract is
  missing, add it to `docs/12-risks-and-open-questions.md` and mock it explicitly.
