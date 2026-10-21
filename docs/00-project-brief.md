# 00 — Project brief

## One sentence

Build a secure, auditable operator console for the MemeChat AI Gateway so the team can
change routing, pricing, kill switches, and user credit state without direct SQL or ad-hoc
scripts.

## Context

The gateway is a Go service sitting between the MemeChat Android app and AI providers. It
owns:

- a dynamic capability registry (what the app can call, what it costs, which provider serves it)
- provider routing chains and kill switches
- a model-picker catalog
- a credit ledger and metadata-only usage events
- operator actions such as credit grants

Today those controls are exposed as an **admin HTTP API** (`/internal/admin/*`) protected by
a shared `ADMIN_API_SECRET` plus an `X-Admin-Actor` audit header. The API is described in
the gateway docs but is **not implemented yet** in the current backend checkout. Operators
therefore lack a safe UI, and the browser cannot hold the shared secret.

## Problem

Without a console:

- Routine changes require SQL access or hand-written curl, which is slow and easy to get wrong.
- A kill switch during an incident depends on whoever has the secret and the right command.
- Support cannot quickly answer "why was this user charged?" or "what happened to this request?"
- Registry changes are not visibly attributed to a person or reviewed before they hit production.
- Credit grants are risky: a double submit or a retry can become a second deposit.

## Goals

1. Make the safe path the fast path for the ten most common operator jobs.
2. Put a hard security boundary between the browser and the admin secret.
3. Make every mutation attributable, reviewable, and visible in the capability audit trail.
4. Make user-level billing investigation possible in under a minute.
5. Keep the UI honest: show real states, real errors, and real audit data; never invent metrics.
6. Build a design and folder system that survives the next 20 features.

## Non-goals

- Consumer-facing analytics or marketing dashboards.
- Editing gateway source code, deployments, or infrastructure from the UI.
- Access to prompt text, images, audio, or provider payloads. The gateway stores none.
- RevenueCat plan management, refunds, or subscription cancellation. The admin API only
  supports positive credit grants.
- A general-purpose SQL console.
- A mobile app. The console is responsive but desktop-first.

## Users

| Persona | Primary jobs | Needs |
|---|---|---|
| Founder / operator | Kill switch, cost changes, grants, incident response | Speed, confidence, audit trail |
| Support engineer | Look up a UID, explain a charge, check usage | Exact IDs, internal ledger states, no PII leakage |
| Backend engineer | Change provider routing, model catalog, cache | Correct payloads, validation, revision/audit visibility |
| Reviewer / teammate | Approve production changes | A PR-able diff and a clear impact summary |

## Success measures

| Measure | Target |
|---|---|
| Time to disable a capability during an incident | < 15 seconds from opening the capability |
| Browser exposure of admin/internal secrets | Zero, verified by bundle and network checks |
| Mutations carrying an actor identity | 100% (enforced by BFF) |
| Support lookup: UID → ledger state | < 30 seconds |
| Credit grant duplicate submits | Zero (idempotency + UI discipline) |
| Accessibility | WCAG 2.2 AA for all core flows |
| Initial route JS | ≤ 250 KB gzipped; route chunks ≤ 100 KB |
| Production deploy rollback | < 5 minutes to the previous image tag |

## Constraints

- **Backend readiness:** the admin API is contract-planned, not implemented. The frontend
  must be mock-first and integrate behind a feature flag.
- **Auth:** the gateway only knows a shared admin secret. Operator identity must be added by
  the BFF (OIDC + allowlist + session).
- **No user directory:** the admin API exposes ledger/usage by exact UID, not a user search.
- **No global audit:** audit history is per capability only.
- **Shared secret:** the BFF is the only component that may hold it; it must be rotatable.
- **Deployment:** a single Linux server is assumed; Docker is the delivery unit.

## Definition of done (whole project)

A release is done when:

- every Must requirement in `docs/requirements/` is Implemented and covered by tests;
- the BFF passes a security review (secret isolation, CSRF, allowlist, headers);
- staging has run the critical E2E suite against the real admin API;
- production can be deployed and rolled back by image tag;
- the design review checklist in `DESIGN.md` passes in light and dark mode;
- runbooks for secret rotation, deploy, and rollback exist.

## Phase 0 deliverable

This corpus: product scope, contract analysis, architecture, stack, screens, API contract,
security, testing, CI/CD, roadmap, risks, ADRs, and one markdown file per requirement. No
application code is promised in Phase 0.
