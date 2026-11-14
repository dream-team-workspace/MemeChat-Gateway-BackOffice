# Runtime topology, ports, and environments

## Local development

```text
┌────────────┐   /api/* (Vite proxy)   ┌──────────────────┐   HTTPS/HTTP    ┌─────────────┐
│ Vite :5173 │ ──────────────────────► │ Hono BFF :8787   │ ──────────────► │ Gateway     │
│ React SPA  │                         │ tsx watch        │  Bearer secret  │ :8080       │
└────────────┘                         └──────────────────┘  X-Admin-Actor  └─────────────┘
        ^                                                                          │
        └──────────────── /cdn-cgi/access/* (production only; dev uses VITE_DEV_AUTH_EMAIL)
```

- Vite proxies `/api` to `127.0.0.1:8787` (`vite.config.ts`). The browser never calls `:8080`.
- `npm run dev` runs both sides with `concurrently`; the BFF loads `.env` via
  `server/src/env.ts` (`process.loadEnvFile(".env")`).
- The gateway must be running and its admin key must match `ADMIN_API_SECRET`, otherwise every
  `/api/admin/*` call fails with 502/503 and the UI shows an error state.
- Development auth has no Access in front of localhost: the BFF uses `DEV_ACTOR_EMAIL`, falling
  back to `VITE_DEV_AUTH_EMAIL`, then `operator@dream-team.works`.

## Production

```text
Internet -> Cloudflare Access -> cloudflared tunnel -> 127.0.0.1:8787 (BFF)
                                                        -> https://gateway.dream-team.works/internal/admin/*
```

- Release root: `/opt/memechat-backoffice`; `current` symlink to `releases/<sha>`; systemd
  service `memechat-backoffice`; env file `/etc/memechat-backoffice.env`.
- Deploy branch: `master`; GitHub Actions builds, tars `dist dist-server node_modules
  package.json package-lock.json`, ships over SSH, runs the deploy helper, checks
  `/api/health` (rollback on failure).
- `development` pushes only verify a clean build. PRs run ESLint.
- Console URL: `https://console.dream-team.works` behind Access. Full runbook:
  `deploy/README.md`.

## Request pipeline (BFF)

1. Assign/propagate `X-Request-Id`; set `X-Content-Type-Options`, `Referrer-Policy`,
   `X-Frame-Options` headers.
2. Route matching: `/api/health`, `/api/meta`, `/api/admin/*`; unknown `/api/*` returns the
   JSON 404 envelope; everything else is static SPA fallback.
3. `/api/admin/*` → `authMiddleware`:
   - production: verify `Cf-Access-Jwt-Assertion` (issuer + audience + JWKS via jose);
   - development: use the dev actor email;
   - production non-GET: `Origin` must equal `APP_ORIGIN`, else 403.
4. Route handler: validate params/query/body with Zod, call `adminFetch`.
5. `adminFetch`: Bearer secret, `X-Admin-Actor`, `X-Request-Id`, 10s timeout; errors map to
   `HttpError`; non-JSON success is a contract mismatch.
6. Handler camelizes the response (`camelize`), normalizes lists/pages, parses with the shared
   schema, returns JSON.
7. Errors hit `errorHandler`: `HttpError` status/code preserved; `ZodError` → 422
   `VALIDATION_FAILED`; unknown → 500 `INTERNAL` with a logged stack.

Planned but not implemented: double-submit CSRF token, rate limiting, pino logging, CSP.
Do not claim they exist. The current protections are Access JWT, production Origin check,
explicit routes, secret isolation, security headers, request IDs, and Zod validation.

## Environment matrix

| Variable | Browser | BFF | Notes |
|---|---|---|---|
| `VITE_DEV_AUTH_EMAIL` | build-time | read as fallback | dev-only identity |
| `VITE_PROVIDER_KEY_MANAGEMENT`, `VITE_ABILITY_ROUTES` | build-time | — | feature flags, default true |
| `NODE_ENV`, `PORT`, `HOST` | — | runtime | port 8787 default |
| `APP_ENV`, `APP_ORIGIN` | — | runtime | environment label / origin check |
| `ADMIN_API_BASE_URL` | — | runtime | local `http://127.0.0.1:8080` |
| `ADMIN_API_SECRET` | **never** | required at startup | gateway Bearer secret |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | — | runtime | production only |
| `DEV_ACTOR_EMAIL` | — | runtime | dev actor fallback |
| `STATIC_DIR`, `APP_VERSION`, `APP_COMMIT` | — | runtime | static serving and `/api/meta` |
| `LOG_LEVEL`, `REQUEST_TIMEOUT_MS`, `TRUST_PROXY` | — | not implemented | planned; timeout is hard-coded 10s |

## Health and meta

- `GET /api/health` is public: probes gateway `/healthz` and `/readyz` with a 2s timeout;
  `missing` (404) readiness becomes `not_configured`; overall `degraded` when not both ok.
- `GET /api/meta` is public: environment, auth mode, `adminApiMode: "live"`, version, commit.
- Neither returns secrets or identity.

## Static serving

In production the BFF serves `dist/` via `serveStatic`, falls back to `dist/index.html` for
client routes, and returns plain `Not found` only if `index.html` is missing. `/api/*` is
registered before static handling so an API 404 never gets the SPA shell.

## Live-only contract

- `config.ts` throws at startup when `ADMIN_API_SECRET` is missing; production also requires
  `CF_ACCESS_AUD`.
- There is no mock store, fixture fallback, or demo mode in the runtime.
- A gateway route that is not shipped yet surfaces as 404/501. The console detects it with
  `isGatewayFeatureMissing` and renders `PendingGatewayState` instead of an error.
- Never synthesize data to make a screen look complete.
