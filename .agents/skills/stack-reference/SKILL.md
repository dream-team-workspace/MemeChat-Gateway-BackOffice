---
name: stack-reference
description: Current version-specific guidance and official references for the pinned stack (React 19.3, Vite 8, TypeScript 6, Zod 4, TanStack Router/Query, Hono 4, Tailwind 4, Vitest 5, jose, Cloudflare Access). Load before relying on memory or upgrading a major.
---

# Stack reference and version guidance

## Use this skill when

- A change depends on how a library actually behaves (not how it behaved two majors ago).
- You are considering a dependency upgrade or adding a library.
- Lint/types/tests fail in a way that smells like a version-specific API change.

Always verify against the official docs linked in
[references/sources.md](references/sources.md) before trusting memory. `docs/04-tech-stack.md`
is the repository policy; this skill records what is true for the pinned versions checked on
2026-11-14.

## Version currency (checked 2026-11-14)

| Package | Pinned here | Latest at check | Action |
|---|---|---|---|
| react / react-dom | 19.3.1 | 19.3.1 | current |
| vite | 8.3.5 | 8.3.8 | patch behind |
| typescript | 6.0.3 | 7.0.2 | intentionally on 6; TS 7 needs an ADR/toolchain check |
| vitest | 5.0.5 | 5.1.0 | minor behind |
| zod | 4.6.7 | 4.6.7 | current |
| hono | 4.13.13 | 4.13.18 | patch behind |
| @hono/node-server | 2.1.5 | 2.1.8 | patch behind |
| @tanstack/react-router | 1.170.45 | 1.170.46 | patch behind |
| @tanstack/react-query | 5.104.5 | 5.107.1 | minor behind |
| tailwindcss / @tailwindcss/vite | 4.3.3 | 4.3.5 | patch behind |
| react-hook-form | 7.90.0 | 7.92.0 | minor behind |
| jose | 6.2.13 | 6.2.17 | patch behind |
| eslint | 10.13.0 | 10.15.0 | minor behind |

Policy: exact pins + committed lockfile; patches/minors via a verify-passing PR; majors need an
ADR and a dedicated change, never inside a feature PR. Check the changelog before moving.

## React 19.3 (pinned 19.3.1)

- `ref` is a normal prop on function components; `forwardRef` is unnecessary and deprecated.
- Context can be rendered as `<Context value=...>`; read with `use(Context)` (can be called
  conditionally). Repo already uses both (`Tabs`, `ThemeProvider`).
- `use()` reads promises/context in render; `useActionState`, `useOptimistic`, form Actions
  exist but this console uses TanStack Query + RHF/controlled forms, not React Actions.
- React 19.2 added `useEffectEvent` (event logic inside effects that reads latest values; not a
  dependency) and `<Activity mode="visible|hidden">` (hide/restore UI while keeping state).
  Use them only when the use case is real; the current code does not use Activity.
- React 19.3 added `<ViewTransition>` / `addTransitionType` (View Transitions), Fragment refs,
  and `react-dom`'s `browser()` for browser-only suspending subtrees. None are required here;
  do not introduce them ad hoc.
- StrictMode is on (dev double-effects); ref callbacks may double-invoke. Effects must be
  idempotent and clean up.
- The React Compiler is not installed; do not rely on automatic memoization.

## Vite 8 (pinned 8.3.5)

- Vite 8 uses **Rolldown** (Rust) as the single bundler and **Oxc** for transforms/minify;
  Rollup/esbuild are compatibility shims. `build.rollupOptions` is deprecated in favor of
  `build.rolldownOptions`; the object form of `output.manualChunks` is removed (use a function
  or Rolldown `codeSplitting`); `build.commonjsOptions` is a no-op.
- Node requirements: 20.19+ / 22.12+ (repo CI uses Node 24). ESM-only distribution.
- Current `vite.config.ts` is simple (react + tailwind plugins, aliases, dev proxy,
  `allowedHosts`) and does not use the removed options. If you add build config, use the new
  keys and verify with `npm run build`.
- Default browser targets moved up (Chrome 111 / Safari 16.4); the repo targets evergreen
  browsers per `docs/04-tech-stack.md`.

