# FR-013 — App shell, navigation, and environment context

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1 |
| Owner | Frontend |
| Depends on | FR-001 |
| Source | [IA §1–§3](../05-information-architecture.md) |

## Intent

Give every screen a consistent frame: navigation, breadcrumbs, session identity, environment
context, route guards, and accessible error/not-found pages.

## Scope

In scope:

- Sidebar groups (Operate/Support/System), top bar, breadcrumbs, user menu.
- Environment badge (staging/production) from the BFF.
- Route guards, lazy routes, 403/404/route error.
- Document titles and responsive behavior.
- Optional command palette / shortcuts (phase 1 shell, capabilities later).

Out of scope:

- Per-role navigation (single operator role in v1).
- Multi-tenant switching.
- Customizable dashboards/widgets.

## User stories

- As an operator, I always know which environment I am in.
- As an operator, I can reach capabilities, models, users, operations, and settings in one click.
- As a user without access, I see a clear 403, not a broken page.
- As a keyboard user, I can skip to content and navigate the sidebar.

## Behavior

1. `AppShell` renders skip link, sidebar, top bar, main, toaster.
2. Sidebar groups: Operate (Overview, Capabilities, Models), Support (Users), System
   (Operations, Settings).
3. Environment badge comes from `/api/auth/me` (or health/meta), never a build-only flag.
4. Top bar shows breadcrumbs, command palette trigger, refresh where relevant.
5. User menu: email, environment, theme, docs, sign out.
6. `beforeLoad` checks session; unauthenticated → login with `returnTo`.
7. 403/404/route error are real routes with home/back actions.
8. Each route sets `document.title` and a breadcrumb.
9. Sidebar collapses at <1280px to icons; <1024px becomes a sheet.
10. Active nav uses a non-color cue (weight/aria-current) plus the accent.

## Acceptance criteria

- [ ] Every protected route is wrapped by the shell and session guard.
- [ ] Environment is visible on every screen and matches the BFF response.
- [ ] Sidebar navigation is keyboard operable and marks `aria-current`.
- [ ] Skip link moves focus to main.
- [ ] 403/404/route error are reachable and actionable.
- [ ] Document titles are unique and include the app name.
- [ ] Breadcrumbs match the route hierarchy.
- [ ] Deep links work after login (returnTo).
- [ ] Mobile sheet traps/restores focus and closes on Escape.
- [ ] No secret/environment config is exposed beyond the label.

## Data and API

| Source | Data |
|---|---|
| `/api/auth/me` | email/name/avatar/environment |
| `/api/health` | version/commit if not in me |
| route context | session, environment |

## UX notes

- Brand: text wordmark "MemeChat BackOffice"; no invented logo.
- Sidebar footer: environment badge + user menu; do not hide it on scroll.
- Top bar is 56px; content starts below; no double headers.
- Use icons + labels at desktop; icons with tooltips when collapsed.
- Command palette (Cmd/Ctrl+K) searches routes and loaded capabilities; show a "No results"
  state; do not fetch secrets.
- Shortcuts: g o/g c/g m/g u; ? opens help; disabled while typing.

## Errors and edge cases

- Session fetch fails 5xx → error page with retry; do not redirect to login blindly.
- Session 401 → login.
- Unknown route → 404 inside the shell if authenticated, standalone otherwise.
- Sidebar collapsed preference persists in localStorage.
- Environment mismatch (staging host, production label) → treat as a critical config error and
  show a blocking banner; do not allow mutations until resolved.

## Security and audit

- No secrets in shell.
- Sign out uses POST + CSRF.
- 403 page does not reveal whether a resource exists.
- Environment badge is informational, not a security boundary; the BFF enforces it.

## Test notes

- Component: nav, active states, user menu, 403/404.
- E2E E1/E17, mobile sidebar, keyboard.
- Accessibility: skip link, focus, aria-current.

## Open questions

- Is the environment available in `/api/auth/me` or only health/meta? (Assumed me/health.)
- Command palette in Phase 1 or 2? (Shell now, capability search later.)

## Traceability

[IA §1–§3](../05-information-architecture.md) · [Architecture §9](../03-architecture.md) ·
[E2E E1/E17](../09-testing-strategy.md)
