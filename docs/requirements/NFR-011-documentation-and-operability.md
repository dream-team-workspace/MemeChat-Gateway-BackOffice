# NFR-011 — Documentation and operability

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Should |
| Phase | 1–5 |
| Owner | Team |
| Source | [Docs index](../README.md) |

## Intent

A new engineer or on-call operator can understand, run, deploy, and recover the console without
asking the original author.

## Requirements

1. README with purpose, status, branch model, commands, and doc map.
2. DESIGN.md with tokens, contrast ledger, component rules, review checklist.
3. One file per requirement with acceptance criteria and traceability.
4. API contract doc with endpoints, payloads, errors, pagination, idempotency.
5. Architecture doc with topology, folder rules, and data flow.
6. Security model with threat table, auth, secrets, headers, incident steps.
7. CI/CD doc with branch protection, environments, deploy/rollback, secret matrix.
8. Runbooks: deploy, rollback, rotate the admin secret, revoke Access sessions, gateway
   outage.
9. ADRs for expensive decisions.
10. Every behavior change updates docs in the same PR.

## Acceptance criteria

- [ ] A new engineer can run the app from README alone.
- [ ] A deploy/rollback can be performed from the runbook without tribal knowledge.
- [ ] Every Must requirement has an owner, phase, and test link.
- [ ] Secret rotation is documented and rehearsed.
- [ ] Docs are linked from README/docs index, not orphaned.
- [ ] No runbook contains real secrets or customer data.
- [ ] Screenshots are supplementary, not the only source of truth.

## Verification

- Onboarding dry run.
- Staging deploy/rollback drill.
- Docs review at phase gates.
- Link checker (optional).

## Traceability

[README](../../README.md) · [DESIGN](../../DESIGN.md) · [Docs index](../README.md) ·
[CI/CD §12](../10-ci-cd-and-environments.md)
