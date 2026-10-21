# AGENTS.md

## Repo status

- **Phase 1 — UI template (mock auth).** The Vite/React console is implemented on
  `feature/template`. Read `README.md`, `DESIGN.md`, and `docs/README.md` first.
- The template includes login, responsive sidebar/topbar, pinned Settings, theme switching,
  and dummy Overview/Capabilities/Models/Users/Operations/Settings pages.
- There is **no BFF, live admin API integration, test suite, CI, or deployment config yet**.
  Mock auth lives in `src/features/auth/auth-store.ts`; all page data is static.
- Do not merge this branch to `development`/`master` until the Phase 1 exit criteria in
  `docs/11-roadmap.md` are met.

## Sources of truth

1. `docs/requirements/` — one file per functional/non-functional requirement.
2. `DESIGN.md` — tokens, shadcn principles, component rules, accessibility overrides.
3. `docs/03-architecture.md` — feature boundaries, BFF, data flow.
4. `docs/02-backend-contract-analysis.md` — what the gateway actually exposes.
5. `docs/06-api-integration.md` — canonical BFF payloads and error handling.
6. `docs/10-ci-cd-and-environments.md` — branch and deployment policy.

Where docs disagree, the requirement file wins for behavior, `DESIGN.md` for visuals, and
`docs/03-architecture.md` for structure. Fix the docs in the same PR.

## Current commands

- `npm install` — installs from the committed lockfile.
- `npm run dev` — Vite dev server on port 5173.
- `npm run build` — `tsc --noEmit` + production Vite build.
- `npm run typecheck` — TypeScript only.
- `npm run preview` — preview the production build.

No lint/test/E2E scripts exist yet. Do not invent feature APIs; the admin routes are not
implemented in the gateway checkout.

## Current app conventions

- Tokens only: no raw hex/rgb/oklch in feature code; use semantic classes.
- Reusable primitives live in `src/components/ui`; shared compositions in
  `src/components/common` and `src/components/layout`.
- Feature slices live in `src/features/<name>`; routes are thin and assembled in
  `src/app/router.tsx`.
- Mock auth/session is explicit; never add a secret or a real admin call to the browser.
- Every new page needs loading/empty/error states before it is considered done.

## Branch and change policy

- `master` = production deployment branch. Never push directly.
- `development` = integration/staging branch. Feature PRs target it.
- Work branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
- Conventional Commits, squash merge, one logical change per PR.
- Never commit secrets, `.env` files, session data, or customer identifiers.

## Boundaries

- This repo is the **web console + BFF** only. The Go gateway lives in another repository;
  do not implement gateway behavior here.
- The browser must never receive `ADMIN_API_SECRET`, `INTERNAL_API_SECRET`, OIDC client
  secrets, or raw session tokens.
- Do not invent admin API endpoints, response fields, or metrics. If the contract is
  missing, add it to `docs/12-risks-and-open-questions.md` and mock it explicitly.
