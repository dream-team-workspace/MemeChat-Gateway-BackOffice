# FR-012 — Operational dashboard

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Should |
| Phase | 3 |
| Owner | Frontend |
| Depends on | FR-003, FR-008 |
| Source | [IA §4.2](../05-information-architecture.md) |

## Intent

Give operators a truthful landing page: what the console can see, what is healthy, what is
disabled, and where to go next. It is not an analytics product.

## Scope

In scope:

- Gateway health (liveness/readiness) via the BFF.
- Console version/commit/environment.
- Counts derived from capabilities/models/app-client lists: total/enabled/disabled and
  integrated clients.
- "Needs attention": disabled capabilities, health failures, stale data.
- Last refreshed and per-card loading/error.

Out of scope:

- Usage/spend charts (no aggregate API).
- Revenue/user growth metrics.
- Real-time monitoring or alerting UI.
- Fabricated "requests today" numbers.

## User stories

- As an operator, I can see whether the gateway is reachable before making changes.
- As an operator, I can see how many capabilities are disabled.
- As an operator, I can see how many app clients are integrated with the gateway.
- As a reviewer, I can trust that every number is derived from real data.

## Behavior

1. On load, fetch capabilities, models, app clients, and `/api/health` in parallel.
2. Header shows environment, last refreshed, Refresh.
3. Status row: gateway liveness, readiness, admin API reachability, console version.
4. Count cards: capabilities total/enabled/disabled; models total; integrated clients
   total/enabled.
5. There is no quick-actions card. Operators use the sidebar.
6. "Needs attention" lists disabled capabilities (link) and any failed health probe.
7. Each card has its own loading/error; one failure does not blank the page.
8. No polling; manual refresh. Health refreshes on focus (15s stale).
9. If capabilities or clients fail, counts show "—" or an error, not 0.

## Acceptance criteria

- [ ] Counts are derived from the actual capabilities/models/app-client arrays.
- [ ] Disabled capabilities are listed and link to detail.
- [ ] Health shows liveness/readiness separately; a gateway failure is visible.
- [ ] Partial failures are isolated per card; the page remains usable.
- [ ] Unknown values show "—"/"Unavailable", never a fabricated zero.
- [ ] Integrated clients counts enabled clients without inventing a number when the list fails.
- [ ] Last refreshed is visible; refresh updates it.
- [ ] No charts or metrics without a real API.
- [ ] Environment badge matches the BFF, not a client-only flag.
- [ ] Loading skeletons match the cards.

## Data and API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/capabilities` | Counts + disabled list |
| GET | `/api/admin/models` | Counts |
| GET | `/api/admin/app-clients` | Integrated clients total/enabled |
| GET | `/api/health` | BFF + gateway liveness/readiness |

No aggregate endpoint. If one is added later, this requirement must be updated before charts.

## UX notes

- Calm layout: status row, counts, attention list.
- Use a 2×2 or 4-up card grid at desktop; stack on mobile.
- Attention panel uses a warning tint, not a red alarm unless the gateway is down.
- Do not use a hero image or marketing copy.
- Link to docs/runbook for incidents.

## Errors and edge cases

- Gateway down: health degraded; reads may still return cached data; banner explains.
- Capabilities 403/401: show error; 401 redirects to login.
- One endpoint slow: its card shows a skeleton; others render.
- No capabilities: empty attention panel, counts 0 (real).
- Stale data: label with age and a refresh action.

## Security and audit

- Read-only.
- Health response must not leak secrets/hostnames beyond the configured origin.
- No UIDs or ledger data on the dashboard.
- No analytics vendor receives dashboard data.

## Test notes

- Component: loading/partial failure/error/disabled list.
- BFF: health aggregation and timeout.
- Smoke: dashboard loads after deploy.
- E2E: refresh + disabled link.

## Open questions

- Is there a stats endpoint planned? (Q15; currently no.)
- Should health be a hard dependency for the dashboard? (Proposed: no; show degraded.)

## Traceability

[IA §4.2](../05-information-architecture.md) · [API §2.1](../06-api-integration.md) ·
[Roadmap Phase 3](../11-roadmap.md)
