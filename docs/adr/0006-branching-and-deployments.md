# ADR-0006 — master is production, development is staging

- **Status:** Proposed
- **Date:** 2026-10-21
- **Deciders:** Team

## Context

The user wants `master` as the deployment base for the server CI action and a
`development` branch where features merge and staging runs. The project is starting from an
empty repository with no workflows.

## Decision

- `master` is the protected production branch. Only release/hotfix PRs merge into it.
- `development` is the protected integration branch. Feature/fix/chore PRs merge into it and
  deploy staging.
- Short-lived branches: `feature/*`, `fix/*`, `chore/*`, `hotfix/*`.
- Squash merge, Conventional Commits, linear history.
- CI gates: lint, typecheck, test, build, E2E, secret scan.
- Production deployment requires the `production` GitHub Environment approval.
- Both environments run the same immutable image; staging promotes a tested SHA.
- Tags `vX.Y.Z` mark production releases.

## Consequences

Positive:

- Clear separation between integration and production.
- Every production change has a PR and an approval.
- Staging and production use the same artifact, reducing "works on staging" drift.
- Rollback is an image tag change.

Negative:

- Two long-lived branches require back-merges and discipline.
- Release cadence depends on PR flow; hotfixes need a back-merge.
- Branch protection + environment approvals add friction (intentional for an admin console).
- No continuous deployment to production on every commit; release is deliberate.

## Alternatives considered

- **Trunk-based with feature flags**: excellent at high maturity, but the user explicitly asked
  for master/development and staging; also needs a flag system we do not have.
- **GitFlow with release branches**: more ceremony than a small team needs.
- **master + main**: confusing; one production branch is enough.

## Follow-up

- Configure branch protection and environments (docs/10).
- Add workflows in Phase 1.
- Rehearse hotfix + back-merge once before launch.
