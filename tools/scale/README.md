# PLS Scale on the Pulse server (branch scale-20261120)

Files for the droplet installer only (not part of the web site; GitHub Pages serves `main`).
- `install.sh` — run as root in the droplet's Web Console (one line below); run again to update.
- `pls-scale-server`, `pls-scale` — Linux x64 builds of PLS Scale v0.14.0 (release pls-scale-v0.14.0-vc24) (source: gundam-farm-note20, branch pls-scale-20261117).
  SHA-256: pls-scale-server 91e1ac2e3904ef4c5dff0762494bf417670d9bc77234cddc60601a00a33ab9aa · pls-scale 24b2359cd54368e56a9c66d0449b1b85f80025cd74b4a3fb5117098654ab9c8a

```
curl -fsSL https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/scale-20261120/tools/scale/install.sh | sh
```
