# FR-006 — Provider routing chain

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend |
| Depends on | FR-003 |
| Source | [IA §4.5](../05-information-architecture.md), [API §8.3](../06-api-integration.md) |

## Intent

Let an operator change which provider/model serves a capability, in what order, with which
config — atomically, with validation and an audit trail.

## Scope

In scope:

- View the ordered `capability_providers` chain.
- Add/remove routes; edit priority via reorder; provider, model, enabled, config.
- Validate JSON config; normalize priorities 1..n; require at least one enabled route.
- Atomic save; old → new diff; audit refresh.

Out of scope:

- Editing the provider adapter registry (server code).
- Per-route kill switch outside the chain.
- Testing a provider from the UI.
- Routing across capabilities.

## User stories

- As an engineer, I can make a backup provider primary during an outage.
- As an engineer, I can disable one route without removing it.
- As an engineer, I can edit provider-specific config as JSON.
- As a reviewer, I can see the exact old and new chains.

## Behavior

1. Routing section lists routes sorted by priority ascending.
2. Each card: priority, provider, model, enabled switch, config JSON, remove.
3. "Add route" appends an empty route; priority is positional.
4. Reorder via up/down buttons (drag optional, never the only method).
5. Provider is free text with suggestions from existing chains; model is free text.
6. Config is JSON; validate before save; Format action.
7. At least one enabled route is required; removing/disabling the last enabled route blocks save.
8. "Review changes" shows old chain → new chain (provider/model/enabled/config).
9. Save calls `PUT /api/admin/capabilities/{id}/providers` atomically.
10. Success: refetch capability + audit; toast; updated chain.
11. Failure: keep edits; map field/index errors; 409/422 handling.

## Acceptance criteria

- [ ] The chain renders in priority order with provider/model/enabled/config.
- [ ] Add/remove/reorder works; priorities normalize to 1..n on save.
- [ ] At least one enabled route is enforced client-side; server errors are shown.
- [ ] Config must be valid JSON; invalid JSON blocks save.
- [ ] Reorder is keyboard accessible (up/down buttons), not drag-only.
- [ ] Remove requires confirmation when the route is enabled or last.
- [ ] Save is atomic; no per-route partial calls.
- [ ] Review shows a readable diff and the affected capability.
- [ ] Success updates audit/revision; failure preserves edits.
- [ ] 422 with route index highlights the correct card.
- [ ] No optimistic update; double-submit is blocked.

## Data and API

See [API §8.3](../06-api-integration.md).

~~~ts
interface ProviderRouteInput {
  priority: number;
  provider: string;
  model: string;
  enabled: boolean;
  config: Record<string, unknown>;
}
~~~

Assumption: the endpoint takes an object with `providers`; confirm the exact envelope (Q7).

## UX notes

- Show the current primary route prominently ("Primary: opencode / deepseek-v4.1-flash").
- Warn when no route is enabled or when a route's provider is unknown/empty.
- Config editor is collapsible; show a summary of keys when collapsed.
- Use an ordered list with clear priority numbers; do not rely on drag affordances alone.
- Explain fallback behavior: "Routes are tried in order; disabled routes are skipped."

## Errors and edge cases

- Empty chain → save blocked with an explanation.
- Duplicate priorities from imported data → normalize and warn.
- Provider name with whitespace → trim; empty is invalid.
- Config JSON is an array/primitive → require an object unless the provider explicitly allows
  otherwise (default: object).
- 422 index error → scroll/highlight the route card.
- Concurrent edit → 409; preserve edits; reload latest.
- Timeout → refresh before retry.

## Security and audit

- Provider names are validated by the gateway against compiled adapters; the UI cannot know the
  full list, so it suggests and warns rather than hard-blocks unknown names.
- No secrets in config; if a provider requires a key, it belongs in server env, not the registry.
- Actor from session; audit entry required.
- No optimistic update.

## Test notes

- Unit: priority normalization, last-enabled guard, JSON validation, diff.
- Component: add/remove/reorder, keyboard, error mapping.
- BFF: body mapping, actor, 422.
- E2E E9.

## Open questions

- Exact providers PUT envelope and error shape (Q7).
- Is a provider enum available to the client? (Currently no.)
- Are disabled routes skipped at runtime? (Assumed yes.)

## Traceability

[IA §4.5](../05-information-architecture.md) · [API §8.3](../06-api-integration.md) ·
[E2E E9](../09-testing-strategy.md)
