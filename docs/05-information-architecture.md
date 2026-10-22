# 05 — Information architecture & screen specification

| Field | Value |
|---|---|
| Status | Proposed |
| Scope | Routes, navigation, page layout, flows, states |
| Visual rules | [DESIGN.md](../DESIGN.md) |
| API | [06-api-integration.md](06-api-integration.md) |

## 1. Navigation model

The sidebar has three groups and a footer:

~~~text
OPERATE
  Overview
  Capabilities
  Models

SUPPORT
  Users

SYSTEM
  Operations
  Settings

────────────────────────────
[STAGING] or [PRODUCTION]     ← environment badge
[avatar] operator@email       ← user menu: theme, docs, sign out
~~~

- **Overview** is the landing route.
- **Capabilities** is the primary operational surface.
- **Users** is support-focused; it starts with a UID search, not a directory.
- **Operations** holds cache invalidation and environment/health details.
- **Settings** holds appearance and session information only.
- The environment badge is always visible and is read from the BFF, never from a client-only
  build flag.
- The sidebar collapses to icons at <1280px and becomes a sheet at <1024px.

## 2. App shell

| Region | Contents | Behavior |
|---|---|---|
| Skip link | "Skip to main content" | First focusable element |
| Sidebar | Brand, nav groups, environment, user | Collapsible; active item uses blue sidebar accent; keyboard navigable |
| Top bar | Breadcrumbs, page context, command palette trigger, refresh | Sticky; 56px; no global search box in v1 |
| Main | Route content | Max-width 1440px; page padding 24/16 |
| Toaster | Sonner region | Top-right desktop, bottom mobile |
| Offline banner | Network/gateway status | Sticky under top bar; dismissible for network only |

Breadcrumb examples:

- `Overview`
- `Capabilities / chat.premium`
- `Capabilities / chat.premium / Audit`
- `Users / <uid>`

## 3. Route catalog

| Route | Page | Auth | Primary data | Primary action |
|---|---|---|---|---|
| `/login` | Sign in | Public | Cloudflare Access identity | Continue with Cloudflare Access |
| `/` | Overview | Required | Capabilities, models, health | Review incident surface |
| `/capabilities` | Capability list | Required | `GET /capabilities` | Open a capability |
| `/capabilities/:capabilityId` | Capability overview | Required | capability + providers | Save changes |
| `/capabilities/:capabilityId/routing` | Provider routing | Required | capability providers | Replace chain |
| `/capabilities/:capabilityId/audit` | Audit history | Required | `GET .../audit` | Inspect a change |
| `/models` | Model catalog | Required | `GET /models` | Add/edit model |
| `/users` | User lookup | Required | none | Look up UID |
| `/users/:uid` | Redirect to ledger | Required | — | — |
| `/users/:uid/ledger` | User ledger | Required | ledger | Inspect state |
| `/users/:uid/usage` | User usage | Required | usage | Inspect metadata |
| `/operations` | Operations | Required | health, cache action | Invalidate cache |
| `/settings` | Settings | Required | session | Change appearance |
| `/forbidden` | 403 | Required | session | Go back |
| `*` | 404 | Public | none | Go home |

All routes except `/login`, `/forbidden`, and the 404 are inside `AppShell`. Tabs are real
nested routes, not local state: the capability tabs are `/routing` and `/audit`, and the user
tabs are `/ledger` and `/usage`.

## 4. Page specifications

### 4.1 Login — `/login`

**Purpose:** establish an operator session through Cloudflare Access.

Layout: split brand/operator panel on desktop, compact form on mobile; one primary button
("Continue with Cloudflare Access"), a note that Access handles SSO/MFA, and a small
workspace-restriction line. No password or email field.

States:

- Default.
- Access identity response pending (route guard).
- Access login loop / no Access in front of a local preview: the login button re-requests the
  page; Access intercepts when the cookie is missing.
- Session already valid → redirect to `/`.
- Local development only: the login page is reachable for review and the development identity
  comes from `VITE_DEV_AUTH_EMAIL`.

Acceptance: keyboard-only login works; no password or identity token is stored in the browser;
the page never renders protected content without an Access identity. See
[14-cloudflare-access.md](14-cloudflare-access.md).

### 4.2 Overview — `/`

**Purpose:** a truthful snapshot of what the console can see, with fast entry points.

Layout:

1. Page header: "Overview", environment badge, last refreshed.
2. Status row: Gateway health (liveness/readiness), Admin API reachability, Console version.
3. Count cards: capabilities (total / enabled / disabled), models (total / enabled).
4. Quick actions: Open capabilities, Look up user, Invalidate cache.
5. "Needs attention" panel: disabled capabilities, stale registry note, failed health probe.
   Only real data; no invented charts.

