#!/bin/sh
# Pulse droplet: let the workshop run jobs here (2026-11-22, James: "can we have away to access the droplets from here?").
# Adds a GitHub Actions runner named "pulse-droplet" (labels: droplet, linux) for jstetson-bit/gundam-farm-note20, as a service
# that starts with the droplet. Jobs pushed to the repo's droplet-jobs branch run here; their output shows on GitHub.
# Usage (as root, in the droplet console):  curl -fsSL <this file's raw link> | sh -s YOUR_RUNNER_TOKEN
# The token comes from GitHub: the repo → Settings → Actions → Runners → New self-hosted runner → Linux (the --token value).
set -e
TOKEN="$1"
REPO="jstetson-bit/gundam-farm-note20"
DIR=/opt/pulse-runner
USER_=pulserunner
[ -n "$TOKEN" ] || { echo "Put the runner token after 'sh -s' (GitHub: Settings → Actions → Runners → New self-hosted runner)."; exit 1; }
[ "$(id -u)" = 0 ] || { echo "Run this as root."; exit 1; }

id "$USER_" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USER_"
echo "$USER_ ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/pulserunner && chmod 440 /etc/sudoers.d/pulserunner

VER=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' | head -1)
[ -n "$VER" ] || { echo "Couldn't find the newest runner version (no internet?)."; exit 1; }
mkdir -p "$DIR" && cd "$DIR"
if [ ! -f ./config.sh ]; then
  curl -fsSL -o runner.tgz "https://github.com/actions/runner/releases/download/v$VER/actions-runner-linux-x64-$VER.tar.gz"
  tar xzf runner.tgz && rm -f runner.tgz
fi
./bin/installdependencies.sh >/dev/null 2>&1 || true
chown -R "$USER_:$USER_" "$DIR"
su "$USER_" -c "cd $DIR && ./config.sh --unattended --replace --url https://github.com/$REPO --token $TOKEN --name pulse-droplet --labels droplet,linux --work _work"
./svc.sh install "$USER_" >/dev/null && ./svc.sh start >/dev/null
echo
echo "PULSE DROPLET RUNNER IS UP (runner v$VER, name pulse-droplet, labels droplet + linux)."
echo "The workshop can now run jobs here; you'll see them under the repo's Actions tab."
