# Architecture decision records

ADRs capture decisions that are expensive to reverse. Each record is short and immutable:
if a decision changes, add a new ADR that supersedes the old one.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-vite-react-spa.md) | Vite + React SPA | Proposed |
| [0002](0002-bff-for-admin-api.md) | BFF owns the admin secret | Proposed |
| [0003](0003-feature-based-architecture.md) | Feature-based folders with enforced boundaries | Proposed |
| [0004](0004-shadcn-owned-components.md) | shadcn components are owned source | Proposed |
| [0005](0005-tanstack-query-router-table.md) | TanStack Router/Query/Table + RHF/Zod | Proposed |
| [0006](0006-branching-and-deployments.md) | master=prod, development=staging | Proposed |
| [0007](0007-mock-first-contract.md) | Mock-first contract until admin API lands | Proposed |

Template:

~~~md
# ADR-XXXX — Title

- Status: Proposed | Accepted | Superseded by ADR-YYYY
- Date: YYYY-MM-DD
- Deciders: names

## Context
## Decision
## Consequences
## Alternatives considered
## Follow-up
~~~
