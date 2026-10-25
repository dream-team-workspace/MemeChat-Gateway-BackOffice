# 14 — Cloudflare Zero Trust (Access) authentication

| Field | Value |
|---|---|
| Status | Implemented in the console (2026-10-22); Cloudflare app/tunnel configuration is operator work |
| Scope | Browser login for the operator console |
| Replaces | The planned custom OIDC authorization-code flow in FR-001 |
| Related | [Security model](07-security-model.md), [Architecture](03-architecture.md), [ADR-0008](adr/0008-cloudflare-access-auth.md) |

## 1. Decision

Operator authentication is delegated to **Cloudflare Access**, the same Zero Trust
organization used for SSH access to `admin.dream-team.works`.

- Cloudflare Access handles the login page, identity-provider SSO, MFA, policy,
  session duration, and the HttpOnly authorization cookie.
- The SPA never implements OIDC, stores no identity token, and has no password
  field.
- The SPA reads the verified identity from the same-origin
  `/cdn-cgi/access/get-identity` endpoint.
- Sign-out goes to `/cdn-cgi/access/logout`.

This removes the need for an application-owned OIDC client, state/nonce/PKCE
cookies, and a session-signing secret. Those were planned in FR-001 but are no
longer required for the console.

### 1.1 Which project and hostname get Access?

Configure Cloudflare Access on the **backoffice hostname** (for example
`console.dream-team.works`), not on the Go gateway.

| Component | Cloudflare Access? | Auth model |
|---|---|---|
| Backoffice SPA / future BFF | **Yes**, browser login | Access SSO + policy |
| Gateway `/v1/*` (mobile app API) | **No** | Firebase ID tokens |
| Gateway `/internal/admin/*` | Not browser-facing | BFF-only, private network, `ADMIN_API_SECRET` |

Putting browser Access in front of `/v1/*` would break the mobile app's Firebase
authentication. The admin API must not be the browser's target; the future BFF
holds the admin secret and calls the gateway privately. If the admin API ever
needs a direct external entry point, protect it with a separate Access
application and service token (machine-to-machine), not the operator browser
session.

## 2. Current Cloudflare context

Observed on the workstation (2026-10-22):

| Item | Value |
|---|---|
| Cloudflare Tunnel client | `cloudflared 2026.10.0` on the server |
| Zero Trust team domain | `rough-water-d6a6.cloudflareaccess.com` |
| Existing SSH hostname | `admin.dream-team.works` |
| Server tunnels | token-managed `cloudflared.service` + named `cloudflared-freesky.service` |
| Named tunnel credentials | `/root/.cloudflared/cert.pem` and `62299d2c-....json` are present on the server |
| `console.dream-team.works` DNS | **Not created yet** (checked 2026-10-25) |
| Access application | **Not created yet** (needs operator action; AUD required by the BFF) |
| BackOffice service | `memechat-backoffice.service` on `127.0.0.1:8787` (initial deployment complete) |
| Public hostname | **Not exposed yet**; intended `console.dream-team.works` -> `http://127.0.0.1:8787` |

The existing tunnel is used for SSH. Do **not** reuse the SSH hostname for the
web console: a tunnel public hostname maps to one service, and the SSH
application already owns `admin.dream-team.works`.

**Recommended console hostname:** `console.dream-team.works`.

### 2.2 Exact remaining public steps

1. In Zero Trust, create a self-hosted Access application for
   `console.dream-team.works` with the operator policy.
2. Copy its AUD into `/etc/memechat-backoffice.env` as `CF_ACCESS_AUD`.
3. Add a tunnel ingress to the named tunnel and create DNS:

   ```yaml
   - hostname: console.dream-team.works
     service: http://127.0.0.1:8787
   ```

   ```bash
   sudo cloudflared tunnel route dns <tunnel-id> console.dream-team.works
   sudo systemctl restart cloudflared-freesky
   ```

   Or add the hostname to the token-managed tunnel in the dashboard.
