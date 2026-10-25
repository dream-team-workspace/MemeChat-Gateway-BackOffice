# 10 — CI/CD, branches, and environments

| Field | Value |
|---|---|
| Status | Active CI: lint on PRs, clean build on `development`, deploy on `master` |
| Remote | `git@github.com:dream-team-workspace/MemeChat-Gateway-BackOffice.git` |
| Production branch | `master` |
| Staging branch | `development` |
| Deployment | Node release tarball + atomic SSH deploy (systemd) |

## 0. Current CI/CD (implemented 2026-10-25)

Workflow: `.github/workflows/ci.yml`.

| Trigger | Jobs | Behavior |
|---|---|---|
| PR → `development` / `master` | `Lint` | `npm ci` + `npm run lint`; required check |
| Push → `development` | `Build` | `npm ci`, `rm -rf dist dist-server`, `npm run build`; no artifact/cache |
| Push → `master` | `Deploy production` | build, prune dev deps, package release, SSH to server, atomic deploy + health check |

Notes:

- The development build job does **not** upload artifacts and does **not** use
  `actions/cache`. It only proves the production build works; the runner is discarded.
- The master deploy job builds in-place, then ships a release tarball. There is no
  `DEPLOY_ENABLED` gate anymore; `environment: production` provides approval protection.
- The only required PR check is `Lint`. `Build` runs on `development` pushes only.
- Production is deployed to `/opt/memechat-backoffice/releases/<sha>` with an atomic
  `current` symlink and systemd restart. The previous release is retained for rollback.
- Server: deploy as `deploy@139.99.88.23:22` (key `github-actions-deploy`); admin
  access is `ubuntu@admin.dream-team.works`; service `memechat-backoffice` listens on
  `127.0.0.1:8787`.
  See [deploy/README.md](../deploy/README.md) and
  [14-cloudflare-access.md](14-cloudflare-access.md).

## 1. Branch model

