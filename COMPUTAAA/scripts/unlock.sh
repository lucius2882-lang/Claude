#!/usr/bin/env bash
# After a reboot: unlock the encrypted folder, then start COMPUTAAA.
#   sudo bash scripts/unlock.sh
# Until you run this, the containers refuse to start (they won't write to an unencrypted folder).
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "run it with sudo: sudo bash scripts/unlock.sh" >&2; exit 1; }

if mountpoint -q /srv/computaaa/data; then
  echo "Already unlocked."
else
  gocryptfs -allow_other /srv/computaaa/vault /srv/computaaa/data
fi
cd "$APP_DIR"
docker compose up -d
sleep 8
docker compose ps --format '  {{.Service}}: {{.State}}'
echo "COMPUTAAA is running. Sign in from your owner panel."
