# PLS Scale on the Pulse server (branch scale-20261120)

Files for the droplet installer only (not part of the web site; GitHub Pages serves `main`).
- `install.sh` — run as root in the droplet's Web Console (one line below); run again to update.
- `pls-scale-server`, `pls-scale` — Linux x64 builds of PLS Scale v0.14.1 (release pls-scale-v0.14.1-vc25) (source: gundam-farm-note20, branch pls-scale-20261117).
  SHA-256: pls-scale-server 8eda61d1a44d48e13c7328992532bc6b5128c2d0d51c9d5f74f1013d3b68e098 · pls-scale a00b1642fcff129982da3a7c7fb3a308654067e9a87581f9435ed0ba2fee493c

```
curl -fsSL https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/scale-20261120/tools/scale/install.sh | sh
```
