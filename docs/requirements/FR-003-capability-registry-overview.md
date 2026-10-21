# FR-003 — Capability registry overview

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend |
| Depends on | FR-002 |
| Source | [IA §4.3](../05-information-architecture.md), [API](../06-api-integration.md) |

## Intent

Give operators a complete, scannable view of every capability, including disabled ones, so
they can find the right control quickly during normal work and incidents.

## Scope

In scope:

- Full capability list (no pagination assumed).
- Search, kind/status filters, sorting, counts, refresh.
- Disabled state visibility, cost summary, provider count, revision, updated time.
- Row actions: view, audit, copy ID.
- Empty/loading/error/stale states.

Out of scope:

- Creating or deleting capabilities.
- Bulk actions.
- Inline editing from the list.

## User stories

- As an operator, I can see all capabilities and which are disabled.
- As an operator, I can search by ID/name and filter by kind/status.
- As an operator, I can open a capability or its audit trail in one click.
- As a support engineer, I can copy the exact capability ID.

## Behavior

1. On load, fetch `GET /api/admin/capabilities`.
2. Render counts: total, enabled, disabled.
3. Table columns: ID, display name, kind, status, cost, providers, revision, updated.
4. Search matches ID, display name, kind (case-insensitive).
5. Filters are stored in the URL: `?q=&kind=&status=`.
6. Sort by ID, kind, status, revision, updated; default ID ascending.
7. Refresh refetches; show "Updated Ns ago"; background failure keeps data + warning.
8. Row click opens detail; action menu offers View, Audit, Copy ID.
9. Disabled rows are badged "Disabled"; not merely dimmed.

## Acceptance criteria

- [ ] All capabilities returned by the API are shown, including disabled.
- [ ] Counts match the rendered list (total/enabled/disabled).
- [ ] Search and filters combine; clearing restores the full list; URL is shareable.
- [ ] Invalid URL filters fall back safely without crashing.
- [ ] Sort works for all listed columns and is keyboard accessible.
- [ ] Empty states distinguish "no capabilities" from "no matches".
- [ ] Loading uses skeleton rows; error shows retry + request ID.
- [ ] Stale data is visibly marked after a failed refetch.
- [ ] Row actions are keyboard reachable; Copy ID announces success.
- [ ] No mutation is possible from the list.

## Data and API

| Method | Path | Response |
|---|---|---|
| GET | `/api/admin/capabilities` | `Capability[]` normalized to `{items}` if needed |

Assumption: the endpoint returns all rows (including disabled). If it later paginates, add
cursor pagination and update this requirement.

Derived cost summary examples:

- `1 CRD / turn`
- `1 CRD / 500 chars`
- `1 CRD / 120 s`
- `1 CRD / 100K tokens`

## UX notes

- Page header: "Capabilities" + subtitle + Refresh.
- Toolbar: search input (debounced 250ms), kind select, status select, clear.
- Table density: 44px rows; ID monospace; status badge with label.
- Provider cell: count + first provider/model; tooltip lists all.
- Empty: "No capabilities match these filters." + Clear filters.
- Disabled banner count on the page header ("2 disabled").

## Errors and edge cases

- 401 → login; 403 → forbidden; 5xx → error panel + retry.
- Malformed capability (`providers` missing) → show row with a warning, do not crash the table.
- Duplicate IDs (contract violation) → render once, log a contract warning.
- Very long IDs/names → truncate visually with tooltip/copy.
- Zero capabilities → empty state with "Check the gateway registry" (no fake create button).

## Security and audit

- Read-only; no actor header required, but the BFF may send it.
- No secrets; no mutation.
- Copy actions do not log the ID in analytics.

## Test notes

- Component tests: loading/empty/error/filters/sort/row actions.
- Contract test: full list fixture + disabled rows.
- E2E E4.

## Open questions

- Is the list paginated? (Assumed no.)
- Are provider chains always included? (Assumed yes.)

## Traceability

[IA §4.3](../05-information-architecture.md) · [API §2.2](../06-api-integration.md) ·
[Testing §4](../09-testing-strategy.md)
