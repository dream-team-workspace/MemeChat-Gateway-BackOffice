# NFR-007 — Observability and auditability

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | BFF/ops |
| Source | [Security §11](../07-security-model.md), [API §9](../06-api-integration.md) |

## Intent

When something goes wrong, the team can correlate a user report with a request, an actor, and an
audit row without exposing sensitive content.

## Requirements

1. Every request has `X-Request-Id`; the BFF generates one if absent and returns it.
2. BFF logs are structured JSON: timestamp, level, request ID, method, route template, status,
   duration, actor hash, upstream status.
3. Logs never contain bodies, cookies, secrets, raw UIDs, or tokens.
4. Every mutation emits an audit log line with actor hash, resource, action, outcome, request ID.
5. Gateway `capability_audit` is surfaced in the UI for capability/provider changes.
6. App-client audits (FR-019) surface every operator mutation with actor, timestamp, and safe
   before/after snapshots; client user activity is metadata-only.
6. Health endpoint reports BFF + gateway liveness/readiness without leaking config.
7. Error responses include a safe code/message/request ID.
8. Optional error reporting (Phase 4) scrubs PII/secrets and is sampled.
9. Metrics (when added) use route templates, not raw URLs; no UID or email labels.
10. Logs are retained 30 days; error reports 30 days. Capability/app-client audit, email, and
    user-activity retention are gateway-owned and documented in
    [15-gateway-requests.md](../15-gateway-requests.md).
11. Alerts (phase 5) for login failure spikes, 5xx rate, grant failures, and admin 401 spikes.

## Acceptance criteria

- [ ] A request ID shown in the UI appears in BFF logs.
- [ ] Mutation logs include actor hash + resource + outcome.
- [ ] No secret/body/UID appears in a log or error report (spot-check + tests).
- [ ] Health distinguishes BFF vs gateway failure.
- [ ] Errors shown to users include a request ID.
- [ ] Audit links work after capability changes.
- [ ] Log/error retention is configured and documented.
- [ ] Alerts are defined before production launch.

## Verification

- Log review in staging.
- Redaction unit tests.
- Request-ID E2E.
- Health failure simulation (stop gateway).
- Audit link after E7.

## Open questions

- Error reporting vendor/DSN (Q14).
- Log aggregation stack (server-dependent).
- Alert channels/on-call owner.

## Traceability

[Security §11](../07-security-model.md) · [API §9](../06-api-integration.md) ·
[CI/CD §8](../10-ci-cd-and-environments.md)
