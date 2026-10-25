# 03 — Architecture

| Field | Value |
|---|---|
| Status | Living architecture; Phase 1 UI implemented; domain refinements proposed 2026-10-22 |
| Scope | Web console + Backend-for-Frontend (BFF) |
| Depends on | [Backend contract analysis](02-backend-contract-analysis.md), [DESIGN.md](../DESIGN.md) |
| Decisions | ADR-0001..0008 |

## 1. Architecture in one picture

~~~text
┌──────────────────────────────┐
│ Browser                      │
│ React 19 SPA (static assets) │
│  - routes / features         │
│  - TanStack Query            │
│  - shadcn/ui                 │
└──────────────┬───────────────┘
               │ same-origin HTTPS
               │ Access cookie + CSRF header
               ▼
┌──────────────────────────────┐
│ BFF (Hono on Node)           │
│  - Access JWT validation     │
│  - no app-owned session      │
│  - route allowlist           │
│  - ADMIN_API_SECRET (server) │
│  - X-Admin-Actor             │
│  - Zod contract validation   │
│  - serves dist/ in prod      │
└──────────────┬───────────────┘
               │ HTTPS, server-to-server
               │ Bearer admin secret
               ▼
┌──────────────────────────────┐
│ MemeChat Gateway             │
│  /internal/admin/*           │
│  /healthz, /readyz           │
│  Postgres + RevenueCat       │
└──────────────────────────────┘
               ▲
               │ Access redirects
┌──────────────┴───────────────┐
│ Cloudflare Access            │
│ Zero Trust SSO / MFA / policy│
└──────────────────────────────┘
~~~

The browser never talks to the gateway's admin origin. The BFF is the only component that
holds the admin secret, and it is also the only component that can assert an operator
identity.

> **Update 2026-10-22:** Cloudflare Access is the identity provider. The SPA reads the verified
> operator from `/cdn-cgi/access/get-identity`; the future BFF validates
> `Cf-Access-Jwt-Assertion` and sets `X-Admin-Actor` from its email. The custom OIDC flow
> previously planned for the BFF is superseded. See
> [14-cloudflare-access.md](14-cloudflare-access.md).

## 2. Why a BFF is mandatory

The gateway's admin API expects:

- `Authorization: Bearer <BACKOFFICE_API_KEY>` — a long-lived 64-hex shared secret.
  The BFF stores the same value in its `ADMIN_API_SECRET` environment variable.
- `X-Admin-Actor: <operator>` — an audit identity the browser cannot be trusted to invent.
- No browser CORS/session model.

Embedding the secret in the SPA, a source map, a service worker, or a build-time `VITE_*`
variable would hand full admin power to anyone who opens DevTools. A reverse proxy that
injects a static header has the same problem plus no per-operator identity. The BFF is the
smallest component that can validate the Access identity, keep the secret server-side,
attribute each mutation, restrict the callable surface, and normalize the contract.

## 3. Runtime responsibilities

### 3.1 Browser SPA

- Render routes and domain UI.
- Manage server state with TanStack Query.
- Validate forms with Zod/RHF.
- Never read or store the admin secret.
- Never call the gateway origin.
- Treat the BFF as the only API.

### 3.2 BFF

- Serve the built SPA (in production) and `/api/*`.
- Validate the Cloudflare Access JWT on every `/api/*` request; enforce the Access policy.
- Do not mint an app-owned session cookie; Access owns the `CF_Authorization` cookie.
- Enforce CSRF (Origin + double-submit token) on non-GET.
- Enforce a method+path allowlist; no generic proxy.
- Inject `Authorization` and `X-Admin-Actor`; propagate/generate `X-Request-Id`.
- Bound body size, timeouts, and retries.
- Parse upstream responses with shared Zod schemas and normalize casing/pagination.
- Redact logs; never log bodies, cookies, secrets, or raw UIDs.
- Rate-limit API reads and mutations.

### 3.3 Gateway

- Owns authorization semantics, validation, revision bumps, audit writes, cache invalidation.
- Is the source of truth for money and routing.
- May be unavailable or contract-incomplete; the BFF must surface that honestly.

### 3.4 Domain model (backend-aligned)

The console is organized around **admin resources and operator jobs**, not the gateway's Go
packages or individual capability kinds.

| Gateway/admin surface | Console domain | Subfeatures / routes |
|---|---|---|
| `capabilities`, `capability_providers`, `capability_audit` | `features/capabilities` | registry, configuration, routing, audit |
| `app_clients`, `app_client_capabilities` | `features/app-clients` | client list, capability/model matrix |
| `models` | `features/models` | catalog list, model editor |
| `account`, `credit_ledger`, `usage_events`, credit grant | `features/users` | lookup, ledger, usage, grant |
| cache invalidation, health, future jobs | `features/operations` | health, cache, jobs |
| No direct backend endpoint | `features/overview` | composition of other domains |
| Browser preference only | `features/settings` | appearance, session |
| Cloudflare Access | `platform/auth` | login, identity, logout |
| `chat`, `tts`, `stt`, `embeddings` | **not a frontend feature** | capability rows / kinds rendered by the registry UI |

Rules:

1. **One domain per admin resource group or operator journey.** The target is seven product
   domains plus platform auth; do not create a domain per endpoint.
2. **A capability kind is data, not a feature.** New kinds must render through the existing
   registry/form renderer. Creating `features/chat`, `features/tts`, or
   `features/embeddings` multiplies UI and defeats the dynamic registry.
3. **Provider routing and audit stay inside capabilities.** They are part of the same
   aggregate and the admin API exposes them under `/capabilities/{id}`. Promote audit to a
   domain only if the backend adds a global audit feed.
4. **Ledger, usage, and grants stay inside users.** They share the UID lookup journey and the
   `/users/{uid}` resource group.
5. **Jobs live under operations but use a separate BFF boundary.** The UI can share the domain;
   the server must not mix `ADMIN_API_SECRET` and `INTERNAL_API_SECRET`.
6. **Overview is composition-only.** It may consume public summary hooks from capabilities and
   models; it must not define duplicate query keys or a second source of truth.
7. **Auth is platform infrastructure, not a product domain.** Access identity, the typed
   API client, and the Query client live under `platform/`, not `features/`.

A useful scale test: adding a new capability kind or provider should require **zero new
top-level domains**. A global audit feed or aggregate stats endpoint would justify promoting a
subfeature to a domain; the user directory stays inside `features/users`.

## 4. Repository layout (target)

~~~text
.
├─ src/
│  ├─ app/
│  │  ├─ router.tsx                   # route tree assembly
│  │  ├─ routes/                      # thin route declarations, split by domain
│  │  ├─ layouts/                     # shell, auth, route error
│  │  ├─ guards/                      # session/authorization
│  │  └─ providers/                   # QueryClient, theme, toasts
│  ├─ features/                       # product domains
│  │  ├─ overview/                    # composition only
│  │  │  ├─ components/
│  │  │  ├─ page.tsx
│  │  │  └─ index.ts
│  │  ├─ capabilities/
│  │  │  ├─ api/
│  │  │  ├─ queries/
│  │  │  ├─ mutations/
│  │  │  ├─ components/
│  │  │  │  ├─ registry/
│  │  │  │  ├─ routing/
│  │  │  │  └─ audit/
│  │  │  ├─ forms/
│  │  │  ├─ pages/
│  │  │  └─ index.ts
│  │  ├─ models/
│  │  │  ├─ api/
│  │  │  ├─ components/
│  │  │  ├─ pages/
│  │  │  └─ index.ts
│  │  ├─ users/
│  │  │  ├─ api/
│  │  │  ├─ components/
│  │  │  │  ├─ lookup/
│  │  │  │  ├─ ledger/
│  │  │  │  ├─ usage/
│  │  │  │  └─ grant/
│  │  │  ├─ pages/
│  │  │  └─ index.ts
│  │  ├─ operations/
│  │  │  ├─ components/
│  │  │  │  ├─ health/
│  │  │  │  ├─ cache/
│  │  │  │  └─ jobs/                  # future; separate BFF secret
│  │  │  └─ index.ts
│  │  └─ settings/
│  ├─ platform/                       # cross-domain infrastructure
│  │  ├─ auth/                        # Access identity, dev identity, logout
│  │  ├─ api/                         # typed fetch client, errors, request IDs
│  │  └─ config/
│  ├─ components/
│  │  ├─ ui/                          # shadcn-owned primitives
│  │  ├─ common/                      # PageHeader, DataTable, ConfirmDialog...
│  │  └─ layout/                      # Sidebar, Topbar, EnvironmentBadge
│  ├─ lib/                            # formatters, cn, pure utilities
│  ├─ styles/globals.css
│  └─ main.tsx
├─ shared/
│  └─ admin-api/                      # runtime-agnostic contract (no React/DOM/Node)
│     ├─ common.ts                    # error envelope, pagination
│     ├─ capabilities.ts
│     ├─ models.ts
│     └─ users.ts
├─ server/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ app.ts
│  │  ├─ config.ts
│  │  ├─ auth/                        # Access JWT, session, middleware
│  │  ├─ routes/                      # capabilities, models, users, operations
│  │  ├─ gateway/
│  │  │  ├─ client.ts
│  │  │  ├─ allowlist.ts
│  │  │  ├─ errors.ts
│  │  │  └─ mappers/                  # capabilities, models, users
│  │  └─ lib/                         # csrf, rate-limit, logger, redact
│  └─ tsconfig.json
├─ tests/
│  ├─ e2e/
│  ├─ fixtures/
│  └─ setup/
├─ public/
├─ docs/
├─ scripts/
├─ components.json
├─ vite.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json / tsconfig.server.json
├─ eslint.config.js
├─ playwright.config.ts
├─ vitest.config.ts
└─ package.json
~~~

**Current implementation (2026-10-23):** `features/dashboard` has been removed in favor
of `features/overview`; auth moved to `platform/auth`; `platform/api`,
`platform/query`, `shared/admin-api`, and `server/` are implemented. The capabilities
domain has separate api/query/mutation modules and routing/audit pages; its remaining
components are still colocated under `components/` rather than the target
`registry/routing/audit` subfolders. Models, users, operations, and settings are wired to the
BFF. The console is live-only against the Postgres-backed gateway admin API; the mock store
has been removed and missing routes are shown as unavailable, never synthesized.



~~~text
.
├─ src/                               # browser application
│  ├─ app/
│  │  ├─ bootstrap.tsx                # mount, providers, error boundary
│  │  ├─ providers.tsx                # QueryClient, theme, toasts
│  │  ├─ router.tsx                   # route tree assembly
│  │  ├─ error-boundary.tsx
│  │  └─ layouts/
│  │     ├─ app-shell.tsx
│  │     ├─ auth-layout.tsx
│  │     └─ route-error.tsx
│  ├─ routes/                         # thin route files only
│  │  ├─ __root.tsx
│  │  ├─ login.tsx
│  │  ├─ index.tsx
│  │  ├─ capabilities.index.tsx
│  │  ├─ capabilities.$capabilityId.tsx
│  │  ├─ capabilities.$capabilityId.audit.tsx
│  │  ├─ models.tsx
│  │  ├─ users.index.tsx
│  │  ├─ users.$uid.tsx
│  │  ├─ operations.tsx
│  │  ├─ settings.tsx
│  │  ├─ forbidden.tsx
│  │  └─ not-found.tsx
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ dashboard/
│  │  ├─ capabilities/
│  │  ├─ models/
│  │  ├─ users/
│  │  ├─ operations/
│  │  └─ settings/
│  ├─ components/
│  │  ├─ ui/                          # shadcn-owned primitives
│  │  ├─ common/                      # PageHeader, DataTable, ConfirmDialog
│  │  └─ layout/                      # Sidebar, Topbar, EnvironmentBadge
│  ├─ lib/
│  │  ├─ api/                         # fetch client, error types, query client
│  │  ├─ env.ts                       # client-safe env parsing
│  │  ├─ format.ts                    # dates, numbers, credits
│  │  └─ utils.ts                     # cn()
│  ├─ hooks/                          # truly global hooks only
│  ├─ styles/globals.css              # Tailwind v4 + tokens
│  └─ main.tsx
├─ shared/                            # runtime-agnostic contract (no React)
│  └─ admin-api/
│     ├─ endpoints.ts
│     ├─ schemas.ts                   # Zod
│     ├─ types.ts                     # inferred types
│     └─ error-codes.ts
├─ server/                            # BFF
│  ├─ src/
│  │  ├─ index.ts                     # Node adapter + static serving
│  │  ├─ app.ts                       # Hono assembly
│  │  ├─ config.ts                    # Zod env validation
│  │  ├─ auth/
│  │  │  ├─ access.ts
│  │  │  ├─ session.ts
│  │  │  └─ middleware.ts
│  │  ├─ gateway/
│  │  │  ├─ client.ts                 # fetch, timeout, auth headers
│  │  │  ├─ allowlist.ts
│  │  │  ├─ mappers.ts                # snake_case → camelCase, pagination
│  │  │  └─ errors.ts
│  │  ├─ routes/
│  │  │  ├─ auth.ts
│  │  │  ├─ admin.ts
│  │  │  └─ health.ts
│  │  └─ lib/
│  │     ├─ csrf.ts
│  │     ├─ rate-limit.ts
│  │     ├─ logger.ts
│  │     └─ redact.ts
│  └─ tsconfig.json
├─ tests/
│  ├─ e2e/
│  ├─ fixtures/
│  └─ setup/
├─ public/
├─ docs/
├─ scripts/
├─ components.json
├─ vite.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json / tsconfig.server.json
├─ eslint.config.js
├─ playwright.config.ts
├─ vitest.config.ts
└─ package.json                       # single package, two runtimes
~~~

A single npm package is intentional: the web app and BFF ship together, share Zod schemas,
and deploy as one container. If the team later needs independent scaling, the `server/` and
`src/` boundaries already make a workspace split cheap.

## 5. Frontend layers

### 5.1 App layer (`src/app`)

Owns bootstrapping only: providers, router creation, global error handling, and the app
shell. It may import domains' public entry points. It contains no business logic.

### 5.2 Route layer (`src/app/routes`)

Thin adapters between URLs and domain pages:

- parse/validate search params
- call `ensureSession` / permission guards
- set document title and breadcrumbs
- render a domain page inside `AppShell`
- declare route-level pending/error components

Routes do not fetch directly, map API data, or contain forms.

### 5.3 Domain layer (`src/features/<domain>`)

A domain is a vertical slice with a **public API** (`index.ts`) and private internals.
Subfeatures are folders inside the domain, not separate top-level domains.

~~~text
features/capabilities/
├─ api/                         # BFF calls, Zod parse
├─ queries/                     # query options + keys
├─ mutations/                   # mutation options + invalidation
├─ components/
│  ├─ registry/                 # list, summary, detail shell
│  ├─ routing/                  # provider chain editor
│  └─ audit/                    # audit table/diff
├─ forms/                       # capability + routing form schemas
├─ pages/
│  ├─ capabilities-page.tsx
│  ├─ capability-detail-page.tsx
│  └─ capability-audit-page.tsx
├─ index.ts                     # pages + deliberate public hooks
└─ __tests__/
~~~

Domain rules:

- Everything inside the domain is private except what `index.ts` exports.
- Only the **domain** has a public entry point. `components/routing` and
  `components/audit` are subfeatures, not separately importable packages.
- A domain may not import another domain's internals. Shared behavior moves to
  `components/common` or `shared/admin-api`.
- A domain API module is the only place that calls the typed client.
- Domain components do not know query keys or cache invalidation; query/mutation modules do.
- `features/overview` is the only composition domain and may import **public summary hooks**
  from capabilities/models. Other domains may not import each other.
- Do not create a domain per endpoint or per capability kind. Add a subfeature until the
  backend exposes a global resource with its own nav, route, and ownership.
- The current flat `features/capabilities` is the starting point; create
  `registry/`, `routing/`, and `audit/` as those workflows are built.

### 5.4 Shared layer

| Location | Allowed contents | Forbidden |
|---|---|---|
| `components/ui` | shadcn primitives, local patches | Domain logic, API calls |
| `components/common` | PageHeader, DataTable, ConfirmDialog, EmptyState, ErrorState, StatusBadge, JsonViewer, CopyButton, DiffView | Domain-specific labels/data |
| `components/layout` | Sidebar, Topbar, EnvironmentBadge, UserMenu | Domain forms |
| `lib` | formatters, env, cn, pure utilities | React components, domain state |
| `platform/api` | typed fetch client, API errors, request IDs | Domain-specific UI |
| `platform/auth` | Access identity, dev identity, logout | Product-domain rules |
| `shared/admin-api` | Zod schemas, types, endpoint constants, error codes | React, DOM, Node APIs |

`shared/` is the contract seam. It must be importable by both Vite and Node, so it may not
import `react`, `server/`, or `src/`.

### 5.5 Dependency direction

~~~text
app/routes ──► domains (public index) ──► components/common ──► components/ui
    │                 │
    │                 ├──► platform/api ──► BFF
    │                 ├──► shared/admin-api
    │                 └──► lib
    └──► platform/auth

overview ──► capabilities/models (public summary hooks only)
domain A ──✕──► domain B (internals)
platform ──✕──► domains
shared   ──✕──► React / DOM / Node
src      ──✕──► server
server   ──✕──► src
~~~

Enforced with ESLint `boundaries` rules and a CI check once the BFF/domain split lands. A
violation is a build failure, not a review comment.

## 6. BFF design

### 6.1 Route shape

~~~text
GET    /api/health
GET    /api/meta
# Access login/logout/get-identity are edge routes, not BFF routes.

GET    /api/admin/capabilities
GET    /api/admin/capabilities/:id
PUT    /api/admin/capabilities/:id
POST   /api/admin/capabilities/:id/toggle
PUT    /api/admin/capabilities/:id/providers
GET    /api/admin/capabilities/:id/audit
GET    /api/admin/models
PUT    /api/admin/models/:id
POST   /api/admin/cache/invalidate
GET    /api/admin/users/:uid/ledger
GET    /api/admin/users/:uid/usage
POST   /api/admin/users/:uid/credits/grant
~~~

There is intentionally **no** `/api/admin/*` catch-all. Each route is registered explicitly
with its method, a Zod body/query schema, and a mapped upstream call.

The BFF source mirrors the same domains: `server/src/routes/{capabilities,models,users,operations}.ts`
and `server/src/gateway/mappers/{capabilities,models,users}.ts`. Access JWT verification lives
in `server/src/auth/`, not in a route module. Avoid a single `admin.ts` monolith; it becomes
the new layer-first bottleneck as the API grows.

### 6.2 Session model

- **Identity:** Cloudflare Access, using the same Zero Trust organization as SSH.
- **Login:** Access handles SSO/MFA and the allowlist policy before the SPA loads.
- **Session:** Access sets an HttpOnly `CF_Authorization` cookie. The console does not mint
  `__Host-bo_session` and does not store an identity token in the browser.
- **Identity read:** the SPA calls `GET /cdn-cgi/access/get-identity` on boot and on a protected
  navigation. A 401, opaque redirect, or non-JSON response means unauthenticated.
- **Logout:** `GET /cdn-cgi/access/logout` clears the Access session.
- **Expiry:** the next identity read fails/redirects; the router redirects to `/login`.
- **BFF:** when the admin API lands, the BFF validates `Cf-Access-Jwt-Assertion` (issuer,
  audience, JWKS, expiry) and uses the verified email for `X-Admin-Actor`. Access is not a
  substitute for the BFF's CSRF, route allowlist, or secret isolation.
- **Local development:** `import.meta.env.DEV` uses `VITE_DEV_AUTH_EMAIL`; production builds
  always use Access.

### 6.3 Request pipeline

~~~text
Request
  → request ID
  → security headers
  → origin check (non-GET)
  → Access JWT validation (issuer, audience, JWKS, expiry)
  → CSRF check (non-GET)
  → rate limit
  → route schema validation
  → upstream fetch (timeout, allowlist, auth, actor)
  → upstream status/error mapping
  → Zod parse + normalize
  → JSON response
~~~

Every stage returns the same error envelope. A failure never leaks an upstream body.

### 6.4 Static serving

In production the BFF serves:

- `/` and client routes → `dist/index.html` (SPA fallback)
- `/assets/*` → immutable hashed assets with long cache
- `/api/*` → API
- Any other path → 404

A reverse proxy (Caddy/Nginx) terminates TLS and forwards to the BFF. Only the proxy is
public; the Node port is bound to localhost.

## 7. Data flow

### 7.1 Read path

1. Route loads; `beforeLoad` ensures a Cloudflare Access identity.
2. Domain page calls a query hook.
3. Query calls the domain `api` module.
4. API module calls the typed client (`/api/...`).
5. BFF validates the Access JWT and forwards to the gateway with server credentials.
6. BFF parses/normalizes the upstream response with the shared Zod schema.
7. Browser parses the BFF response with the same schema (defense in depth).
8. Query caches by key; table renders loading/empty/error/data.

### 7.2 Mutation path

1. User edits a form; local Zod validation runs.
2. "Review changes" builds a before/after diff.
3. Confirmation dialog shows impact and actor.
4. Mutation sends the full payload; no optimistic cache update.
5. BFF validates, injects `X-Admin-Actor`, forwards.
6. Success: invalidate the affected query keys, refetch, toast with request ID.
7. Failure: map code to field/form error; keep form state; show request ID.
8. For credit grants, retry reuses the same `requestId`; a new intent gets a new one.

### 7.3 Cache invalidation map

| Mutation | Invalidate |
|---|---|
| Capability PUT | `capabilities`, `capabilities/{id}`, `capabilities/{id}/audit` |
| Toggle | same as PUT |
| Providers PUT | same as PUT |
| Model PUT | `models` |
| Cache invalidate | `capabilities`, `models` |
| Credit grant | `users/{uid}/ledger` |

No global cache clear. No optimistic writes. No mutation retries except the idempotent grant
retry initiated by the user.

## 8. State management

| State kind | Tool | Examples |
|---|---|---|
| Server state | TanStack Query | capabilities, models, ledger, usage, audit, session |
| URL state | TanStack Router search params + Zod | filters, search, tabs, cursor |
| Form state | React Hook Form + Zod | capability edit, model edit, grant |
| Ephemeral UI | `useState`/`useReducer` | dialog open, selected row, copy state |
| Cross-cutting UI prefs | Zustand + persist | theme, sidebar collapsed |
| Access identity | Query + router context | session, environment, redirect target |

No Redux. No global store for server data. No duplicated derived state that can drift.

## 9. Routing and code splitting

The route tree follows the operator domains and uses real URLs for tabs:

~~~text
/login
/
/capabilities
/capabilities/:capabilityId
/capabilities/:capabilityId/routing
/capabilities/:capabilityId/audit
/models
/users
/users/:uid/ledger
/users/:uid/usage
/operations
/settings
~~~

- Use nested routes instead of local tab state so deep links, refresh, breadcrumbs, and
  code-splitting work. A tab that cannot be linked is a hidden feature.
- TanStack Router is code-based today; split route declarations by domain as the route count
  grows. File-based routing is optional, not a requirement.
- Every domain page is lazy-loaded at the route boundary.
- The shell, Access guard, and shared UI are in the initial bundle.
- Search params are validated; invalid filters fall back to defaults and are replaced in the
  URL (no crash).
- Route context carries `session`, `environment`, and `queryClient`.
- A route-level `errorComponent` and `pendingComponent` are mandatory.
- 404 and 403 are real routes, not toasts.

## 10. Error handling and resilience

- React error boundary at the root and per route.
- Query errors are rendered as `ErrorState` with retry, not thrown to the boundary, except
  contract mismatches (which are bugs).
- A failed Access identity check redirects to `/login`.
- A 403 renders the forbidden page, not a generic error.
- An upstream 5xx shows "Gateway unavailable" with request ID and retry; it does not log the
  user out.
- Network offline: show an offline banner; queries pause/retry; mutations disabled.
- Contract mismatch: log a redacted event; show "Unexpected response" and request ID.

## 11. Build and runtime boundaries

| Concern | Browser | BFF |
|---|---|---|
| Env prefix | `VITE_*` only | full `process.env` via Zod |
| Secrets | none | admin secret, Access AUD (not secret) |
| Node APIs | no | yes |
| Static assets | yes | serves them |
| CSP | served by BFF/proxy | sets headers |
| Source maps | hidden in prod; upload to error tracker only | server maps private |

Production builds must fail if `ADMIN_API_SECRET` or any unexpected secret appears in
`dist/` (grep + bundle scan). Access identity is edge-provided.

## 12. Scaling the domain set

Adding an operator workflow is a repeatable change:

1. Write/update the requirement and acceptance criteria.
2. Add shared Zod schemas/types for any new payload.
3. Add the explicit BFF route + mapper (if a new endpoint).
4. Decide whether it belongs to an existing domain or justifies a new one.
5. Add the nested route(s), nav entry, and a thin route declaration.
6. Add fixtures, unit/integration/E2E coverage, and screenshots.

A new domain is justified only when the backend exposes a **new global resource** with its own
route, navigation entry, and ownership. An endpoint or a capability kind is not enough. If the
backend route does not exist, the UI is marked blocked; it does not invent a client-side
endpoint or fall back to mock data.

### 12.1 Domain vs subfeature

| Change | Where it goes |
|---|---|
| New capability kind (`chat`, `tts`, `stt`, `embeddings`, future kind) | No new domain. Add a field renderer/help entry in `features/capabilities/forms` and let the registry drive it. |
| New provider or model in a capability chain | `features/capabilities/components/routing`; no new domain. |
| New provider/model catalog behavior | `features/models`. |
| Ledger/usage/grant addition | `features/users` subfeature. |
| Cache invalidation, health, ops job | `features/operations`; jobs use a separate BFF secret. |
| Global audit feed | Promote `capabilities/audit` to `features/audit` if the backend adds a global route. |
| User directory/search | Kept in `features/users`: directory + ID/email lookup. Gateway data/API pending; no new domain. |
| Aggregate stats | Add a stats query to `features/overview` only when a real endpoint exists. |

### 12.2 What to change now

These are low-risk structural changes; do them before the next feature wave:

1. Rename `features/dashboard` to `features/overview` and keep the route `/`. “Dashboard”
   implies metrics the backend does not expose.
2. Create `shared/admin-api` now, before the BFF. One contract file per resource, not one
   schema dump.
3. When routing and audit are built, add `components/routing` and `components/audit` inside
   `features/capabilities`. Do not create top-level domains for them yet.
4. Keep `features/users` as the user-facing name; use `ledger`, `usage`, and `grant`
   subfolders internally.
5. Add `server/src/routes/<domain>.ts` and `gateway/mappers/<resource>.ts` when the BFF lands.
6. Add `eslint-plugin-boundaries` before the number of domains grows.
7. Convert capability/user tabs to nested routes as each tab gets deep-linkable.

Do not perform the entire target tree refactor in one commit before the BFF exists. Apply the
renames and subfolders as the relevant feature lands.

### 12.3 Anti-patterns

- A feature per capability kind (`features/chat`, `features/tts`, …).
- A feature per endpoint.
- A global `services/` or `hooks/` dumping ground.
- Separate top-level domains for providers and audit before a global backend resource exists.
- Duplicate query keys in overview.
- Treating `settings` as a backend domain.
- Hiding the shared-secret boundary behind a generic browser proxy.

The scale test: **adding a capability kind or provider should require zero new domains; adding
a truly global backend resource may add one.**



## 13. Testing seams

- **Fetch-level fake gateway** is used only by BFF contract tests; no runtime mock exists.
- **Hono `app.request`** tests the BFF without a browser.
- **Playwright** (pending) runs the real BFF and gateway.
- **Shared schemas** are the contract test surface: every real response is parsed.
- **Domain public API** is the unit boundary; internal components can still be tested
  directly.

See [09-testing-strategy.md](09-testing-strategy.md).

## 14. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Next.js full-stack | No SEO/SSR need; heavier runtime; BFF would still be needed for secret isolation; Vite is faster to operate |
| Browser → gateway directly | Secret exposure, no CORS/admin session, no actor identity |
| Nginx injecting a static admin header | No per-operator identity/session; a static route is an unauthenticated admin proxy |
| Generic `/api/proxy/*` | Turns the BFF into an SSRF/open-proxy surface; no schema validation |
| Redux Toolkit | Server state is the hard part; Query + URL + RHF covers it with less ceremony |
| Component library (MUI/AntD) | Conflicts with shadcn ownership and the chosen token system |
| Micro-frontends | One team, one deployable; feature folders are enough |
| Separate repos for web/BFF | Shared schemas and atomic deploy are more valuable than independent release cadence at this size |

## 15. Related decisions

- [ADR-0001](adr/0001-vite-react-spa.md) — Vite SPA.
- [ADR-0002](adr/0002-bff-for-admin-api.md) — BFF boundary.
- [ADR-0003](adr/0003-feature-based-architecture.md) — feature folders and boundaries.
- [ADR-0004](adr/0004-shadcn-owned-components.md) — shadcn ownership.
- [ADR-0005](adr/0005-tanstack-query-router-table.md) — routing/server state/table.
- [ADR-0006](adr/0006-branching-and-deployments.md) — branches and environments.
- [ADR-0007](adr/0007-mock-first-contract.md) — mock-first integration.
- [ADR-0008](adr/0008-cloudflare-access-auth.md) — Cloudflare Access identity.
