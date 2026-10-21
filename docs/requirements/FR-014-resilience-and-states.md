# FR-014 — Loading, empty, error, and offline states

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1 |
| Owner | Frontend |
| Depends on | FR-002 |
| Source | [DESIGN.md §7.7](../../DESIGN.md), [Testing](../09-testing-strategy.md) |

## Intent

No screen should be a blank page, an infinite spinner, or a lie. Every data surface has a
designed state for loading, empty, error, partial, stale, and offline.

## Scope

In scope:

- Standard `LoadingState`, `EmptyState`, `ErrorState`, `StaleBanner`, `OfflineBanner`.
- Root/route error boundaries.
- Retry behavior and request ID display.
- Partial panel failures and stale data.
- Skeleton layout matching content.

Out of scope:

- Automatic offline mutation queue.
- Service worker/offline cache (v1).
- Global retry orchestration.

## User stories

- As an operator, I know whether data is loading, empty, or broken.
- As an operator, I can retry without losing context.
- As support, I can give engineering a request ID.
- As a user on a flaky connection, I see an offline state, not a crash.

## Behavior

1. Queries show skeleton rows/cards matching final layout; no full-page spinner unless the
   whole app is booting.
2. Empty states distinguish "no data" from "no matches" and offer one action.
3. Errors show: what failed, a safe message, request ID, Retry (reads only), and a link back.
4. Partial failures keep successful panels; each panel owns its error/retry.
5. Background refetch failure keeps stale data and shows a warning with age + refresh.
6. Network offline: show a banner; pause queries; disable mutations; restore automatically.
7. Route errors use an error boundary with a request ID and home/retry.
8. 401 → login flow; 403 → forbidden; 404 → not found.
9. Toasts are for action outcomes, not initial load failures.

## Acceptance criteria

- [ ] Every page/table/card has loading, empty, error, and data states.
- [ ] Skeletons match the final layout to avoid CLS.
- [ ] Empty states have a specific title + one action.
- [ ] Errors include a request ID and retry where safe.
- [ ] 401/403/404 map to the right routes, not generic errors.
- [ ] Partial failures do not blank the page.
- [ ] Stale data is visibly marked with age; no fake fresh timestamp.
- [ ] Offline banner appears/disappears with connectivity; mutations disabled offline.
- [ ] Error boundaries catch render errors without losing the shell.
- [ ] No raw stack traces/upstream bodies in production.

## Data and API

No new endpoints. The BFF error envelope provides `code/message/requestId/details`. Query
retry policy is in [API §7](../06-api-integration.md).

## UX notes

- Error copy: "Couldn't load capabilities." + "The gateway returned an error. Retry or copy the
  request ID." Never "Oops!".
- Empty copy: "No ledger activity for this UID." + "View usage".
- Stale banner: "Showing data from 2 minutes ago." + Refresh.
- Offline: "You're offline. Changes are disabled." + Retry.
- Toast success includes a Details disclosure with request ID.
- Do not stack multiple error toasts; dedupe by request ID.

## Errors and edge cases

- Contract mismatch → "Unexpected response" + request ID; do not render partial data.
- Timeout on a mutation → "Unknown result" + refresh; no auto-retry.
- Session expiry mid-page → login with returnTo.
- Repeated retry → backoff; disable while pending.
- Empty error message from upstream → use a generic safe message + code.

## Security and audit

- Error messages must not expose secrets, upstream hostnames, SQL, or stack traces.
- Request IDs are safe to show/copy.
- Log errors once at the boundary with redaction.
- Do not include UIDs or ledger payloads in error reports.

## Test notes

- Component: each state for table/form/card.
- BFF: error envelope mapping.
- E2E E17/E20 (route error/offline).
- Accessibility: error alerts, retry focus.

## Open questions

- Do we add a service worker later? (Deferred; no offline mutations in v1.)
- Is request ID available on network errors? (Generate client-side if the request never reached
  the BFF.)

## Traceability

[DESIGN §7.7](../../DESIGN.md) · [API §6–§7](../06-api-integration.md) ·
[Testing §7 E17/E20](../09-testing-strategy.md)
