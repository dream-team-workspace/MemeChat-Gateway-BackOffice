# 12 — Risks and open questions

| Field | Value |
|---|---|
| Status | Living document |
| Review cadence | Each phase gate |
| Owner | Project lead |

## 1. Top risks

| ID | Risk | Likelihood | Impact | Mitigation | Trigger |
|---|---|---|---|---|---|
| R1 | Gateway admin API remains unimplemented | High | Blocking integration | Mock-first; track backend Phase A/B; set a go/no-go date | No admin routes by Phase 4 start |
| R2 | Exact admin schemas differ from assumptions | High | Rework, bugs | BFF anti-corruption layer; Zod; contract tests; confirm P0 fields early | First staging call |
| R3 | Credit grant idempotency/replay behavior unclear | Medium | Double credits | Confirm with backend; requestId reuse; timeout UX; staging test | Grant design review |
| R4 | Pagination contract differs | Medium | Broken tables | BFF normalizes; fixture coverage; backend P0 ask | First ledger call |
| R5 | Operator login provider/allowlist | **Resolved 2026-10-22** | Auth delay | Cloudflare Access (same policy as SSH); see ADR-0008 | Resolved |
| R6 | Admin secret compromise / shared secret | Low–Medium | Full admin | BFF-only, network allowlist, rotation, monitoring | Security review |
| R7 | No per-operator RBAC | Medium | Insider risk / all-or-nothing | Allowlist + audit + rotation; request scoped tokens | Team growth |
| R8 | Admin API publicly reachable | Medium | Credential spray | Firewall allowlist BFF→gateway; strong secret; monitor 401s | Server setup |
| R9 | Server/domain/TLS/SSH details unknown | Medium | Deployment delay | Phase 1 infrastructure checklist; staging first | Phase 1 |
| R10 | Theme contrast overrides rejected | Low | Rework | Documented WCAG rationale; screenshot comparison; approve at G0 | Design review |
| R11 | Radius/typography deviation from theme rejected | Low | Visual rework | Keep color authoritative; make geometry a documented decision | Design review |
| R12 | TypeScript 7 / ESLint 10 ecosystem incompatibility | Medium | Tooling churn | Pin current stable; fallback TS 6/ESLint 9; ADR if changed | Scaffold |
| R13 | No staging gateway or test data | Medium | Can't validate integration | Provision staging; use test UID/capability; never prod mutations | Phase 4 |
| R14 | Scope creep (global audit, jobs, charts, user search) | High | Delay v1 | Explicit non-goals; defer table; requirement gate | Sprint planning |
| R15 | No user directory / summary | High (product) | Support friction | Exact UID lookup + latest ledger balance; backend ask | Phase 3 |
| R16 | No global audit feed | Medium | Harder investigation | Per-capability audit; document limitation | Phase 3 |
| R17 | Dashboard pressure to invent metrics | Medium | Misleading ops | No charts without API; explicit "not available" | Phase 3 |
| R18 | Single-server deployment outage | Medium | Console down | Health checks, rollback, runbook; acceptable v1 | Phase 5 |
| R19 | Rate limiting is in-memory/single instance | Low | Bypass at scale | One replica; shared store if scale-out | Scaling |
| R20 | Access session revocation is global only | Low–Medium | Slow operator removal | Remove from Access policy, revoke Access sessions; per-app policy later | Security review |
| R21 | PII leakage via logs/error reports | Medium | Privacy incident | Redaction, no bodies, no UIDs, scrubber tests | Security review |
| R22 | Test data uses real UIDs | Low–Medium | Privacy | Fake fixtures; review; no prod data | Test setup |
| R23 | Contract drift after launch | Medium | UI breakage | Shared schemas, contract tests, feature flags, changelog | Backend change |
| R24 | Browser/Safari oklch/font issues | Low | Visual defects | Test Safari; sRGB fallbacks; self-host fonts | Phase 4 |
| R25 | On-call ownership for production approvals unclear | Medium | Slow incident response | Name approvers; environment protection; runbook | Phase 5 |
| R26 | Static origin reachable outside the Cloudflare Tunnel | Low–Medium | Access bypass | Bind origin to localhost; firewall; validate Access JWT at the BFF/origin | Access/tunnel review |

## 2. Open questions

| # | Question | Why it matters | Needed by | Owner | Status |
|---|---|---|---|---|---|
| Q1 | Which OIDC provider: GitHub org/team or Google Workspace? | Auth flow, allowlist, MFA | Phase 1 | Eng + ops | **Resolved — Cloudflare Access, ADR-0008** |
| Q2 | What are the exact admin JSON field names/casing? | Entire BFF mapping | G2 | Backend | Open |
| Q3 | Single-capability GET? | Detail route efficiency | Phase 2 | Backend | Open |
| Q4 | Pagination params/response for ledger/usage/audit? | Tables | G2 | Backend | Open |
| Q5 | Grant request/response and replay behavior? | Money correctness | G2 | Backend | Open |
| Q6 | Capability PUT: full replace vs merge; revision/If-Match? | Conflict safety | G2 | Backend | Open |
| Q7 | Providers PUT envelope and error indexing? | Routing editor | G2 | Backend | Open |
| Q8 | Toggle response body? | UI refresh | G2 | Backend | Open |
| Q9 | Is the admin API reachable from the server? Network allowlist? | Deployment | Phase 4 | Infra | Open |
| Q10 | Staging/prod domains and TLS termination? | Deploy | Phase 1 | Infra | Open |
| Q11 | Which server and deploy user? Docker available? | Deploy script | Phase 1 | Infra | Open |
| Q12 | Who approves production deploys? | Environment protection | Phase 1 | Team | Open |
| Q13 | Grant amount limits/approval policy? | Money safety | Phase 3 | Product | Open |
| Q14 | Error tracking vendor/DSN? | Observability | Phase 4 | Eng | Open |
| Q15 | Is the theme contrast/radius override approved? | Design | G0 | Product/design | Open |
| Q16 | Is a test gateway/DB available for staging? | Integration | Phase 4 | Backend | Open |
| Q17 | Audit retention and who can read it? | Compliance | Phase 4 | Product | Open |
| Q18 | Future RBAC roles and scope? | Roadmap | Phase 6 | Product | Open |

## 3. Assumptions

1. The gateway remains the source of truth for validation, audit, and money.
2. The admin API will be implemented with the documented route set before Phase 4.
3. The gateway will accept a server-to-server bearer secret from the BFF.
4. The BFF can reach the gateway over HTTPS; no mTLS required in v1.
5. A single Linux server with Docker is available for staging and production.
6. The team is small enough for one operator role and one shared admin secret.
7. UIDs are Firebase UIDs and can be validated as URL-safe strings.
8. No prompt/image/audio content will be exposed to the console.
9. English-only UI for v1.
10. Desktop-first operators; mobile is emergency/read-only.

## 4. Constraints

- No direct DB access from the console.
- No gateway code changes in this repo.
- No admin secret in the browser.
- No invented endpoints or metrics.
- No production mutations from E2E without explicit approval.
- Budget for one small container + one server; avoid vendor sprawl.

## 5. Review triggers

Re-open this document when:

- the backend admin contract changes;
- a new requirement is added;
- a security finding is accepted;
- a phase gate is missed;
- a deferred item is pulled into v1;
- the team grows beyond the single-operator model.
