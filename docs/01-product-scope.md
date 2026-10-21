# 01 — Product scope

## Scope rule

A feature is in scope only if it maps to an existing or explicitly planned admin API route
and has a named operator job. "It would be nice to see" is not a scope argument.

## Personas and jobs to be done

### Founder / operator

- "Disable the premium chat capability right now; users must not be charged for a broken provider."
- "Change the credit cost per TTS character, but show me exactly what changes."
- "Give a user 30 credits for a support issue without risking a double deposit."
- "Tell me whether the registry change I made actually propagated."

### Support engineer

- "This UID says they were charged twice. Show me the ledger rows and internal states."
- "What capability and model handled this request, and did it succeed?"
- "Was the charge committed, refunded, or stuck in a pending state?"

### Backend engineer

- "Swap the primary provider for chat.standard and keep a fallback."
- "Disable a model in the app catalog without deleting its history."
- "Force a registry cache reload after a seed migration."

### Reviewer

- "Show me the before/after state and who changed it."
- "Is this change auditable after the fact?"

## In scope for v1

| Area | Capability | Requirement |
|---|---|---|
| Access | Operator login, session, allowlist, sign-out | FR-001 |
| Boundary | BFF proxy, secret isolation, actor attribution | FR-002 |
| Registry | List/inspect all capabilities, including disabled | FR-003 |
| Registry | Edit cost, limits, fair use, flags, app gating | FR-004 |
| Registry | Kill switch with reason | FR-005 |
| Routing | Ordered provider chain add/edit/remove/reorder | FR-006 |
| Audit | Per-capability audit history and before/after diff | FR-007 |
| Catalog | Model list and upsert | FR-008 |
| Users | Ledger inspection by exact UID | FR-009 |
| Users | Usage inspection by exact UID | FR-010 |
| Users | Positive credit grant with idempotency | FR-011 |
| Overview | Honest operational summary and health | FR-012 |
| Shell | Navigation, environment context, route guards | FR-013 |
| Quality | Loading/empty/error/offline behavior | FR-014 |
| Appearance | Light/dark/system theme | FR-015 |
| Safety | Mutation protocol (diff, confirm, pending, evidence) | FR-016 |
| Development | Mock/demo mode for the unimplemented API | FR-017 |

## Explicitly out of scope for v1

- Creating or deleting capabilities (the API is upsert-only; no delete route).
- Creating or deleting users.
- Viewing or editing message content, images, audio, or prompts.
- Refunds, negative adjustments, plan changes, or RevenueCat subscription management.
- Global user search or a user directory (no API).
- Global audit stream (only per-capability audit exists).
- Triggering `/internal/jobs/*` (different secret, separate ops surface; deferred).
- Bulk operations across capabilities/models.
- CSV/PDF export.
- A visual provider-adapter registry (the backend validates against compiled adapters).
- Editing gateway environment variables or infrastructure.
- Real-time collaboration or presence.

## Product principles

1. **Production is the default context.** The environment badge is always visible; the UI
   never makes staging look like production or vice versa.
2. **Every mutation is a reviewed change.** Show the diff before saving; never auto-save
   money or routing fields.
3. **No optimistic money.** Grants and registry changes wait for the server, then refetch.
4. **Evidence over vibes.** Show revision, timestamp, actor, request ID, and audit row.
5. **Exact identifiers.** UIDs, capability IDs, request IDs, and ledger IDs are copyable and
   never truncated without a way to see the full value.
6. **No invented data.** If the backend does not expose a metric, the UI does not fake it.
7. **Least privilege.** The BFF exposes only the routes the UI needs; no generic proxy.
8. **Fast under pressure.** Kill switch and user lookup are reachable in one click from the
   shell.

## Data available to the UI

| Data | Source | Notes |
|---|---|---|
| Capabilities + provider chains + revision | Admin API | Full list, including disabled |
| Capability audit | Admin API | Per capability, newest first |
| Models | Admin API | App catalog rows |
| Ledger | Admin API | By exact UID, keyset paginated |
| Usage | Admin API | By exact UID, metadata only, keyset paginated |
| Credit grant | Admin API | Positive CRD deposit via RevenueCat |
| Gateway health | Gateway `/healthz`, `/readyz` | Via BFF health probe |
| Operator identity | BFF session | Email/login, allowlist |
| Environment | BFF config | Staging/production, never trusted from the client |

## Success metrics for v1

- 100% of registry/credit mutations carry a non-empty actor.
- 0 admin secrets in client bundles, source maps, logs, or network payloads.
- Kill switch flow completes in ≤ 3 user actions after opening the capability.
- Every list/detail screen has loading, empty, error, and stale states.
- Core flows pass Playwright in Chromium and WebKit.
- No P1/P2 accessibility violations in axe for core routes.

## Release slices

| Slice | Contents | Exit |
|---|---|---|
| S0 | Planning corpus, branch model, ADRs | This repository state |
| S1 | Scaffold, design system, BFF skeleton, mock API, login, shell | App runs locally against mocks |
| S2 | Capabilities, routing, kill switch, audit, models | Registry operations complete on mocks |
| S3 | Users, ledger, usage, grants, dashboard, operations | Support flows complete on mocks |
| S4 | Real admin API integration, staging E2E, hardening | Staging sign-off |
| S5 | Production deploy, runbooks, monitoring | Production release |

Detailed milestones are in [11-roadmap.md](11-roadmap.md).
