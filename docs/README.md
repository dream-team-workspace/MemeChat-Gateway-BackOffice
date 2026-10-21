# Documentation index

This repository is documentation-first. The planning corpus is complete; the Phase 1 UI
template is implemented on `feature/template` with mock auth and dummy data. The BFF, live
admin API, tests, and deployment workflows are still pending.

## Start here

1. [Project brief](00-project-brief.md) — why the console exists and how success is measured.
2. [Backend contract analysis](02-backend-contract-analysis.md) — what the gateway actually
   exposes today and where the contract stops.
3. [Architecture](03-architecture.md) — runtime topology and the feature-based frontend.
4. [DESIGN.md](../DESIGN.md) — the visual system and shadcn principles.
5. [Requirements](requirements/README.md) — one file per requirement, with acceptance criteria.

## By audience

**Product / operations**

- [Product scope](01-product-scope.md)
- [Information architecture](05-information-architecture.md)
- [Roadmap](11-roadmap.md)
- [Risks and open questions](12-risks-and-open-questions.md)

**Engineering**

- [Tech stack](04-tech-stack.md)
- [API integration](06-api-integration.md)
- [Engineering standards](08-engineering-standards.md)
- [Testing strategy](09-testing-strategy.md)
- [Architecture decision records](adr/)

**Security / deployment**

- [Security model](07-security-model.md)
- [CI/CD and environments](10-ci-cd-and-environments.md)

**New team members**

- [Glossary](13-glossary.md)
- [AGENTS.md](../AGENTS.md)

## Status legend

| Status | Meaning |
|---|---|
| Proposed | Written and open for review; not implemented |
| Accepted | Decision approved; implementation may start |
| In progress | Actively being built |
| Implemented | Code exists and acceptance criteria pass |
| Deferred | Intentionally postponed; tracked in the roadmap |

Every requirement file carries its own status and priority.

## How to change this corpus

- A behavior change updates the requirement file **and** the relevant architecture/API doc
  in the same pull request.
- A visual change updates [DESIGN.md](../DESIGN.md) with a screenshot and a contrast check.
- A new endpoint or field must be traceable to the gateway contract or explicitly marked
  **assumed** in [02-backend-contract-analysis.md](02-backend-contract-analysis.md).
- Do not delete a requirement to make a milestone look complete. Change its status and
  record why.
