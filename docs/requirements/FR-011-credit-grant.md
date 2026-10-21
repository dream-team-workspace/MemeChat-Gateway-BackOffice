# FR-011 — Credit grant

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 3 |
| Owner | Frontend + BFF |
| Depends on | FR-009 |
| Source | [IA §4.11](../05-information-architecture.md), [API §8.5](../06-api-integration.md) |

## Intent

Let support or an operator deposit a positive credit amount to a user for a support issue or
promotion, without double-charging or losing track of the request.

## Scope

In scope:

- Positive integer amount, required reason, generated idempotency requestId.
- Confirmation with UID/amount/reason; high-amount second confirmation.
- Pending lock, success evidence, timeout/retry semantics.
- Ledger refresh after success.

Out of scope:

- Negative adjustments, refunds, plan changes.
- Bulk grants.
- Approval workflow beyond a second confirmation.
- RevenueCat dashboard management.

## User stories

- As support, I can grant 30 credits to a user and know it succeeded exactly once.
- As an operator, I can retry after a timeout without duplicating the deposit.
- As a reviewer, I can see who granted what, when, and why in the ledger/audit.
- As a security reviewer, I can verify grants are not optimistic or auto-retried.

## Behavior

1. "Grant credits" opens a dialog from user detail.
2. The dialog generates a UUID `requestId` once per intent (copyable, read-only).
3. Fields: amount (positive integer), reason (10–500 chars). The UID is fixed and shown.
4. "Review" shows UID, amount, reason, requestId, and impact copy.
5. If amount > 1,000, require a second confirmation (type amount or extra checkbox).
6. Submit calls `POST /api/admin/users/{uid}/credits/grant` with `{amount, reason, requestId}`
   and `X-Request-Id: <requestId>`.
7. Pending: disable submit/close; show "Granting…".
8. Success: show amount, requestId, and `balanceAfter`/`rcTxnId` if returned; invalidate
   ledger; toast; close.
9. Timeout/network: do not auto-retry. Show "We don't know whether the grant applied." with
   Refresh ledger and "Retry with same request ID".
10. After success, a new grant requires a new requestId (reopen dialog).

## Acceptance criteria

- [ ] Amount must be a positive integer; 0/negative/float/empty is rejected.
- [ ] Reason is required (10–500 chars).
- [ ] requestId is generated once per intent and reused on retry.
- [ ] Double-click/Enter cannot send two requests.
- [ ] Confirmation shows UID, amount, reason, and requestId.
- [ ] No optimistic ledger/balance update.
- [ ] Success refreshes the ledger and shows request ID + balance if available.
- [ ] Timeout does not auto-retry and offers ledger refresh before retry.
- [ ] A retry after an unknown result reuses the same requestId.
- [ ] 401/403/409/422/429/5xx are mapped safely with request ID.
- [ ] The actor is server-derived; no client actor field.
- [ ] High amounts require a second confirmation.

## Data and API

See [API §8.5](../06-api-integration.md).

~~~ts
interface CreditGrantInput {
  amount: number;
  reason: string;
  requestId: string;
}

interface CreditGrantResult {
  uid: string;
  amount: number;
  requestId: string;
  balanceAfter?: number;
  rcTxnId?: string;
}
~~~

**Assumption:** the request/response fields are proposed; confirm with the backend (Q5). If the
backend uses different names, the BFF maps them.

## UX notes

- Copy: "This deposits credits via RevenueCat. It cannot be undone from this console."
- Show the fixed UID in monospace; do not allow editing it in the dialog.
- Show a requestId with copy so support can reference it.
- After success, keep the evidence visible until the user closes the dialog.
- Do not show a celebratory animation for money.

## Errors and edge cases

- 422 amount/reason → inline errors; keep the dialog.
- 409 duplicate requestId → treat as possibly succeeded; refresh ledger before retry.
- 429 → show retry-after; do not spam.
- 502/504 → unknown; refresh first.
- Session expiry → login; after return, refresh ledger before assuming anything.
- Backend returns no balance → do not invent one.

## Security and audit

- Actor from session; BFF overwrites any client actor.
- requestId is the idempotency key; body + header must match.
- No automatic retry; no optimistic UI.
- Log attempt/success/failure with actor hash, UID hash, amount, request ID; no raw UID.
- Rate-limit grants to 5/min/session.
- Backend enforces the final idempotency; the UI cannot guarantee it alone.

## Test notes

- Unit: amount/reason validation, requestId lifecycle, high-amount confirmation.
- Component: pending lock, success, 422, timeout message, retry same requestId.
- BFF: body mapping, header, actor, error mapping, no retry.
- E2E E13 (success), E14 (timeout/retry), double-click.
- Backend contract: replay with the same requestId returns one deposit.

## Open questions

- Exact grant request/response (Q5).
- Maximum amount / approval policy (Q13).
- Does the gateway return balance/RC txn? (Assumed optional.)
- What does a duplicate requestId return? (409 vs 200 replay.)

## Traceability

[IA §4.11](../05-information-architecture.md) · [API §8.5](../06-api-integration.md) ·
[Security §9](../07-security-model.md) · [E2E E13/E14](../09-testing-strategy.md)
