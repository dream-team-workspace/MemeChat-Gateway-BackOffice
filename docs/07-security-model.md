# 07 — Security model

| Field | Value |
|---|---|
| Status | Proposed; must pass review before production |
| Scope | Browser SPA, BFF, gateway admin API boundary |
| Related | [02-backend-contract-analysis.md](02-backend-contract-analysis.md), [06-api-integration.md](06-api-integration.md), [10-ci-cd-and-environments.md](10-ci-cd-and-environments.md) |

> **Update 2026-10-22:** Cloudflare Access is the operator authentication provider.
> References below to OIDC, state/nonce/PKCE, or an app-owned session cookie are superseded;
> see [14-cloudflare-access.md](14-cloudflare-access.md). The BFF must validate
> `Cf-Access-Jwt-Assertion` before the admin API is wired.

## 1. Security objectives

1. **No admin secret in the browser.** Ever.
2. **Only allowlisted humans** can use the console.
3. **Every mutation is attributable** to an authenticated operator.
4. **The BFF cannot be turned into an open proxy** or an SSRF pivot.
5. **Money actions are deliberate, idempotent, and evidenced.**
6. **Sensitive data stays out of logs, analytics, and error reports.**
7. **A compromised session has a bounded blast radius and a clear revocation path.**

## 2. Assets and trust boundaries

| Asset | Where it lives | Sensitivity |
|---|---|---|
| `ADMIN_API_SECRET` | BFF environment/secret store | Critical |
| `CF_ACCESS_AUD` (Access app tag) | BFF environment/config | Low (not secret) |
| Access `CF_Authorization` cookie | Browser ↔ Cloudflare | High |
| CSRF token (future BFF) | Browser ↔ BFF | Medium |
| CSRF token | Browser ↔ BFF | Medium |
| Capability registry/routing | Gateway/Postgres | High (production behavior) |
| Credit ledger/usage | Gateway/Postgres | High (financial/PII) |
| Audit trail | Gateway/Postgres | High (integrity) |
| UIDs | Ledger/usage/UI | Confidential |
| Prompt/image/audio content | Not stored by gateway or console | Out of scope |

Trust boundaries:

~~~text
Untrusted browser
   │  session cookie + CSRF
   ▼
Trusted BFF  ── secret ──►  Trusted gateway  ──► Postgres / RevenueCat
   ▲
   │  Access
Identity provider
~~~

The browser is untrusted. The BFF is trusted but internet-exposed. The gateway is trusted and
must only be reachable by the BFF (network allowlist preferred).

## 3. Threat model

