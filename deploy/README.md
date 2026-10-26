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
| Gateway origin | `memechat-gateway.service` on `127.0.0.1:18081` |

The initial release is installed and healthy on loopback. It is **not publicly exposed yet**:
`console.dream-team.works` has no DNS record, no Cloudflare Access application, and the
running service still uses the safe loopback development identity.

The workflow is present in the working tree but **not active on GitHub** until it is committed,
pushed, and the repository secrets below are added.

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
  -> http://127.0.0.1:18081/internal/admin/*
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
ADMIN_API_BASE_URL=http://127.0.0.1:18081
ADMIN_API_SECRET=<gateway admin secret>
CF_ACCESS_TEAM_DOMAIN=rough-water-d6a6.cloudflareaccess.com
CF_ACCESS_AUD=<Access application AUD>
~~~

The current server install intentionally uses `NODE_ENV=development` so it can be tested
on loopback without Access. **Do not expose it through the tunnel until it is switched to
production and the Access AUD is configured.**

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

## Gateway sidecar

The console is live-only. The current server also runs the gateway admin build on loopback:

~~~bash
sudo systemctl status memechat-gateway
curl http://127.0.0.1:18081/readyz
sudo journalctl -u memechat-gateway -n 100 --no-pager
~~~

This gateway service was installed manually from the current gateway working tree. It is not
part of the backoffice master workflow. Long term, give the gateway its own CI/deployment.

## Cloudflare Access / public hostname

The existing named tunnel has a usable `cert.pem` and credentials on the server.

1. Create the Access application in Zero Trust:
   - Type: Self-hosted
   - Name: `MemeChat BackOffice`
   - Hostname: `console.dream-team.works`
   - Policy: allow the same operator group/email domain as the SSH application.
2. Copy the application **AUD** into `/etc/memechat-backoffice.env`.
3. Add the tunnel ingress. For the named freesky tunnel, edit
   `/etc/cloudflared/freesky.yml` and add, before the catch-all:

~~~yaml
  - hostname: console.dream-team.works
    service: http://127.0.0.1:8787
~~~

4. Create the DNS route:

~~~bash
sudo cloudflared tunnel route dns <tunnel-name-or-id> console.dream-team.works
sudo systemctl restart cloudflared-freesky
~~~

Alternatively add the public hostname to the token-managed `cloudflared.service` tunnel in
the Zero Trust dashboard.

5. Switch the BFF to production and restart:

~~~bash
sudo sed -i 's/^NODE_ENV=.*/NODE_ENV=production/; s/^APP_ENV=.*/APP_ENV=production/' \
  /etc/memechat-backoffice.env
sudo systemctl restart memechat-backoffice
~~~

6. Verify:
   - `https://console.dream-team.works` redirects to Access login
   - after login, Overview shows real capabilities/models
   - `/api/health` is healthy from loopback
   - browser console has no errors

## Important security note

Until step 5 is complete, the BFF is in development auth mode and must remain bound to
`127.0.0.1`. Do not add the Cloudflare hostname before Access is configured.
