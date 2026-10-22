# 04 — Tech stack

| Field | Value |
|---|---|
| Status | Proposed |
| Versions checked | 2026-10-21 against the npm registry |
| Policy | Pin exact versions in `package-lock.json`; majors require an ADR |

## 1. Summary

A **single npm package** with two runtimes:

- `src/` — React 19 + TypeScript SPA built by Vite.
- `server/` — Hono BFF on Node, built by TypeScript, serving the SPA in production.
- `shared/` — Zod schemas and types used by both.

This keeps deployment atomic and the contract in one place without a monorepo tool.

## 2. Choices

### 2.1 Runtime and language

| Concern | Choice | Version | Why |
|---|---|---|---|
| Runtime (CI/prod) | Node.js LTS | 24.x | Vite 8 requires Node ≥20.19/22.12; 24 LTS is supported by the ecosystem and GitHub Actions. Local Node 26.5 is compatible. |
| Package manager | npm | 11.x | Already present, lockfile-based, no extra tool; workspaces not needed |
| Language | TypeScript | 6.0.3 (pinned) | Strict typing, type-only imports. The template pins 6.0.3; TS 7 is deferred until the ESLint/TanStack toolchain is verified together, then recorded in an ADR. |
| Module format | ESM | — | Vite, Hono, and modern Node all use ESM; no dual-package complexity |

### 2.2 Browser application

| Concern | Choice | Version | Why |
|---|---|---|---|
| UI runtime | React + React DOM | 19.3.x | Stable concurrent features, ecosystem, team familiarity |
| Build tool | Vite | 8.3.x | Fast dev server, native ESM, first-class Tailwind v4 plugin, static output |
| Styling | Tailwind CSS + @tailwindcss/vite | 4.3.x | CSS-first config, semantic tokens, no PostCSS chain |
| Component source | shadcn-style primitives owned in the repo; shadcn CLI when adding registry components | CLI 4.22.x | Open code, owned components, accessible primitives |
| Icons | lucide-react | 1.61.x | Consistent, tree-shakeable, shadcn default |
| Toasts | sonner | 2.0.x | shadcn's current toast primitive, accessible live regions |
| Animation helper | tw-animate-css | 1.4.x | shadcn-compatible utilities without a runtime animation library |

### 2.3 Routing, data, tables, forms

| Concern | Choice | Version | Why |
|---|---|---|---|
| Router | TanStack Router + plugin | 1.170.x | Type-safe routes and search params, route-level guards, lazy routes |
| Server state | TanStack Query | 5.104.x | Cache, retries, invalidation, devtools; no global store needed |
| Tables | TanStack Table | 9.3.x | Headless sorting/filtering/pagination; works with shadcn table |
| Forms | React Hook Form | 7.90.x | Minimal re-renders, uncontrolled inputs, shadcn Form integration |
| Validation | Zod | 4.6.x | Shared runtime schemas for forms and API contracts |
| Resolver | @hookform/resolvers | 6.0.x | Zod + RHF integration |
| UI state | Zustand | 5.0.x | Only theme/sidebar prefs; no server data |
| Class utilities | clsx + tailwind-merge + CVA | current | shadcn conventions; `cn()` and typed variants |

### 2.4 BFF

| Concern | Choice | Version | Why |
|---|---|---|---|
| HTTP framework | Hono | 4.13.x | Small, Web-standard, excellent testability via `app.request` |
| Node adapter | @hono/node-server | current | Serve HTTP + static assets |
| Access JWT | jose | current | Verify Cloudflare Access tokens in the BFF (JWKS, issuer, audience) |
| JWT/session signing | jose | current | Standards-based JWS/JWE; no custom crypto |
| Env validation | Zod | 4.6.x | Fail fast on missing/unsafe config |
| Logging | pino | current | Structured JSON with redaction hooks |

### 2.5 Testing and quality

| Concern | Choice | Version | Why |
|---|---|---|---|
| Unit/component runner | Vitest | 5.0.x | Vite-native, fast, ESM |
| Component testing | Testing Library + user-event | 16.3.x / 14.6.x | User-centric queries |
| HTTP mocking | MSW | 3.0.x | Same handlers in browser, Node, and Playwright |
| E2E | Playwright | 1.64.x | Cross-browser, tracing, visual screenshots |
| Accessibility | axe-core + @axe-core/playwright + vitest-axe | current | Automated WCAG checks in unit and E2E |
| Lint | ESLint + typescript-eslint + React hooks/refresh plugins | 10.13.0 / 8.72.0 | Flat config, typed rules; `npm run lint` is the CI PR check |
| Formatting | Prettier + Tailwind plugin | planned | Not installed yet; add before enforcing a format check |
| Boundary linting | eslint-plugin-boundaries | current | Enforce feature/folder dependency rules |

