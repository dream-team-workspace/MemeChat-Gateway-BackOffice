# FR-008 — Model catalog management

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend |
| Depends on | FR-002 |
| Source | [IA §4.8](../05-information-architecture.md), [API §8.4](../06-api-integration.md) |

## Intent

Let an operator curate the app-facing model picker without touching SQL: display name, tier,
capability mapping, sort order, enabled, min app version.

## Scope

In scope:

- List all model rows; search/filter; enabled/disabled visibility.
- Create a new model via PUT upsert; edit an existing model.
- Capability link select (nullable); sort order; enabled; min app version.
- Validation, duplicate sort warning, no delete.

Out of scope:

- Deleting models (no API).
- Renaming an existing model ID (path key).
- Model-level audit (backend gap).
- Bulk sort/reorder drag-and-drop.

## User stories

- As an operator, I can add a model for a new capability.
- As an operator, I can hide a model by disabling it.
- As an operator, I can change the display order in the app.
- As an engineer, I can map a model to a capability.

## Behavior

1. List loads `GET /api/admin/models`.
2. Table: ID, display name, tier, capability, sort order, status, min app version, updated.
3. Filters: search, tier, enabled status; URL-backed.
4. "Add model" opens a drawer/dialog with an empty form; ID editable.
5. Edit opens the same form; ID read-only.
6. Capability select is populated from the capabilities list; "None" allowed.
7. Save calls `PUT /api/admin/models/{id}` with the canonical fields.
8. Success: close, toast, invalidate models; detail/list refresh.
9. Duplicate sort order shows a warning (not a hard block unless the backend enforces it).
10. No delete; disabling is the removal path.
11. If the linked capability is disabled/missing, show a warning but allow save.

## Acceptance criteria

- [ ] All models are listed with ID/name/tier/capability/sort/status.
- [ ] Search/filter/sort work and are URL-backed where applicable.
- [ ] New model ID is validated and cannot collide silently (409 shown).
- [ ] Existing model ID is read-only.
- [ ] Fields validate: display name required, tier required, sort order integer, min version
      optional.
- [ ] Capability select includes all capabilities and "None".
- [ ] Duplicate sort order is warned; save still possible if backend allows.
- [ ] Save is pessimistic (no optimistic list update); pending lock prevents double submit.
- [ ] No delete control exists.
- [ ] Disabled models remain visible with a badge.
- [ ] 409/422/5xx errors are mapped safely; request ID shown.

## Data and API

See [API §8.4](../06-api-integration.md).

~~~ts
interface ModelInput {
  displayName: string;
  tier: string;
  capabilityId: string | null;
  sortOrder: number;
  enabled: boolean;
  minAppVersion: string | null;
}
~~~

Assumption: PUT is an upsert and the response returns the model. If not, refetch the list.

## UX notes

- Table is compact; sort order is numeric and editable via the drawer.
- Disabled models are badged, not hidden.
- Capability link shows ID + display name; warning if disabled.
- "Add model" is the only primary action on the page.
- Drawer on narrow screens; dialog on desktop.

## Errors and edge cases

- Duplicate ID → 409; keep the form; suggest a new ID.
- Invalid sort order (negative/float) → inline error.
- Capability deleted after load → select shows "Unknown capability" + warning.
- Model ID with invalid characters → client validation + server 422.
- Timeout → refresh before retry; no auto-retry.
- Empty catalog → empty state with "Add model" (valid).

## Security and audit

- Actor from session; BFF injects.
- No delete; no destructive action.
- No provider keys in model fields.
- Note: model changes may not have a backend audit trail (gap G9); show actor in the UI and
  request audit parity.

## Test notes

- Component: list/filter, create/edit, validation, duplicate ID, capability select.
- BFF: PUT mapping, actor, error mapping.
- E2E E10.

## Open questions

- Are model IDs immutable after creation? (Path key implies yes.)
- Does PUT return the row? (Assumed yes.)
- Is there a sort-order uniqueness constraint? (Not documented.)
- Will model changes get audit parity? (Backend ask.)

## Traceability

[IA §4.8](../05-information-architecture.md) · [API §8.4](../06-api-integration.md) ·
[E2E E10](../09-testing-strategy.md)
