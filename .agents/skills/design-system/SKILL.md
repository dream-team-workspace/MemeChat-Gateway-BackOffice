---
name: design-system
description: The console's visual and interaction contract from DESIGN.md: semantic tokens, typography, component patterns, status vocabulary, contrast, dark mode, and content tone. Load for UI or visual changes.
---

# Design system

## Use this skill when

- Adding or restyling a page, component, badge, dialog, table, or empty/error state.
- Touching `src/styles/globals.css`, `components/ui`, `components/common`, or layout.
- Reviewing a UI PR for visual consistency and accessibility.

`DESIGN.md` is the authoritative visual contract; this skill is the working summary. If code
and DESIGN.md disagree, DESIGN.md wins for visuals until a PR updates both together. Read the
full relevant section before changing tokens or shared patterns.

## Principles (from DESIGN.md)

1. **Open code, not a black box.** Components are source in this repo (shadcn-style, locally
   owned). Local patches are allowed but must be minimal and documented.
2. **Composition over configuration.** Install primitives, compose in features. No mega
   components with dozens of boolean modes.
3. **Semantic tokens only.** No raw hex/oklch/arbitrary shadows in domain code.
4. **Accessible primitives, accessible composition.** Preserve keyboard/focus behavior.
5. **Own the surface, keep the system small.** One page header, one table pattern, one form
   section, one confirm dialog, one empty/loading/error pattern, one status vocabulary.
6. **Operational honesty.** Show what changes (before → after), who acts, when, what happened
   (success/failure + request ID), and when data is stale/unavailable. No fake dashboards, no
   optimistic money.

## Theme and tokens

- Runtime source of truth: `src/styles/globals.css`. Tailwind v4 CSS-first config:
  `@import "tailwindcss"; @custom-variant dark (&:is(.dark *));` then `:root` / `.dark`
  variables, then `@theme inline { --color-…: var(--…); }` to expose utilities.
- Palette provenance: tweakcn theme `cmthn09qj000004jx7ky299wm`, with committed accessibility
  deviations (dark primary foreground, darker blue accent, 12px radius, contrast repairs).
  Do not "restore" a raw token without re-running the contrast ledger.
- Use semantic utilities: `bg-background`, `text-foreground`, `text-muted-foreground`,
  `bg-card`, `border-border`, `ring-ring`, `bg-primary`, `text-primary-foreground`,
  `bg-accent`, `text-accent-foreground`, `bg-destructive`, `bg-success`, `bg-warning`,
  `bg-info`, `brand-panel*`.
- Token usage: orange `primary` is a signal — one primary action per view, never body text on
  white, never a success color. Blue `accent` is navigation/selection/links/focus. Green,
  amber, red are status only and always paired with a label/icon. `chart-*` is data-viz only.
  `brand-panel-*` is only the permanently dark login/operator panel.
- Radius: `--radius: 0.75rem` (sm 8, md 10, lg 12, xl 16). Buttons/inputs `rounded-md`,
  cards/dialogs `rounded-lg`/`rounded-xl`, status badges `rounded-full`.
- Elevation: no drop shadows. Use 1px borders, surface contrast, `bg-black/50` scrim, and a
  single inset ring for focused/dirty states.
- Typography: Open Sans variable, self-hosted via `@fontsource-variable/open-sans`; Menlo for
  IDs/JSON/tokens (`font-mono`). Page title 24/32 600; section 18/28 600; body 14/20; small
  12/16; overline 11/16 600 uppercase with tracking. Tabular numerals for money, tokens,
  durations, revisions, timestamps. Line length 60–75 chars for prose.
- Spacing: 4px scale. Page padding 24 desktop / 16 tablet-mobile; section gap 32; card padding
  20–24; table rows 44–48; buttons 32/36/40; badges 20.

## Layout and shell

- Sidebar 264px in code (`lg:w-[264px]`), top bar, content `max-w-[1440px]`, page padding
  `px-4 sm:px-6 lg:px-8`.
- Nav groups: OPERATE (Overview, Abilities, App clients, Models, Providers), SUPPORT (Users),
  SYSTEM (Operations); Settings is the sidebar footer. The environment panel and operator block
  were deliberately removed — do not reintroduce them. Identity/sign-out live in Settings and
  the top bar.
- Mobile: sidebar becomes a focus-trapped sheet (`AppLayout` implements scroll lock, Escape,
  focus trap/restore). Keep that behavior.
- Detail pages: two columns at ≥1280px (main + context), stacked below.

## Component rules

