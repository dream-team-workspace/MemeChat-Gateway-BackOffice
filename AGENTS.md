# AGENTS.md

## Repo status

- **Phase 1 implementation.** The Vite/React operator console, Cloudflare Access login, shared
  admin contract, and Hono BFF are implemented on `feature/implementation`.
- The BFF is **live-only** and always uses the gateway's Postgres-backed
  `/internal/admin/*` API. There is no mock admin store or fixture fallback in the runtime;
  readiness, capabilities, routing, kill switch, audit, models, ledger, usage, cache, grants,
  and RevenueCat status were exercised against the gateway.
- Capabilities, models, users, operations, and settings are wired through TanStack Query and
  the BFF. The old dummy pages and `features/dashboard` are removed.
- The gateway shipped the five BackOffice additions: users directory read endpoint, app-client
  SHA-1 identity, client admin audit, per-client activity read endpoint, and persisted provider
  health. Two data-source gaps remain: the gateway does not yet store verified email/RevenueCat
  tier, and it has no usage-event writer to attach `app_client_id`. See the status block in
  [docs/15-gateway-requests.md](docs/15-gateway-requests.md); the console shows honest empty or
  unknown values for those two gaps.
- `console.dream-team.works` is live behind Cloudflare Access; the BFF runs production auth
  and calls the main gateway at `https://gateway.dream-team.works`. CI deploys `master` to
  `/opt/memechat-backoffice`; see [deploy/README.md](deploy/README.md).

## Sources of truth

1. `docs/requirements/` — one file per requirement.
2. `DESIGN.md` — tokens, shadcn principles, visual rules.
3. `docs/03-architecture.md` — domain structure, BFF, boundaries.
4. `docs/06-api-integration.md` — canonical admin payloads/errors/pagination.
5. `docs/02-backend-contract-analysis.md` — real gateway status and gaps.
6. `docs/10-ci-cd-and-environments.md` — branch/CI/deploy policy.
7. `docs/14-cloudflare-access.md` — Access/Tunnel setup.
8. `docs/15-gateway-requests.md` — gateway contract status, remaining write paths, and SQL.

Where docs disagree: requirement file wins for behavior, `DESIGN.md` for visuals,
`docs/03-architecture.md` for structure. Fix docs in the same change.

## Commands

- `npm install` — install from the lockfile.
- `npm run dev` — Vite (5173) + BFF (8787); requires the gateway admin API.
- Live start: `ADMIN_API_BASE_URL=http://127.0.0.1:8080 ADMIN_API_SECRET=... npm run dev`.
- `npm test` — live BFF adapter contract tests with a fake upstream gateway; no runtime mock data.
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
  `/internal/admin/*`. The gateway wraps that subtree in `AdminAuth` and requires
  `X-Admin-Actor` on mutating requests.
- Provider catalogs are authoritative: routing and model forms must use provider-published
  models and their single capability mapping; do not hardcode or allow free-text model ids.
- App clients always carry the full capability matrix. Enabled rows must bind a capability to
  a model routed for that capability; disabled rows remain present and are not grants.
- `requireFirebaseUid` is per app client. When true, the gateway requires the app-asserted
  `X-Firebase-Uid` header; when false it is optional request context only. Never treat the UID
  as proof of identity by itself.
- Browser data goes through the typed client and Query hooks; no `fetch` in components/pages.
- Forms use RHF + Zod; mutations are pessimistic for registry and money paths.
- Use semantic design tokens only; no raw colors in domain code.
- Every page needs loading/empty/error states.

## Authentication and secrets

- Cloudflare Access is the edge identity. Production requests carry
  `Cf-Access-Jwt-Assertion`; the BFF verifies issuer/audience/JWKS and derives the actor email.
- Local dev uses `VITE_DEV_AUTH_EMAIL` and the BFF `DEV_ACTOR_EMAIL` fallback. The BFF
  requires `ADMIN_API_SECRET` at startup (all environments); production also requires
  `CF_ACCESS_AUD`.
- Never put `ADMIN_API_SECRET`, `CF_ACCESS_AUD` validation secrets, session tokens, or raw
  UIDs in the browser, logs, fixtures, or commits.
- App-client keys are returned exactly once by create/rotate. The app sends
  `X-App-Client-Key`; only its SHA-1 digest is stored. Never log or display the plaintext key
  after the one-time reveal; rotating invalidates the previous key.

## Branch and change policy

- `master` = production deployment branch. Never push directly.
- `development` = integration branch. Feature PRs target it; pushes currently build only.
- Work branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
- Conventional Commits, squash merge, one logical change per PR.
- Never commit secrets, `.env` files, session data, or real customer identifiers.
