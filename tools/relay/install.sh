#!/bin/sh
# PLS Relay installer for a fresh Ubuntu server (DigitalOcean droplet, 2026-11-18). Run once as root in the droplet's console.
set -e
URL="https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/relay-20261118/tools/relay/pls_relay.py"
mkdir -p /opt/pls-relay
curl -fsSL "$URL" -o /opt/pls-relay/pls_relay.py
id plsrelay >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin plsrelay
cat > /etc/systemd/system/pls-relay.service <<'UNIT'
[Unit]
Description=PLS Relay (PLS Stream fallback path)
After=network-online.target
Wants=network-online.target
[Service]
User=plsrelay
ExecStart=/usr/bin/python3 /opt/pls-relay/pls_relay.py
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
MemoryMax=128M
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now pls-relay
# firewall: SSH, relay UDP, status TCP; everything else closed
ufw allow 22/tcp >/dev/null
ufw allow 41400/udp >/dev/null
ufw allow 41401/tcp >/dev/null
ufw --force enable >/dev/null
# security updates install themselves
apt-get -qq update >/dev/null 2>&1 && DEBIAN_FRONTEND=noninteractive apt-get -qq install -y unattended-upgrades >/dev/null 2>&1 || true
sleep 1
systemctl is-active pls-relay >/dev/null && echo "PLS RELAY IS UP" || echo "PLS RELAY FAILED: run  journalctl -u pls-relay -n 20"