4. Switch the BFF from its safe loopback development mode to production
   (`NODE_ENV=production`, `APP_ENV=production`, real `CF_ACCESS_AUD`), then
   restart `memechat-backoffice`.
5. Verify Access login and the real Overview/Providers pages.

See [deploy/README.md](../deploy/README.md) for the current deployment state.

If the console must live at `admin.dream-team.works`, move SSH to another
hostname first (for example `ssh.dream-team.works`) and re-point the SSH
application. That is a separate, deliberate change.

### 2.1 Does this require production first?

**No.** Cloudflare Access works on any hostname that Cloudflare proxies and that
has an Access application. Cloudflare does not know whether you call the
environment "production".

| Where the console runs | Real Cloudflare login? | Why |
|---|---|---|
| `npm run dev` on localhost | No | No Access in front; `import.meta.env.DEV` uses `VITE_DEV_AUTH_EMAIL` |
| `npm run preview` on localhost | No | Production build, but still no Access; the login fallback cannot authenticate |
| Preview/static build behind a Tunnel + Access app (staging hostname) | **Yes** | Access intercepts the hostname; `get-identity` works |
| Production hostname + Access app | **Yes** | Same flow |
| `npm run dev` behind a Tunnel + Access app | **No real identity** | The dev build still uses the development identity even though Access logs you in |

So you do not need production. You need all four of these:

1. a **production build** (`npm run build`, not `npm run dev`);
2. an origin serving `dist/` on localhost;
3. a Cloudflare Tunnel public hostname (staging or production);
4. an Access application/policy on that hostname.

Recommended sequence: test with a **staging** hostname first, e.g.
`console-staging.dream-team.works` → `http://localhost:4173` → staging Access
application/policy. Once the Access login and `get-identity` work there, repeat
the same steps for `console.dream-team.works`. The app code does not change;
only the hostname and Access application do.

**Trap:** putting `npm run dev` behind Access makes Cloudflare log you in, but
the SPA still shows "Development Operator" because the dev build ignores Access.
Use `npm run build` + `npm run preview` (or a static server) for any Access test.

## 3. Runtime shape

~~~text
Browser
  │  HTTPS, CF_Authorization HttpOnly cookie
  ▼
Cloudflare Access (rough-water-d6a6.cloudflareaccess.com)
  │  SSO / MFA / allowlist policy
  ▼
Cloudflare Tunnel
  │  public hostname: console.dream-team.works
  ▼