## TypeScript 6.0 (pinned 6.0.3)

- New defaults: `strict: true`, `module: esnext`, `target` = current-year ES, `types: []`,
  `rootDir` defaults to the tsconfig directory, `noUncheckedSideEffectImports: true`.
  Most projects must set `"types": ["node"]` and an explicit `rootDir`.
- Deprecated (still works with `ignoreDeprecations: "6.0"`, removed in TS 7): `target: es5`,
  `moduleResolution: node/node10`, `amd/umd/systemjs` modules, `baseUrl`, `outFile`,
  `esModuleInterop: false` / `allowSyntheticDefaultImports: false`.
- Repo setup: browser tsconfig uses `moduleResolution: "Bundler"`, `types: ["vite/client",
  "node"]`; server tsconfig uses `module/moduleResolution: "NodeNext"`, `rootDir: ".."`,
  `types: ["node"]`, and `.js` extensions in relative imports. Keep that split.
- TS 7 (native port) is out but the repo intentionally stays on 6.0.3 until the ESLint and
  TanStack toolchain is verified; any move is a separate ADR-level change.

## Zod 4.6 (pinned 4.6.7)

- String formats moved to the top level: `z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`,
  `z.ipv4()`, etc. Method forms (`z.string().email()`) still work but are deprecated.
- `z.record()` requires key **and** value schemas; single-argument usage is gone.
- Error-message option is `error` (not `message`); `errorMap`/`invalid_type_error`/
  `required_error` are removed in v4. `ZodError.format()`/`.flatten()` are deprecated in favor
  of `z.treeifyError`/`z.flattenError`.
- `.strict()`/`.passthrough()` → `z.strictObject`/`z.looseObject`; `.merge()` → `.extend()`;
  `z.nativeEnum` → `z.enum`.
- Repo state: most existing schemas use the deprecated method spellings (they parse fine). New
  code should use top-level formats; convert old files only in a dedicated cleanup, not mixed
  into behavior changes. `z.record(z.string(), z.unknown())` is already v4-correct.
- Use `.catch(fallback)` for URL/search defaults so malformed params never break a page.

## TanStack Router (pinned 1.170.45)

- The repo uses **code-based routing** in `src/app/router.tsx` (`createRootRoute`,
  `createRoute`, `getParentRoute`, `routeTree`, `createRouter({ routeTree, defaultPreload:
  "intent" })`). The Router docs recommend file-based routing for most apps; the code-based
  choice is deliberate and documented here. Do not migrate routing as part of a feature.
- Lazy components: `lazyRouteComponent(() => import("@/features/x"), "NamedExport")` (the
  named export is required because domain entry points export named pages).
- `beforeLoad` runs before children load; `throw redirect({ to, params })` for auth/redirects.
  `isRedirect` exists if you catch errors around auth checks.
- Search params: define a Zod schema and pass it as `validateSearch` (Zod 4 schemas are
  accepted directly; `@tanstack/zod-adapter` is only for Zod 3 and is not installed).
  Read via `useSearch({ from })` / `getRouteApi`; use `.catch()` defaults.
- Route context is not used today; `ensureSession()` is called in `beforeLoad` instead. Keep
  that pattern unless adding real router context.
- `errorComponent`/`pendingComponent`/`notFoundComponent` are route options; the root and app
  routes already provide `RouteError` + `NotFoundPage`.

## TanStack Query v5 (pinned 5.104.5)

- Single object signature for `useQuery`/`useMutation`/`queryClient.*`; `queryOptions()` is the
  recommended way to share `queryKey`+`queryFn` with type inference.
- Query-level `onSuccess`/`onError`/`onSettled` were removed in v5; use the mutation lifecycle
  and cache invalidation instead. `gcTime` replaced `cacheTime`; `isPending` replaced
  `isLoading` for mutations/query pending states (`isLoading = isPending && isFetching`).
- Invalidate with the object form: `invalidateQueries({ queryKey })`.
- Repo defaults: `staleTime: 15_000`, `retry: 1`, no focus refetch, mutations `retry: 0`.
  Keep mutations pessimistic; no automatic retry for non-idempotent writes.

## Tailwind CSS 4.3 (pinned 4.3.3)