| # | Threat | Vector | Impact | Mitigation | Verification |
|---|---|---|---|---|---|
| T1 | Secret exfiltration | Secret embedded in SPA, source map, logs, error report | Full admin compromise | BFF-only secret; no `VITE_*` secret; build scan; log redaction | CI grep + bundle scan + manual DevTools |
| T2 | Unauthenticated access | Direct BFF/admin route call | Unauthorized changes | Session required on all `/api/admin/*`; gateway also fail-closed | BFF tests for 401; gateway 401 |
| T3 | Unauthorized operator | Valid IdP account not covered by the Access policy | Unauthorized access | Access policy allowlist; deny by default | Access policy review + denied-user test |
| T4 | CSRF | Cross-site form/fetch with session cookie | Unauthorized mutation | SameSite=Lax + Origin check + double-submit CSRF header | BFF tests for missing/bad Origin/token |
| T5 | XSS | Malicious API string rendered as HTML | Session theft/actions | React escaping; no `dangerouslySetInnerHTML`; CSP; JSON viewer as text | Lint rule + CSP + XSS fixtures |
| T6 | Open proxy / SSRF | Generic `/api/proxy?url=` or unvalidated path | Access internal network | Explicit allowlist; fixed base URL; validated path params | Route table review + tests |
| T7 | Session theft | XSS, physical access, insecure cookie | Operator impersonation | HttpOnly/Secure/SameSite; short TTL; no localStorage; CSP | Cookie tests + browser inspection |
| T8 | Session fixation | Attacker sets session before login | Impersonation | New session on login; signed state; rotate cookie | Auth integration test |
| T9 | Open redirect | `returnTo` to attacker site | Phishing | Same-origin path validation; reject scheme/host | Unit tests |
| T10 | CSRF via login | Login CSRF | Account confusion | State + nonce + PKCE | Auth tests |
| T11 | Brute force / credential stuffing | Access login | Access attempts | Access/IdP handles credentials and MFA; monitor Access logs | Access policy + logs |
| T12 | Duplicate grant | Double click/retry/timeout | Double credits | requestId idempotency; pending lock; no auto-retry; confirm | E2E retry test + backend test |
| T13 | Accidental destructive change | Misclick/wrong capability | Outage | Type-ID confirm; reason; diff; no optimistic UI | E2E kill-switch test |
| T14 | Audit forgery | Browser sets `X-Admin-Actor` | False attribution | BFF overwrites actor from session; browser header ignored | BFF test asserts override |
| T15 | Supply-chain compromise | Malicious npm package/action | Code execution/secret theft | Lockfile, `npm ci`, audit, pinned actions, review | Dependabot + CI audit |
| T16 | Log leakage | UIDs/tokens/bodies in logs | Privacy breach | Structured logs with allowlist fields; redaction; no bodies | Log review + tests |
| T17 | Unauthorized gateway exposure | Admin API publicly reachable | Brute force/secret spray | TLS, firewall allowlist BFF→gateway, rotate secret, monitor 401s | Network review |
| T18 | Stolen admin secret | Env leak/host compromise | Full admin | Short rotation runbook; least-privilege network; audit; revoke | Rotation drill |
| T19 | Malicious JSON/config | Huge/deep JSON, prototype pollution | DoS/XSS | Body size cap, JSON depth/size limits, schema validation, no merge into prototypes | BFF tests |
| T20 | Clickjacking | Embedding console | UI redress | `frame-ancestors 'none'` / X-Frame-Options DENY | Header test |

## 4. Authentication

### 4.1 Provider

Operator authentication is **Cloudflare Access**, using the same Zero Trust organization as the
SSH entry point (`rough-water-d6a6.cloudflareaccess.com`). Access owns the login page, identity
provider, MFA, allowlist policy, session duration, and the authorization cookie.

### 4.2 Flow

1. The browser requests the console hostname (for example `console.dream-team.works`).
2. Cloudflare Access intercepts the request and redirects unauthenticated users to the team
   login page.
3. After the policy passes, Access sets an HttpOnly authorization cookie and serves the SPA.
4. The SPA calls `GET /cdn-cgi/access/get-identity` and maps `email`, `name`, `idp`, and `iat`
   into the operator session. It never reads or stores a token.
5. Sign out navigates to `GET /cdn-cgi/access/logout`, which clears the cookie and revokes the
   session across applications.
6. There is no application-owned OIDC client, state/nonce/PKCE cookie, or session-signing
   secret.

### 4.3 Session

- The session cookie is Cloudflare's `CF_Authorization`, HttpOnly and Secure. The SPA cannot
  read it.
- Session duration is configured on the Access application (8 hours is the current proposal).
- The console does not mint a `__Host-bo_session` cookie. The earlier requirement is
  superseded.
- An expired Access session causes the next `get-identity` request to redirect; the SPA treats
  an opaque redirect or non-200 response as unauthenticated and shows `/login`.
- The origin must be reachable only through the tunnel. If it is directly reachable, Access is
  bypassable and the origin/BFF must validate the Access JWT.

### 4.4 Authorization

- The Access policy is the allowlist; deny by default.
- v1 has one role, **operator**.
- The gateway still sees one shared admin secret and cannot distinguish operators. The BFF is
  the identity source and sets `X-Admin-Actor` from the verified Access email.
- The browser never calls the gateway admin origin and never receives the admin secret.

### 4.5 BFF validation (required when the admin API lands)

The BFF must validate the Access JWT on every `/api/admin/*` request:

~~~ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const team = "rough-water-d6a6.cloudflareaccess.com";
const jwks = createRemoteJWKSet(new URL("https://" + team + "/cdn-cgi/access/certs"));
const token = request.headers.get("Cf-Access-Jwt-Assertion");

const { payload } = await jwtVerify(token ?? "", jwks, {
  issuer: "https://" + team,
  audience: process.env.CF_ACCESS_AUD,
});
~~~

