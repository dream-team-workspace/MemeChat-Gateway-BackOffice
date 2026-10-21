# FR-001 — Operator authentication and session

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1 |
| Owner | Frontend/BFF |
| Depends on | — |
| Source | [Security model](../07-security-model.md), [Architecture](../03-architecture.md) |

## Intent

Only allowlisted team members can open the console, and every subsequent request carries a
real operator identity. The gateway's shared admin secret is never the operator's credential.

## Scope

In scope:

- OIDC authorization-code login (GitHub or Google Workspace).
- Allowlist by login, email domain, or org/team.
- Signed session cookie, logout, expiry, and return-to behavior.
- Login error states and dev-only bypass.

Out of scope:

- Password storage, MFA implementation (delegated to the IdP).
- Per-operator roles/RBAC (Phase 6).
- Multiple simultaneous identities in one browser profile.

## User stories

- As an operator, I can sign in with my team identity and land on the page I requested.
- As an operator, I can sign out and know the session is gone.
- As a denied user, I see a clear message and a way to request access.
- As a security reviewer, I can verify that the browser never receives the admin secret.

## Behavior

1. An unauthenticated visit to a protected route redirects to `/login?returnTo=<path>`.
2. `/login` shows one primary button for the configured provider and a help link.
3. Clicking it calls `GET /api/auth/login?returnTo=...`; the BFF sets short-lived state,
   nonce, and PKCE cookies and redirects to the IdP.
4. The IdP returns to `/api/auth/callback`; the BFF verifies state, nonce, code, token
   signature/issuer/audience/expiry, and the allowlist.
5. On success, the BFF mints a new session and redirects to a **same-origin path** only.
6. `GET /api/auth/me` returns `{sub,email,name,avatarUrl,issuedAt,expiresAt,environment}`.
7. Logout calls `POST /api/auth/logout` (CSRF-protected), clears the cookie, and redirects to
   `/login` or the IdP logout URL.
8. Expired/invalid sessions return 401 `SESSION_EXPIRED`; the client refetches once, then
   redirects to login with the current path.
9. Development may enable `DEV_AUTH_BYPASS`, but production startup rejects it.

## Acceptance criteria

- [ ] Unauthenticated `/api/admin/*` requests return 401 without calling the gateway.
- [ ] Login uses state + nonce (+ PKCE where supported); a mismatched state is rejected.
- [ ] A user outside the allowlist is denied with a human message; no session is created.
- [ ] The session cookie is `__Host-bo_session`, HttpOnly, Secure, SameSite=Lax, Path=/.
- [ ] Login rotates the session; a pre-login cookie is not reused.
- [ ] `returnTo` rejects absolute URLs, protocol-relative URLs, and paths outside the origin.
- [ ] Logout clears the cookie and protected routes redirect to login.
- [ ] Expired sessions redirect to login and return to the original page after re-auth.
- [ ] `/api/auth/me` never returns tokens, secrets, or the admin base URL.
- [ ] Production startup fails if `DEV_AUTH_BYPASS` is enabled or OIDC config is incomplete.
- [ ] The login page is keyboard-operable and has no secret in the bundle.

## Data and API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/login` | Start OIDC, set state/nonce/PKCE |
| GET | `/api/auth/callback` | Verify, allowlist, mint session |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current operator + environment |

Session claims: `sub`, `email`, `name`, `avatarUrl`, `iat`, `exp`, `ver`.
Absolute lifetime 8h; idle 30m (or documented server-side enforcement).

## UX notes

- Login card: wordmark, one sentence, provider button, "Need access?" link.
- Error messages: access denied, not allowed, expired state, provider unavailable. Include a
  request ID and retry.
- The session menu shows email, environment, theme, docs, sign out.
- Never show a "remember me" checkbox.

## Errors and edge cases

- IdP unavailable → 502 `AUTH_PROVIDER_ERROR` with retry.
- Missing email / unverified email → deny.
- GitHub private email → use the primary verified email; if unavailable, deny with guidance.
- Clock skew → validate with a small leeway; log the reason.
- Session tampering → 401, clear cookie, no details.
- Logout while offline → clear local cookie via BFF when possible; show a warning if not.

## Security and audit

- No tokens in localStorage/sessionStorage.
- Session cookie is signed/encrypted with `SESSION_SECRET`; no raw IdP token stored.
- Allowlist check happens before session creation; deny by default.
- Log login success/failure with actor hash, IP, request ID; never log tokens.
- Rate-limit login/callback (10/min/IP).

## Test notes

- BFF: state mismatch, nonce mismatch, expired code, denied user, allowed user, open redirect,
  cookie flags, logout, expired session.
- E2E: E1 (login), E2 (denied), E3 (expiry/returnTo), logout.
- Security: secret scan; cookie inspection.

## Open questions

- OIDC provider choice (Q1).
- Idle timeout enforcement: stateless claim refresh vs server-side store.
- Per-user revocation requirements.

## Traceability

[Architecture §6.2](../03-architecture.md) · [Security §4](../07-security-model.md) ·
[API §2.1](../06-api-integration.md) · [E2E E1–E3](../09-testing-strategy.md)
