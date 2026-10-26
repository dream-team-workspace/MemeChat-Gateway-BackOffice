#!/usr/bin/env bash
# One-time bootstrap for the BackOffice host. Run as root from the repo:
#   sudo bash deploy/bootstrap-server.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER=memechat
APP_ROOT=/opt/memechat-backoffice
ENV_FILE=/etc/memechat-backoffice.env
NODE_LINK=/opt/node
NODE_MAJOR=24

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl xz-utils >/dev/null

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home "${APP_ROOT}" --shell /usr/sbin/nologin "${APP_USER}"
fi

install -d -o root -g root -m 755 "${APP_ROOT}" "${APP_ROOT}/releases"

if [ ! -x "${NODE_LINK}/bin/node" ] || [ "$("${NODE_LINK}/bin/node" -p 'process.versions.node.split(".")[0]')" != "${NODE_MAJOR}" ]; then
  case "$(uname -m)" in
    x86_64) NODE_ARCH=linux-x64 ;;
    aarch64|arm64) NODE_ARCH=linux-arm64 ;;
    *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  NODE_FILE="$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" | awk -v suffix="${NODE_ARCH}.tar.xz" '$2 ~ suffix {print $2; exit}')"
  if [ -z "${NODE_FILE}" ]; then
    echo "could not resolve Node ${NODE_MAJOR} tarball" >&2
    exit 1
  fi
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "${TMP_DIR}"' EXIT
  curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/${NODE_FILE}" -o "${TMP_DIR}/${NODE_FILE}"
  tar -xJf "${TMP_DIR}/${NODE_FILE}" -C /opt
  NODE_DIR="/opt/${NODE_FILE%.tar.xz}"
  ln -sfn "${NODE_DIR}" "${NODE_LINK}"
fi

ln -sfn "${NODE_LINK}/bin/node" /usr/local/bin/node
ln -sfn "${NODE_LINK}/bin/npm" /usr/local/bin/npm

install -m 755 -o root -g root "${SCRIPT_DIR}/memechat-backoffice-deploy.sh" /usr/local/sbin/memechat-backoffice-deploy
install -m 644 -o root -g root "${SCRIPT_DIR}/memechat-backoffice.service" /etc/systemd/system/memechat-backoffice.service

if id -u deploy >/dev/null 2>&1; then
  SUDOERS_FILE=/etc/sudoers.d/memechat-backoffice-deploy
  printf '%s\n' 'deploy ALL=(root) NOPASSWD: /usr/local/sbin/memechat-backoffice-deploy' >"${SUDOERS_FILE}.tmp"
  install -m 440 -o root -g root "${SUDOERS_FILE}.tmp" "${SUDOERS_FILE}"
  rm -f "${SUDOERS_FILE}.tmp"
  visudo -cf "${SUDOERS_FILE}" >/dev/null
  echo "granted deploy user access to memechat-backoffice-deploy"
else
  echo "warning: deploy user not found; CI SSH user must be created separately" >&2
fi

if [ ! -f "${ENV_FILE}" ]; then
  install -m 640 -o root -g "${APP_USER}" /dev/null "${ENV_FILE}"
  cat >"${ENV_FILE}" <<'ENV'
NODE_ENV=production
APP_ENV=production
HOST=127.0.0.1
PORT=8787
APP_ORIGIN=https://console.dream-team.works
ADMIN_API_BASE_URL=http://127.0.0.1:18081
# Must equal the gateway's 64-hex BACKOFFICE_API_KEY.
ADMIN_API_SECRET=CHANGE_ME
CF_ACCESS_TEAM_DOMAIN=rough-water-d6a6.cloudflareaccess.com
CF_ACCESS_AUD=CHANGE_ME
APP_VERSION=0.1.0
ENV
  echo "created ${ENV_FILE}; fill in ADMIN_API_SECRET, ADMIN_API_BASE_URL, CF_ACCESS_AUD"
else
  chown root:"${APP_USER}" "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
fi

systemctl daemon-reload
systemctl enable memechat-backoffice >/dev/null
echo "bootstrap complete"
echo "node: $("${NODE_LINK}/bin/node" --version)"
echo "next: edit ${ENV_FILE}, then deploy a release via GitHub master or manually."