Use `payload.email` for `X-Admin-Actor`. Do not trust
`Cf-Access-Authenticated-User-Email` alone. The BFF still needs Origin/CSRF checks for mutations,
the explicit route allowlist, and secret isolation. Cloudflare's guidance says a Tunnel-connected
origin is protected by the tunnel; validation is defense in depth and is required if the origin is
not tunnel-only.

## 5. Secret management

### 5.1 Rules

- Secrets live only in the BFF runtime environment or a secret manager.
- Never in git, `VITE_*`, `dist/`, source maps, Docker image layers, build logs, or error
  reports.
- The browser bundle is scanned in CI for known secret patterns and the literal env values.
- The BFF logs only a fingerprint (e.g., first 6 chars of a SHA-256) when diagnosing, never
  the secret.
- Separate secrets per environment (staging ≠ production).
- The gateway's admin secret must be different from `INTERNAL_API_SECRET` and all provider keys.

### 5.2 Rotation

1. Generate a new `ADMIN_API_SECRET`.
2. Deploy it to the gateway (accept old + new during a short window if the gateway supports
   dual secrets; otherwise pick a low-traffic window).
3. Deploy the BFF with the new value.
4. Verify admin reads/mutations.
5. Remove the old value from the gateway and secret store.
6. Record the rotation in the ops log.

Access session revocation is managed from Cloudflare (per-user or policy); no app session secret exists.

### 5.3 Storage

- Production: Docker secret, systemd `EnvironmentFile` with 0600, or a hosted secret manager.
- Never bake secrets into the image; pass at runtime.
- Staging uses separate values.

## 6. CSRF, CORS, and headers

### 6.1 CSRF

- All state-changing methods require:
  - `Origin` (or `Referer` fallback) exactly equal to `APP_ORIGIN`.
  - `X-CSRF-Token` matching a signed/random token bound to the session (double-submit).
- The CSRF cookie is readable by JS (`__Host-bo_csrf`, not HttpOnly) but useless without the
  session cookie; the header proves same-origin script access.
- Reject requests with `Content-Type` other than `application/json` for JSON bodies.
- `SameSite=Lax` is defense in depth, not the only control.

### 6.2 CORS

- No cross-origin API access. The BFF serves the SPA same-origin.
- Do not enable `Access-Control-Allow-Origin: *`.
- If a separate dev origin is used, allow only `http://localhost:5173` in development.

### 6.3 Headers (production)

~~~text
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none'
~~~

Notes:

- `style-src 'unsafe-inline'` is allowed for Radix positioning and component inline styles;
  scripts are not allowed inline. The theme boot script must be an external file or nonce/hash.
- Dev CSP is looser for Vite HMR WebSocket; never ship it.
- Test headers with a real browser and an automated header test.

## 7. BFF route security

- Explicit allowlist of method + path template + Zod schema.
- No user-supplied upstream URL, host, or header forwarding.
- Validate path params before interpolation.
- Bound body to 64 KiB; reject oversized bodies before JSON parse.
- Bound JSON depth/size to prevent parser DoS.
- Strip hop-by-hop and sensitive upstream headers.
- Do not forward browser cookies to the gateway.
- Do not return upstream `Set-Cookie`.
- Rate limits:
  - login/callback: 10/min/IP.
  - mutations: 30/min/session.
  - reads: 120/min/session.
  - grants: 5/min/session (in addition to mutations).
- On upstream 401/403: return a safe error; do not expose the admin secret state.
- On upstream 5xx: log code/request ID; return `UPSTREAM_ERROR`.
- Timeouts: see [06-api-integration.md](06-api-integration.md).

## 8. XSS and content safety

- React escapes by default. No `dangerouslySetInnerHTML`.
- JSON/audit viewers render text nodes, not HTML.
- Markdown is not rendered from API data in v1. If added, sanitize with a maintained renderer.
- URLs from API data are not rendered as links unless scheme is https and host is allowlisted.
- CSP blocks inline scripts; any third-party script requires a security review.
- File uploads do not exist in v1.

## 9. Money-path controls

Credit grants are the only money mutation in v1.

