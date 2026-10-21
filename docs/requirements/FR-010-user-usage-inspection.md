# FR-010 — User usage inspection

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 3 |
| Owner | Frontend |
| Depends on | FR-002 |
| Source | [IA §4.10](../05-information-architecture.md), [API §2.2](../06-api-integration.md) |

## Intent

Show metadata-only usage events for a UID so support can correlate a charge with the capability,
model, tokens/seconds, status, and latency — without exposing any content.

## Scope

In scope:

- Cursor-paginated usage table.
- Capability, provider/model, tokens, chars, seconds, credits, status, latency, time.
- Row detail; status filter on loaded page; copy request ID.
- Empty/loading/error states.

Out of scope:

- Prompt/response content (not stored).
- Provider payloads or errors.
- Aggregated charts/analytics (no API).
- Export.

## User stories

- As support, I can see whether a request succeeded or failed upstream.
- As an engineer, I can see which model served a capability and its token usage.
- As a reviewer, I can confirm no content is exposed.

## Behavior

1. Usage tab loads `GET /api/admin/users/{uid}/usage?limit=50`.
2. Columns: created, capability, provider/model, input/output tokens, chars, seconds, credits,
   status, latency.
3. Status badge: ok (success), upstream_error (destructive), client_abort (neutral/warning),
   insufficient_credits/fair_use (warning/destructive), unknown (neutral).
4. Numbers are right-aligned; null values show "—".
5. Row opens a detail sheet with full metadata JSON.
6. "Older"/"Newer" cursor navigation.
7. Client-side filter by status/capability on the loaded page, labeled "on this page" (not a
   server filter).
8. Refresh refetches; stale data warning on failure.

## Acceptance criteria

- [ ] Table shows only metadata; no content fields are rendered or requested.
- [ ] All documented statuses render with a label + non-color cue.
- [ ] Null tokens/characters/seconds/latency show "—".
- [ ] Cursor pagination works and resets on UID change.
- [ ] Row detail is read-only, keyboard accessible, and copyable.
- [ ] Empty state distinguishes no usage from no matches.
- [ ] Error/401/403/404 states exist with request ID.
- [ ] No chart/aggregate is fabricated.
- [ ] UID/request IDs are not logged raw.

## Data and API

| Method | Path | Response |
|---|---|---|
| GET | `/api/admin/users/{uid}/usage?limit=50&cursor=...` | `{items,nextCursor}` |

`limit` default 50, max 200. UID regex as FR-009.

## UX notes

- Tabs on user detail: Ledger / Usage; keep both query states independent.
- Status badge + label; tooltip explains status.
- Request ID links/copies; no link to gateway logs (not available).
- Show "metadata only — no message content is stored" as help text.
- Compact columns; horizontal scroll on narrow screens.

## Errors and edge cases

- Unknown status string → neutral "Unknown" badge, do not crash.
- Negative/large numbers → display as-is with formatting; do not compute derived totals.
- Cursor expired → reset.
- 5xx → error panel; keep previous page.
- 401/403/404 as standard.

## Security and audit

- Read-only.
- Privacy: UIDs and usage metadata are confidential; no analytics/session replay.
- The BFF allowlist prevents arbitrary query params.
- No content endpoints exist; do not invent them.

## Test notes

- Component: statuses, nulls, pagination, detail, empty/error.
- Contract: fixture with ok/upstream_error/client_abort.
- E2E E12.
- Privacy check: network payload contains no content fields.

## Open questions

- Can usage filter server-side by capability/status? (Not documented.)
- Are `provider`/`model` always populated? (Nullable assumed.)
- Is latency in ms? (Assumed.)

## Traceability

[IA §4.10](../05-information-architecture.md) · [API §2.2](../06-api-integration.md) ·
[Testing §7 E12](../09-testing-strategy.md)