- **Buttons** (`components/ui/button.tsx`): `default` (orange, one per view), `secondary`
  (high-emphasis neutral, sparing), `outline` (secondary/row actions), `ghost` (tertiary/icon),
  `destructive` (kill switch/revoke), `link` (inline nav). Pending buttons keep width and say
  the verb ("Saving…"). Icon-only buttons need `aria-label`.
- **Badges** (`components/ui/badge.tsx`): `success` and `warning` use solid semantic fills with
  matching foreground (tinted fills failed AA at 11px); `info`/`destructive` are tinted;
  `outline` is neutral metadata. Status is never color-only.
- **Dialogs** (`components/ui/dialog.tsx`): native modal panel with focus trap, Escape,
  restore-focus, scroll lock, and a portal to `document.body`. Use `ConfirmDialog` for
  destructive/high-impact actions; confirm label is the action ("Disable capability"), never
  "OK". Disable Escape/close only while a request is pending, and show pending state.
- **Forms**: one pattern per form; visible labels; `FormField`; inline `role="alert"` errors;
  sections (Identity, Commercial, Capabilities, Limits, Fair use, App gating) when applicable;
  JSON editors with validation/format; integers for money; preserve unknown keys.
- **Tables**: real table semantics, muted header, 44–48px rows, numeric columns right-aligned
  with tabular numerals, IDs monospace/truncated with copy, cursor pagination "Newer/Older",
  empty state replaces the body, skeleton rows match columns. DESIGN.md names TanStack Table as
  the target; it is **not installed** — current tables use local primitives.
- **JSON/diff**: read-only tree with copy/raw; never `dangerouslySetInnerHTML`; diffs show
  changed keys by default, `+/-` markers with labels, not color alone.
- **Empty/loading/error**: icon + short title + one sentence + one action. Skeleton matches the
  final layout. Error states say what failed, what to do, the request ID, and retry. Partial
  failures keep the page usable.
- **Toasts**: DESIGN.md describes sonner, but it is not installed and there is no toast region
  yet. Use inline errors/messages; do not introduce a toast library in a feature PR.

## Status vocabulary

| Meaning | Token | Labels |
|---|---|---|
| Enabled / healthy / committed | `success` | Enabled, Healthy, Committed, OK |
| Disabled / failed / refunded | `destructive` or neutral | Disabled, Failed, Refunded |
| Pending / reserved / degraded | `warning` | Pending, Reserved, Degraded |
| Informational / neutral | `info` / `muted` | Unknown, Not configured |

Ledger states are shown verbatim in a monospace badge:
`PENDING_SPEND`, `RESERVED`, `COMMITTED`, `REFUND_PENDING`, `REFUNDED`, `EXPIRED`, `FAILED`.
Do not collapse them.

## Motion and dark mode

- Motion 120–180ms hover/focus, 180–240ms dialogs; animate opacity/transform only; no looping
  decoration; skeletons may shimmer; respect `prefers-reduced-motion` (global CSS handles it).
- Dark mode is class-based (`.dark` on `<html>`), default follows system, persisted in
  `localStorage` key `bo-theme`, applied pre-paint by `public/theme-init.js` to avoid flash.
  ThemeProvider (`src/lib/theme.tsx`) reads/writes the preference; theme toggle is in the top
  bar. Test every screen in both modes, including disabled and JSON states. Dark background is
  pure black; cards are near-black; borders must stay visible.

## Content and tone

- Sentence case for labels, buttons, titles, menus. Verbs for actions, object included
  ("Delete model", not "Delete"). Errors say what happened and what to do; no stack traces or
  provider payloads. Use "credits" in UI copy, "CRD" only in data columns. Timestamps: local
  time, UTC tooltip; relative time only secondary. Empty copy is specific ("No providers match
  this view.") — no exclamation marks, jokes, emoji, or filler.

## UI change checklist

- [ ] Semantic tokens only; no raw colors/shadows.
- [ ] Light and dark states checked; screenshots in the PR.
- [ ] Contrast: 4.5:1 text, 3:1 UI for new pairs.
- [ ] Keyboard path works; focus visible; dialog focus/Escape/restore preserved.
- [ ] Labels for icon-only controls and status badges.
- [ ] Loading, empty, error, and permission states exist.
- [ ] One obvious primary action; destructive action has impact copy + confirmation.
- [ ] Numbers tabular/right-aligned; no layout shift; reduced motion respected.
- [ ] Mobile/narrow viewport checked (sheet, table scroll).
- [ ] `DESIGN.md` updated in the same PR for token/pattern changes.

## References

- `DESIGN.md` — authoritative visual contract (tokens, contrast ledger, component rules).
- `src/styles/globals.css` — committed tokens and utilities.
- [references/visual-contract.md](references/visual-contract.md) — token/contrast/component quick table.
