# NFR-012 — Design system consistency

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Frontend/design |
| Source | [DESIGN.md](../../DESIGN.md) |

## Intent

Every screen should feel like the same product: one token system, one component vocabulary, one
set of interaction patterns. No page-specific visual dialects.

## Requirements

1. All colors/radii/fonts come from DESIGN.md tokens; no raw color values in feature code.
2. shadcn primitives live in `components/ui`; shared compositions in `components/common`.
3. One primary action per view; destructive actions use the destructive variant + confirmation.
4. Status uses the defined badge vocabulary, with text + icon, not color alone.
5. Tables/forms/dialogs follow the shared patterns; no one-off variants without a design note.
6. Light/dark screenshots and a contrast check accompany UI changes.
7. No second icon set, toast library, or component library.
8. Motion follows the duration/easing rules and reduced motion.
9. New shared components need a usage note and tests.
10. Design changes update DESIGN.md in the same PR.

## Acceptance criteria

- [ ] A grep for raw hex/rgb/oklch in feature code is empty (except token file).
- [ ] Pages use the shared PageHeader/DataTable/EmptyState/ErrorState patterns.
- [ ] Buttons follow the variant usage table; one primary per view.
- [ ] Status badges are consistent across capabilities/models/ledger/usage.
- [ ] Light/dark review passes on core screens.
- [ ] New patterns are documented in DESIGN.md.
- [ ] No duplicate component implementations.
- [ ] Reduced-motion behavior verified.

## Verification

- Code review + grep/lint rule.
- Visual regression screenshots.
- Design checklist in DESIGN.md §12.
- Contrast unit test.

## Exceptions

- Data-viz colors may use `chart-*` tokens with labels/patterns.
- A one-off layout for a specific page is allowed if it composes shared primitives and does not
  introduce new tokens.

## Traceability

[DESIGN](../../DESIGN.md) · [Standards §9](../08-engineering-standards.md) ·
[ADR-0004](../adr/0004-shadcn-owned-components.md)
