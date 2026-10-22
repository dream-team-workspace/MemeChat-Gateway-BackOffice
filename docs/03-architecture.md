# 03 — Architecture

| Field | Value |
|---|---|
| Status | Proposed (Phase 0) |
| Scope | Web console + Backend-for-Frontend (BFF) |
| Depends on | [Backend contract analysis](02-backend-contract-analysis.md), [DESIGN.md](../DESIGN.md) |
| Decisions | ADR-0001..0007 |

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
               │ cookie session + CSRF header
               ▼
┌──────────────────────────────┐
│ BFF (Hono on Node)           │
│  - Access JWT validation    │
│  - session cookie            │
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

- `Authorization: Bearer <ADMIN_API_SECRET>` — a long-lived shared secret.
- `X-Admin-Actor: <operator>` — an audit identity the browser cannot be trusted to invent.
- No browser CORS/session model.

Embedding the secret in the SPA, a source map, a service worker, or a build-time `VITE_*`
variable would hand full admin power to anyone who opens DevTools. A reverse proxy that
injects a static header has the same problem plus no per-operator identity. The BFF is the
smallest component that can authenticate a human, keep the secret server-side, attribute
each mutation, restrict the callable surface, and normalize the contract.

## 3. Runtime responsibilities

### 3.1 Browser SPA

- Render routes and feature UI.
- Manage server state with TanStack Query.
- Validate forms with Zod/RHF.
- Never read or store the admin secret.
- Never call the gateway origin.
- Treat the BFF as the only API.

### 3.2 BFF

- Serve the built SPA (in production) and `/api/*`.
- Validate the Cloudflare Access JWT; enforce the Access policy.
- Issue an HttpOnly, Secure, SameSite=Lax session cookie.
- Enforce CSRF (Origin + double-submit token) on non-GET.
- Enforce a method+path allowlist; no generic proxy.
- Inject `Authorization` and `X-Admin-Actor`; propagate/generate `X-Request-Id`.
- Bound body size, timeouts, and retries.
- Parse upstream responses with shared Zod schemas and normalize casing/pagination.
- Redact logs; never log bodies, cookies, secrets, or raw UIDs.
- Rate-limit login and mutations.

### 3.3 Gateway

- Owns authorization semantics, validation, revision bumps, audit writes, cache invalidation.
- Is the source of truth for money and routing.
- May be unavailable or contract-incomplete; the BFF must surface that honestly.

## 4. Repository layout (target)

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
shell. It may import features' public entry points. It contains no business logic.

### 5.2 Route layer (`src/routes`)

Thin adapters between URLs and feature pages:

- parse/validate search params
- call `ensureSession` / permission guards
- set document title and breadcrumbs
- render a feature page inside `AppShell`
- declare route-level pending/error components

Routes do not fetch directly, map API data, or contain forms.

### 5.3 Feature layer (`src/features/<name>`)

A vertical slice with a **public API** (`index.ts`) and private internals:

~~~text
features/capabilities/
├─ api/
│  ├─ capabilities.api.ts       # BFF calls, Zod parse
│  ├─ capabilities.queries.ts   # query options + keys
│  └─ capabilities.mutations.ts # mutation options + invalidation
├─ components/
│  ├─ capability-table.tsx
│  ├─ capability-form.tsx
│  ├─ provider-chain-editor.tsx
│  ├─ kill-switch-dialog.tsx
│  └─ audit-diff.tsx
├─ hooks/
│  └─ use-capability-filters.ts
├─ pages/
│  ├─ capabilities-page.tsx
│  ├─ capability-detail-page.tsx
│  └─ capability-audit-page.tsx
├─ lib/
│  └─ capability-form-schema.ts
├─ types.ts
├─ index.ts                     # only pages/components intended for routes
└─ __tests__/
~~~

Rules:

- Everything inside the feature is private except what `index.ts` exports.
- One feature may not import another feature's internals. Shared behavior moves to
  `components/common` or `shared/`.
- Feature API modules are the only place that call `fetch`/the typed client.
- Feature components do not know about query keys or cache invalidation; hooks/api do.
- A feature may be deleted by deleting its folder and its route files, with no orphaned
  imports elsewhere (except nav registration).

### 5.4 Shared layer

| Location | Allowed contents | Forbidden |
|---|---|---|
| `components/ui` | shadcn primitives, local patches | Feature logic, API calls |
| `components/common` | PageHeader, DataTable, ConfirmDialog, EmptyState, ErrorState, StatusBadge, JsonViewer, CopyButton, DiffView | Feature-specific labels/data |
| `components/layout` | Sidebar, Topbar, EnvironmentBadge, UserMenu | Feature forms |
| `lib` | fetch client, formatters, env, cn | React components |
| `shared` | Zod schemas, types, endpoint constants, error codes | React, DOM, Node APIs |

`shared/` is the contract seam. It must be importable by both Vite and Node, so it may not
import `react`, `server/`, or `src/`.

### 5.5 Dependency direction

~~~text
routes ──► features ──► components/common ──► components/ui
  │            │               │
  │            └──────────────► lib
  └───────────────────────────► app

features ──► shared
server   ──► shared
src      ──► shared
src      ──✕──► server
server   ──✕──► src
feature A ──✕──► feature B (internals)
~~~

Enforced with ESLint `boundaries` rules and a CI check. A violation is a build failure, not
a review comment.

## 6. BFF design

### 6.1 Route shape

~~~text
GET    /api/health
GET    /api/auth/login
GET    /api/auth/callback
POST   /api/auth/logout
GET    /api/auth/me

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
  → session parse
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

1. Route loads; `beforeLoad` ensures a session.
2. Feature page calls a query hook.
3. Query calls feature `api` module.
4. API module calls the typed client (`/api/...`).
5. BFF validates the session and forwards to the gateway with server credentials.
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
| Auth | Query + router context | session, redirect target |

No Redux. No global store for server data. No duplicated derived state that can drift.

## 9. Routing and code splitting

- TanStack Router file-based routes; route files are thin.
- Every feature page is lazy-loaded at the route boundary.
- The shell, auth guard, and shared UI are in the initial bundle.
- Search params are validated; invalid filters fall back to defaults and are replaced in the
  URL (no crash).
- Route context carries `session`, `environment`, and `queryClient`.
- A route-level `errorComponent` and `pendingComponent` are mandatory.
- 404 and 403 are real routes, not toasts.

## 10. Error handling and resilience

- React error boundary at the root and per route.
- Query errors are rendered as `ErrorState` with retry, not thrown to the boundary, except
  contract mismatches (which are bugs).
- A failed session check redirects to login with a safe `returnTo`.
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

## 12. Scaling the feature set

Adding a feature is a repeatable six-step change:

1. Write/update the requirement file and acceptance criteria.
2. Add shared Zod schemas/types for any new payload.
3. Add the explicit BFF route + mapper (if a new endpoint).
4. Create `src/features/<name>/` with api, components, pages, index.
5. Add thin route files, nav entry, and route tests.
6. Add MSW fixtures, unit/integration/E2E coverage, and screenshots.

If step 3 is impossible because the backend route does not exist, the feature stays mock-only
and is marked **blocked** in the roadmap. It does not invent a client-side endpoint.

## 13. Testing seams

- **MSW** intercepts browser/BFF HTTP for unit and component tests.
- **Hono `app.request`** tests the BFF without a network.
- **Playwright** runs the real BFF in mock mode or against staging.
- **Shared schemas** are the contract test surface: every fixture and real response is parsed.
- **Feature public API** is the unit boundary; internal components can still be tested
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
