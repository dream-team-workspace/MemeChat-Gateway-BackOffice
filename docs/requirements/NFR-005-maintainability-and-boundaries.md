# NFR-005 — Maintainability and architecture boundaries

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Engineering |
| Source | [Architecture](../03-architecture.md), [Standards](../08-engineering-standards.md) |

## Intent

The console should grow by adding features without turning into a layer-first tangle. Boundaries
must be enforced by tooling, not by memory.

## Requirements

1. Frontend organized by vertical feature slices under `src/features/<name>`.
2. Each feature exposes a small public `index.ts`; internals stay private.
3. No cross-feature imports of internals; shared behavior moves to `components/common` or
   `shared`.
4. Routes are thin: no fetch, mapping, or forms.
5. `shared` is runtime-agnostic (no React/DOM/Node).
6. `server` never imports `src`; `src` never imports `server`.
7. ESLint `boundaries` and import-cycle rules run in CI.
8. TypeScript strict; no `any` at boundaries; Zod parse at runtime edges.
9. No barrel files except feature public entries.
10. New dependencies require a justification in the PR; prefer native APIs.
11. Docs/requirements update with behavior changes.
12. File/component size should stay reviewable; split >~300 lines when it improves clarity.

## Acceptance criteria

- [ ] A dependency-cruiser/boundaries graph shows no forbidden edges.
- [ ] A new feature can be added by adding one folder + one route + a BFF route.
- [ ] Routes contain no fetch/mapping/form logic.
- [ ] `shared` builds in both Vite and Node without React/DOM.
- [ ] ESLint fails on a cross-feature internal import.
- [ ] No circular imports.
- [ ] TypeScript strict passes with no `any` escapes in app code.
- [ ] A feature can be deleted without orphaned imports (except nav/routing registration).
- [ ] Docs/requirements are updated in the same PR.

## Verification

- CI: lint, typecheck, dependency graph.
- Code review checklist in docs/08.
- Periodic architecture review at phase gates.

## Exceptions

- A genuinely shared domain concept may move to `shared`; do not import another feature.
- Temporary duplication is preferable to a premature abstraction; document the third use case.

## Traceability

[Architecture §5](../03-architecture.md) · [Standards §3–§5](../08-engineering-standards.md) ·
[ADR-0003](../adr/0003-feature-based-architecture.md)
