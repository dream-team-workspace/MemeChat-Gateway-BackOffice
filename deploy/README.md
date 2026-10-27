# Deployment runbook

## Current server state (2026-10-25)

| Item | Value |
|---|---|
| Host | `139.99.88.23` |
| Admin SSH | `ubuntu@admin.dream-team.works` (Cloudflare Access) |
| Deploy SSH | `deploy@139.99.88.23:22` |
| Deploy key | GitHub Actions public key `github-actions-deploy` |
| Node | `v24.22.1` at `/opt/node` |
| Service | `memechat-backoffice.service` |
| Bind | `127.0.0.1:8787` |
| Release root | `/opt/memechat-backoffice` |
| Env file | `/etc/memechat-backoffice.env` |
| Gateway origin | `https://gateway.dream-team.works` |
| Console | `https://console.dream-team.works` behind Cloudflare Access |

The master release is deployed with systemd and is publicly reachable through Cloudflare
Access. The BFF runs in production mode and calls the main gateway through its public origin.

The workflow is active on `master`; the deployment secrets below are already configured.

## Topology

~~~text
GitHub Actions (master)
  -> npm ci / build / prune
  -> release tarball over SSH
  -> sudo /usr/local/sbin/memechat-backoffice-deploy <sha>
  -> /opt/memechat-backoffice/releases/<sha>
  -> current symlink + systemctl restart
  -> loopback health check

cloudflared
  -> https://console.dream-team.works
  -> Cloudflare Access
  -> http://127.0.0.1:8787

BFF
  -> https://gateway.dream-team.works/internal/admin/*
~~~

Nginx is not used for this service.

## GitHub repository settings

### Secrets

| Name | Value |
|---|---|
| `DEPLOY_SSH_KEY` | Private key matching `github-actions-deploy` (local `~/.ssh/deploy_dreamteam`) |
| `DEPLOY_HOST` | `139.99.88.23` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_PORT` | `22` |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan -p 22 139.99.88.23` |

Optional: configure the `production` environment with required reviewers. Do not put
`ADMIN_API_SECRET` or `CF_ACCESS_AUD` in GitHub; they live only in
`/etc/memechat-backoffice.env`.

After `gh auth login`, the helper below sets all five secrets without printing them:

~~~bash
./deploy/configure-github.sh
~~~

### Trigger behavior

| Event | Action |
|---|---|
| PR to `development`/`master` | Lint only |
| Push to `development` | Clean build only; no artifact upload/cache/deploy |
| Push to `master` | Build, package, SSH deploy, restart, local health check |

## Server bootstrap (already run)

From the repository root:

~~~bash
tar -czf /tmp/backoffice-deploy-files.tgz deploy
scp /tmp/backoffice-deploy-files.tgz ubuntu@admin.dream-team.works:/tmp/
ssh ubuntu@admin.dream-team.works \
  'rm -rf /tmp/backoffice-bootstrap && mkdir /tmp/backoffice-bootstrap && \
   tar -xzf /tmp/backoffice-deploy-files.tgz -C /tmp/backoffice-bootstrap && \
   sudo -n bash /tmp/backoffice-bootstrap/deploy/bootstrap-server.sh'
~~~

The script installs Node 24, the `memechat` user, directories, the systemd unit, the
deployment helper, a sudoers rule allowing `deploy` to run only that helper, and a
placeholder env file. It is idempotent. The workflow does not upload or install the helper;
rerun bootstrap (or install it as root) when the helper itself changes.

## Runtime env

Edit on the server:

~~~bash
sudo install -m 640 -o root -g memechat /dev/null /etc/memechat-backoffice.env
sudo editor /etc/memechat-backoffice.env
~~~

Use [memechat-backoffice.env.example](memechat-backoffice.env.example). Required production
values:

~~~env
NODE_ENV=production
APP_ENV=production
HOST=127.0.0.1
PORT=8787
APP_ORIGIN=https://console.dream-team.works
ADMIN_API_BASE_URL=https://gateway.dream-team.works
ADMIN_API_SECRET=<production gateway BACKOFFICE_API_KEY>
CF_ACCESS_TEAM_DOMAIN=rough-water-d6a6.cloudflareaccess.com
CF_ACCESS_AUD=<Access application AUD>
~~~

The server is in production mode. The gateway key is the 64-hex value in
`/etc/memechat-gateway/backoffice.env`; the BFF must use the same value as
`ADMIN_API_SECRET`.

## Manual deployment / rollback

Current releases:

~~~bash
ssh ubuntu@admin.dream-team.works
sudo -n readlink -f /opt/memechat-backoffice/current
ls -1 /opt/memechat-backoffice/releases
sudo systemctl status memechat-backoffice
sudo journalctl -u memechat-backoffice -n 100 --no-pager
~~~

The helper keeps the previous release and automatically rolls back if the service does not
answer `/api/health` within 30 seconds.

## Main gateway

The console is live-only and connects to the main gateway at
`https://gateway.dream-team.works`:

~~~bash
curl -fsS https://gateway.dream-team.works/healthz
curl -fsS https://gateway.dream-team.works/readyz
sudo systemctl status memechat-gateway
sudo journalctl -u memechat-gateway -n 100 --no-pager
~~~

The gateway is deployed separately by its own master workflow. The BFF uses the production
`BACKOFFICE_API_KEY` from `/etc/memechat-gateway/backoffice.env`; do not use the local
development key.

## Cloudflare Access / public hostname

The console is configured and live:

~~~text
https://console.dream-team.works
  -> Cloudflare Access
  -> http://127.0.0.1:8787
~~~

The Access application is `MemeChat BackOffice`; its AUD is stored in
`/etc/memechat-backoffice.env` as `CF_ACCESS_AUD`. The BFF runs with
`NODE_ENV=production` and `APP_ENV=production`.

Verify from a private browser window:

1. `https://console.dream-team.works` redirects to the Access login.
2. After login, `/cdn-cgi/access/get-identity` returns the operator email.
3. Overview, app clients, users, providers, and operations load live data.
4. `/api/admin/*` without an Access session returns 401/302, never data.

## Important security note

The main gateway is publicly reachable at `https://gateway.dream-team.works`.
`/internal/admin/*` is protected by the 64-hex `BACKOFFICE_API_KEY`; the app API
`/v1/*` is protected by Firebase plus the app-client key. Do not expose the admin key to the
browser. Consider putting `/internal/admin/*` behind a Cloudflare Access service-token policy
or WAF rule if it does not need to be reachable from outside the BFF host.
