#!/usr/bin/env bash
# COMPUTAAA one-shot server setup for a fresh Ubuntu 24.04 VPS.
#
#   sudo bash scripts/setup-server.sh
#
# Safe to run again: every step checks what's already done.
# It will ask you for: an encryption passphrase, your email, your Anthropic API key,
# and three values from Cloudflare (see README step 4). Secrets are typed hidden.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT=/srv/computaaa/vault
DATA=/srv/computaaa/data
ENV_FILE="$APP_DIR/.env"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die()  { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run it with sudo: sudo bash scripts/setup-server.sh"
grep -qi ubuntu /etc/os-release || note "Warning: written for Ubuntu 24.04; other systems may need changes."

# ---------------------------------------------------------------- 1. packages
say "1/8  Installing Docker, encryption and firewall tools"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 gocryptfs ufw unattended-upgrades openssl python3 >/dev/null
systemctl enable --now docker >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true
note "Done. Security updates install automatically."

# ---------------------------------------------------------------- 2. firewall
say "2/8  Firewall: nothing comes in except SSH (the Cloudflare tunnel only goes out)"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw --force enable >/dev/null
note "Done."

# ---------------------------------------------------------------- 3. SSH
say "3/8  SSH: key-only sign-in"
SUDO_HOME="$(getent passwd "${SUDO_USER:-root}" | cut -d: -f6)"
if [ -s "$SUDO_HOME/.ssh/authorized_keys" ] || [ -s /root/.ssh/authorized_keys ]; then
  cat > /etc/ssh/sshd_config.d/99-computaaa.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
  note "Done. Passwords are off; only your SSH key works."
else
  note "Skipped: no SSH key found for ${SUDO_USER:-root}. Add your key first, or you could lock yourself out."
  note "Then run this script again."
fi

# ---------------------------------------------------------------- 4. encrypted folder
say "4/8  Encrypted folder for your passkeys and logins"
mkdir -p "$VAULT" "$DATA"
chmod 700 /srv/computaaa
if [ ! -f "$VAULT/gocryptfs.conf" ]; then
  note "Choose a long passphrase. You'll need it after every reboot. Store it somewhere safe."
  note "gocryptfs will also print a master key: write it down offline. It's the only way back if you forget the passphrase."
  gocryptfs -init "$VAULT"
fi
if ! mountpoint -q "$DATA"; then
  note "Unlock it now:"
  gocryptfs -allow_other "$VAULT" "$DATA"
fi
mkdir -p "$DATA/control" "$DATA/worker-main" "$DATA/worker-jobs"
note "Done. Everything COMPUTAAA saves lives in here, encrypted on disk."

# ---------------------------------------------------------------- 5. settings
say "5/8  Settings (.env)"
[ -f "$ENV_FILE" ] || cp "$APP_DIR/.env.example" "$ENV_FILE"
chmod 600 "$ENV_FILE"

get_env() { python3 - "$ENV_FILE" "$1" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
for line in open(path):
    if line.startswith(key + "="):
        print(line.split("=", 1)[1].rstrip("\n")); break
PY
}
set_env() { python3 - "$ENV_FILE" "$1" "$2" <<'PY'
import sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path).read().splitlines()
out, done = [], False
for line in lines:
    if line.startswith(key + "=") or line.startswith("# " + key + "="):
        if not done:
            out.append(f"{key}={value}"); done = True
        continue
    out.append(line)
if not done:
    out.append(f"{key}={value}")
open(path, "w").write("\n".join(out) + "\n")
PY
}
ask() { # ask KEY "question" [secret]
  local key="$1" q="$2" secret="${3:-}" cur val
  cur="$(get_env "$key")"
  case "$cur" in *example.com*|*yourteam*|*paste-the*) cur="" ;; esac   # template placeholders don't count
  if [ -n "$cur" ]; then note "$key is already set (keeping it)."; return; fi
  if [ -n "$secret" ]; then read -r -s -p "   $q: " val; echo; else read -r -p "   $q: " val; fi
  [ -n "$val" ] || die "$key can't be empty"
  set_env "$key" "$val"
}
for w in MAIN JOBS; do
  [ -n "$(get_env "WORKER_TOKEN_$w")" ] || set_env "WORKER_TOKEN_$w" "$(openssl rand -hex 32)"
done
note "Worker secrets generated."
ask OWNER_EMAIL "Your email (the one Cloudflare Access lets in)"
ask ANTHROPIC_API_KEY "Anthropic API key (typing is hidden)" secret
ask CF_ACCESS_TEAM_DOMAIN "Cloudflare team domain (like yourteam.cloudflareaccess.com)"
ask CF_ACCESS_AUD "Cloudflare Access Application Audience (AUD) tag"
ask CLOUDFLARE_TUNNEL_TOKEN "Cloudflare tunnel token (typing is hidden)" secret
note "Done. Review the rest any time with: sudo nano $ENV_FILE  (ALLOWED_SITES, JOBS_*, NTFY_URL…)"

# ---------------------------------------------------------------- 6. build
say "6/8  Building COMPUTAAA (a few minutes the first time)"
cd "$APP_DIR"
docker compose build -q

# ---------------------------------------------------------------- 7. folder owners
say "7/8  Giving each container its own folder"
CONTROL_UID="$(docker compose run --rm --no-deps -T --entrypoint id control -u | tr -d '\r')"
WORKER_UID="$(docker compose run --rm --no-deps -T --entrypoint id worker-main -u | tr -d '\r')"
chown "$CONTROL_UID" "$DATA/control"
chown "$WORKER_UID" "$DATA/worker-main" "$DATA/worker-jobs"
chmod 700 "$DATA/control" "$DATA/worker-main" "$DATA/worker-jobs"
note "Done (control plane user $CONTROL_UID, workers $WORKER_UID)."

# ---------------------------------------------------------------- 8. start
say "8/8  Starting"
docker compose up -d
sleep 10
docker compose ps --format '   {{.Service}}: {{.State}}'

say "Last step: create your passkey"
note "Open this link within 15 minutes, on your phone:"
docker compose exec -T control node scripts/enroll.js | sed -n 's/^ *\(https:.*\)$/      \1/p'
note "Save the 8 recovery codes it shows you, offline."
note ""
note "After a reboot, unlock and start with:  sudo bash scripts/unlock.sh"
