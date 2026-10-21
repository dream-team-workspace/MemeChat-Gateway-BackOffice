# FR-015 — Theme and appearance

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Should |
| Phase | 1 |
| Owner | Frontend |
| Depends on | FR-013 |
| Source | [DESIGN.md](../../DESIGN.md) |

## Intent

Provide a consistent light/dark/system appearance that uses the approved tokens, avoids a flash
of the wrong theme, and never becomes a per-feature styling free-for-all.

## Scope

In scope:

- Light, dark, and system modes.
- Persistent preference (localStorage) + OS change handling.
- No-FOUC boot.
- Token-only styling; contrast overrides from DESIGN.md.
- Reduced-motion behavior.

Out of scope:

- Per-user server-side theme sync.
- Custom accent color picker.
- Density toggle (could be added later).
- High-contrast OS mode beyond token contrast (respect forced colors where possible).

## User stories

- As an operator, I can switch to dark mode and it stays across sessions.
- As an operator using system mode, the console follows my OS.
- As a reviewer, I see no flash of the wrong theme on load.
- As a user with reduced motion, animations do not play.

## Behavior

1. On boot, an external theme-init script reads localStorage/system and sets `.dark` on
   `<html>` before paint.
2. Default mode: `system`; explicit `light`/`dark` override.
3. The user menu offers Light / Dark / System with the current selection marked.
4. Changing mode updates `.dark` immediately and persists.
5. System mode listens to `prefers-color-scheme` changes.
6. Components use semantic tokens only; no raw colors.
7. Reduced motion is respected globally; skeletons shimmer only when allowed.
8. The theme toggle does not trigger a data refetch.

## Acceptance criteria

- [ ] No flash of the wrong theme on first paint (light/dark/system).
- [ ] Preference persists across reloads.
- [ ] System mode follows OS changes without reload.
- [ ] Light and dark use the committed token block; contrast ledger passes.
- [ ] No feature hardcodes hex/rgb/oklch colors.
- [ ] Focus rings, inputs, borders, and status badges remain visible in both modes.
- [ ] JSON viewers, tables, dialogs, and toasts are tested in both modes.
- [ ] Reduced-motion disables shimmer/slide transitions.
- [ ] Theme choice is per-browser, not per-account (v1).

## Data and API

No API. Storage key: `bo-theme` (value `light|dark|system`). The boot script is served as a
static file to satisfy `script-src 'self'`.

## UX notes

- Theme control lives in the user menu or Settings, not the primary nav.
- Use a segmented control or radio group with labels, not an icon-only toggle.
- Dark background is pure black; cards are elevated by surface + border, not shadows.
- Do not auto-switch based on time of day.
- Charts (future) must use token colors and patterns.

## Errors and edge cases

- localStorage unavailable (private mode) → default to system; no crash.
- Invalid stored value → system.
- OS change while on explicit mode → no change.
- Forced-colors mode → ensure focus/outline remains visible; test in Windows High Contrast if
  available.

## Security and audit

- No secrets in localStorage.
- Theme value is not security-sensitive; sanitize before applying a class.
- CSP must allow the external boot script and styles.

## Test notes

- E2E E16: toggle, reload, system emulation, no FOUC (screenshot at first paint).
- Visual regression light/dark.
- Unit: theme resolver.
- Accessibility: contrast + focus in both modes.

## Open questions

- Is a density toggle needed? (Not v1.)
- Should theme sync to the operator profile? (No API; not v1.)

## Traceability

[DESIGN §3, §9, §11](../../DESIGN.md) · [E2E E16](../09-testing-strategy.md)
