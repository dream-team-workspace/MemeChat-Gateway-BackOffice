# NFR-004 — Reliability and data integrity

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Frontend + BFF |
| Source | [API §7–§8](../06-api-integration.md), [Security §9](../07-security-model.md) |

## Intent

The console must never silently lose a change, double-apply a mutation, or present stale data as
fresh. When the outcome is unknown, it must say so.

## Requirements

1. No optimistic writes for registry/money mutations.
2. Reads may retry; mutations do not auto-retry.
3. Grants are idempotent by `requestId`; retries reuse it.
4. Timeouts on mutations produce an "unknown result" state and require verification before retry.
5. 409 conflicts preserve the draft and offer reload; no last-write-wins silently.
6. Successful mutations invalidate exact query keys and refetch.
7. Background refetch failure keeps stale data with a visible age/warning.
8. Contract mismatch fails closed (no partial render).
9. Double submit is blocked; pending state is visible.
10. Session expiry does not discard a mutation silently; the user is told what may have happened.
11. No client-side derived balance is presented as authoritative.
12. Audit evidence is shown after mutations (where available).

## Acceptance criteria

- [ ] Double-click/Enter produces one request.
- [ ] Grant retry after timeout reuses requestId; ledger shows one deposit.
- [ ] 409 shows reload + draft preserved.
- [ ] 422 maps fields and keeps input.
- [ ] Mutation 5xx/timeout does not auto-retry.
- [ ] Successful mutation refetches detail/list/audit.
- [ ] Stale data is marked; no fake "just now".
- [ ] Contract mismatch shows an error, not partial data.
- [ ] Session expiry message is accurate.
- [ ] No optimistic balance/registry state.

## Verification

- BFF tests for retry/no-retry/timeouts.
- E2E E5/E6/E13/E14.
- Contract tests for malformed responses.
- Manual network throttling/offline.

## Open questions

- Does the backend support revision/If-Match? (Q6; if not, document last-write-wins risk.)
- What does a duplicate grant requestId return? (Q5.)

## Traceability

[API §7–§8](../06-api-integration.md) · [FR-016](FR-016-safe-mutation-protocol.md) ·
[FR-011](FR-011-credit-grant.md)
