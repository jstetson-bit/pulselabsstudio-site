# EOD · Editor of Doom

A free website for building classic Doom maps in the browser, playing them with one tap on phone, PC (keyboard and mouse) or controller, and sharing them in a community map library with forums.

**A Pulse Labs Studio project. Unofficial fan project, not affiliated with id Software, Bethesda or ZeniMax.**

## What's in this repository
| Path | What it is |
|---|---|
| `index.html` | Home page: newest and top-rated maps |
| `maps.html` | Map library: search, sort, ▶ Play, Remix, WAD download, votes, report |
| `editor.html` | The editor + game (built from `engine/src`; don't edit by hand) |
| `forums.html` | Forums: categories, threads, replies, pin/lock/delete for admins |
| `account.html` | Sign up / sign in, profile, My maps (versions, publish/unpublish, delete), admin reports queue |
| `assets/config.js` | **The only file you edit to go live**: Supabase URL + anon key |
| `assets/backend.js` | Data layer: Supabase (live) or Local test mode (this device only) |
| `assets/site.js`, `assets/site.css` | Shared header, footer, manual, settings, sign-in, map cards |
| `engine/src/*` | Editor/game source. Rebuild with `python3 engine/build.py` |
| `supabase/schema.sql` | Database tables, security rules, triggers. Run once in Supabase |
| `docs/` | CHANGELOG and PROJECT_OVERVIEW |

## Art, credits and what we can't get sued over
- Engine, editor, site and the in-house art: Pulse Labs Studio, written from scratch.
- Optional Freedoom art pack in `res/`: © Contributors to the Freedoom project, BSD license (`res/FREEDOOM-COPYING.txt`, `res/FREEDOOM-CREDITS.txt`). Free to redistribute with that notice.
- No id Software files are included or hosted. If a member opens their own doom2.wad, it stays in their browser.
- Community maps are opened by the member from their own device; EOD doesn't host other people's WADs.

## How it works (why hosting is cheap)
Everything runs in the visitor's own browser. The website is plain files (HTML/JS/CSS) served free by GitHub Pages. When someone plays a map, their browser downloads the map data (usually 5-50 KB of JSON) and the game engine runs on their device. No game server, no video streaming. The only "server" is Supabase, which stores accounts, maps, votes and forum posts and enforces who can change what.

## Where it lives now
In the `pulselabsstudio-site` repo under `EOD/`, served at https://pulselabsstudio.com/EOD/ by the site's own deploy workflow (no separate Pages setup needed). Rebuild the editor with `python3 EOD/engine/build.py`.

## Go live (one time, if moved to its own repo)
1. **GitHub Pages:** repository → Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save. The site appears at `https://<owner>.github.io/editor-of-doom/` within a minute or two.
2. **Supabase:** create a free project → SQL Editor → paste all of `supabase/schema.sql` → Run.
3. Supabase → Authentication → URL Configuration → set **Site URL** to the GitHub Pages address above (so confirmation emails link back correctly).
4. Supabase → Project Settings → API → copy **Project URL** and **anon public** key into `assets/config.js` → commit. (Never use the service_role key in this repo.)
5. Sign up on the live site, then in the Supabase SQL Editor run:
   `update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';`

Until step 4, the site runs in **Local test mode** (yellow bar at the top): everything works but is stored only in that browser.

## Handing it to someone else (e.g. Kevin)
- GitHub: Settings → Collaborators → add them, or Settings → Transfer ownership.
- Supabase: Organization → Members → invite them as Owner.
- Site: make their account an admin with the SQL line above.

## Custom domain (optional)
Buy a domain, add it under Settings → Pages → Custom domain, and add the DNS records GitHub shows. Then update Supabase's Site URL.
