# FR-007 — Capability audit history

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend |
| Depends on | FR-003 |
| Source | [IA §4.7](../05-information-architecture.md), [API §2.2](../06-api-integration.md) |

## Intent

Answer "who changed what, when, and from what" for a capability, with enough state to debug a
bad routing or cost change.

## Scope

In scope:

- Per-capability audit list, newest first.
- Revision, action, actor, timestamp, summary.
- Before/after JSON and a changed-key diff.
- Limit handling (documented `?limit=50`) and refresh.

Out of scope:

- Global audit across capabilities (no API).
- Editing/deleting audit rows.
- Export.
- Real-time streaming.

## User stories

- As an operator, I can see the last change and who made it.
- As an engineer, I can compare before/after states to find a bad config.
- As a reviewer, I can verify a change was recorded after a save.
- As support, I can correlate a user issue with a registry change time.

## Behavior

1. Detail page links to `/capabilities/:id/audit`.
2. Page loads `GET /api/admin/capabilities/{id}/audit?limit=50`.
3. Table: changed at, revision, action, changed by, summary.
4. Row expands (or opens a sheet) with Before, After, Diff tabs.
5. Diff shows changed keys only by default; toggle "show unchanged".
6. JSON is read-only, collapsible, copyable; no HTML injection.
7. Local filter by action/revision; no server-side filter assumed.
8. Refresh refetches; a failed refetch keeps stale data + warning.
9. Empty state: "No changes recorded yet."
10. If the API returns only 50, show "Most recent 50" (do not imply completeness).

## Acceptance criteria

- [ ] Audit entries render newest first with revision/action/actor/time.
- [ ] Before/after states are viewable; missing state shows "not captured", not "{}".
- [ ] Diff highlights changed keys with `-/ +` markers (not color alone).
- [ ] JSON viewer is read-only, keyboard accessible, and copyable.
- [ ] Empty/loading/error states exist; error includes request ID + retry.
- [ ] The page is read-only; no mutation controls.
- [ ] Limit behavior is disclosed when no cursor is available.
- [ ] Long values wrap/scroll, not overflow the layout.
- [ ] Actor null shows "unknown actor" honestly.
- [ ] Links back to capability/detail work.

## Data and API

| Method | Path | Response |
|---|---|---|
| GET | `/api/admin/capabilities/{id}/audit?limit=50` | `AuditEntry[]` or `{items}` normalized |

Assumption: no cursor; if a cursor is added, switch to "Load older" and update this requirement.

## UX notes

- Use a timeline/table hybrid: time, action, actor, revision.
- Expanded state: tabs Before / After / Diff; default Diff.
- Summarize the action ("cost changed", "providers replaced", "disabled").
- Show the capability ID in the header for context.
- Do not show raw audit JSON as the only view.

## Errors and edge cases

- 404 capability → not-found state with back link.
- 403 → forbidden.
- Audit empty for a new capability → empty state.
- Huge before/after JSON → virtualized/collapsible tree; cap initial depth.
- Malformed JSON state → render as text with a warning.
- 5xx → error panel; keep previous data if any.

## Security and audit

- Read-only; no actor header needed.
- Audit data can contain config but no secrets (provider config must not hold keys).
- Do not log audit payloads.
- No client-side mutation of displayed history.

## Test notes

- Component: list, expand, diff, missing state, empty/error.
- Contract: fixture with before/after and null actor.
- E2E: open audit after a kill-switch change (E7).
- Unit: diff builder.

## Open questions

- Can audit paginate beyond 50? (No documented cursor.)
- Does `before_state` always include the full capability? (Assumed yes.)
- Is there a global audit endpoint planned? (Deferred.)

## Traceability

[IA §4.7](../05-information-architecture.md) · [API §2.2](../06-api-integration.md) ·
[E2E E7](../09-testing-strategy.md)
