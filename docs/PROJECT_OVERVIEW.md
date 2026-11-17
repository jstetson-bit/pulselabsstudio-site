# pulselabsstudio.com — Project Overview

## Purpose
Public home of Pulse Labs Studio (Pulse National LLC). Lists every finished Pulse Labs app as a
"jump card" on the Downloads page, with direct downloads. Later: user accounts, forums, profiles.

## How it's hosted
- GitHub Pages from this repo's `main` branch, custom domain `pulselabsstudio.com` (CNAME file).
- Pages is static: HTML/CSS/JS only. Pictures live in `media/<id>/`.
- Big files (APK/exe/zip) do NOT go in the repo (Pages caps a site at 1 GB). They go in
  **GitHub Releases** on this repo (2 GB per file), tagged `<id>-v<version>`.

## The farm back door
`tools/Publish-ToSite.ps1` runs on any farm machine (admin PowerShell, needs git + gh logged in):
uploads the build files to a Release, computes size + SHA-256, copies icon/screenshots,
updates `products.json`, commits and pushes. Pages republishes in ~1 minute. No Claude, no tokens.
Safety net: refuses debug-signed APKs (house signing rule) unless `-AllowDebugSigned`.

## products.json shape
`{ updated, products: [ { id, name, tagline, description, icon, screenshots[], downloads: [
  { platform: android|windows, version, file, size, sha256, buildDate, releaseDate, url, notes } ] } ] }`
Newest download per platform is shown on the card; older ones are kept as history.

## Roadmap
1. ✅ Downloads page with jump cards + publish script (v0.1)
2. Accounts (sign up / sign in) — needs a backend; GitHub Pages can't store users. Plan: Supabase
   (free tier: login + database) called from the static pages. Pending owner decision.
3. Forums, profiles, gated downloads (if wanted) on the same backend.

## House rules applied
Ghost "i" manual button + invert button on every page; confirm = green check; back/cancel = red undo
arrow; US spelling; white text; page returns to where you left it; lightweight (no frameworks).