Data: capabilities query, models query, `/api/health`. Counts are derived client-side from
the full lists (the admin API returns all capabilities/models).

States: loading skeletons per card; partial failure keeps other cards; gateway down shows a
degraded banner and still allows reading cached data; no fake zeros.

### 4.3 Capability list — `/capabilities`

**Purpose:** find a capability quickly and see its operational state.

Layout: page header with "Capabilities", total count, refresh; toolbar with search, kind
filter, status filter, clear; table.

Columns: ID (mono, copy), Display name, Kind, Status (badge), Cost (e.g. "1 CRD / 500 chars"),
Providers (count + primary), Revision, Updated.

Behavior:

- Search matches ID, display name, kind.
- Filters live in the URL: `?q=&kind=&status=`.
- Sort by ID, kind, status, revision, updated; default ID ascending.
- Row click opens detail; row action menu has "View", "Audit", "Copy ID".
- Disabled rows are clearly badged, not merely dimmed.
- Refresh button refetches; "Updated 12s ago" is shown.

States: skeleton rows; empty (no capabilities vs no filter matches); error with retry; stale
data warning if refetch fails.

### 4.4 Capability detail — `/capabilities/:capabilityId`

**Purpose:** inspect and safely change one capability.

Header: breadcrumb, ID, display name, status badge, revision, last updated, "View audit"
link, overflow menu (copy ID, open audit).

Tabs are nested URLs: the base page is the overview/configuration, routing lives at
`/capabilities/:id/routing`, and audit at `/capabilities/:id/audit`. A tab switch is a route
change, not local state.

Sections:

1. **Overview** — read-only summary: kind, streaming, reasoning, image, min app version,
   cost formula, limits, fair use, provider count.
2. **Configuration** — editable form:
   - Identity: display name, kind (read-only after creation), streaming (select), flags.
   - Commercial: cost unit, credits, per (integer > 0), with a live sentence: "1 credit per
     500 characters."
   - Limits: JSON editor with schema hints per kind (e.g. maxChars, maxSeconds, maxInputs).
   - Fair use: JSON editor + common presets; explicit "off" state.
   - App gating: min app version.
3. **Routing** — ordered provider chain editor (see 4.5).
4. **Danger zone** — kill switch (see 4.6).

Footer: sticky save bar appears when dirty: "Unsaved changes", Discard, Review changes.
Review dialog shows a field-by-field diff, revision, actor, and impact. Save sends a full PUT.

States:

- Loading skeleton.
- 404: capability not found, link back.
- 409: someone else changed it; show "Reload latest" and preserve the user's draft in a
  collapsible panel (do not silently overwrite).
- 422: inline field errors from `details`; scroll to first error.
- Success: toast + revision update + audit invalidation.

Rules:

- Enabled is **not** edited in this form; use the kill switch to keep audit semantics clear.
- ID and kind are immutable in the UI; the API may allow an upsert, but the console does not
  create capabilities in v1.
- Unknown top-level fields are not displayed; nested JSON unknown keys are preserved.

### 4.5 Provider routing — `/capabilities/:capabilityId/routing`

**Purpose:** change which provider/model serves a capability and in what order.

Layout: ordered list of route cards. Each card: priority, provider, model, enabled switch,
config JSON (collapsible), remove. Add route button. Drag handle + up/down buttons.

Behavior:

- Priorities are normalized to 1..n on save.
- Provider is free text with suggestions from existing chains; model is free text.
- At least one enabled route is required; removing the last enabled route is blocked with an
  explanation.
- Reorder is keyboard accessible (up/down buttons), not drag-only.
- Save uses the atomic providers PUT; it does not call per-route endpoints.
- Confirmation shows the old chain → new chain.

States: empty chain (warning), invalid JSON, unsaved changes, 422 with route index, success
with audit link.

### 4.6 Kill switch (within detail)

**Purpose:** disable a capability immediately during an incident.

Entry: Danger zone card, also reachable from the capability row action.

Dialog:

- Current state and impact: "All users will receive CAPABILITY_DISABLED for this capability."
- Reason (required, 10–500 chars).
- For disabling: type the capability ID to confirm.
- Primary button: "Disable capability" (destructive); re-enable uses "Enable capability"
  (default, not red).
- Pending state locks the dialog; close is disabled during the request.
- Success: close, toast, refetch capability + audit, show a persistent "Disabled" banner on
  the detail page.
- Failure: keep the dialog open with the request ID and a safe retry.

Target: from the capability row to a confirmed disable in ≤ 3 actions and < 15 seconds.

### 4.7 Audit history — `/capabilities/:capabilityId/audit`

