# FR-009 — User ledger inspection

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 3 |
| Owner | Frontend |
| Depends on | FR-002 |
| Source | [IA §4.10](../05-information-architecture.md), [API §2.2](../06-api-integration.md) |

## Intent

Let support answer "why was this user charged?" by inspecting the credit ledger for one UID,
including internal states that are hidden from the app.

## Scope

In scope:

- Exact-UID ledger table with cursor pagination.
- All internal states, reserved/committed/units, balance after, RC txn, attempts, timestamps.
- Row detail (full JSON), copy IDs.
- Latest-known balance card with a caveat.
- Empty/loading/error/stale/permission states.

Out of scope:

- The user directory and email search: see [FR-018](FR-018-user-directory-and-tier.md). This
  requirement remains the exact-UID ledger detail view.
- Editing ledger rows or issuing refunds.
- RevenueCat transaction lookup outside the ledger fields.
- Content/prompt inspection (none exists).

## User stories

- As support, I can see every recent ledger row for a UID.
- As support, I can tell whether a charge is committed, refunded, or stuck.
- As an engineer, I can correlate a request ID with usage.
- As a reviewer, I can see attempts and RC transaction IDs for debugging.

## Behavior

1. User detail loads ledger page 1: `GET /api/admin/users/{uid}/ledger?limit=50`.
2. Table columns: created, capability, request ID, state, reserved, committed, units,
   balance after, attempts (spend/refund), RC txn.
3. Internal states are displayed verbatim with a tooltip; no collapsing to external states.
4. Numbers are right-aligned/tabular; credits are integers.
5. Row click opens a detail sheet with the full ledger JSON.
6. "Older" follows `nextCursor`; "Newer" pops the cursor stack.
7. Latest-known balance card uses the newest row's `balanceAfter`; label explains it is not a
   live RevenueCat balance.
8. Empty state: "No ledger activity for this UID." with a link to usage.
9. Refresh refetches; failed background refetch keeps data + warning.

## Acceptance criteria

- [ ] All seven internal states render correctly with labels/tooltips.
- [ ] Null committed/units/balance/RC txn display as "—", not 0.
- [ ] Cursor pagination works; no offset/page-number fiction.
- [ ] Changing UID resets pagination and caches under the new key.
- [ ] Request IDs/UIDs are monospace, copyable, and not truncated without a tooltip.
- [ ] Row detail shows the full row and can be closed by keyboard.
- [ ] Empty/loading/error/401/403/404 states exist.
- [ ] No edit/refund/delete controls.
- [ ] No content fields are requested or displayed.
- [ ] 429/timeout messages include request ID and safe retry.

## Data and API

| Method | Path | Response |
|---|---|---|
| GET | `/api/admin/users/{uid}/ledger?limit=50&cursor=...` | `{items,nextCursor}` |

UID is validated as `[A-Za-z0-9_-]{1,128}` before the request. `limit` default 50, max 200.

## UX notes

- Header: UID, copy, latest-known balance, Grant credits (FR-011).
- State badge colors follow DESIGN.md, but the label is the source of truth.
- Attempts column: "2 / 0" with a tooltip "spend attempts / refund attempts".
- Detail sheet groups fields: Identity, Money, State, RevenueCat, Timestamps.
- No chart; a table is the right tool.
- Show a banner if the latest row is PENDING_SPEND/REFUND_PENDING ("settlement may be in
  progress").

## Errors and edge cases

- Unknown UID with no rows → empty state, not 404 (unless the API returns 404).
- Invalid UID → inline validation on the lookup page; no request.
- Cursor expired → 400 `INVALID_CURSOR`; reset to page 1.
- Very large ledger → paginate; do not fetch all.
- 5xx → error panel + retry; keep previous page if possible.
- 403 → forbidden page.
- 401 → login with returnTo.

## Security and audit

- Read-only.
- UIDs are confidential; do not log them raw or send them to analytics.
- No ledger export in v1.
- The BFF validates the UID and only calls the fixed ledger route.

## Test notes

- Component: all states, pagination, row detail, empty/error.
- Contract: fixture with all seven states and nulls.
- E2E E11.
- BFF: UID validation, pagination mapping.

## Open questions

- Exact cursor parameter/response (Q4).
- Is there a user summary/balance endpoint? (No; Q15/R15.)
- Does the ledger return a total count? (Assumed no.)

## Traceability

[IA §4.10](../05-information-architecture.md) · [API §2.2](../06-api-integration.md) ·
[Testing §7 E11](../09-testing-strategy.md)
