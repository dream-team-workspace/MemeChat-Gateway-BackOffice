# NFR-008 — Browser, viewport, and device support

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–4 |
| Owner | Frontend |
| Source | [Tech stack §5](../04-tech-stack.md), [IA §7](../05-information-architecture.md) |

## Intent

Operators use modern desktop browsers, occasionally a tablet or phone during an incident. The
console must work there without pretending to be a mobile-first product.

## Supported browsers

- Chrome/Edge: last 2 major versions.
- Firefox: last 2 major versions.
- Safari: last 2 major versions (macOS/iOS).
- No Internet Explorer or legacy Edge.
- JavaScript required; no no-JS fallback.

## Viewports

| Width | Support |
|---|---|
| ≥1440px | Full layout |
| 1024–1439px | Collapsed sidebar, stacked detail |
| 768–1023px | Sheet nav, single column, scrollable tables |
| 360–767px | Read-only-friendly; kill switch/lookup still work; forms warn |

## Requirements

1. Responsive layout at 360/768/1024/1440.
2. Sidebar collapses to icons then a sheet; focus trap/restore.
3. Tables scroll horizontally; primary columns remain visible.
4. Sticky save bar does not cover content; respects safe areas.
5. Touch targets ≥44px on touch devices (or 24px minimum with spacing).
6. No hover-only functionality.
7. Fonts render correctly; no layout shift.
8. Test WebKit/Safari for oklch, dialogs, and scrolling.
9. No horizontal page scroll at supported widths (tables may scroll internally).
10. Emergency actions (kill switch, ledger read, grant) work at 360px.

## Acceptance criteria

- [ ] Playwright runs Chromium + WebKit for critical paths.
- [ ] Screenshots at 390/768/1440 for core screens.
- [ ] No horizontal body scroll at 360/768/1024/1440.
- [ ] Sidebar sheet traps/restores focus and closes on Escape.
- [ ] Kill switch + lookup reachable at 360px.
- [ ] Tables scroll internally with accessible headers.
- [ ] Safari renders tokens/dialogs correctly.
- [ ] Touch targets meet the minimum.
- [ ] No hover-only actions.

## Verification

- Playwright viewport projects.
- Manual Safari/iOS smoke.
- Responsive screenshots in PRs.
- Lighthouse mobile profile for layout/CLS.

## Exceptions

- Dense ledger/usage tables may require horizontal scrolling on phones; no data is hidden.
- Complex JSON editing on phones is possible but warned; users can copy/edit elsewhere.

## Traceability

[Tech stack §5](../04-tech-stack.md) · [IA §7](../05-information-architecture.md) ·
[Testing §7 E19](../09-testing-strategy.md)
