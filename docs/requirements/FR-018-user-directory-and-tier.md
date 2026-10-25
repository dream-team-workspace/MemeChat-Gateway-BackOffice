# FR-018 — User directory, email, and subscription tier

| Field | Value |
|---|---|
| Status | In progress (directory read live; email/tier write path pending) |
| Priority | Must |
| Phase | 3 |
| Owner | Frontend + gateway |
| Depends on | FR-002; gateway §1 of [15-gateway-requests.md](../15-gateway-requests.md) |
| Source | [IA §4.10](../05-information-architecture.md) |

> **Verified 2026-10-26:** `GET /internal/admin/users` is live. The signed-in account appears
> with `email: null` and `tier: unknown`; the table, email/ID panel, and exact-UID lookup work.
> The remaining work is the gateway write path for email and RevenueCat tier (see below).

## Intent

Let support find a MemeChat account without already knowing its Firebase UID: list the accounts
that have signed in, show the email and subscription tier (Pro/Ultra), and keep exact-UID
lookup as a first-class path. Ledger and usage inspection remain FR-009 and FR-010.

## Scope

In scope:

- Directory of signed-in accounts: email, tier, UID, last seen, joined.
- Compact lookup panel at the top right of the Users page with ID/Email modes.
- ID mode navigates straight to the existing ledger route (works without the directory API).
- Email mode filters the directory server-side.
- Cursor pagination and explicit loading/empty/error/pending-gateway states.
- Tier values `pro`, `ultra`, `free`, `unknown`; `unknown` is shown, never guessed.

Out of scope:

- Editing a user, changing a tier, refunds, or banning.
- RevenueCat transaction/customer detail.
- Exporting the directory.
- Content or message inspection (none exists).

## Behavior

1. `/users` loads `GET /api/admin/users?limit=50` and shows newest sign-in first.
2. The header actions contain the ID/Email toggle, the input, and Find. There is no large
   lookup card in the content area.
3. ID mode validates `[A-Za-z0-9_-]{1,128}` and navigates to `/users/{uid}/ledger`.
4. Email mode validates an address and refetches the directory with `?query=`.
5. A row shows email (or “Email not captured”), UID, tier badge, last seen, joined, and a link
   to the ledger.
6. “Clear filter” restores the unfiltered directory; “Load older” follows `nextCursor`.
7. If the gateway has no users route, the page shows a neutral “gateway support pending”
   state; ID lookup still works and the rest of the shell is unaffected.
8. No tier is derived from credits, usage, or model selection.

## Acceptance criteria

- [x] The Users page has the compact top-right ID/Email panel.
- [x] Exact-UID lookup still navigates to the ledger and works against the current gateway.
- [x] The directory table renders email, tier, last seen, joined, and ledger link when data
      is available (contract-tested with a fixture).
- [x] Missing directory API renders a pending state, not a hard error or fake rows.
- [x] Email validation and empty-submit errors are inline.
- [x] Filters reset pagination.
- [x] Live gateway returns signed-in, non-deleted accounts only.
- [x] `GET /api/admin/users` is live and the table renders the returned account.
- [ ] Live gateway stores and returns the verified email.
- [ ] Live gateway resolves and returns `pro`/`ultra` from RevenueCat (fallback agreed).
- [ ] Email search is case-insensitive and never written to gateway logs.
- [x] Deleted users and never-signed-in accounts are excluded by the gateway query.

The email/tier items are the remaining gateway work in
[15-gateway-requests.md §1](../15-gateway-requests.md#1-users-directory). The gateway endpoint
and schema are shipped; only the write path and entitlement mapping are outstanding.

## Data and API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/users?limit=50&cursor=...&query=...` | Live; email/tier data pending |
| GET | `/api/admin/users/{uid}/ledger` | Existing; unchanged |

Response shape is `UserSummary` in
[`shared/admin-api/users.ts`](../../shared/admin-api/users.ts) and §6 of the gateway requests.

## Security and privacy

- Email is PII: admin-only, no logs, no analytics, no export.
- The BFF already avoids body/query logging; the gateway must follow the same rule for
  `query`.
- Tier is billing-adjacent; no RC ids or transaction data in this response.
- UIDs remain confidential; the UI never sends them to external tools.

## Test notes

- BFF contract test: `/api/admin/users?query=` forwards `limit`, `cursor`, and `query`, and
  parses email/tier.
- Browser: pending state with the current gateway; ID lookup end-to-end.
- Gateway acceptance: curl with a seeded signed-in user, plus a non-admin rejection check.

## Traceability

[Gateway request §1](../15-gateway-requests.md#1-users-directory) ·
[FR-009](FR-009-user-ledger-inspection.md) · [FR-010](FR-010-user-usage-inspection.md)