Static console origin (localhost, not publicly reachable)
  ├─ dist/index.html + assets
  └─ /api/* only after the BFF lands

The browser also calls, on the same hostname:
  GET /cdn-cgi/access/get-identity   → verified email/name/idp
  GET /cdn-cgi/access/logout        → revoke Access session
~~~

`/cdn-cgi/access/get-identity` is answered by Cloudflare at the edge, not by the
static origin. It returns the identity only when the Access cookie is valid.

## 4. Cloudflare dashboard setup

### 4.1 Add the console public hostname to the tunnel

1. Zero Trust dashboard → **Networks → Tunnels**.
2. Select the tunnel that already serves `admin.dream-team.works`. This tunnel is
   token-managed, so the public hostname is configured in the dashboard, not in a local
   `config.yml`.
3. **Public hostname → Add a public hostname**:
   - Subdomain: `console`
   - Domain: `dream-team.works`
   - Service: `HTTP` → `localhost:4173` (or `8787` once the BFF exists)
4. Save. Cloudflare creates the DNS record for the hostname.
5. Start the token-managed tunnel on the **same host** as the origin. If the tunnel
   runs elsewhere, `localhost:4173` points at the wrong machine. Use the existing
   token/service or the dashboard's tunnel run command; no local `cert.pem` is
   present, so CLI tunnel management is unavailable.

The origin port depends on how the static site is served:

| Mode | Origin |
|---|---|
| Local preview behind a temporary tunnel | `http://localhost:4173` (`npm run preview -- --host 127.0.0.1 --port 4173`) |
| Production static server | `http://127.0.0.1:4173` behind Caddy/Nginx, or the BFF port `8787` later |
| Cloudflare Pages | no tunnel origin; protect the Pages custom domain with Access instead |

The origin must bind to localhost (or be firewalled to the tunnel). If the
origin is publicly reachable, Access at the edge is not a security boundary.

Whatever server serves `dist/` must return `index.html` for client routes such as
`/settings` (SPA fallback) while leaving `/cdn-cgi/access/*` to Cloudflare; otherwise
a refresh on a deep link returns 404.

For local preview through the tunnel, `vite.config.ts` allows `.dream-team.works` in
`server.allowedHosts` and `preview.allowedHosts`. Without that, Vite returns
`403 Blocked request. This host is not allowed.` before the SPA loads. If the console
domain changes, add the new hostname there.

### 4.2 Create the Access application

1. Zero Trust dashboard → **Access → Applications → Add an application →
   Self-hosted**.
2. Name: `MemeChat BackOffice`.
3. Session duration: **8 hours** (matches the console's intended operator day;
   adjust to policy).
4. Application domain: `console.dream-team.works`.
5. Policy: reuse the same allowlist/IdP as the SSH application. A simple policy:
   - Action: **Allow**
   - Include: **Emails** → the operator addresses, or **Emails ending in** →
     `@dream-team.works`
   - Require: same MFA/device posture as SSH, if configured.
6. Save.

Access now redirects unauthenticated visitors to the team login before the SPA
loads.

### 4.3 Verify

1. Open `https://console.dream-team.works` in a private window.
2. Complete the Access login.
3. The console should render the Overview page with your name in the sidebar.
4. Open `https://console.dream-team.works/cdn-cgi/access/get-identity`; you
   should see JSON containing `email`, `name`, `idp`, and `iat`.
5. Use the console's **Sign out**; it navigates to
   `/cdn-cgi/access/logout` and clears the Access session.

If step 4 returns 404, the request is reaching the static origin instead of
Cloudflare Access: the hostname is not attached to the Access application, or
the tunnel public hostname is missing.

## 5. Application implementation

| File | Responsibility |
|---|---|
| `src/features/auth/cloudflare-access.ts` | `get-identity` fetch with `redirect: "manual"`; logout path |
| `src/features/auth/auth-store.ts` | session load with five-minute refresh, React store, dev identity, sign-in/out |
| `src/app/router.tsx` | async `beforeLoad` guards on the app and login routes |
| `src/features/auth/pages/login-page.tsx` | Access fallback page and "Continue with Cloudflare Access" |
| `src/features/settings/pages/settings-page.tsx` | real operator identity and Access session copy |
| `src/features/operations/pages/operations-page.tsx` | auth mode label |
| `.env.example` | `VITE_DEV_AUTH_EMAIL` for localhost only |

Behavior:

1. In production, on the first protected navigation, `ensureSession()` fetches
   `/cdn-cgi/access/get-identity` with a 5-second timeout; the cached identity is
   refreshed on the next protected navigation after five minutes. Local development
   returns the configured development identity instead of fetching.
2. A 200 identity is mapped to `{id,name,email,initials,role,signedInAt,provider}`.
3. A 401, 403, opaque redirect, non-JSON body, or network failure means
   unauthenticated; the router redirects to `/login`.
4. The login button re-requests the page. Access intercepts it and shows the
   team login when the cookie is missing or expired.
5. Sign-out navigates to `/cdn-cgi/access/logout`.
6. No auth data is written to `localStorage`. The old mock key `bo-session` is
   removed on load.

### 5.1 Local development

There is no Cloudflare Access in front of `localhost`. When
`import.meta.env.DEV` is true, the store uses a development identity:

~~~env
VITE_DEV_AUTH_EMAIL=operator@dream-team.works
~~~

This value is:
- public (Vite exposes `VITE_*` to the browser);
- used only when `import.meta.env.DEV` is true;
- ignored by production builds, which always use Access.

`npm run preview` is a production build. Without Access in front of the preview
origin it shows the login fallback and cannot authenticate; use `npm run dev`
for local work.

In development, sign-out returns to `/login` and keeps the fallback page visible so
it can be reviewed. A fresh load of a protected route (for example `/`) re-establishes
the development identity; the login button does the same.

## 6. Security model

- **Allowlist:** Access policy, not application code. Deny by default.
- **Session:** Access `CF_Authorization` cookie, HttpOnly/Secure/SameSite; the
  SPA cannot read it. No app-owned session token.
- **No secrets:** no OIDC client secret, no `SESSION_SECRET`, no admin secret in
  the browser.
- **No direct gateway access:** the static SPA has no admin API calls. The
  future BFF remains the only admin-secret holder.
- **Origin isolation:** the static origin is behind the tunnel only. If the
  origin can be reached directly, Access is bypassable.
- **Logout:** same-origin `/cdn-cgi/access/logout` clears the app cookie and
  revokes the session across applications.
- **Expiry:** an expired Access session causes the next `get-identity` call to
  redirect; the SPA treats that as unauthenticated and shows the login page.

### 6.1 BFF and the Access JWT (next phase)

When the BFF lands, it must validate the Access JWT on every
`/api/admin/*` request rather than trusting a header alone:

~~~ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const team = "rough-water-d6a6.cloudflareaccess.com";
const jwks = createRemoteJWKSet(new URL("https://" + team + "/cdn-cgi/access/certs"));
const token = request.headers.get("Cf-Access-Jwt-Assertion");

const { payload } = await jwtVerify(token ?? "", jwks, {
  issuer: "https://" + team,
  audience: process.env.CF_ACCESS_AUD,
});

// payload.email is the verified operator identity.
~~~

Use `payload.email` for `X-Admin-Actor`. Do not trust
`Cf-Access-Authenticated-User-Email` alone, and do not implement a generic
proxy. The existing BFF requirements (CSRF, allowlist, secret isolation) still
apply.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Access login loops | The application is not on the hostname, or the origin is not reached through the tunnel | Check the Access application domain and tunnel public hostname |
| `403 Blocked request. This host is not allowed.` | Vite preview/dev rejected the tunnel Host header | Add the hostname or `.dream-team.works` to `server.allowedHosts` / `preview.allowedHosts` |
| `/cdn-cgi/access/get-identity` returns 404 | Cloudflare Access is not proxying the hostname | Attach the hostname to the Access application; verify DNS is proxied |
| Console shows login page but button loops | The origin is not behind Access (preview/local, or a direct IP) | Use `npm run dev` locally; put production behind the tunnel/Access |
| `get-identity` fetch fails with CORS | A redirect was followed to the team login domain | The app uses `redirect: "manual"`; keep it |
| Sign-out returns to the app still signed in | Cookie was cleared on the wrong domain | Use `/cdn-cgi/access/logout` on the console hostname |
| SSH to `admin.dream-team.works` breaks | The web hostname reused the SSH hostname | Keep `console.dream-team.works` separate |

## 8. Follow-up

- [ ] Create the `console.dream-team.works` tunnel public hostname.
- [ ] Create/reuse the Access application and policy.
- [ ] Put the production static origin behind the tunnel only.
- [ ] When the BFF lands, add JWT verification and use `email` as the actor.
- [ ] Add a staging Access application and a read-only smoke test.
- [ ] Decide whether Access session duration 8h matches the operator policy.

## 9. References

- [Cloudflare Access — application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Cloudflare Access — session management / logout](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
- [Cloudflare Access — get identity](https://developers.cloudflare.com/cloudflare-one/tutorials/extend-sso-with-workers/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