**Purpose:** answer "who changed what, when, and from what."

Layout: page header with capability link, refresh; audit table/timeline.

Columns: changed at, revision, action, changed by, summary. Expand row → three tabs:
Before, After, Diff. Diff highlights changed keys and shows `-/ +` markers.

Behavior: newest first; `?limit=50` default; load more if the backend supports it; otherwise
show the documented limit and a note. Local filter by action/revision. No editing.

States: empty ("No changes recorded yet"), error, loading, `before_state` or `after_state`
missing (show "not captured" honestly).

### 4.8 Models — `/models`

**Purpose:** manage the app-facing model picker catalog.

Layout: header with "Add model"; toolbar search, tier filter, status filter; table.

Columns: ID, Display name, Tier, Capability, Sort order, Status, Min app version, Updated.

Editor: sheet/dialog with ID (editable only on create), display name, tier, capability select
(from capabilities list; nullable), sort order, enabled, min app version. Save is a PUT
upsert. No delete; disable instead. ID cannot be changed after creation (API path key).

Rules: warn on duplicate sort order; show which capability it points to; if the capability is
disabled, show a warning but still allow saving.

### 4.9 User lookup — `/users`

**Purpose:** start a support investigation without a user directory.

Layout: centered search panel: "Find a user by Firebase UID"; input; "Look up" button; help
text with where to find a UID. Recent UIDs are **not** persisted by default.

Behavior: trim, validate against `[A-Za-z0-9_-]{1,128}`, navigate to
`/users/:uid/ledger`. Invalid input is inline, not a toast. No fuzzy match; no email search
(API gap). The bare `/users/:uid` redirects to the ledger tab.

States: default, invalid, loading (during navigation), error if the user has no ledger
(empty state with usage link).

### 4.10 User detail — `/users/:uid/ledger` and `/users/:uid/usage`

**Purpose:** explain billing and usage for one UID. Tabs are real URLs; the bare
`/users/:uid` redirects to `/ledger`.

Header: UID (mono, copy), status hints, "Grant credits" primary action. "Latest known
balance" card derived from the newest ledger row with a caveat ("from the latest ledger row;
not a live RevenueCat balance"). If no rows, show "No ledger activity".

Tabs (nested routes):

1. **Ledger** — `/users/:uid/ledger`: created, capability, request ID (mono), state (internal
   state badge), reserved, committed, units, balance after, RC txn, attempts. Cursor pagination.
2. **Usage** — `/users/:uid/usage`: created, capability, provider/model, input/output tokens,
   chars, seconds, credits, status, latency. Cursor pagination.

Row click opens a detail sheet with full JSON (read-only). No content fields exist.

States: loading, empty ledger, empty usage, 404, error, stale.

### 4.11 Grant credits (dialog from user detail)

**Purpose:** positive credit adjustment with idempotency.

Fields: amount (positive integer), reason (required, 10–500 chars), requestId (generated,
read-only, copyable). Confirmation step repeats UID + amount + reason and warns "This
deposits credits and cannot be undone from this console."

Behavior:

- Generate `requestId` when the dialog opens; reuse it on retry.
- Disable submit while pending; no optimistic balance update.
- On success: show amount, requestId, balance if returned; invalidate ledger; toast.
- On 409/422: keep dialog open, show field/form error.
- On network timeout: do not auto-retry; show "Retry with same request ID" and explain.
- After success, close and require a new intent (new requestId) for another grant.

### 4.12 Operations — `/operations`

**Purpose:** safe system actions and environment context.

Cards:

1. **Environment** — name, gateway base URL (host only, no secret), console version/commit,
   build time.
2. **Health** — gateway liveness/readiness, admin API reachability, last checked.
3. **Registry cache** — explanation, "Invalidate cache" button, confirmation, result
   timestamp. This is safe but fleet-affecting; no reason field required by the API.
4. **Deferred jobs** — a note that sweep/export/retention triggers are not exposed in v1;
   link to the runbook. Do not render disabled fake buttons.

### 4.13 Settings — `/settings`

**Purpose:** personal preferences and session facts.

Sections: Appearance (light/dark/system), Session (email, provider, issued, expires, sign
out), About (version, commit, docs link). No secrets, no admin config, no feature flags.

### 4.14 403 / 404 / route error

- 403: "You don't have access to this console" + signed-in email + sign out.
- 404: "Page not found" + home link.
- Route error: "Something went wrong" + request ID + retry + home. In development, show the
  error message; in production, a redacted message.

## 5. Core flows

### 5.1 Incident: disable a capability

1. Operator opens **Capabilities**.
2. Searches the capability ID.
3. Opens the row.
4. Clicks **Disable** in the danger zone.
5. Types the ID, enters a reason, confirms.
6. UI shows pending, then success + audit link.

