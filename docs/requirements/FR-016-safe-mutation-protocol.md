# FR-016 — Safe mutation protocol

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1 |
| Owner | Frontend + BFF |
| Depends on | FR-002 |
| Source | [DESIGN §7.4](../../DESIGN.md), [Security §9](../07-security-model.md) |

## Intent

Make every write deliberate, attributable, idempotent where possible, and evidenced. This is
the cross-cutting protocol for capability edits, toggles, routing, models, cache invalidation,
and grants.

## Scope

In scope:

- Before/after diff for changes.
- Confirmation for high-impact/destructive actions.
- Required reason where the API/audit needs it.
- Pending lock, no double submit, no optimistic writes.
- No automatic mutation retries; grant retry reuses requestId.
- Request ID + audit link + refetch on success.
- Actor from session (BFF).

Out of scope:

- Server-side approval workflows.
- Transactional multi-resource edits.
- Undo/rollback of a completed mutation (only inverse actions, e.g. re-enable).

## User stories

- As an operator, I see exactly what will change before I commit.
- As an operator, I cannot double-charge or double-toggle by double-clicking.
- As a reviewer, I can trace every change to an actor and an audit entry.
- As support, I can retry a timed-out grant without duplicating it.

## Behavior

1. The form builds a diff between the loaded state and the draft.
2. "Review" shows only changed fields (with show-unchanged), impact copy, actor, revision.
3. High-impact actions require a confirmation dialog:
   - kill switch (reason + type-ID for disable),
   - provider chain replacement,
   - credit grant (amount/reason/requestId; high amount extra confirm),
   - cache invalidation (impact copy).
4. The confirm button is labeled with the action, not "OK".
5. While pending: disable the submit and close; show a verb; keep layout stable.
6. On success: refetch affected queries, show a toast with request ID, link to audit where
   applicable.
7. On failure: keep the form/dialog, map field errors, show request ID; do not auto-retry.
8. On timeout/network: show "unknown result"; require refresh/verify before retry. Grant retry
   reuses the same requestId.
9. No optimistic cache updates for registry/money.
10. The BFF overwrites any client-supplied actor with the session email.

## Acceptance criteria

- [ ] Every mutation has a visible confirmation or review step.
- [ ] Destructive actions use a destructive button and clear impact copy.
- [ ] Double-click/Enter cannot submit twice.
- [ ] Pending state is visible and blocks navigation/close where appropriate.
- [ ] Success invalidates the right queries and shows request ID.
- [ ] Failure preserves input and shows a safe error + request ID.
- [ ] Timeout does not silently retry any mutation.
- [ ] Grant retry reuses the same requestId; success starts a new intent.
- [ ] No mutation relies on optimistic UI for correctness.
- [ ] Actor is server-derived; browser actor headers are ignored.
- [ ] Audit link is shown after capability/provider changes.

## Data and API

Applies to:

| Mutation | Confirmation | Idempotency |
|---|---|---|
| Capability PUT | diff review + impact | full-state PUT; no auto-retry |
| Toggle | reason + type-ID (disable) | no auto-retry; refetch on 409 |
| Providers PUT | old → new chain | atomic; no auto-retry |
| Model PUT | form review | upsert; no auto-retry |
| Cache invalidate | impact copy | safe but no auto-retry |
| Grant | UID/amount/reason/requestId | requestId; explicit retry only |

## UX notes

- Use a sticky save bar for forms, a dialog for discrete actions.
- Diff uses `-/ +` markers and labels, not color alone.
- Success toast: "Capability updated." + "View audit" + request ID disclosure.
- Failure copy: "Couldn't save. The gateway returned INVALID_REQUEST." + field/request ID.
- Do not use celebratory animations for money.

## Errors and edge cases

- 409 revision conflict → reload latest; preserve draft; do not overwrite.
- 422 field error → inline; scroll to first.
- 429 → retry-after; do not spam.
- 401 → login; after return, refresh before retrying (the mutation may have applied).
- 5xx → no auto-retry; safe retry for PUT only after refresh.
- Network offline → disable submit; queue is out of scope.

## Security and audit

- Actor from session via BFF; never trust a browser header.
- Reason fields are recorded by the gateway; do not log them client-side.
- Request IDs correlate UI, BFF, and gateway logs.
- Rate limits apply per session.
- No secret or upstream body in errors.

## Test notes

- Cross-cutting E2E: E5/E7/E9/E10/E13/E14.
- BFF: actor override, no-retry, timeout mapping.
- Component: pending/double-submit, diff, error preservation.
- Grant: replay with same requestId.

## Open questions

- Which mutations support optimistic concurrency/revision? (Q6.)
- Is cache invalidation idempotent/safe to retry? (Assumed safe but no auto-retry.)
- Do model changes have audit parity? (G9.)

## Traceability

[DESIGN §7.4](../../DESIGN.md) · [Security §9](../07-security-model.md) ·
[API §8](../06-api-integration.md) · [E2E](../09-testing-strategy.md)
