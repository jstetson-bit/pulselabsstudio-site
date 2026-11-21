# PLS Scale on the Pulse server (branch scale-20261120)

Files for the droplet installer only (not part of the web site; GitHub Pages serves `main`).
- `install.sh` — run as root in the droplet's Web Console (one line below); run again to update.
- `pls-scale-server`, `pls-scale` — Linux x64 builds of PLS Scale v0.13.0 (source: gundam-farm-note20, branch pls-scale-20261117).
  SHA-256: pls-scale-server ef0ecb38cb6cb5e89bc955628bf0320155d751175b1a28a5fa1e5b00b3eee669 · pls-scale 53ff8076d0723f2bac2ac30f10d5adf1ad955eb57fa2cc872a1a22032d7cd5c7

```
curl -fsSL https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/scale-20261120/tools/scale/install.sh | sh
```
