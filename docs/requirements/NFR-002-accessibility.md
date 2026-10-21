# NFR-002 — Accessibility (WCAG 2.2 AA)

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Frontend |
| Source | [DESIGN.md §6, §12](../../DESIGN.md) |

## Intent

Operators under pressure, on bad monitors, or using assistive technology must be able to disable
a capability, inspect a ledger, and grant credits without a mouse.

## Requirements

1. Target WCAG 2.2 AA for all core flows.
2. Contrast: 4.5:1 for normal text, 3:1 for large text and UI boundaries, per the DESIGN.md
   ledger.
3. Full keyboard operation: login, navigation, tables, dialogs, forms, kill switch, grant.
4. Visible focus ring on every interactive element; never remove outline without a replacement.
5. Semantic landmarks, headings, labels, and table headers.
6. Dialogs/sheets trap focus, restore focus, close on Escape (unless pending).
7. Errors are announced and associated with fields; success toasts use a live region.
8. Status is not conveyed by color alone; badges include text/icons.
9. Target size ≥24×24px, preferably 36×36.
10. Respect `prefers-reduced-motion`.
11. Zoom to 200% and reflow at 320px without loss of function.
12. No keyboard trap; skip link to main.

## Acceptance criteria

- [ ] axe reports no serious/critical issues on core routes and dialogs.
- [ ] Keyboard-only E2E completes kill switch, capability save, ledger pagination, grant.
- [ ] Focus is visible and restored after dialogs.
- [ ] Form errors are programmatically associated and announced.
- [ ] Tables have proper headers and row action labels.
- [ ] Light/dark contrast passes the DESIGN.md ledger.
- [ ] Reduced-motion mode disables non-essential animation.
- [ ] 200% zoom and 320px width keep core actions reachable.
- [ ] Icon-only buttons have accessible names.
- [ ] No color-only status.

## Verification

- axe in component/E2E tests.
- Manual keyboard pass per release.
- Screen-reader smoke (VoiceOver/NVDA) for login, kill switch, grant.
- Contrast unit test for tokens.
- Visual review light/dark.

## Exceptions

- Complex JSON diffs may require horizontal scrolling; the content remains keyboard reachable and
  copyable.
- Data tables may scroll horizontally at narrow widths; row actions remain reachable.

## Traceability

[DESIGN §6, §12](../../DESIGN.md) · [Testing §9](../09-testing-strategy.md) ·
[FR-016](FR-016-safe-mutation-protocol.md)
