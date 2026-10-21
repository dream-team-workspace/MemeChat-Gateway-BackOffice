# ADR-0003 — Feature-based architecture with enforced boundaries

- **Status:** Proposed
- **Date:** 2026-10-21
- **Deciders:** Frontend lead

## Context

The console will grow by operator domain: capabilities, routing, audit, models, users,
ledger, usage, grants, operations. A layer-first structure (`components/`, `hooks/`,
`services/`) spreads one feature across many folders and makes ownership/diff review harder
as the feature count grows.

## Decision

Organize the frontend by **vertical feature slices** under `src/features/<name>`. Each slice
owns its api, queries, mutations, components, pages, hooks, and tests, and exposes a small
public `index.ts`. Routes are thin adapters. Shared composition lives in
`components/common`; the contract lives in `shared`.

Dependency rules are enforced by ESLint `boundaries`:

- routes → features → common → ui
- features → lib/shared
- no feature → feature internals
- no `src` → `server`; no `server` → `src`
- `shared` has no React/DOM/Node

## Consequences

Positive:

- A feature can be added, reviewed, or removed in one folder.
- Clear ownership and smaller PRs.
- Boundaries are machine-checked, not tribal knowledge.
- Shared code is deliberate (third use) rather than accidental.

Negative:

- More folders per feature; small features can feel heavy.
- Requires discipline for cross-feature reuse.
- The public `index.ts` adds a deliberate export step.

## Alternatives considered

- **Layer-first**: simpler at 3 features, painful at 15; cross-feature coupling grows.
- **Monorepo packages per feature**: too much tooling for one app/team.
- **Route-colocated only**: works for pages, but hides API/query/test ownership.

## Follow-up

- Add boundary lint rules in Phase 1.
- Document the feature template in docs/08.
- Review folder shape after Phase 3; adjust only with an ADR.