- CSS-first configuration: `@import "tailwindcss";` + `@theme { ... }`; no
  `tailwind.config.js`. Theme variables drive utilities; regular CSS vars can stay in `:root`.
- `@custom-variant dark (&:is(.dark *));` implements class dark mode (repo uses it).
- `@theme inline` maps `--color-*` to `var(--token)` utilities; the token block in
  `src/styles/globals.css` is the runtime source of truth.
- Built-in Vite plugin: `@tailwindcss/vite` in `vite.config.ts`; content detection is automatic
  (no `content` array). Other directives: `@utility`, `@variant`, `@apply`, `@source inline()`.
- Hover is gated to hover-capable devices in v4; don't depend on hover for functionality.

## Hono 4.13 (pinned 4.13.13) + Node adapter 2.1.5

- `new Hono<AppEnv>()`, `app.get/post/put/delete`, `app.route("/prefix", subApp)`,
  `app.use` middleware and `app.onError` for the error envelope. Middleware runs in
  registration order; handlers stop dispatch when they return a Response.
- `app.request(path, init)` is the supported test entry (no network); it returns a standard
  `Response`. Use it for BFF contract tests.
- Node: `serve({ fetch: app.fetch, hostname, port }, cb)` from `@hono/node-server`; graceful
  shutdown closes the returned server. `serveStatic` from `@hono/node-server/serve-static`
  serves `dist/`.
- NodeNext + ESM: server-relative imports need `.js` extensions (`./routes/admin.js`), while
  `shared/` uses explicit `.js` in its own index re-exports. Vite/browser imports omit them.

## Vitest 5 (pinned 5.0.5)

- Requires Vite ≥6.4 and Node ≥22.12; `vite` is a peer dependency (npm installs it).
- `clearMocks` now defaults to `true`; inline projects inherit the root config by default;
  hoisted `vi.mock` calls must be at module top level (nested usage throws).
- Artifacts (HTML/JSON/JUnit, screenshots) default under `.vitest/`; reporters may write files
  instead of stdout.
- Repo config: node environment, includes `server/**/*.test.ts`, `shared/**/*.test.ts`,
  `src/**/*.test.ts`, `restoreMocks: true`, fixed fake env. Component testing would require a
  jsdom project/environment and `.test.tsx` includes — that setup does not exist yet.

## jose 6 + Cloudflare Access

- Verify the `Cf-Access-Jwt-Assertion` header (not the cookie; the cookie is not guaranteed to
  be forwarded) with `createRemoteJWKSet(new URL("https://<team>.cloudflareaccess.com/
  cdn-cgi/access/certs"))` + `jwtVerify(token, JWKS, { issuer: "https://<team>.cloudflareaccess.com",
  audience: CF_ACCESS_AUD })`.
- Access rotates signing keys (default 6 weeks, old keys valid 7 days); remote JWKS handles the
  rotation. Never hard-code a public key or read `public_cert`.
- Browser identity: `GET /cdn-cgi/access/get-identity` (same-origin behind Access) returns
  `email`, `name`, `idp`, `iat`, etc.; logout is `GET /cdn-cgi/access/logout`. There is no
  app-owned session or token in the browser.
- The BFF still owns the Origin check, route allowlist, secret isolation, and actor header.

## React Hook Form 7.92 (pinned 7.90.0)

- `useForm` + resolver; `formState` is a Proxy, read it before render to subscribe; `isDirty`
  needs `defaultValues`; `isSubmitting` is true only while the returned promise is pending.
- Repo uses a custom `zodResolver` (`src/lib/zod-resolver.ts`), not `@hookform/resolvers`
  (not installed). Most dialogs use controlled `useState` + `schema.safeParse`. Keep the local
  pattern; if you add RHF, use the custom resolver.

## Upgrade checklist

- [ ] Read the official changelog/migration guide for the exact major.
- [ ] Confirm Node/Vite peer requirements and CI Node version.
- [ ] Patch/minor: bump pinned versions + lockfile, run lint/typecheck/test/build, update
      `docs/04-tech-stack.md` if the version table changes.
- [ ] Major: ADR with motivation, migration notes, risk, rollback; separate PR.
- [ ] Re-verify the parts of this skill the upgrade changes.
