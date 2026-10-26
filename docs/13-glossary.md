# 13 — Glossary

| Term | Meaning in this project |
|---|---|
| **BackOffice / console** | This web application: the operator UI for the gateway |
| **Gateway** | The Go service at `/home/dani/GolandProjects/MemeChat-Gateway` that brokers AI providers, auth, credits, and usage |
| **BFF** | Backend-for-Frontend. The Node/Hono server in `server/` that authenticates operators, holds the admin secret, and proxies allowlisted calls |
| **Admin API** | The gateway's `/internal/admin/*` routes, authenticated by `ADMIN_API_SECRET` |
| **Operator** | An allowlisted human using the console |
| **Actor** | The identity recorded in `X-Admin-Actor` and `capability_audit.changed_by`; derived from the session by the BFF |
| **Capability** | A billable gateway service the app can call (e.g. `chat.standard`, `tts`) |
| **Capability registry** | The DB-backed catalog of capabilities, costs, limits, flags, and revisions |
| **Provider route** | One entry in a capability's ordered fallback chain (provider, model, priority, enabled, config) |
| **Model catalog** | App-facing model-picker rows in the `models` table |
| **Kill switch** | Fast disable/enable of a capability via `/toggle`; records an audit row and invalidates cache |
| **Revision** | Monotonic counter bumped on capability changes; used in the manifest and audit |
| **Audit entry** | Append-only record of a registry change: actor, revision, before/after, timestamp |
| **Ledger** | `credit_ledger` rows tracking reserve → commit/refund for each request |
| **Internal ledger state** | One of `PENDING_SPEND`, `RESERVED`, `COMMITTED`, `REFUND_PENDING`, `REFUNDED`, `EXPIRED`, `FAILED` |
| **Usage event** | Metadata-only `usage_events` row (tokens, chars, seconds, credits, status, latency); no content |
| **Credit / CRD** | The gateway's virtual currency unit; integer only |
| **Grant** | A positive credit deposit via RevenueCat, idempotent by `requestId` |
| **Reservation** | The amount held before a metered request settles |
| **Commit** | Final charge after a successful request |
| **Refund** | Return of a reservation after failure/cancellation |
| **Idempotency** | Replaying the same operation with the same key has one effect; grants use `requestId` |
| **Keyset pagination** | Cursor pagination based on an indexed ordering (e.g. `(uid, created_at DESC)`), not OFFSET |
| **Cursor** | Opaque string identifying the next page; the client never constructs it |
| **Cache invalidation** | Forcing the gateway's in-memory capability registry snapshot to reload |
| **Cloudflare Access** | Zero Trust login/policy layer used for operators (ADR-0008) |
| **OIDC** | Historical: the previously planned operator login protocol; superseded by Access |
| **PKCE** | Proof Key for Code Exchange; protects the OAuth code flow |
| **Session** | Signed HttpOnly cookie representing an authenticated operator |
| **CSRF** | Cross-Site Request Forgery; mitigated by Origin + double-submit token |
| **CSP** | Content Security Policy; restricts scripts/styles/connections |
| **Allowlist** | Explicitly permitted operators (email/domain/org) or BFF routes |
| **Test double** | Fetch-level fake gateway used only by contract tests; never used by runtime |
| **Mock mode** | Historical: removed 2026-10-24; the console is live-only |
| **Contract** | The canonical camelCase payloads, errors, and pagination the BFF exposes |
| **ADR** | Architecture Decision Record |
| **FR / NFR** | Functional / non-functional requirement |
| **WCAG 2.2 AA** | Accessibility target for contrast, keyboard, focus, and target size |
| **Design token** | Semantic CSS variable (e.g. `--primary`) consumed via Tailwind |
| **shadcn/ui** | A copy-in component model: accessible primitives in `components/ui` owned by this repo |
| **tweakcn** | The theme source for the palette, fonts, and radius |
| **Production** | The environment serving real operators and the real gateway |
| **Staging** | The environment for integration testing, deployed from `development` |
| **Smoke test** | A small post-deploy check that the app, auth, and a read route work |
| **Rollback** | Redeploying the previous immutable image tag |
