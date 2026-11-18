---
name: code-style
description: This repo's TypeScript and file conventions: strict typing, naming, imports/aliases, formatting, comments, React symbol style, error/async patterns, and commit/doc writing. Load before writing or reviewing code so it matches the existing style.
---

# Code style and writing conventions

## Use this skill when

- Writing a new module, component, hook, route, or test.
- Reviewing a diff for consistency with the existing codebase.
- Unsure how to name a file, symbol, query key, schema, or commit.

`docs/08-engineering-standards.md` is authoritative; this skill is the practical digest plus
the current codebase's actual style (which matters more than an unrelated format preference).

## TypeScript

- Strict mode; `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- No `any`. At boundaries use `unknown` + a Zod schema/guard; never cast parsed JSON with `as`.
- Prefer `type` aliases for data shapes (`type ProviderStatus = z.infer<...>`); avoid enums —
  use string unions or `as const` objects.
- Type-only imports: `import type { Foo } from "..."`.
- Dates cross boundaries as ISO strings; convert with `Intl.DateTimeFormat` at the edge. No
  `Date` objects in query keys or payloads.
- Credits/money are integers. IDs are opaque; treat numeric ledger ids as strings in UI code.
- Avoid non-null assertions (`!`) unless the invariant is obvious and local; prefer guards.
- Use `?.`/`??` for nullable wire data. Do not invent defaults for fields the gateway has not
  supplied — make the absence visible (optional schema field + honest UI state).
- Exported pure helpers get a short JSDoc only when the contract is not obvious from the name.

## File and symbol naming

| Kind | Convention | Example |
|---|---|---|
| React component file | kebab-case | `provider-card.tsx` |
| Component symbol | PascalCase | `ProviderCard` |
| Hook | `use-*.ts` / `useX` | `use-route-editor.ts` / `useRouteEditor` |
| API module | `<domain>.api.ts` | `providers.api.ts` |
| Query module | `<domain>.queries.ts` | `providers.queries.ts` |
| Mutation module | `<domain>.mutations.ts` | `providers.mutations.ts` |
| Pure logic | kebab-case in `lib/` | `provider-status.ts` |
| Test | `*.test.ts` next to the unit | `provider-status.test.ts` |
| Zod schema | `<thing>Schema` | `providerInputSchema` |
| Query-key factory | `<domain>Keys` | `providerKeys` |
| Page | `<domain>-page.tsx` / `Page` export | `providers-page.tsx` / `ProvidersPage` |

- No `index.ts` barrels inside a domain except its public entry point (`features/<domain>/index.ts`).
- Booleans read as `is/has/can/should`; handlers are `handleX` (local) or `onX` (prop).
- No abbreviations that are not already domain language (`uid`, `api`, `id` are fine).

## Imports and aliases

- Browser/build imports: `@/*` → `src/*`, `@shared/*` → `shared/*`.
- Server (NodeNext) imports: relative paths with `.js` extensions (`./routes/admin.js`); server
  imports the contract via `../../../shared/admin-api/index.js`. This deep path is required by
  NodeNext and is the documented exception to "no deep relative climbs".
- Order: Node/built-ins, external packages, `@shared/`, `@/` modules, relative imports; blank
  line between groups. Follow the surrounding file rather than re-sorting a whole file.
- No circular imports. A domain imports another domain only through its public `index.ts`
  (only `overview` is allowed to compose other domains).
- `shared/admin-api` may import only `zod` — no React, DOM, Node, or `src/`.

## Formatting

- 2 spaces, double quotes, semicolons, trailing commas where the surrounding code has them.
- Prettier is **not installed**; do not reformat unrelated code or change quote/semicolon
  style in a feature diff. Match the file you are editing.
- Keep lines readable; the repo wraps long conditions/props onto multiple lines rather than
  enforcing a hard column.
- No inline `eslint-disable` without a comment explaining why and a follow-up issue.

## React and component style

- Named exports for components and pages; the domain `index.ts` exports the page symbols that
  the router lazily imports by name.
- Props as a `type` alias; no `React.FC`; no `defaultProps`; `ref` is a normal prop (React 19).
- Presentational components take data + callbacks and do not fetch, know query keys, or mutate
  cache. Container pages own route params + queries + state selection.
- Hooks stay inside `hooks/`; pure logic goes in `lib/` so it can be unit-tested.
- Do not use `useEffect` to derive/copy state; derive during render or select from the query.
  `void promise` is used deliberately for fire-and-forget navigation/cache calls; don't leave
  unhandled promises otherwise.
- Comments in JSX should explain a non-obvious accessibility/layout decision, not restate the
  markup.

## Errors and async

- Throw/return typed errors (`HttpError` on the server, `ApiError` in the browser); never
  swallow an error silently. Best-effort cleanup (localStorage, optional enrichment) may catch
  with an explanatory comment.
- Client-facing errors map to inline fields/dialogs; include the request ID for unexpected
  failures; never show stack traces or upstream bodies.
- Mutations are pessimistic and never auto-retried. Queries may retry once (global default).
- Guard async route params/queries with loading/error branches; no floating promises in
  effects/event handlers.

## Tests

- `describe` the behavior, `it` states the expected outcome in plain language.
- Table-driven cases for edge values; assert outputs, not implementation details.
- Test names and file placement follow the module: `lib/x.test.ts`, `hooks/use-x.test.ts`.
- Do not add snapshot tests for business logic.

## Comments and docs

- Comments explain **why**, constraints, and non-obvious tradeoffs; no commented-out code, no
  banner comments, no "TODO" without an owner/context.
- Public helpers and tricky invariants get a short JSDoc; keep it current when behavior changes.
- Documentation writing follows `.agents/skills/docs-and-plan-workflow/SKILL.md`: sentence
  case headings, tables for matrices, explicit status, relative links, no secrets.
- Update the requirement/doc in the same PR as a behavior change; update a stale skill too.

## Commits and branches

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`.
- Imperative subject, scoped where useful (`feat(app-clients): …`), body explains why when
  non-obvious. Squash merge with the PR title as the subject.
- Branches: `feature/<slug>` or `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
  PRs target `development`; `master` deploys production.

## Review checklist

- [ ] No `any`, no unchecked casts, no raw colors, no `fetch` in components.
- [ ] Names/files match the table; public surface is explicit.
- [ ] Import groups/aliases consistent; no new circular dependency.
- [ ] Errors surfaced with the request ID; no swallowed failures.
- [ ] Comments explain why; no commented-out code or stale docs.
- [ ] Unrelated formatting untouched.
- [ ] Docs/skills updated when a convention or behavior changed.

## References

- `docs/08-engineering-standards.md` — authoritative standards (naming, forms, a11y, DoD).
- `docs/16-react-architecture.md` — composition and React 19 rules.
- `AGENTS.md` — architecture rules, branch policy, workflow.
