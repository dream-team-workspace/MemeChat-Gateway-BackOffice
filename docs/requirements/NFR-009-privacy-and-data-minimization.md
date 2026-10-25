# NFR-009 — Privacy and data minimization

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Engineering/security |
| Source | [Security §10](../07-security-model.md), [Gateway contract §8](../02-backend-contract-analysis.md) |

## Intent

The console handles billing metadata and UIDs, not conversation content. It must not create a
shadow copy of sensitive data or leak identifiers into logs, analytics, or error reports.

## Requirements

1. Never request, render, or store prompt text, images, audio, or provider payloads. The gateway
   does not expose them.
2. Ledger/usage views show metadata only; no content fields in fixtures or network payloads.
3. UIDs are confidential: log a hash or last-4 only when necessary; never send raw UIDs to
   analytics/session replay.
4. No ledger/usage export in v1.
5. Browser storage: theme/sidebar only. No tokens, UIDs, email addresses, ledger data, or
   search history.
6. No third-party analytics by default. Error reporting (if added) scrubs headers, cookies, query
   strings, UIDs, and bodies.
7. Logs retain 30 days; error reports 30 days; audit retention is gateway-owned.
8. Screenshots/tests use fake UIDs and data.
9. Email and subscription tier (FR-018) are admin-only PII: never logged, analytics-exported,
   or persisted in browser storage. The gateway owns their retention.
10. Client activity (FR-019) is metadata only (UID, capability, status, latency, time); no
    content and no client key material.
9. Support documentation explains what the console cannot see.
10. Data access is limited to allowlisted operators; future RBAC can narrow it.

## Acceptance criteria

- [ ] Network traces for ledger/usage contain no content fields.
- [ ] localStorage/sessionStorage contain no tokens/UIDs/emails/ledger rows.
- [ ] User search terms and email are absent from BFF/gateway logs and error reports.
- [ ] Logs/error reports contain no raw UIDs or bodies (redaction tests).
- [ ] Test fixtures use fake UIDs only.
- [ ] No analytics SDK is loaded unless a privacy review approves it.
- [ ] Retention settings are documented and configured.
- [ ] The UI states "metadata only" where relevant.
- [ ] No export/download control exists.

## Verification

- Network inspection in E2E.
- Storage inspection.
- Log redaction tests.
- Dependency/privacy review for any analytics/error SDK.
- Fixture review.

## Open questions

- Is a UID considered PII for the team's policy? (Treat as confidential regardless.)
- Error tracking vendor/DSN and scrubber config (Q14).
- Audit retention requirements (Q17).

## Traceability

[Security §10](../07-security-model.md) · [FR-009](FR-009-user-ledger-inspection.md) ·
[FR-010](FR-010-user-usage-inspection.md)
