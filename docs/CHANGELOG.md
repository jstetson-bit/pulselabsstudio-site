# Changelog

## v0.7.2 — 2026-11-17
- PLS Zip gets its own product page at /pls-zip/ and a card in Products (Windows PC, Android inside PLS Explorer; "Coming soon"
  until it has a price). James: it "needs to be uploaded onto the website as a product that we offer now." The deploy now copies
  the pls-zip folder.

## v0.7.5 — 2026-11-17
- EOD 0.3.2: glass panes (see-through, reflecting, breakable; every part on/off).

## v0.7.4 — 2026-11-17
- EOD 0.3.0/0.3.1: monster generator and weapon generator.

## v0.7.3 — 2026-11-17
- EOD 0.2.2: Vanilla limits check (Off/On) with live counters, warnings and a whole-map scan.

## v0.7.2 — 2026-11-17
- EOD 0.2.1 at /EOD: members can add their own wall/floor textures (saved in the map, exported into WADs); About + Check for updates.

## v0.7.1 — 2026-11-17
- EOD 0.2.0 at /EOD: opens any community map (.wad / idgames .zip / .pk3) and plays it with its own art, the player's own
  IWAD (device only) or the free Freedoom art pack (EOD/res, BSD license, 7.2 MB gzip, loaded on demand and cached).

## v0.7 — 2026-11-17
- EOD · Editor of Doom (preview v0.1.1) added at /EOD (public, no sign-in): web Doom map editor + game, map library,
  forums, accounts, keyboard/mouse/controller mapping. Runs in its Local test mode until it gets Supabase keys
  (EOD/assets/config.js). Lowercase /eod forwards to /EOD. Home page footer links to it.
- Deploy fix: the workflow now also copies `assets/` and the root `.js` files (store-config.js), which the store pages
  (products, cart, account) load but were not being published.

## v0.6 — 2026-11-17
- First real farm run (Snow White, PowerShell 5.1): Keyboard Studio (30 builds of history), PLS File Explorer (7),
  Pulse Meter Android (7), PLS Launcher (1) on the private shelves.
- Vault master key replaced (the old one had been written into a mailbox Order); same sign-ins.
- Product overviews written for those four (what it's for, bullets, description).
- "Where it stands" on every app page: state (farm project directory), last touched (last commit: when + message,
  linked), last delivered (newest build), where the code is (repo + branch), status notes (top of STATUS.md /
  CHANGELOG). Shelf cards show "code touched X ago". New `tools/Watch-Status.ps1`, every 30 minutes from the same task.
- Fixes: publishing an update with no files (overview/pictures only) crashed; dry-run log wording.

## v0.5 — 2026-11-16
- The store: products.html, cart.html, account.html, assets/pls.css, assets/pls-store.js, store-config.js; home page
  links to Products and Account. Opens "soon" until docs/STORE-SETUP.md is done.
- Supabase schema with row-level security (001_store.sql); Paddle webhook edge function + lib.js (signature check,
  idempotent orders, bundle unlocks, refund revokes); Pulse key signer; offline key checkers for Android and Windows;
  key-pair maker.
- Tested: store core (node: forged/tampered/wrong-product keys refused, Paddle signature + replay, bundles); schema on
  real Postgres 16 with Supabase stand-ins (other users' orders/keys/cart invisible, no self-made orders or keys,
  unverified accounts can't use the cart, profile trigger); Windows checker via .NET 8 and Android checker via Java,
  20/20 real keys each; full browser flow with fake Supabase + fake Paddle (sign up, unverified sign-in refused,
  email link verifies, cart follows into the account, Paddle opens with the account id, keys + order appear, cart
  cleared). Not yet tested against the real Supabase or Paddle.

## v0.4 — 2026-11-16
- Build history: every build kept newest-first with its own changelog (from the farm Release notes), date, size,
  download, share and fingerprint; newest 8 per shelf stored on the site, older ones "Archived · farm copy" links.
  First watcher run backfills history from the farm's existing Releases.
- Tickets: "Report a problem" form (build picker, text, pasted log, screenshot pick/paste) writing to the private
  pls-tickets repo; ticket list with status on each app page (New / Being fixed / Fixed in v… / Needs Jason).
- New `tools/Watch-Tickets.ps1` (ticket → seat mailbox, wake only on new tickets, "Fixes T-..." → fixed) and
  `tools/Set-TicketKey.ps1`; `run-hidden.vbs` runs builds then tickets every 2 minutes.
- Tested on Linux/PowerShell 7 + headless Chrome against a fake farm: 3 builds → 2 downloadable + 1 archived, then a
  4th; ticket → mailbox → fixed in v1.24.303 by release notes; browser ticket sent 3 files with the right key;
  history, changelog toggle and ticket status render on a phone-size screen.

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
