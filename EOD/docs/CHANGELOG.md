# EOD · Editor of Doom — Changelog

## Queued
- Go live: Supabase keys in `EOD/assets/config.js` so accounts, maps and forums are shared between visitors (waiting on owner)
- Live co-editing (two people on one map at once) via Supabase Realtime
- Map comments on each map, member profile pages, follow authors
- Load real textures from a member's own IWAD / Freedoom (stays on their device)
- Built-in node builder so exported WADs also run in Chrome/Chocolate Doom
- Everything queued for the engine in No Shit Doom Editor (curve/grid drawing, blockmap speed-up, grates)

## v0.1.1 — 2026-11-17 — live test on pulselabsstudio.com/EOD
- EOD now lives in the Pulse Labs site repo under `EOD/` and deploys with the site to pulselabsstudio.com/EOD (lowercase /eod forwards there).
- Footer links back to the Pulse Labs Studio home page; the home page footer links to EOD.
- Still in Local test mode (no Supabase keys yet): every visitor's accounts, maps and posts stay on their own device.

## v0.1.0 — 2026-11-16 — first build
- New website built on the No Shit Doom Editor engine (UDB-style editor + Doom-style game), rebranded EOD.
- Pages: Home, Maps library, Editor, Forums, Account. Ghost "i" manual, invert, settings (look, font, size, crash log) on every page; first-visit look picker.
- Accounts: free sign-up/sign-in, profile (username, bio), password reset (live mode).
- Map library: creator, made/updated dates, plays, votes, permissions (remix allowed, WAD download allowed, public or private draft), ▶ Play (flips straight into the game), Remix (opens your own credited copy), WAD download, Report.
- Editor: File → Publish to EOD (new version each publish, last 20 kept and restorable), File → Open from the EOD library; ?map= / ?remix= / ?play= / ?wad= links.
- Controls: keyboard + mouse with pointer lock (click to lock, Esc releases), mouse wheel, Xbox/standard controller (left stick move, right stick turn, RT fire, A use, RB/Y next weapon, LB previous, View map, Menu exit), rumble on damage, full remapping screen (two keys per action + controller button, mouse and stick speed, dead zone, invert), saved on the device and to the member's account. Touch controls hide automatically when a keyboard, mouse or controller is used.
- Forums: 5 categories (Announcements admin-only), threads, replies, edit/delete own posts, admin pin/lock/delete, report.
- Admin: reports queue on Account page (view, delete map/post, dismiss).
- Supabase schema with row-level security, version history trigger, vote scoring, play counter, posting rate limits, admin role.
- Local test mode so the whole site works before the server is connected.
- Tested in headless Chrome over HTTP (desktop 1280×800 and phone 412×915): sign-up, publish, republish → version, library card, play from library, keyboard movement, simulated Xbox controller (move/turn/fire), rebinding a key + account sync, exit back to library, remix, forum thread + reply, account page.
