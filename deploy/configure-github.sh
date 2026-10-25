#!/usr/bin/env bash
# Configure the GitHub Actions deployment secrets for this repository.
# Requires: gh auth login (repo admin), ssh key at ~/.ssh/deploy_dreamteam.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
KEY="${DEPLOY_SSH_KEY_PATH:-$HOME/.ssh/deploy_dreamteam}"
HOST="${DEPLOY_HOST:-139.99.88.23}"
USER="${DEPLOY_USER:-deploy}"
PORT="${DEPLOY_PORT:-22}"

if [ ! -f "${KEY}" ]; then
  echo "missing deploy key: ${KEY}" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "run: gh auth login" >&2
  exit 1
fi

gh secret set DEPLOY_SSH_KEY --repo "${REPO}" < "${KEY}"
gh secret set DEPLOY_HOST --repo "${REPO}" --body "${HOST}"
gh secret set DEPLOY_USER --repo "${REPO}" --body "${USER}"
gh secret set DEPLOY_PORT --repo "${REPO}" --body "${PORT}"
ssh-keyscan -p "${PORT}" "${HOST}" 2>/dev/null \
  | gh secret set DEPLOY_KNOWN_HOSTS --repo "${REPO}"

echo "configured deployment secrets for ${REPO}"
