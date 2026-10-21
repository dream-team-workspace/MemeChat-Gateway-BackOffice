# Requirements

One file per requirement. These are the behavior contract for implementation and review. A
requirement is not "done" because code exists; it is done when its acceptance criteria and test
notes pass.

## Status legend

| Status | Meaning |
|---|---|
| Proposed | Written, open for review |
| Accepted | Approved; implementation may start |
| In progress | Being built |
| Implemented | Acceptance criteria + tests pass |
| Deferred | Intentionally postponed |
| Blocked | Depends on an unavailable backend/API decision |

## Functional requirements

| ID | Title | Priority | Phase | Depends on | Status |
|---|---|---|---|---|---|
| [FR-001](FR-001-operator-authentication.md) | Operator authentication and session | Must | 1 | — | Proposed |
| [FR-002](FR-002-secure-admin-api-gateway.md) | Secure admin API gateway (BFF) | Must | 1 | FR-001 | Proposed |
| [FR-003](FR-003-capability-registry-overview.md) | Capability registry overview | Must | 2 | FR-002 | Proposed |
| [FR-004](FR-004-capability-configuration-editing.md) | Capability configuration editing | Must | 2 | FR-003 | Proposed |
| [FR-005](FR-005-capability-kill-switch.md) | Capability kill switch | Must | 2 | FR-003 | Proposed |
| [FR-006](FR-006-provider-routing-chain.md) | Provider routing chain | Must | 2 | FR-003 | Proposed |
| [FR-007](FR-007-capability-audit-history.md) | Capability audit history | Must | 2 | FR-003 | Proposed |
| [FR-008](FR-008-model-catalog-management.md) | Model catalog management | Must | 2 | FR-002 | Proposed |
| [FR-009](FR-009-user-ledger-inspection.md) | User ledger inspection | Must | 3 | FR-002 | Proposed |
| [FR-010](FR-010-user-usage-inspection.md) | User usage inspection | Must | 3 | FR-002 | Proposed |
| [FR-011](FR-011-credit-grant.md) | Credit grant | Must | 3 | FR-009 | Proposed |
| [FR-012](FR-012-operational-dashboard.md) | Operational dashboard | Should | 3 | FR-003, FR-008 | Proposed |
| [FR-013](FR-013-app-shell-and-environment.md) | App shell and environment context | Must | 1 | FR-001 | Proposed |
| [FR-014](FR-014-resilience-and-states.md) | Loading, empty, error, offline states | Must | 1 | FR-002 | Proposed |
| [FR-015](FR-015-theme-and-appearance.md) | Theme and appearance | Should | 1 | FR-013 | Proposed |
| [FR-016](FR-016-safe-mutation-protocol.md) | Safe mutation protocol | Must | 1 | FR-002 | Proposed |
| [FR-017](FR-017-mock-and-demo-mode.md) | Mock and demo mode | Must (dev) | 1 | FR-002 | Proposed |

## Non-functional requirements

| ID | Title | Priority | Phase | Status |
|---|---|---|---|---|
| [NFR-001](NFR-001-security-and-secret-isolation.md) | Security and secret isolation | Must | 1–5 | Proposed |
| [NFR-002](NFR-002-accessibility.md) | Accessibility (WCAG 2.2 AA) | Must | 1–5 | Proposed |
| [NFR-003](NFR-003-performance-and-bundle-budgets.md) | Performance and bundle budgets | Should | 1–4 | Proposed |
| [NFR-004](NFR-004-reliability-and-data-integrity.md) | Reliability and data integrity | Must | 1–5 | Proposed |
| [NFR-005](NFR-005-maintainability-and-boundaries.md) | Maintainability and boundaries | Must | 1–5 | Proposed |
| [NFR-006](NFR-006-testing-and-quality-gates.md) | Testing and quality gates | Must | 1–5 | Proposed |
| [NFR-007](NFR-007-observability-and-auditability.md) | Observability and auditability | Must | 1–5 | Proposed |
| [NFR-008](NFR-008-browser-viewport-support.md) | Browser, viewport, device support | Must | 1–4 | Proposed |
| [NFR-009](NFR-009-privacy-and-data-minimization.md) | Privacy and data minimization | Must | 1–5 | Proposed |
| [NFR-010](NFR-010-portability-and-deployment.md) | Portability and deployment | Must | 1–5 | Proposed |
| [NFR-011](NFR-011-documentation-and-operability.md) | Documentation and operability | Should | 1–5 | Proposed |
| [NFR-012](NFR-012-design-system-consistency.md) | Design system consistency | Must | 1–5 | Proposed |
| [NFR-013](NFR-013-internationalization-readiness.md) | Internationalization readiness | Could | 4–6 | Deferred |

## Priority meaning

- **Must** — v1 cannot ship without it.
- **Should** — expected in v1; can slip only with an explicit risk acceptance.
- **Could** — deferred; tracked in the roadmap.

## Traceability

| Requirement | Primary screen | Primary API | Key tests |
|---|---|---|---|
| FR-001 | /login | BFF /api/auth/* | BFF auth tests, E1/E2 |
| FR-002 | all | BFF /api/admin/* | BFF integration suite |
| FR-003 | /capabilities | GET /capabilities | component + E4 |
| FR-004 | /capabilities/:id | PUT /capabilities/{id} | component + E5/E6 |
| FR-005 | /capabilities/:id | POST .../toggle | E2E E7/E8 |
| FR-006 | /capabilities/:id | PUT .../providers | E2E E9 |
| FR-007 | /capabilities/:id/audit | GET .../audit | component + E7 |
| FR-008 | /models | GET/PUT models | E2E E10 |
| FR-009 | /users/:uid | GET .../ledger | E2E E11 |
| FR-010 | /users/:uid | GET .../usage | E2E E12 |
| FR-011 | /users/:uid | POST .../grant | E2E E13/E14 |
| FR-012 | / | capabilities/models/health | component + smoke |
| FR-013 | shell | /api/auth/me | E1/E17 |
| FR-014 | all | all | error-state suite |
| FR-015 | /settings, shell | none | E16 |
| FR-016 | all mutations | all mutations | E5/E7/E13 |
| FR-017 | dev/test | mock routes | MSW/BFF tests |

## Changing a requirement

- Update the requirement file and the linked API/architecture doc in the same PR.
- Add/update acceptance criteria and tests.
- If a requirement is deferred, set its status and record the reason in
  `docs/11-roadmap.md` and `docs/12-risks-and-open-questions.md`.
