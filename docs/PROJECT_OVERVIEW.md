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

## Farm tools (admin PowerShell, need git + gh signed in)
- `tools/Vault-User.ps1 -Init | -Add -Name X | -Remove -Name X | -List`
- `tools/Publish-ToSite.ps1 -Id <id> -Version <v> -Files <...> [-Name -Tagline -Description -Icon -Screenshots -Notes -Platform -DryRun]`
  Refuses debug-signed APKs unless `-AllowDebugSigned`.

## Roadmap
1. ✅ v0.1 public downloads page (replaced)
2. ✅ v0.2 private, encrypted vault with sign-in and three shelves
3. Forums / profiles — need a real back end (Supabase recommended); not started.
4. Swap shelf art for final art if wanted.

## Limits to know
- Removing a person stops them signing in on any new visit; someone who already copied the master key
  out of their browser could still read files until the key is rotated (re-run -Init on a new vault and
  republish). For family/testers this is fine.
- Files are unlocked in memory: fine for apps up to a few hundred MB; 1.5 GB cap in the script.

## House rules applied
Ghost manual + invert in the header; confirm = green check; back = red undo arrow; Cancel-free;
US spelling; white text; returns to where you left off; no frameworks, tiny page.
