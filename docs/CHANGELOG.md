# Changelog

## v0.7.41 — 2026-11-22
- EOD 0.8.21: the Carbine shoulders to the center to fire and drops back to its carry pose.

## v0.7.40 — 2026-11-22
- EOD 0.8.20: painted closing frame for the Coach Gun.

## v0.7.39 — 2026-11-22
- EOD 0.8.19: the Coach Gun's full painted reload (open, shells out, load, close).

## v0.7.38 — 2026-11-22
- EOD 0.8.18: final Coach Gun firing frame; Carbine flash alternates two painted stars.

## v0.7.37 — 2026-11-22
- EOD 0.8.17: Coach Gun recoil frame and rising gun smoke.

## v0.7.36 — 2026-11-22
- EOD 0.8.16: painted Coach Gun firing frame; painted muzzle star on the Carbine.

## v0.7.35 — 2026-11-22
- EOD 0.8.15: painted Coach Gun art on the Sawed-Off, new painted Carbine with a 30-round magazine.

## v0.7.34 — 2026-11-22
- EOD 0.8.14: new demo level UAC Corridor (MAP08); weapon cutter tool.

## v0.7.33 — 2026-11-22
- EOD 0.8.13: shots follow the crosshair when looking up/down; puffs at the real impact height.

## v0.7.32 — 2026-11-22
- EOD 0.8.12: crash guard (safe mode after a tab crash) and glass cracks sent to render cores only when they change.

## v0.7.31 — 2026-11-22
- EOD 0.8.11: gunfire/fireball/blast lighting; the water plant lights trap shows a message.

## v0.7.30 — 2026-11-22
- EOD 0.8.10: monster infighting; floor junk under the camera no longer flickers across the screen.

## v0.7.29 — 2026-11-22
- EOD 0.8.9: bulletproof glass announces itself; glass demo names its panes.

## v0.7.28 — 2026-11-22
- EOD 0.8.8: Kev's Water Plant hall back to its original layout; Baron still sealed in the pipe.

## v0.7.27 — 2026-11-22
- EOD 0.8.7: Kev's Water Plant rework (Baron sealed in the pipe, stairs back up, east catwalk stairs, cover pillars).