Failure paths: session expired → login with returnTo; 403 → forbidden; 409/5xx → dialog stays
open with request ID; network timeout → explicit retry, no duplicate toggle assumption.

### 5.2 Change cost

1. Open capability → Configuration.
2. Edit cost credits/per; the sentence preview updates.
3. Review changes → diff.
4. Confirm → PUT → revision increments.
5. Audit link shows the new entry.

Guard: if the capability changed since load, a 409/revision mismatch shows "Reload latest";
the draft remains visible and can be copied, but cannot be saved blindly.

### 5.3 Reorder providers

1. Open capability → Routing.
2. Move routes with up/down; toggle enabled; edit model/config.
3. Review old → new chain; confirm.
4. PUT providers; refetch; audit link.

Guard: empty chain, no enabled route, invalid JSON, duplicate priorities (normalized).

### 5.4 Investigate a charge

1. Users → enter UID.
2. Read latest balance card.
3. Ledger table; find request ID; inspect state and attempts.
4. Open Usage tab; correlate request ID, capability/model, tokens/seconds, status.
5. If appropriate, grant credits with a reason.

### 5.5 Grant credits

As 4.11. The flow is deliberately slower than a toggle: amount, reason, confirmation.

### 5.6 Session expiry

Any 401 from the BFF triggers one session refetch; if still unauthenticated, route to
`/login?returnTo=<current>`. Unsaved form state is lost unless the user copies it; show a
warning before redirect when a form is dirty (best effort).

## 6. Interaction details

### 6.1 Keyboard

- `Cmd/Ctrl + K` — command palette (routes + loaded capabilities).
- `g o` / `g c` / `g m` / `g u` — go to Overview, Capabilities, Models, Users.
- `?` — keyboard help.
- `Esc` — close dialog/sheet; if dirty, confirm discard.
- `Cmd/Ctrl + Enter` — submit the active form when valid (not for destructive dialogs).

Shortcuts are disabled while typing in inputs/textareas/editors.

### 6.2 Unsaved changes

- Route change with a dirty form triggers a confirmation dialog.
- Browser unload uses `beforeunload` only when dirty.
- The save bar shows "Unsaved changes" and the last saved revision.

### 6.3 Refresh and staleness

- Every list/detail shows a "last updated" time and a refresh action.
- Background refetch does not reset a dirty form.
- A failed background refetch keeps stale data and shows a warning banner, not a blank page.
- No polling by default; operators refresh explicitly during incidents. Query `staleTime`
  and focus behavior are defined in [06-api-integration.md](06-api-integration.md).

### 6.4 Copy and identifiers

- IDs are monospace with a copy button and a tooltip containing the full value.
- Copy success is announced ("Copied") via a toast or inline state.
- Request IDs are shown on every error and in success details.

## 7. Responsive behavior

| Width | Behavior |
|---|---|
| ≥1280px | Sidebar expanded; two-column detail; full tables |
| 1024–1279px | Sidebar icons; detail stacked; tables scroll |
| 768–1023px | Sidebar sheet; single column; sticky save bar; tables scroll |
| <768px | Read-only-friendly; kill switch and lookup still work; complex forms warn about small screens |

No feature is desktop-only in an emergency: kill switch, user lookup, and ledger reading must
work at 360px, even if the tables scroll horizontally.

## 8. Permissions and environment

- v1 has one role: authenticated, allowlisted operator. All operators can do everything the
  BFF exposes. The UI does not fake role management.
- The BFF returns the environment in `/api/meta` or `/api/health`; the SPA reads the operator
  identity from `/cdn-cgi/access/get-identity`. The shell displays both.
- Production changes require the production environment; staging never proxies to production.
- A future RBAC change adds permissions to the BFF identity model and hides/disables actions;
  the API remains the final authority.

## 9. Content patterns

| Pattern | Example |
|---|---|
| Page title | "Capabilities" |
| Page subtitle | "Costs, limits, and routing for every gateway capability." |
| Empty list | "No capabilities match these filters." + Clear filters |
| Empty detail | "This capability has no provider routes." + Add route |
| Error | "Couldn't load capabilities." + "Retry" + request ID |
| Success | "Capability updated." + "View audit" |
| Destructive | "Disable chat.premium?" + impact + reason + type ID |
| Pending | "Disabling…", "Saving…", "Granting…" |
| Stale | "Showing data from 2 minutes ago. Refresh." |

## 10. Out of scope for these screens

- Bulk edit/delete.
- Drag-and-drop table columns.
- Real-time collaborative editing.
- Global audit/activity feed.
- User directory browsing.
- Job triggers.
- File export.
