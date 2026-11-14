# Visual contract quick reference

Extracted from `DESIGN.md`. The document wins; this is a lookup table.

## Token map

| Token | Use |
|---|---|
| `background` / `foreground` | App canvas / primary text |
| `card` / `card-foreground` | Panels, tables, dialogs |
| `primary` / `primary-foreground` | One primary action per view; brand signal |
| `secondary` / `secondary-foreground` | High-emphasis neutral action |
| `muted` / `muted-foreground` | Metadata, disabled surfaces, table headers |
| `accent` / `accent-foreground` | Hover, selected row, inline links, focus |
| `destructive` / `destructive-foreground` | Destructive actions / error emphasis |
| `border` | Decorative separators (not the form boundary) |
| `input` | Form control boundaries (≥3:1) |
| `ring` | Focus ring / selected outline |
| `success`, `warning`, `info` | Status surfaces/badges with matching foreground |
| `brand-panel` / `brand-panel-foreground` | Login/operator dark panel only |
| `chart-*` | Data visualization only |

## Contrast ledger (committed)

| Pair | Ratio | Note |
|---|---|---|
| foreground/background light | 18.51:1 | pass |
| muted-foreground/background light | ~7.1:1 | pass |
| primary-foreground/primary | 6.66:1 | pass via dark foreground override |
| accent-foreground/accent light | 4.97:1 | pass via darker blue |
| input/background light | 3.35:1 | pass UI 3:1 |
| ring/background light | ~4.8:1 | pass |
| destructive/background | 4.79:1 | pass |
| white/destructive | 4.79:1 | pass |
| foreground/background dark | 17.24:1 | pass |
| muted-foreground/card dark | 4.88:1 | pass |
| primary-foreground/primary dark | 6.66:1 | pass |
| white/sidebar-primary | ~4.8:1 | pass |

Prohibited: white on raw orange (2.78:1), raw bright blue accents (2.46–2.83:1), tinted
success/warning badges at 11px, chart hue as the only signal.

## Typography

| Role | Size/line | Weight | Usage |
|---|---|---|---|
| Display | 30/36 | 700 | Login, rare empty page |
| Page title | 24/32 | 600 | one per route |
| Section title | 18/28 | 600 | card/dialog sections |
| Body | 14/20 | 400 | default |
| Body strong | 14/20 | 600 | labels/key values |
| Small | 12/16 | 400 | metadata/help/footers |
| Mono | 12/18 | 400 | IDs/JSON/tokens |
| Overline | 11/16 | 600 uppercase, tracked | compact group labels only |

## Component-state quick table

| Element | Default | Hover/focus | Disabled/pending |
|---|---|---|---|
| Primary button | orange surface, dark text | 90% opacity | 50% opacity, pointer none |
| Outline button | border-input | accent bg | same opacity rule |
| Badge success/warning | solid fill + matching fg | — | — |
| Badge info/destructive | tinted bg + colored text | — | — |
| Dialog | scrim + card | — | pending blocks close |
| Table row | 44–48px, 1px divider | accent/40 | disabled not just gray |

## Screenshot/QA matrix

| Surface | Light | Dark | Notes |
|---|---|---|---|
| Overview, Providers, Provider detail | required | required | health badges |
| Abilities, Ability detail | required | required | route/model lists |
| App client detail (Access/audit/activity) | required | required | empty + pending states |
| Users directory, ledger/usage/activity | required | required | pii, monospace IDs |
| Operations, Settings | required | required | environment/status |
| Dialogs (confirm/grant/kill switch) | required | required | focus + escape |
| 360 / 768 / 1024 / 1440 widths | required | — | sidebar sheet, table scroll |

## Known design/implementation gaps (do not assume these exist)

- TanStack Table is not installed; tables are local primitives.
- sonner/toasts are not installed; feedback is inline.
- shadcn primitives are hand-authored; no Radix/Base UI dependency.
- Design doc calls for a JSON tree viewer/diff component; only ad-hoc JSON `<pre>` formatting
  exists (`formatJson`), and capability/provider config is edited as text.
- `prefers-reduced-motion` is handled globally in `globals.css`.