## v0.7.26 — 2026-11-22
- EOD 0.8.6: boss health bar (The Clog in Kev's Water Plant).

## v0.7.25 — 2026-11-22
- EOD 0.8.5: animated break-open reload with ejecting shells on the Sawed-Off.

## v0.7.24 — 2026-11-22
- EOD 0.8.4: in-game Menu (Esc, pauses) with volume sliders.

## v0.7.23 — 2026-11-22
- EOD 0.8.3: the Sawed-Off (both barrels, close-range power, reload every blast).

## v0.7.22 — 2026-11-22
- EOD 0.8.2: bullets aim up/down at monsters; monsters partly behind ledges can be hit.

## v0.7.21 — 2026-11-22
- EOD 0.8.1: status bar cleanup (gun name, full ammo words, KEYS), kills/items in the top bar, face art order sheet.

## v0.7.20 — 2026-11-22
- EOD 0.8.0: multi-core 3D view, Classic/Modern look with a sharp status bar, death-screen fix, Restart button.

## v0.7.19 — 2026-11-22
- EOD 0.7.3: 3D view up to 2.3× faster at high detail.

## v0.7.18 — 2026-11-22
- EOD 0.7.2: Auto picture detail up to Native 4K, in-game Detail button.

## v0.7.17 — 2026-11-22
- EOD 0.7.1: Kev's Water Plant entrance door opens fully.

## v0.7.25 — 2026-11-21 — status watcher fixed on Windows PowerShell 5.1; privacy pages always ship
- The status watcher's "latest commit" lookup used a jq filter with quotes inside; Windows PowerShell 5.1 strips those when it
  calls another program, so every run failed ("failed to parse jq expression") once Snow White ran the current copy. It now reads
  the commit as JSON inside PowerShell. No other watcher command has the same pattern.
- Behind that error sat a second one: with "stop on any error", Windows PowerShell 5.1 treated GitHub's normal "not found"
  (a status file that isn't at the first place looked) as fatal. The status watcher's GitHub lookups now treat it as an answer.
- The deploy ships any product folder that holds a privacy page (Pulse 64's and PlsMark's were "page not found").

## v0.7.24 — 2026-11-21 — clean public site (owner)
- Owner: no outside product names anywhere, including in the code and the builds.
- Three in-house tools are off the public site: their cards and folders moved to the private farm repo (nothing lost).
- Editor of Doom: removed a leftover hook for one host app's download feature, and renamed the demo monsters' behavior label.
- Deploy no longer publishes any `docs/` folder (internal design history).

## v0.7.23 — 2026-11-21 — store bundles don't break the watcher
- The store weekend puts an unsigned Play bundle (.aab) beside each APK in a Release (first: PLS Clock HUD v2.17.39).
  The watcher counted .aab as an Android download and its APK check failed ("Missing AndroidManifest.xml").
- Fix: .aab files are skipped. They are for Google Play, not for installing from the downloads page. APKs post as before.

## v0.7.22 — 2026-11-20 — new builds reach the site within minutes again (owner)
- Owner: "It should be immediate the second they're built… There's easily 20 different versions in the last hour."
- Cause: every farm update started three deploys. The good one, from the push, was cancelled by two extra runs that
  the vault release's "edited" event started from the old `vault` tag. Those runs then failed, because the Pages
  environment only deploys main. So most farm updates since this morning never went live. The site only caught up
  when an unrelated push (a "where it stands" status update) deployed.
- Fix: the deploy runs on pushes to main only, in its own lane (`site-deploy-main`). The old tag's runs read the
  tag's copy of the file, so they still start, but they can no longer cancel the real deploy. The watcher uploads
  files before it pushes, so nothing is lost.

## v0.7.21 — 2026-11-19 — proof pages live for 11 products (owner)
- HQ picture check of every proof PR (338 pictures: text read off every screen, every sheet looked at). Covered two spots: a real person's name and home town on one EOD screen, and the retired $9.99 price on one PLS PDF screen.
- Merged: Keyboard Studio, PLS Authenticator, PulseMark, PLS Zip, EOD, PLS PDF, PLS Launcher, Pulse Meds, Pulse Dark, Clock HUD (now 17 of 18), PLS File Explorer.
- Two in-house tools held for the owner.
- Products: every card with a page links to it with "See every feature, with proofs (N of M shown)"; new PLS File Explorer card.

## v0.7.20 — 2026-11-19 — product pages with proofs (owner)
- New shared `assets/proofs.js`: every product page shows Overview · What it does · Proofs · Demo from its own `proofs.json`. Each capability gets real bench pictures/clips stamped with version and capture date; one with no proof yet says "Proof coming" so gaps stay visible.
- First page: `/pls-clock-hud/` (18 capabilities, 6 proven with Release pictures and the v2.17.0 hologram clip). Pictures that show saved home cities were left out on purpose.
- Products: PLS Clock HUD card, linking to its page.
- Deploy: any folder with a `proofs.json` now ships automatically (the deploy only copied folders it named, so /pls-clock-hud/ wasn't going out).

## v0.7.19 — 2026-11-19
- Owner: "I don't want my downloads, once I've logged in … to log me out … I don't have to keep typing that shit … Once I'm in, I
  don't need to re-sign in." Sign-in now stays on that device until **Sign out** (⏻) is pressed: the unlock is kept in the
  browser's local storage instead of per-tab session storage (which forgot it whenever the tab or browser closed). Applies to every
  sign-in (ElFuego, KatieCakes). Sign out clears it. If the vault's lock is ever changed, the page asks once more.

## v0.7.18 — 2026-11-19
- Fix: the repo held both `EOD/` and a lowercase `eod/index.html` (the /eod redirect). Windows treats those as the same folder, so
  every Windows clone (the farm's site watcher) broke on pull from 2026-11-18 ~9:44 PM and the downloads page stopped updating for
  ~16 hours. The lowercase redirect is now generated at deploy time in `pages.yml` instead of stored in the repo; /eod still works.
  Rule for every lane: no two paths in this repo may differ only by capital letters.

## v0.7.17 — 2026-11-19
- Owner: "These need to say last updated with the time and the date stamp to the second … within the last 5 minutes … just now … within the last hour, 1 hour ago." Every time on the downloads pages now reads like `Nov 19, 2026 · 12:06:42 PM (just now)` in the viewer's own time zone: card "Last updated" (was "code touched"), Released, product page "Last updated" / "Last delivered", status "checked", the shelf header and the farm-problem bar. Ages: under 5 min "just now", under an hour "within the last hour", then "1 hour ago" / "N hours ago", "1 day ago" / "N days ago". Date-only values (Built on older builds) show just the date.

## v0.7.16 — 2026-11-19
- EOD 0.7.0: King of Shit Hill, Kev's Water Plant Concept, 68 Freedoom maps on the hub (res/freedoom-maps.wad.gz, 2.6 MB).

## v0.7.15 — 2026-11-19
- EOD 0.6.1: LOOK stick, turn-around, look up/down; chainsaw, double barrel and rocket launcher in Chaingun Carnage.

## v0.7.14 — 2026-11-18
- EOD 0.6.0: Doom status bar with the marine's face; demo map 5 Chaingun Carnage (6 waves, 156 monsters).

## v0.7.13 — 2026-11-18
- An in-house tool got a product page and a card (since moved off the public site).

## v0.7.12 — 2026-11-18
- EOD 0.5.0: /EOD/ is now a no-login hub (play demo, create monster/weapon, edit map, demo maps); old page at /EOD/community.html.

## v0.7.11 — 2026-11-18
- EOD 0.4.3: art library 74 monsters / 61 weapons (EOD/res/art ~7 MB, loaded per map).

## v0.7.10 — 2026-11-18
- Pulse Forge 0.1.1: export each creature as a zip; copy fallback.

## v0.7.9 — 2026-11-18
- **Pulse Forge** launched at /forge (free, browser): monster/weapon DNA builder, art orders, sprite cutter, sends art to EOD. Product card added (Free · Open it). Deploy copies forge/ without src and docs.
- EOD 0.4.2 reads Forge art.

## v0.7.8 — 2026-11-18
- EOD 0.4.1: 46 painted monsters, 22 guns, turning monsters, firing animations, thrown weapons.

## v0.7.7 — 2026-11-18
- EOD 0.4.0: painted art library (EOD/res/art) behind the monster and weapon generators.

## v0.7.6 — 2026-11-17
- EOD 0.3.3: weapon art overhaul (space rifles, railguns, power slider).

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
