# FR-004 — Capability configuration editing

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend |
| Depends on | FR-003 |
| Source | [IA §4.4](../05-information-architecture.md), [API §8.1](../06-api-integration.md) |

## Intent

Let an operator change a capability's cost, limits, fair-use rules, flags, and app gating with
a reviewable diff and a clear audit trail — without accidentally changing its enabled state or
losing unknown configuration.

## Scope

In scope:

- Edit display name, streaming, reasoning/image flags, cost unit/credits/per, limits JSON,
  fair-use JSON, min app version.
- Integer validation; per-kind hints; JSON validation/format.
- Dirty guard, review diff, save, revision/audit refresh.
- 409/422 handling; preserve draft.

Out of scope:

- Enabling/disabling (FR-005).
- Provider routing (FR-006).
- Creating/deleting capabilities.
- Editing raw DB rows or fields not in the contract.

## User stories

- As an operator, I can change a cost and see exactly what users will be charged.
- As an operator, I can review a before/after diff before saving.
- As an operator, I can edit limits/fair use as JSON with validation.
- As a reviewer, I can see the revision and audit entry after the change.

## Behavior

1. Detail loads capability + providers; form is initialized from the canonical shape.
2. Sections: Identity, Commercial, Capabilities, Limits, Fair use, App gating.
3. Cost preview: "1 credit per 500 characters" / "5 credits per turn".
4. JSON editors validate on change; Format action; invalid JSON blocks review/save.
5. Save bar appears when dirty; Discard restores the last loaded state.
6. "Review changes" opens a dialog with a field-by-field diff, revision, actor, impact.
7. Confirm sends a full PUT (editable fields only; no `enabled`/`revision`/`providers`).
8. Success: toast, update detail, invalidate audit/list, show new revision.
9. 409 revision mismatch: show "Reload latest"; preserve the draft in a collapsible panel;
   never silently overwrite.
10. 422: map `details.field` to the form; scroll to the first error.

## Acceptance criteria

- [ ] All editable fields round-trip without loss; unknown nested JSON keys are preserved.
- [ ] `costCredits`/`costPer` are positive integers; 0/negative/float input is rejected.
- [ ] `enabled` cannot be changed from this form.
- [ ] Invalid JSON cannot be submitted; the error is associated with the editor.
- [ ] Dirty navigation/unload prompts; Discard restores the loaded state.
- [ ] Review shows only changed fields by default (with show-unchanged toggle).
- [ ] PUT sends only editable fields; no `id`/`revision`/`providers` injection.
- [ ] Success updates revision and audit; list is invalidated.
- [ ] 409 preserves the draft and offers reload; 422 maps field errors.
- [ ] Save is disabled while pending; no duplicate PUT on double-click.
- [ ] Loading/404/error states are handled.

## Data and API

See [API §8.1](../06-api-integration.md).

~~~ts
interface CapabilityUpdate {
  displayName: string;
  streaming: StreamingMode;
  supportsReasoning: boolean;
  supportsImage: boolean;
  costUnit: CostUnit;
  costCredits: number;
  costPer: number;
  limits: Record<string, unknown>;
  fairUse: Record<string, unknown>;
  minAppVersion: string | null;
}
~~~

## UX notes

- Use a single-column form, max 720px; JSON editors up to 960px.
- Show the cost formula as a sentence, not only fields.
- Fair use presets: off, daily cap, monthly cap; presets fill JSON, still editable.
- Sticky save bar: "Unsaved changes" + Discard + Review changes.
- Review dialog: impact copy for cost changes ("New requests will be charged X").
- Do not auto-save.

## Errors and edge cases

- No changes → Review disabled.
- Number input with whitespace/commas → normalize or reject with a clear message.
- Very large JSON → client size guard; server 422.
- Capability changed by another operator → 409; draft preserved.
- Gateway timeout → uncertain; refresh detail before retrying.
- Missing optional fields → default to safe values, but do not invent limits.

## Security and audit

- Actor from session; BFF overwrites any client actor.
- Money fields require confirmation; no optimistic update.
- Audit entry must appear; show link on success.
- No secret or raw upstream body in errors.

## Test notes

- Unit: form schema, integer/number coercion, diff builder, JSON parse/format.
- Component: validation, dirty guard, review, 409/422.
- BFF: PUT mapping, actor header, error normalization.
- E2E E5/E6.

## Open questions

- PUT full replacement vs merge (Q6).
- Limits/fair-use schemas per kind (need backend examples).
- Is revision accepted for optimistic concurrency?

## Traceability

[IA §4.4](../05-information-architecture.md) · [API §8.1](../06-api-integration.md) ·
[Testing §4](../09-testing-strategy.md) · [E2E E5/E6](../09-testing-strategy.md)
