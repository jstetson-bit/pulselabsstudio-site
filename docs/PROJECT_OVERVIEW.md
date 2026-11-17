# pulselabsstudio.com — Project Overview

## Purpose
Public home of Pulse Labs Studio (Pulse National LLC). Lists every finished Pulse Labs app as a
"jump card" on the Downloads page, with direct downloads. Later: user accounts, forums, profiles.

## Who it's for
PRIVATE. The downloads page is for Jason and the people he hands a name + password to (testers like
Katy). The public home page only has a small "Sign in" link in the footer. The page is marked noindex.

## How the lock works (v0.2)
- Everything behind the sign-in is encrypted: the product list, the pictures and every build file.
  Without a name + password, a visitor sees only a sign-in box; the files on the server are noise.
- One master key (64 random bytes) encrypts everything. It lives ONLY on farm machines
  (default `C:\PulseLabs\vault.key`) and never goes in any repo.
- Each person's password (PBKDF2-SHA256, 600,000 rounds, own salt) unlocks a copy of the master key.
  Names are stored only as fingerprints, so even the user list doesn't show who's on it.
- Format: "PLS1" + IV + AES-256-CBC + HMAC-SHA256. The check runs before decrypting, so tampered or
  corrupted files are refused. Unlocking happens in the visitor's browser (WebCrypto); no server.
- Same code both ends: `tools/PlsVault.ps1` (farm) and the script in `downloads.html` (browser).

## Hosting
- GitHub Pages deployed by `.github/workflows/pages.yml` (Pages source must be "GitHub Actions").
- Encrypted builds are stored as assets of a single GitHub Release named `vault`, random file names.
  The workflow copies them into the site at `/v/` on every deploy. (GitHub's own release download links
  can't be read by a web page — no CORS — so they must be served from the site itself.) Only the newest
  build per shelf is kept; the old one is deleted from the release on publish.
- Custom domain `pulselabsstudio.com` (CNAME).

## Shelves (the jump cards on the landing screen)
- Pulse Labs PC — `windows` (.exe .msi .msix .zip)
- Pulse Labs Droid — `android` (.apk .aab)
- Chrome Extensions — `chrome` (.crx, or .zip with `-Platform chrome`)
An app with both a phone and PC build (PLS PDF) shows on both shelves; its page offers both downloads.

## Automatic publishing (v0.3) — the farm back door
`tools/Watch-Builds.ps1` runs every 2 minutes on a farm machine (scheduled task "Pulse Labs Site Watcher",
installed by `tools/Install-Watcher.ps1`, started hidden through `run-hidden.vbs`). Each run:
1. Lists every `jstetson-bit` repo and its Releases (a Release = built and passed the in-house checks, per
   the farm delivery rule). Only Releases newer than the last run are opened (state in
   `C:\PulseLabs\watcher-state.json`, local only).
2. Skips drafts, anything marked FAIL / "checks: fail", source/art/asset zips, files over 1.5 GB.
3. Sorts files by name: `Name-vX.Y.Z...` gives product + version; .apk → Droid, .exe/.msi or zip with
   -PC/windows → PC, .crx or zip with chrome/extension → Chrome. Newest per product per shelf wins.
4. Picks up extras attached to the same Release: `pls-listing.json` (name, purpose, bullets, description,
   shots with captions, icon), `<Name>-shot-<n>-<caption>.png`, `<Name>-icon.png`.
5. Encrypts and publishes in one push; deletes the replaced build from the vault. Quiet when nothing is new.
6. On error: logs to `C:\PulseLabs\logs\watcher.log` AND puts a red "Farm watcher problem" bar on the
   page after sign-in (once per distinct error), cleared automatically on the next good run.
APK signer is read with apksigner when the SDK is present: cards show "Test build" (debug) or "Release-signed".

## Every build, kept (v0.4)
Each product keeps its whole build history, newest first, per shelf. Each entry: version, release date (tap → that
build's own changelog = the farm Release's notes), size, Download + Share, fingerprint. The newest
`PLS_KEEP_PER_SHELF` (default 8) per shelf are stored on the site; older ones become "Archived · farm copy" entries
that link to their GitHub Release on the farm repo (nothing is ever deleted there). The watcher's first run backfills
history from the last 30 Releases of every repo.

## Tickets (v0.4)
- "Report a problem" on every app page: which build, what happened, pasted log, screenshot (pick or paste).
- Saved straight from the browser into the private repo `jstetson-bit/pls-tickets` as
  `tickets/<T-id>/{ticket.json, log.txt, screenshot.png}` using a fine-grained token that can only touch that repo.
  The token lives inside the encrypted product list (`tools/Set-TicketKey.ps1`), so only signed-in browsers have it.
  Without the token the form falls back to an email to support@pulselabsstudio.com.
- `tools/Watch-Tickets.ps1` (same 2-minute task, token-free): new ticket → mailbox ticket on the farm repo's
  `orders` branch (the seat's poll) → status "Being fixed"; runs `C:\PulseLabs\wake-seat.cmd` ONLY when there was a
  new ticket. A seat sets "Needs Jason" with `tickets/<id>/status.json`. A Release whose notes say "Fixes T-..." marks
  the ticket "Fixed in v<version>" automatically. `index.json` in the tickets repo is what the page shows.

## Share links (v0.3)
Every stored file has its own random key (kept inside the encrypted list). Share makes
`share.html#<file>.<key>.<name>.<filename>.<size>`: opens that ONE build without signing in, nothing else.
The key sits after the # so it never reaches any server; the page wipes it from the address bar on open.
Not truly one-time (a static site can't count uses). It dies when that build leaves the site's downloadable window
(becomes Archived).

## Farm tools (admin PowerShell, need git + gh signed in)
- `tools/Vault-User.ps1 -Init | -Add -Name X | -Remove -Name X | -List`
- `tools/Publish-ToSite.ps1 -Files <...> [-Name -Purpose -Bullets -Description -Icon -Screenshots -Captions -Notes -Platform -Id -Version -DryRun]` (by hand; normally the watcher does it)
- `tools/Watch-Builds.ps1 [-DryRun]`, `tools/Install-Watcher.ps1`
- Sign-ins (2026-11-16): ElFuego, KatieCakes (KatyCakes also accepted). Names ignore case, spaces, symbols.
- Private vault is for testing, so debug-signed bench builds ARE published (labeled Test build).

## Roadmap
1. ✅ v0.1 public downloads page (replaced)
2. ✅ v0.2 private, encrypted vault with sign-in and three shelves
3. ✅ v0.3 automatic farm watcher, per-file keys, share links, at-a-glance cards, full product pages
4. QUEUED: public `/products` catalog (pulselabsstudio.com/products): living showcase of every product,
   detailed descriptions, every screen, NO download links; feeds SEO and later direct sales (site price
   cheaper than Play / bundles). Needs: public (unencrypted) listing + pictures per product, opt-in per
   product so unreleased work stays private; payment processor decision; signing-key plan (a direct-sale
   APK and a Play-installed copy can't update each other unless signed with the same key).
5. QUEUED: forums / profiles — need a real back end (Supabase recommended).
6. Swap shelf art for final art if wanted.

## Limits to know
- Removing a person stops them signing in on any new visit; someone who already copied the master key
  out of their browser could still read files until the key is rotated (re-run -Init on a new vault and
  republish). For family/testers this is fine.
- Files are unlocked in memory: fine for apps up to a few hundred MB; 1.5 GB cap in the script.

## House rules applied
Ghost manual + invert in the header; confirm = green check; back = red undo arrow; Cancel-free;
US spelling; white text; returns to where you left off; no frameworks, tiny page.
