# NFR-003 — Performance and bundle budgets

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Should |
| Phase | 1–4 |
| Owner | Frontend |
| Source | [Tech stack §5](../04-tech-stack.md) |

## Intent

The console should feel instant on an internal network and remain usable on a laptop during an
incident. Performance is a product requirement, not a vanity metric.

## Budgets

| Metric | Budget |
|---|---|
| Initial JS (gzip) | ≤ 250 KB |
| Route chunk (gzip) | ≤ 100 KB |
| LCP (Overview, Fast 3G/4× CPU) | ≤ 2.5 s |
| CLS | < 0.1 |
| Table interaction (200 rows) | ≤ 100 ms |
| Search debounce | 250 ms |
| Fonts | ≤ 2 files, Latin subset, preload only used |

## Requirements

1. Route-level code splitting; no giant shared barrel.
2. Lazy-load heavy editors/viewers only when opened.
3. Server-side pagination for ledger/usage; virtualize only above ~200 rows.
4. Skeletons match layout to avoid CLS.
5. Self-host fonts; avoid blocking third-party requests.
6. No chart/editor library without a measured need and a bundle review.
7. Lighthouse CI on Overview/Capabilities before release.
8. A >20% regression requires justification or a fix.

## Acceptance criteria

- [ ] Bundle analyzer shows initial/route chunks within budget.
- [ ] Lighthouse CI meets LCP/CLS targets on the defined profile.
- [ ] No route imports another feature's internals or pulls the whole catalog.
- [ ] Tables paginate; no unbounded fetch.
- [ ] Fonts are self-hosted and preloaded minimally.
- [ ] A performance report is attached to the release PR.

## Verification

- `npm run build` + bundle analyzer in CI (report artifact).
- Lighthouse CI nightly/release.
- Playwright performance marks for table interactions.
- Manual throttling check.

## Open questions

- Is Lighthouse CI available in the chosen CI? (Can run locally/nightly if not.)
- What is the real network profile for operators? (Assume Fast 3G for budget.)

## Traceability

[Tech stack §5–§6](../04-tech-stack.md) · [Testing §10](../09-testing-strategy.md)
