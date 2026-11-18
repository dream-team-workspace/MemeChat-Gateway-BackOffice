---
name: shared-contract
description: The runtime-agnostic Zod contract in shared/admin-api: schema and pagination conventions, rollout-safe optional fields, error envelope, and how browser and BFF validate the same payload. Load when a field, enum, or payload changes.
---

# Shared admin contract

## Use this skill when

- Adding/removing a field, enum value, payload, or endpoint shape.
- A BFF route needs a new request/response schema.
- The console must tolerate an older or newer gateway build.
- Writing contract tests or fixtures.

`shared/admin-api` is the only contract seam between browser and server. It is
runtime-agnostic: no React, DOM, or Node imports. Both `tsconfig.json` and
`server/tsconfig.json` include it; browser imports use `@shared/admin-api`, server imports use
`../../../shared/admin-api/index.js` (NodeNext requires the `.js` extension in shared's own
internal imports).

## Layout

| File | Resource |
|---|---|
| `common.ts` | error envelope, pagination helper, ISO date, health/meta, provider health/credential enums, shared derives |
| `abilities.ts` | ability catalog |
| `providers.ts` | provider detail/status, catalog models, inputs, in-use refs |
| `app-clients.ts` | clients, routes, audit, activity, inputs |
| `capabilities.ts` | legacy cost/limits profiles, provider chain, audit |
| `models.ts` | legacy app-picker models |
| `users.ts` | user summaries, ledger, usage, grant, RevenueCat status |
| `index.ts` | re-exports every file |

One file per resource, not one schema dump. Export inferred types next to each schema.

## Conventions

- Canonical shapes are camelCase, ISO-8601 strings, integer credits, opaque IDs
  (`z.union([z.number(), z.string()])` where the gateway may use either), opaque cursors.
- Names: `<thing>Schema` for outputs, `<thing>InputSchema` for inputs, `<thing>ListSchema` /
  `<thing>PageSchema` for collections, `type <Thing> = z.infer<...>`.
- Collections use `paginatedSchema(itemSchema)`:
  `{ items: T[], nextCursor: string | null }`. Do not invent page numbers or totals.
- `apiErrorSchema` is the single error envelope:
  `{ code: string, message: string, requestId?: string, details?: Record<string, unknown> }`.
- Date strings use `isoDateTimeSchema` (`z.string()`) — the contract does not re-validate
  calendar timestamps; the gateway is authoritative.
- Integers for credits (`z.number().int()`), never floats. Amounts have explicit min/max.
- `z.record(z.string(), z.unknown())` — Zod 4 requires both key and value schemas.
- Enums are `z.enum([...])` string unions; when a backend may add a value, prefer an explicit
  error over silently accepting it, unless the UI has a designed fallback (e.g. users
  `tier: "unknown"`).
- Do not add `.passthrough()`/loose objects by default; the BFF strips unknown fields when it
  parses. Preserve user JSON explicitly (provider `config`, capability `limits`/`fairUse`)
  through the mapper's preserved keys.

### Zod 4 note

New code should use Zod 4 top-level formats (`z.email()`, `z.uuid()`, `z.url()`,
`z.iso.datetime()`) and `.catch()` for URL defaults. Existing files still use the deprecated
method spellings (`z.string().uuid()`, `z.string().email()`); they work in Zod 4 and should be
converted only in a dedicated cleanup, not mixed into a feature change. See
`.agents/skills/stack-reference/SKILL.md`.

## Rollout-safe fields

The console often ships before a gateway deployment. Rules:

- New fields the gateway may not return yet are `.optional()` and/or `.nullable()` with a
  comment naming the gateway prerequisite: `clientKeySha1`, `routes`, `lastCheck`.
- Never require a field in a read schema until the gateway endpoint is deployed everywhere the
  console runs (production first).
- When absent, the UI shows an honest state (`PendingGatewayState`, disabled control, "not
  captured") — never a fabricated value.
- Input schemas can already send new fields if the BFF/gateway tolerates them; document the
  deployment order in `docs/15-gateway-requests.md`.
- Renames are additive: add the new field, keep reading the old one until the gateway migrates.

## Validation at both edges

1. BFF parses the upstream response after `camelize`/`normalizePage` and fails loudly
   (`CONTRACT_MISMATCH`) on mismatch.
2. Browser `apiRequest` parses the BFF response with the same schema and throws `ApiError`
   with code `CONTRACT_MISMATCH` on mismatch.
3. Forms reuse input schemas (or a form schema mirroring them), so field rules live once.

A contract test must prove every fixture/real shape parses. `shared/admin-api/capabilities.test.ts`
is the existing example; extend it for new enums/edge cases (empty lists, null optional fields,
legacy payload without new fields).

## Changing a payload (checklist)

- [ ] Shared schema: output + input + paginated variant as needed, with inferred types.
- [ ] Compatibility: optional/nullable for rollout-pending fields; comment the prerequisite.
- [ ] BFF mapper/route updated; no existing field renamed or dropped silently.
- [ ] Browser API module + query/mutation updated; UI handles absent/empty states.
- [ ] Contract/unit test added (valid, missing new field, invalid enum, pagination edge).
- [ ] `docs/06-api-integration.md` (canonical types/endpoints) updated.
- [ ] Requirement doc acceptance criteria updated if behavior changed.
- [ ] `docs/15-gateway-requests.md` updated if the gateway must change.
- [ ] `npm run typecheck` and `npm test` pass.

## Anti-patterns

- Duplicating a schema in a feature instead of extending the shared one.
- Parsing with `as SomeType` or `any` instead of a schema at a boundary.
- Making a new field required in a read schema before the gateway ships it.
- Returning raw upstream snake_case to the browser.
- Using floats for credits, page-number pagination, or local timestamps in payloads.
- Putting React/DOM/Node imports in `shared/`.

## References

- `shared/admin-api/common.ts` — envelope, pagination, health, provider health.
- `shared/admin-api/app-clients.ts` — optional rollout fields, routes, audit, activity.
- `docs/06-api-integration.md` — canonical endpoint catalog and types.
- `docs/02-backend-contract-analysis.md` — what the gateway actually exposes and its gaps.
