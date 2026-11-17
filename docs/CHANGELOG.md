# Changelog

## v0.3 — 2026-11-16
- Automatic: `Watch-Builds.ps1` + `Install-Watcher.ps1` + `run-hidden.vbs`: farm Releases → vault every 2 min.
- Shared publish engine `PlsSite.ps1`; `Publish-ToSite.ps1` now a thin by-hand wrapper.
- Every stored file has its own key; product list format v2 (purpose, bullets, captioned shots, signer,
  source release). Share links + `share.html` (no sign-in, one build only, key never sent to a server).
- Shelf cards show purpose, system, Test build/Release badge, version, dates, size, plus Download and Share.
- Product page: name, what it's for, system at the top; bullets; "What it looks like" captioned screens;
  per-platform download + share; what changed; fingerprints and source release.
- Red "Farm watcher problem" bar when the farm can't publish.
- Sign-in names ignore spaces/case/symbols ("El Fuego" = "ElFuego"). Min password 8.
- Real vault created: sign-ins ElFuego, KatieCakes, KatyCakes.
- Tested on Linux, PowerShell 7 + headless Chrome (phone size) against a fake farm of 3 repos: FAIL release and
  source zip skipped; second run silent; newer build replaced older and old file retired; download and share
  link byte-identical to the source; "katy cakes" sign-in works. Not yet run on Windows PowerShell 5.1.

## v0.2 — 2026-11-16
- Downloads are now PRIVATE and ENCRYPTED. Sign-in box (name + password, green check) is the first
  thing anyone sees; nothing is listed until it unlocks. Sign-out button (⏻) in the header.
- Landing screen = three jump cards: Pulse Labs PC (monitor art), Pulse Labs Droid (Fold-style phone
  opened at an angle with our own robot in the glass), Chrome Extensions (puzzle piece). Each shows
  its app count; tap → that shelf's app cards → app page with downloads. Red undo arrow goes back.
- Downloads are decrypted and fingerprint-checked in the browser before saving with the real file name.
- New farm tools: PlsVault.ps1 (crypto), Vault-User.ps1 (set up vault, add/remove people),
  Publish-ToSite.ps1 rewritten to encrypt and upload to the `vault` release, auto-pick the shelf,
  keep only the newest build per shelf.
- New deploy workflow (.github/workflows/pages.yml) that serves the encrypted files from the site.
- Removed public products.json and the big home-page Downloads button (footer "Sign in" link instead).
- Tested end-to-end on Linux with PowerShell 7 + headless Chrome (phone size): wrong password refused,
  right one unlocks, downloaded APK byte-identical to the original. Not yet run on Windows PowerShell 5.1.

## v0.1 — 2026-11-16
- Added `downloads.html`: jump-card grid (screenshot, icon, name, Android/PC badges, short description,
  version, build date, release date, size). Tap a card → it jumps open to the full page: hero
  screenshot, download buttons per platform (file name + size), description, screenshot strip,
  what changed, SHA-256 fingerprints. Back arrow / phone back button closes it. Cards are deep-linkable
  (`downloads.html#pls-pdf`). Filter chips All / Android / PC. Remembers filter + scroll.
- Ghost "i" manual and invert button in the header.
- Added `products.json` (empty — fills as builds are published).
- Added `tools/Publish-ToSite.ps1` (farm → Releases → card), with debug-signer refusal and 2 GB check.
- Home page: Downloads button.
- Queued: accounts/forums (needs backend decision).
