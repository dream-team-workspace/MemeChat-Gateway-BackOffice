# MemeChat Gateway BackOffice

Internal operator console for the **MemeChat AI Gateway**. It gives the team a safe,
auditable UI over the gateway's backend-management surface: capability registry, provider
routing, kill switches, model catalog, user ledger/usage, credit grants, and system operations.

> **Status: Phase 1 — operator console with live gateway support.** The domain-oriented React
> UI, Cloudflare Access login, shared Zod contract, and Hono BFF are implemented. The gateway
> now has a working `/internal/admin/*` API, and the BFF runs **live-only** against it. There
> is no mock/demo data path in the runtime. The first release is deployed to the server on
> loopback; public Cloudflare Access/tunnel exposure is the remaining step.

- **Remote:** [dream-team-workspace/MemeChat-Gateway-BackOffice](https://github.com/dream-team-workspace/MemeChat-Gateway-BackOffice)
- **Gateway backend:** [MemeChat-Gateway](https://github.com/dream-team-workspace/MemeChat-Gateway) (source of truth for the admin API)
- **Local gateway checkout:** `/home/dani/GolandProjects/MemeChat-Gateway`
- **Working branch:** `feature/implementation`

---

## What is implemented

- **Cloudflare Access login** — identity is read from `/cdn-cgi/access/get-identity`;
  sign-out uses `/cdn-cgi/access/logout`. Local dev uses `VITE_DEV_AUTH_EMAIL`.
- **Domain-oriented UI** — overview, capabilities (list, configuration, routing, audit,
  kill switch), app clients (capability/model matrix), models (create/edit), providers
  (connection details and health probes), users (lookup, ledger, usage, grant), operations
  (health, RevenueCat, cache invalidation), and settings.
- **App clients** — create Android/iOS/web/backend clients, enable the capabilities each one
  may consume, and bind each enabled capability to a model from that capability's routed
  catalog. Every client always shows the full capability matrix. Each client gets a one-time
  40-character identity key (store only its SHA-1 digest); the app sends it as
  `X-App-Client-Key`, and rotation immediately invalidates the old key. Clients can require
  the app-asserted `X-Firebase-Uid` header; optional clients may omit it.
- **BFF** — Hono on Node, Cloudflare Access JWT validation in production, live gateway proxy
  with admin-secret injection and canonical mapping, request IDs, error envelope, origin
  checks, security headers, static serving, and graceful shutdown. Every request is forwarded
  to the gateway; no data is synthesized locally.
- **Shared contract** — Zod schemas and inferred types for capabilities, app clients, models,
  users, ledger, usage, audit, grants, health, and meta, used by both the browser and the BFF.
- **Data layer** — typed fetch client, TanStack Query cache, query keys, mutations, and
  precise invalidation.
- **Forms** — React Hook Form + Zod validation for capability edits; dialogs for kill switch,
  models, and credit grants.
- **RevenueCat support** — a safe status endpoint reports whether grants are configured, the
  project ID, and the API base (never the secret). Operations shows the status; user grant
  controls disable when RC is not configured.
- **Catalog-driven model policy** — each provider publishes its models and each model maps to
  exactly one capability. Routing shows only providers/models valid for the capability; the
  model editor derives capability from the selected model. Invalid configured models fall back
  to a provider default, set `modelValid: false`, and disable probing.
- **Tests** — Vitest contract tests for the live BFF adapter using a fake upstream gateway
  fixture, plus Go tests for admin auth, cursor pagination, and the RevenueCat grant client.
  The real gateway path was verified end-to-end through the Chrome remote browser.
- **Design system** — repo-owned shadcn-style primitives, semantic tokens, Light/Dark/System,
  responsive shell, mobile drawer focus trap, axe-clean core screens.
- **CI/CD** — lint on PRs, clean build on `development`, and atomic SSH/systemd deploy on
  `master`. See [deploy/README.md](deploy/README.md).

### Routes

| Route | Page |
|---|---|
| `/login` | Cloudflare Access fallback |
| `/` | Overview |
| `/capabilities` | Capability registry |
| `/capabilities/:capabilityId` | Capability overview/configuration |
| `/capabilities/:capabilityId/routing` | Provider routing |
| `/capabilities/:capabilityId/audit` | Capability audit |
| `/app-clients` | App client list |
| `/app-clients/:clientId` | App client capability/model matrix |
| `/models` | Model catalog |
| `/providers` | Provider connections and health |
| `/users` | UID lookup |
| `/users/:uid/ledger` | Credit ledger |
| `/users/:uid/usage` | Usage events |
| `/operations` | Health and registry operations |
| `/settings` | Appearance and account |

Protected routes use the Access identity guard and redirect to `/login` when unauthenticated.
The BFF derives `X-Admin-Actor` from the verified Access JWT in production; it never trusts a
browser-supplied actor. The gateway requires that header on mutating admin requests and writes
it to `capability_audit.changed_by`.

---

## Local development

~~~bash
npm install
npm run dev          # Vite (5173) + BFF (8787); requires the gateway admin API
npm run lint         # ESLint; CI PR check
npm run test         # Vitest BFF contract tests
npm run typecheck    # web + BFF
npm run build        # typecheck + Vite build + server build
npm start            # serve dist + /api from the built BFF
~~~

`npm run dev` starts both processes via `concurrently`. Vite proxies `/api` to the BFF.
`npm run preview` serves only the static Vite build; use `npm start` when you need the API.

### Live-only runtime

There is no mock admin store. The BFF requires `ADMIN_API_SECRET` at startup and forwards
every read and mutation to `ADMIN_API_BASE_URL` (`http://127.0.0.1:8080` by default). If the
gateway is down, screens show error states; they do not fall back to fixtures. Production also
requires `CF_ACCESS_AUD`.

### Running against the live gateway

The gateway admin API is in the local gateway working tree at
`/home/dani/GolandProjects/MemeChat-Gateway`. Start it with an admin secret and a seeded
database:

~~~bash
cd /home/dani/GolandProjects/MemeChat-Gateway
psql "$DATABASE_URL" -f seed/registry.sql
BACKOFFICE_API_KEY=<64-hex-development-key> go run ./cmd/gateway
~~~

Then start the console with the same key as its bearer:

~~~bash
cd /home/dani/WebstormProjects/gateway-backoffice
ADMIN_API_BASE_URL=http://127.0.0.1:8080 \
ADMIN_API_SECRET=<same-64-hex-development-key> \
npm run dev
~~~

Credit grants additionally need `REVENUECAT_SECRET_KEY` and `REVENUECAT_PROJECT_ID` on
the gateway. Without them the grant endpoint correctly returns `503 NOT_CONFIGURED` and the
console disables the grant button; the rest of the registry and support screens remain usable.
For local contract tests, `REVENUECAT_BASE_URL` can point at a stub. The console reads
`GET /internal/admin/revenuecat/status` and never receives the secret key.

See [.env.example](.env.example) for the full local matrix. Do not commit `.env`.

---

## Domain structure

~~~text
src/
  app/                 router, layouts, guards
  features/
    overview/          composition only
    capabilities/      api, queries, mutations, components, pages
    app-clients/       api, queries, mutations, components, pages
    models/            api, queries, mutations, components, pages
    providers/         external service status and health probes
    users/             api, queries, mutations, components, pages
    operations/        health, cache, future jobs
    settings/          local preferences
  platform/            auth, typed API client, Query client, config
  components/          ui primitives, common compositions, layout
  lib/                 formatting, cn, zod resolver
shared/admin-api/      canonical contract for browser + BFF
server/                Hono BFF, live gateway proxy, Access auth
~~~

Capability kinds are data, not domains. Routing/audit are subfeatures of capabilities;
ledger/usage/grant are subfeatures of users. See [docs/03-architecture.md](docs/03-architecture.md).

---

## Backend sync (2026-10-23)

- Gateway app routes now live: Kokoro TTS, Salad STT, and Voyage embeddings. Chat is still
  mounted as `501`.
- The gateway admin surface is now mounted and backed by Postgres: capabilities, provider
  routing, kill switch, audit, models, cache invalidation, ledger, usage, and grants.
- `/readyz` now pings Postgres; `/internal/admin/*` is wrapped by constant-time Bearer auth
  and requires `X-Admin-Actor` on mutations.
- The live registry contains the eight seeded capabilities: `chat.standard`,
  `chat.premium`, `tts`, `stt`, and `embeddings.fast/balanced/quality/code`.
- Provider rows use the actual adapter names (`opencode`, `salad`, `kokoro`, `voyage`) and the
  current model choices (`deepseek-v4.1-flash`, `deepseek-v4-pro`, `voyage-4*`,
  `voyage-code-4`).
- Audit now follows the planned keyset contract (`?limit=&cursor=`) and the UI supports
  "Load older".
- Live health treats a missing `/readyz` as `not_configured` instead of incorrectly marking
  the gateway degraded.

### 2026-10-26

Gateway migration `0004_backoffice_contract.sql` is applied locally. Live and verified:
`clientKeySha1`, app-client admin audit, activity read endpoint, users directory read endpoint,
and persisted provider health (`lastCheck` survives restarts). Still missing: the sign-in write
path for verified email/RevenueCat tier, and a usage-event writer that attaches
`app_client_id`. See [docs/15-gateway-requests.md](docs/15-gateway-requests.md).

## What remains

- Complete the two remaining gateway data sources in
  [docs/15-gateway-requests.md](docs/15-gateway-requests.md): store verified Firebase email and
  the RevenueCat-derived tier on sign-in, and attach `app_client_id` when the usage-event writer
  lands. The directory, SHA-1, client audit, provider health, and activity read endpoints are
  live; the activity screen is empty until the writer exists.
- Publish/review the gateway admin API changes (working tree, not committed here) and verify
  the exact contract against staging.
- Configure production RevenueCat credentials; grants are a live external mutation.
- Add Playwright E2E against the live gateway; current coverage is the live BFF adapter test
  plus manual Chrome validation.
- Add boundary lint and the remaining cleanup/golden tests.
- Finish the public Cloudflare Access application and tunnel hostname as described in
  [docs/14-cloudflare-access.md](docs/14-cloudflare-access.md). The Node service is already
  deployed on the server loopback.
- Add gateway admin deployment to CI (the loopback gateway is currently installed manually).
- Add Playwright smoke tests after Access is configured.

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Trigger | What runs |
|---|---|
| PR → `development` or `master` | `Lint` (`npm run lint`) |
| Push → `development` | `Build` (clean `dist` + `dist-server`, no artifacts) |
| Push → `master` | `Deploy production` (build, package, SSH, atomic release + health check) |

The deploy is a Node/systemd release at `/opt/memechat-backoffice` on
`deploy@139.99.88.23` (admin access: `ubuntu@admin.dream-team.works`). It requires the
repository secrets listed in
[deploy/README.md](deploy/README.md). Tests are available via `npm test` but are not yet a
CI gate.

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
| [docs/15-gateway-requests.md](docs/15-gateway-requests.md) | Gateway contract status, remaining email/tier and activity write paths |
| [docs/requirements/README.md](docs/requirements/README.md) | Requirement index |

---

## Security boundary

The browser never receives `ADMIN_API_SECRET`, `INTERNAL_API_SECRET`, Access validation
secrets, or raw session tokens, and it never calls the gateway's `/internal/admin/*` routes
directly. The BFF is the only admin-secret holder and the only place that sets
`X-Admin-Actor`.