~~~text
feature/* ──PR──► development ──PR──► master
fix/*     ──PR──►     │                 │
chore/*   ──PR──►     │                 │
                      ▼                 ▼
                 deploy staging    deploy production
                      │                 │
                      └── same image ───┘
                         promoted by digest/tag
~~~

| Branch | Created from | Merges into | Deploy | Protection |
|---|---|---|---|---|
| `master` | — | — | Gated production deploy (pending setup) | No direct push; PR required; 1 approval; checks; linear history |
| `development` | `master` | — | Build check only (staging deploy later) | No direct push; PR required; 1 approval; checks |
| `feature/*` | `development` | `development` | — | Owner |
| `fix/*` | `development` | `development` | — | Owner |
| `chore/*` | `development` | `development` | — | Owner |
| `hotfix/*` | `master` | `master` + back-merge `development` | Production (after setup) | Incident process |

Release flow:

1. Feature PR → `development` (squash merge).
2. CI runs a clean build check on `development`; no staging deployment yet.
3. Staging verification + approval once staging deployment is wired.
4. Release PR `development` → `master`; the `Lint` check must pass.
5. Squash merge to `master`; CI builds, packages, deploys over SSH, and runs the loopback
   health check.
6. Tag `vX.Y.Z` on the production commit.

Hotfix flow:

1. Branch `hotfix/<slug>` from `master`.
2. PR into `master`; expedited review + checks.
3. Deploy production; verify.
4. Back-merge `master` into `development` (or cherry-pick) so staging matches.

## 2. Required GitHub settings

Configure these once in the repository settings:

### 2.1 Branches

- Default branch: `master`.
- Protect `master`:
  - Require a pull request before merging.
  - Require 1 approval (2 for production changes if the team grows).
  - Dismiss stale approvals on new commits.
  - Require status checks: `Lint` (current); add build/E2E/secret-scan checks when those
    run on pull requests.
  - Require branches to be up to date before merging.
  - Require linear history (squash merge only).
  - Restrict who can push; disallow force pushes and deletions.
- Protect `development`:
  - Require a PR, 1 approval, status checks, no force pushes.
- Enable auto-delete of head branches after merge.
- Enable "Allow squash merging" only; disable merge commits and rebase merging.

### 2.2 Environments

| Environment | Protection | Secrets |
|---|---|---|
| `staging` | No manual approval (or 1 reviewer) | Staging SSH, staging env file, staging Access app, staging admin secret |
| `production` | Required reviewers (≥1), wait timer optional | Production SSH, production env file, production Access app, production admin secret |

Environment secrets are scoped; a workflow referencing `environment: production` cannot read
them without approval.

### 2.3 Security

- Secret scanning + push protection.
- Dependabot alerts/security updates.
- CodeQL or Semgrep (optional; add when code lands).
- Actions permissions: `contents: read` by default; elevate per job.
- No pull_request_target with untrusted code.

## 3. Target workflows (only the current subset is active)

> Today only `.github/workflows/ci.yml` exists, with the jobs in §0. The jobs below describe
> the target pipeline once tests, staging, and deployment are implemented.

### 3.1 `ci.yml` — verify

Trigger: pull_request to `development`/`master`; push to either branch.

Jobs:

1. **verify**
   - checkout
   - setup Node 24 with npm cache
   - `npm ci`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test -- --run`
   - `npm run build`
   - upload `dist/` + server build artifact
2. **e2e**
   - depends on verify
   - install Playwright browsers (Chromium for PR)
   - start the gateway admin API + BFF (live)
   - `npm run test:e2e -- --project=chromium`
   - upload traces/screenshots on failure
3. **secret-scan**
   - `grep`/trufflehog/gitleaks for known patterns
   - fail if `ADMIN_API_SECRET`, private keys, or `.env` content is found

Path filters: CI still runs for docs-only changes where cheap; deploy jobs skip docs-only.

### 3.2 `deploy-staging.yml` — development

Trigger: push to `development` after CI, or workflow_run on success.

Steps:

1. Download/build the image (or rebuild deterministically).
2. Log in to GHCR; push `ghcr.io/<org>/<repo>:<sha>` and `:staging`.
3. Deploy via SSH:
   - `ssh staging "cd /srv/backoffice && ./deploy.sh <sha>"`
   - `deploy.sh` pulls the image, updates `IMAGE_TAG` in `.env`, runs
     `docker compose up -d`, waits for health, rolls back on failure.
4. Smoke: `curl -fsS https://staging.../api/health`; run a read-only Playwright smoke.
5. Record the deployed SHA in the job summary.

Environment: `staging`.

### 3.3 `deploy-production.yml` — master

Trigger: push to `master` after CI, or workflow_run on success.

Steps:

1. Build/push the image with the exact `master` SHA; also tag `:production` and `:vX.Y.Z`
   when a tag is pushed.
2. Require the `production` environment approval.
3. Deploy via SSH with the same `deploy.sh` but production compose/env.
4. Health + read-only smoke (login page, `/api/health`, capabilities read with a service
   check if safe).
5. If health fails: redeploy the previous `IMAGE_TAG` automatically and fail the job.
6. Job summary: image digest, deployed SHA, approver, smoke result.

Environment: `production`. Concurrency: one production deploy at a time; do not cancel an
in-progress deploy (queue it).

### 3.4 `nightly.yml` — deep checks

- Full Playwright matrix (Chromium/WebKit/Firefox).
- Visual regression.
- Lighthouse CI.
- Image scan.
- Dependency audit.
- Optional staging mutation suite with a dedicated test UID.

### 3.5 `release.yml` — tag

- On `v*` tag: create a GitHub Release with changelog, image digest, and deploy notes.
- Do not rebuild from a different commit; promote the tested digest.

## 4. Deployment topology

> **Implemented 2026-10-25:** the production path is Node 24 + systemd + an atomic release
> directory, not Docker. The Docker/compose topology below is retained as historical design
> context; use [deploy/README.md](../deploy/README.md) for the live runbook.

### 4.1 Server

Historical design assumption: Linux server with Docker Engine + Compose, a domain, TLS via
Caddy/Nginx, and SSH access for the deploy user.

~~~text
Internet
  │ 443
  ▼
Cloudflare Access (SSO/MFA/policy)
  │
  ▼
Cloudflare Tunnel (origin bound to localhost)
  │
  ▼
Caddy/Nginx or a small static server (security headers, compression)
  │ 127.0.0.1:8787
  ▼
backoffice container
  ├─ Hono BFF (/api/*)
  └─ static dist/ (SPA)
  │
  └─ HTTPS → gateway admin API (firewall allowlist)
~~~

- Container runs as non-root, read-only root filesystem where possible, no shell.
- Only the proxy port is public; the app port binds to localhost.
- Environment file on the server: `/srv/backoffice/.env`, mode 0600, owned by deploy user.
- Compose pins `IMAGE_TAG`; no `latest` in production.
- Logs to stdout JSON; Docker log rotation configured.
- Health check: `GET /api/health` (checks BFF + optionally gateway).
- One replica is enough for v1; sessions are stateless, so a second replica is possible if
  rate limits move to a shared store.

### 4.2 Staging vs production

- Separate hosts (recommended) or separate compose projects/ports on one host.
- Separate databases (gateway staging DB) and separate RevenueCat/IdP apps if possible.
- Staging must never point at the production admin API or production Access application.
- Production deploys only from `master`; staging only from `development`.

### 4.3 Domains (placeholders)

| Environment | Console | API |
|---|---|---|
| Staging | `https://backoffice.staging.example.com` | same origin `/api` |
| Production | `https://backoffice.example.com` | same origin `/api` |

## 5. Container build

Multi-stage:

1. **deps** — Node 24, `npm ci`.
2. **build** — `npm run build` (web + server), no secrets, `NODE_ENV=production`.
3. **runtime** — distroless Node 24 or `node:24-alpine` with a non-root user; copy
   `dist/`, `server/dist/`, production `node_modules`; `EXPOSE 8787`;
   `CMD ["node", "server/dist/index.js"]`.

Rules:

- No secrets in build args or layers.
- `.dockerignore` excludes `node_modules`, `.git`, `.env*`, tests, docs, coverage.
- Image labels: source, revision, version, created.
- Healthcheck defined in Compose, not only Dockerfile.

## 6. Deploy script contract

~~~bash
#!/usr/bin/env bash
set -euo pipefail
# /srv/backoffice/deploy.sh <sha> [--rollback]
# 1. read current IMAGE_TAG
# 2. pull ghcr.io/...:<sha>
# 3. write IMAGE_TAG to .env atomically
# 4. docker compose up -d --remove-orphans
# 5. wait up to 60s for /api/health
# 6. on failure: restore previous tag, compose up -d, exit 1
~~~

- The script is idempotent.
- It never prints the env file.
- It records the previous tag in `/srv/backoffice/.last-good`.
- It does not run database migrations (none in this repo).
- It refuses to deploy a non-existent image.

## 7. Environment variables and secrets

### 7.1 GitHub Actions secrets

| Secret | Scope | Purpose |
|---|---|---|
| `SSH_HOST` | staging/production | Server address |
| `SSH_USER` | staging/production | Deploy user |
| `SSH_KEY` | staging/production | Private key (no passphrase in CI) |
| `SSH_KNOWN_HOSTS` | staging/production | Host key verification |
| `GHCR_TOKEN` | repo | Pull image on the server (or server `docker login` once) |

Use environment-scoped secrets, not repository-wide, for production.

### 7.2 Server env file (BFF)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | `8787` |
| `APP_ORIGIN` | yes | Exact public origin |
| `ADMIN_API_BASE_URL` | yes | Gateway origin, no trailing slash |
| `ADMIN_API_SECRET` | yes | Secret; required at startup in every environment |
| `ADMIN_API_BASE_URL` | yes | Gateway base URL, e.g. `http://127.0.0.1:8080` |
| `CF_ACCESS_TEAM_DOMAIN` | BFF | `rough-water-d6a6.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | BFF | Access application AUD tag (not secret) |
| `VITE_DEV_AUTH_EMAIL` | dev only | Local identity for `npm run dev`; ignored in production builds |
| `LOG_LEVEL` | no | `info` |
| `REQUEST_TIMEOUT_MS` | no | `10000` |
| `TRUST_PROXY` | yes | `1` behind Caddy/Nginx |

> **2026-10-22 — Access update:** Operator authentication is Cloudflare Access. There is no
> app-owned `SESSION_SECRET` and no OIDC client secret. `VITE_DEV_AUTH_EMAIL` is for
> `npm run dev` only and is ignored by production builds. The future BFF uses
> `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` to validate `Cf-Access-Jwt-Assertion`.

Startup validation must reject:

- missing `ADMIN_API_SECRET` in any environment
- a production build that enables a development identity (the compile-time `import.meta.env.DEV` guard prevents it)
- missing `CF_ACCESS_AUD` in production
- insecure `APP_ORIGIN` (non-HTTPS except localhost)

## 8. Health, smoke, and rollback

### 8.1 Health

`GET /api/health` returns:

~~~json
{
  "status": "ok",
  "version": "1.4.0",
  "commit": "abc1234",
  "environment": "production",
  "gateway": { "liveness": "ok", "readiness": "ok" }
}
~~~

It must not include secrets, env values, or internal hostnames. If the gateway is down, return
`status: "degraded"` with a 200 (the BFF is alive) or 503 if readiness requires the gateway;
document the choice. The UI distinguishes "BFF down" from "gateway down".

### 8.2 Smoke

- `curl -fsS https://host/api/health`
- `curl -fsS -o /dev/null -w "%{http_code}" https://host/` (200 HTML)
- Unauthenticated `/api/admin/capabilities` returns 401 (proves auth wiring).
- Optional: a read-only Playwright login + capabilities load using a staging test operator.

### 8.3 Rollback

1. Read the previous tag from `.last-good`.
2. Run `deploy.sh <previous-sha>`.
3. Verify health + smoke.
4. Record the rollback in the incident log.

Target: < 5 minutes. No rebuild; pull the previous immutable image.

## 9. Release and versioning

- Semantic version `MAJOR.MINOR.PATCH` for the console.
- Tag `vX.Y.Z` on the production commit.
- Changelog generated from Conventional Commits; manually curate breaking/ops notes.
- Image tags: `sha-<short>`, `staging`, `production`, `vX.Y.Z`. Production compose
  uses the immutable SHA; `production` is a convenience tag.
- Do not reuse a tag for a different commit.

## 10. First-time setup checklist

- [x] Create the GitHub repository and confirm `master` is the default branch.
- [x] Push `master` and `development` (planning baseline).
- [x] Add `.github/workflows/ci.yml` (lint on PR, build on `development`, deploy on `master`).
- [ ] Protect both branches; require the `Lint` check on PRs.
- [ ] Create the `production` environment and add reviewers.
- [ ] Create the `staging` environment/workflow when staging deployment is implemented.
- [ ] Add the five deployment secrets and push the workflow to GitHub.
- [x] Provision the server, Node 24, systemd service, `deploy` user, release helper, directories.
- [ ] Create the Cloudflare Access application and allowlist policy.
- [ ] Set the gateway `ADMIN_API_SECRET` in `/etc/memechat-backoffice.env`.
- [x] Add the runtime env file (0640).
- [x] Add `deploy/` scripts and systemd units.
- [ ] Run a staging deploy and a rollback drill once staging exists.
- [ ] Document on-call/owner for production approvals.

## 11. Current CI status

Implemented (2026-10-25):

- `.github/workflows/ci.yml`: `Lint` on PRs, clean `Build` on `development`, and
  `Deploy production` on `master`.
- `npm run lint` with ESLint 10 + typescript-eslint.
- No artifact upload and no `actions/cache`; `dist` is removed before the build and discarded.
- Node 24 systemd deployment to `deploy@139.99.88.23`, atomic release + rollback helper.
- Initial release deployed and healthy on `127.0.0.1:8787`.

Still pending:

- Add the GitHub deployment secrets and push/activate the workflow.
- Create the Cloudflare Access application, set `CF_ACCESS_AUD`, add the tunnel/DNS route.
- Staging deployment workflow.
- Automated tests, E2E, and secret scanning.

Branch protection and environment reviewers must be configured in GitHub; the repository
cannot enforce them. The required PR check is `Lint`.

## 12. Operational runbooks (to write in Phase 1)

- Deploy staging/production.
- Roll back.
- Rotate `ADMIN_API_SECRET`.
- Revoke Cloudflare Access sessions / update the Access policy.
- Revoke an operator.
- Gateway admin API outage.
- Certificate/proxy failure.
- Disk/log growth.
