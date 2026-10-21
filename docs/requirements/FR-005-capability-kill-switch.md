# FR-005 — Capability kill switch

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend |
| Depends on | FR-003 |
| Source | [IA §4.6](../05-information-architecture.md), [API §8.2](../06-api-integration.md) |

## Intent

Give an operator a fast, unambiguous way to disable a capability during an incident, with a
reason and an audit trail, without navigating a full edit form.

## Scope

In scope:

- Disable and re-enable a capability.
- Required reason, impact copy, type-ID confirmation for disable.
- Pending lock, success/failure handling, audit refresh.
- Persistent disabled banner on the detail page.

Out of scope:

- Disabling a provider route (the chain editor handles routes).
- Per-user or per-region disable.
- Scheduling/auto-reenable.
- Deleting a capability.

## User stories

- As an operator, I can disable a broken capability in seconds.
- As an operator, I can re-enable it after the provider recovers.
- As a reviewer, I can see who disabled it, when, and why.
- As a support engineer, I can tell whether a capability is disabled globally.

## Behavior

1. The danger-zone card shows current state, last change, and a Disable/Enable button.
2. Disable opens an AlertDialog:
   - impact: "All users will receive CAPABILITY_DISABLED."
   - reason field (10–500 chars, required).
   - type the capability ID to confirm.
   - primary destructive button "Disable capability".
3. Enable opens the same dialog without type-ID (but still requires a reason) and a default
   (non-destructive) primary button "Enable capability".
4. Submit calls `POST /api/admin/capabilities/{id}/toggle` with `{enabled, reason}`.
5. While pending: buttons/spinner disabled; dialog cannot close; no second submit.
6. Success: close, toast, refetch capability + audit + list; show a "Disabled" banner.
7. Failure: keep the dialog open, show the error + request ID; retry is explicit.
8. No optimistic state change.

## Acceptance criteria

- [ ] Disable requires a reason and typing the exact capability ID.
- [ ] Enable requires a reason but not type-ID.
- [ ] The request body is exactly `{enabled: boolean, reason: string}`.
- [ ] Double-click/Enter cannot send two requests.
- [ ] Pending state disables close/escape and shows a progress label.
- [ ] Success updates the badge, banner, revision/last-updated, and audit.
- [ ] Failure preserves the dialog and input; retry does not lose the reason.
- [ ] A disabled capability shows a persistent banner on detail and a badge in the list.
- [ ] The flow is keyboard-only operable and target < 15 seconds from the row.
- [ ] No other capability fields are sent/changed.
- [ ] 401/403/409/5xx/timeout are handled with safe messages.

## Data and API

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/admin/capabilities/{id}/toggle` | `{enabled, reason}` | updated capability (assumed) |

Assumption: the toggle response returns the capability. If not, refetch the detail/list. The BFF
must not fabricate a response.

## UX notes

- Danger zone uses a red-tinted border/surface, not a red page.
- Disabled banner: "This capability is disabled. Users receive CAPABILITY_DISABLED."
- Show the last audit entry inline ("Disabled by x@y, 2 min ago") with a link.
- The reason is stored in the audit by the gateway; do not echo it in the toast.
- The type-ID confirmation prevents wrong-row incidents.

## Errors and edge cases

- 409 (already toggled by another operator): refetch and show the current state; do not silently
  flip back.
- 422 (reason too short): inline error; keep the dialog.
- 503/502: gateway unavailable; keep the dialog; retry.
- Timeout: unknown result; require a refresh before retry; never assume success.
- Session expiry: redirect to login; the toggle may have applied; refresh on return.

## Security and audit

- Actor from session via BFF; never client-supplied.
- Reason required for audit quality.
- No optimistic UI; no auto-retry.
- Audit entry is the evidence; link to it.
- Rate-limit toggles via the BFF mutation limiter.

## Test notes

- Component: reason validation, type-ID, pending lock, failure preservation.
- BFF: body mapping, actor header, error mapping.
- E2E E7 (disable) and E8 (enable), including keyboard path and timing.
- Contract: toggle response shape; fallback refetch.

## Open questions

- Does the toggle response include the updated capability? (Q8)
- Should re-enable require type-ID for symmetry? (Proposed: no; lower risk.)
- Is there a reason length limit in the backend? (Assumed 500.)

## Traceability

[IA §4.6](../05-information-architecture.md) · [API §8.2](../06-api-integration.md) ·
[Security §9](../07-security-model.md) · [E2E E7/E8](../09-testing-strategy.md)
