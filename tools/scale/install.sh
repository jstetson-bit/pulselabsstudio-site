#!/bin/sh
# PLS Scale on the Pulse server (DigitalOcean droplet, Ubuntu). Run as root in the droplet's Web Console; run it again to update.
# (Owner, 2026-11-20: "what about the server im renting … its worth using … and is always up".)
#  - the PLS Scale home server (meeting point): every device calls OUT to it, so it works behind any router, LTE or Starlink
#  - this server also joins as a device and is the relay, and serves the owner page to the owner's own devices
# Next to PLS Relay (PLS Stream); different ports, nothing shared.
set -e
BASE="https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/scale-20261120/tools/scale"
D=/opt/pls-scale; V=/var/lib/pls-scale
mkdir -p "$D" "$V/server" "$V/device" "$V/inbox"
for f in pls-scale-server pls-scale; do
  curl -fsSL "$BASE/$f" -o "$D/$f.new"
  chmod 755 "$D/$f.new"; mv -f "$D/$f.new" "$D/$f"
done
IP=$(curl -fsS --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || hostname -I | awk '{print $1}')

cat > /etc/systemd/system/pls-scale-server.service <<UNIT
[Unit]
Description=PLS Scale home server (meeting point)
After=network-online.target
Wants=network-online.target
[Service]
Environment=PLSSCALE_DATA=$V/server
ExecStart=$D/pls-scale-server serve -data $V/server -listen :8488 -router=false -public $IP:8488 -owner-page-on-network
Restart=always
RestartSec=2
MemoryMax=128M
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/pls-scale.service <<UNIT
[Unit]
Description=PLS Scale device (this server on the private network; the relay)
After=pls-scale-server.service
Wants=pls-scale-server.service
[Service]
Environment=PLSSCALE_DEVICE_DATA=$V/device
Environment=PLSSCALE_INBOX=$V/inbox
ExecStart=$D/pls-scale up
Restart=always
RestartSec=3
MemoryMax=128M
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable pls-scale-server >/dev/null 2>&1
systemctl restart pls-scale-server
sleep 2

export PLSSCALE_DATA=$V/server PLSSCALE_DEVICE_DATA=$V/device
if [ ! -f "$V/device/device.json" ]; then
  LINK=$("$D/pls-scale-server" invite "Pulse Server" | grep -o 'plsscale://[^"]*' | head -1)
  "$D/pls-scale" join "$LINK" -name "Pulse Server" -port 41641 >/dev/null
fi
systemctl enable pls-scale >/dev/null 2>&1
systemctl restart pls-scale
"$D/pls-scale-server" relay "Pulse Server" >/dev/null 2>&1 || true

# firewall: keep what's open (SSH, PLS Relay) and add PLS Scale's two ports + the private network itself
ufw allow 22/tcp >/dev/null
ufw allow 8488/tcp >/dev/null      # devices check in (HTTPS, locked to this server's certificate)
ufw allow 41641/udp >/dev/null     # this server's tunnel (relay)
ufw allow in on plsscale0 >/dev/null
ufw --force enable >/dev/null
sleep 3

if systemctl is-active pls-scale-server >/dev/null && systemctl is-active pls-scale >/dev/null; then
  echo
  echo "PLS SCALE IS UP on $IP  (home server v$("$D/pls-scale-server" version))"
  echo
  # v0.13.6: an owner key only on the first install (no owner device yet). An update made a fresh owner key every run.
  if "$D/pls-scale-server" devices 2>/dev/null | grep -q '"owner": true'; then
    echo "Updated. Your devices, their names and addresses are kept; your phone is still the owner. No new owner key made."
    echo "Need another owner device?  $D/pls-scale-server invite-owner"
  else
    echo "Scan this with PLS Scale on YOUR phone (Join -> Scan). It joins as an owner device:"
    "$D/pls-scale-server" invite-owner
    echo
    echo "Then add everything else from the phone: Owner -> Make a join code."
  fi
  echo "Owner page from the phone or a PC on the network: http://$(python3 -c 'import json;print(json.load(open("'$V'/device/device.json"))["address"])' 2>/dev/null || echo 100.88.0.1):8489"
else
  echo "PLS SCALE FAILED: run  journalctl -u pls-scale-server -u pls-scale -n 30"
fi
