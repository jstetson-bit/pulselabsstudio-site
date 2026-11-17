# Changelog

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
