#!/usr/bin/env bash
# Root-only deployment helper. Installs an immutable release uploaded to /tmp,
# atomically switches the current symlink, restarts the service, and rolls back
# when the local health check fails.
#
# Invoked by GitHub Actions:
#   sudo -n /usr/local/sbin/memechat-backoffice-deploy <sha>
set -euo pipefail

SHA="${1:-}"
if [[ ! "${SHA}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "usage: $0 <release-id>" >&2
  exit 2
fi

ROOT=/opt/memechat-backoffice
RELEASE="${ROOT}/releases/${SHA}"
ARCHIVE="/tmp/memechat-backoffice-${SHA}.tar.gz"
ENV_FILE=/etc/memechat-backoffice.env
SERVICE=memechat-backoffice

if [ ! -f "${ARCHIVE}" ]; then
  echo "missing release archive: ${ARCHIVE}" >&2
  exit 1
fi
if [ ! -f "${ENV_FILE}" ]; then
  echo "missing environment file: ${ENV_FILE}" >&2
  exit 1
fi

install -d -o root -g root -m 755 "${ROOT}" "${ROOT}/releases"
install -d -o memechat -g memechat -m 755 "${RELEASE}"
tar -xzf "${ARCHIVE}" --no-same-owner -C "${RELEASE}"
chown -R memechat:memechat "${RELEASE}"

if [ ! -f "${RELEASE}/dist/index.html" ] || [ ! -f "${RELEASE}/dist-server/server/src/index.js" ]; then
  echo "release is incomplete" >&2
  rm -rf "${RELEASE}"
  exit 1
fi

PREVIOUS=""
if [ -L "${ROOT}/current" ]; then
  PREVIOUS="$(readlink -f "${ROOT}/current")"
fi

rollback() {
  echo "deploy failed; rolling back" >&2
  if [ -n "${PREVIOUS}" ] && [ -d "${PREVIOUS}" ]; then
    ln -sfn "${PREVIOUS}" "${ROOT}/.current-rollback"
    mv -Tf "${ROOT}/.current-rollback" "${ROOT}/current"
    systemctl restart "${SERVICE}" || true
  fi
  exit 1
}

ln -sfn "${RELEASE}" "${ROOT}/.current-next"
mv -Tf "${ROOT}/.current-next" "${ROOT}/current"

systemctl daemon-reload
systemctl enable "${SERVICE}" >/dev/null
systemctl restart "${SERVICE}"

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:8787/api/health >/tmp/memechat-backoffice-health.json 2>/dev/null \
    && grep -q '"status":"ok"' /tmp/memechat-backoffice-health.json; then
    healthy=1
    break
  fi
  sleep 1
done

if [ "${healthy}" -ne 1 ]; then
  systemctl status "${SERVICE}" --no-pager -l >&2 || true
  journalctl -u "${SERVICE}" -n 60 --no-pager >&2 || true
  rollback
fi

cat /tmp/memechat-backoffice-health.json
rm -f "${ARCHIVE}" "${ARCHIVE}.sha256"

# Keep the five newest releases.
mapfile -t OLD < <(find "${ROOT}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk 'NR>5 {print $2}')
for dir in "${OLD[@]:-}"; do
  [ -n "${dir}" ] && rm -rf "${dir}"
done

echo "deployed ${SHA}"