- Positive integers only; UI enforces > 0; BFF re-validates; gateway is authoritative.
- Amount, reason, UID, and requestId are shown in a confirmation step.
- The requestId is generated per intent and reused on retry.
- No automatic retry; a timeout requires a state refresh before retry.
- No optimistic balance update; ledger refetch after success.
- Actor is the session email, not user input.
- High amounts (>1,000) require a second confirmation and a longer reason.
- Audit/log every grant attempt (success/failure) with request ID, actor hash, amount, UID hash.
- Backend must enforce idempotency; the UI cannot guarantee it alone.

## 10. Privacy and logging

- The gateway stores no message/image/audio content; the console must not create a shadow copy.
- UIDs are confidential. Logs use a hash or last 4 chars only when necessary.
- Do not send ledger/usage rows to analytics or session replay.
- Error reports scrub cookies, headers, query strings, UIDs, and request bodies.
- Browser storage:
  - `localStorage`: theme and sidebar preference only.
  - `sessionStorage`: none for auth.
  - IndexedDB: none in v1.
- Retention: logs 30 days; error reports 30 days; audit lives in the gateway.

## 11. Auditability

- Every mutation carries `X-Admin-Actor` from the session.
- The gateway writes `capability_audit` for capability/provider changes and (planned) model
  changes. The UI displays it.
- The BFF emits a structured audit log line for every mutation: timestamp, actor hash, action,
  resource ID, request ID, outcome, status. No body.
- The UI shows the request ID and audit link on success.
- Audit records are append-only; the console has no edit/delete path.

## 12. Supply chain

- Commit `package-lock.json`; CI uses `npm ci`.
- Dependabot/Renovate for npm and GitHub Actions.
- `npm audit --omit=dev` in CI; production vulnerabilities block release.
- Pin GitHub Actions to major versions; third-party actions to SHAs.
- No postinstall scripts from unknown packages; review new dependencies.
- Build in CI from a clean checkout; no local artifacts.
- Container runs as non-root, read-only filesystem where possible, no shell in the runtime image.
- Scan the image (Trivy/Grype) before push; fail on critical/high with a documented exception.

## 13. Incident response

1. **Suspected secret leak:** rotate `ADMIN_API_SECRET`; revoke Cloudflare Access
   sessions; review gateway audit/401 logs; redeploy.
2. **Suspected operator account compromise:** remove the user from the Access policy/IdP;
   revoke Access sessions; review audit and ledger grants.
3. **Malicious dependency:** pin/remove, rebuild from a clean lockfile, rotate secrets if the
   build had access.
4. **XSS report:** disable the affected route via feature flag if possible, patch, rotate
   sessions, review CSP reports.
5. **Gateway admin outage:** console remains readable from cache? No — reads fail; show a
   degraded state; do not queue mutations.

Runbooks live with the deployment docs; this section is the policy.

## 14. Security acceptance checklist

- [ ] No secret in bundle/source maps/logs (automated scan + manual).
- [ ] All admin BFF routes require a session; direct calls return 401.
- [ ] Non-allowlisted users are denied by the Access policy.
- [ ] CSRF: missing/invalid Origin or token is rejected on POST/PUT.
- [ ] Session cookie has HttpOnly, Secure, SameSite=Lax, `__Host-` prefix.
- [ ] Open redirect is rejected.
- [ ] BFF allowlist rejects unknown paths/methods; no SSRF.
- [ ] CSP/headers verified in production.
- [ ] Grant idempotency and timeout behavior tested.
- [ ] Audit actor is server-derived and cannot be spoofed by the browser.
- [ ] Logs contain no bodies, cookies, secrets, or raw UIDs.
- [ ] Dependency and image scans pass.
- [ ] Secret rotation runbook tested in staging.
- [ ] Backend admin routes are network-restricted to the BFF where possible.

## 15. Residual risks

- **Shared admin secret:** the gateway cannot distinguish operators or scope permissions. A
  BFF compromise yields full admin. Mitigate with network isolation, rotation, and monitoring.
- **Stateless sessions:** no per-session revocation without a denylist; global rotation logs
  everyone out.
- **Public admin API:** unless firewalled, it is exposed to credential spraying. The secret
  must be strong; monitor 401s.
- **No backend RBAC:** all operators are equal in v1.
- **Client-side hiding is not security:** any future permission UI must be enforced by the BFF.