### 2.6 Delivery

| Concern | Choice | Why |
|---|---|---|
| Container | Multi-stage Docker, Node 24 Alpine build, distroless Node runtime | Small, non-root, no shell in production |
| Registry | GHCR | Native GitHub permissions, immutable SHA tags |
| Reverse proxy | Caddy or Nginx on the server | TLS, HTTP/2, compression, security headers |
| CI | GitHub Actions | Native to the remote, environments and approvals |
| Artifact | One image containing BFF + `dist/` | Atomic web/API version, simple rollback |

## 3. Versions are a snapshot, not a mandate

The versions above are the current stable set at planning time. At scaffold time:

1. Re-check the latest patch/minor.
2. Pin exact versions in `package.json` and commit `package-lock.json`.
3. Run the full verify pipeline.
4. Record any major deviation in an ADR.

Do not float ranges in production. Do not upgrade a major inside a feature PR.

## 4. Explicitly rejected

| Rejected | Reason |
|---|---|
| Next.js / Remix / TanStack Start | No SSR/SEO requirement; the BFF already handles server concerns; adds runtime complexity |
| Create React App | Deprecated tooling; Vite is the supported path |
| Redux / MobX | Server state + URL + form state cover the app; a global store would duplicate Query |
| Axios | Native `fetch` + a small typed client is enough; fewer dependencies |
| Formik | RHF has better performance and shadcn integration |
| Moment.js | Native `Intl` covers formatting; no large date library needed |
| Lodash | Native array/object methods cover the needs; avoid bundle weight |
| MUI / Ant Design / Chakra | Conflicts with shadcn ownership and the token system |
| CSS-in-JS | Tailwind + CSS variables is the chosen styling model |
| Storybook (v1) | Useful later for the design system; not required to ship the console. Revisit in Phase 4. |
| Recharts (v1) | No aggregate API to chart; adding charts would encourage fake data. Add only with a real endpoint. |
| Sentry (v1) | Error tracking is desirable but requires a vendor/DSN decision; design the hook now, integrate in Phase 4. |
| pnpm / Turborepo | Single package; npm is sufficient. Revisit only if a second app appears. |

## 5. Browser and language targets

- Evergreen Chrome, Edge, Firefox, Safari (last two major versions).
- No Internet Explorer, no legacy Edge.
- Target ES2022; Vite handles transpilation for the supported baseline.
- CSS: modern layout (grid/flex), `oklch()` with sRGB fallbacks if analytics show older
  browsers; test in Safari.
- Minimum viewport: 768px for full operations; 360px must remain functional for read-only
  checks and emergency kill switch.

## 6. Fonts

- Open Sans variable, self-hosted via `fontsource-variable/open-sans` (or the current
  `fontsource` package).
- Menlo is a system font; fall back to `ui-monospace`.
- Subset to Latin; preload the 400/600/700 weights used above the fold.
- No Google Fonts runtime request (CSP and privacy).

## 7. Environment variables (summary)

Browser (build-time, public):

- `VITE_APP_ENV` — `development|staging|production`
- `VITE_API_BASE_URL` — normally `/api`
- `VITE_ENABLE_MOCKS` — `true` only for local/test
- `VITE_ERROR_REPORTING_DSN` — optional, non-secret

BFF (runtime, secret):

- `NODE_ENV`, `PORT`, `APP_ORIGIN`
- `ADMIN_API_BASE_URL`, `ADMIN_API_SECRET`
- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`
- `VITE_DEV_AUTH_EMAIL` (development only)
- `DEV_AUTH_BYPASS` — local only; startup rejects in production
- `ADMIN_API_MODE` — `live|mock`; production must be `live`
- `LOG_LEVEL`, `REQUEST_TIMEOUT_MS`, `TRUST_PROXY`

Full matrix and deployment values: [10-ci-cd-and-environments.md](10-ci-cd-and-environments.md).

## 8. Version policy

- Patch/minor updates: automated PR, must pass verify + E2E.
- Major updates: ADR, migration notes, manual QA on core flows.
- Security fixes: prioritized regardless of cadence.
- Lockfile is committed; CI uses `npm ci`.
- GitHub Actions pinned to major versions (or SHAs for third-party actions); Dependabot
  enabled for npm and actions.
