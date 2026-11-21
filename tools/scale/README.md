# PLS Scale on the Pulse server (branch scale-20261120)

Files for the droplet installer only (not part of the web site; GitHub Pages serves `main`).
- `install.sh` — run as root in the droplet's Web Console (one line below); run again to update.
- `pls-scale-server`, `pls-scale` — Linux x64 builds of PLS Scale v0.13.6 (release pls-scale-v0.13.6-vc22) (source: gundam-farm-note20, branch pls-scale-20261117).
  SHA-256: pls-scale-server 38016a5cbbe6e46d27bca93a34ba0d6d379cec3bd160807b1297cec73f89e4a8 · pls-scale 387365bb855f5861373849af4941092953d303526235ca2daa96c36647739472

```
curl -fsSL https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/scale-20261120/tools/scale/install.sh | sh
```
