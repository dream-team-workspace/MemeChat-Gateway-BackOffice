# AGENTS.md

## Repo status

- **Phase 1 implementation.** The Vite/React operator console, Cloudflare Access login, shared
  admin contract, and Hono BFF are implemented on `feature/implementation`.
- The BFF defaults to a deterministic **mock** admin store. The gateway admin API is still
  contract-planned; `ADMIN_API_MODE=live` is a proxy skeleton, not a verified integration.
- Capabilities, models, users, operations, and settings are wired through TanStack Query and
  the BFF. The old dummy pages and `features/dashboard` are removed.
- There is no production deployment yet. The CI deploy job is gated by
  `DEPLOY_ENABLED` and still contains a placeholder.

## Sources of truth

1. `docs/requirements/` — one file per requirement.
2. `DESIGN.md` — tokens, shadcn principles, visual rules.
3. `docs/03-architecture.md` — domain structure, BFF, boundaries.
4. `docs/06-api-integration.md` — canonical admin payloads/errors/pagination.
5. `docs/02-backend-contract-analysis.md` — real gateway status and gaps.
6. `docs/10-ci-cd-and-environments.md` — branch/CI/deploy policy.
7. `docs/14-cloudflare-access.md` — Access/Tunnel setup.

Where docs disagree: requirement file wins for behavior, `DESIGN.md` for visuals,
`docs/03-architecture.md` for structure. Fix docs in the same change.

## Commands

- `npm install` — install from the lockfile.
- `npm run dev` — Vite (5173) + BFF (8787); mock store by default.
- `npm run dev:web` / `npm run dev:api` — run one side.
- `npm run lint` — ESLint; CI PR gate.
- `npm run test` — Vitest BFF contract tests.
- `npm run typecheck` — web + BFF.
- `npm run build` — typecheck + Vite build + server build.
- `npm start` — serve `dist/` + API from the built BFF.
- `npm run preview` — static Vite preview only (no API proxy).

## Architecture rules

- `src/features/<domain>` is a product domain with a public `index.ts`; subfeatures stay
  inside it. Do not create a domain per ability kind or per endpoint.
- `src/platform` holds auth, the typed API client, and the Query client.
- `shared/admin-api` is the runtime-agnostic Zod contract; both browser and server import it.
- `server` is the only admin-secret holder and the only component allowed to call
  `/internal/admin/*`.
- Browser data goes through the typed client and Query hooks; no `fetch` in components/pages.
- Forms use RHF + Zod; mutations are pessimistic for registry and money paths.
- Use semantic design tokens only; no raw colors in domain code.
- Every page needs loading/empty/error states.

## Authentication and secrets

- Cloudflare Access is the edge identity. Production requests carry
  `Cf-Access-Jwt-Assertion`; the BFF verifies issuer/audience/JWKS and derives the actor email.
- Local dev uses `VITE_DEV_AUTH_EMAIL` and the BFF `DEV_ACTOR_EMAIL` fallback. Production
  startup rejects mock admin mode or missing Access/admin secrets.
- Never put `ADMIN_API_SECRET`, `CF_ACCESS_AUD` validation secrets, session tokens, or raw
  UIDs in the browser, logs, fixtures, or commits.

## Branch and change policy

- `master` = production deployment branch. Never push directly.
- `development` = integration branch. Feature PRs target it; pushes currently build only.
- Work branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
- Conventional Commits, squash merge, one logical change per PR.
- Never commit secrets, `.env` files, session data, or real customer identifiers.
