# EOD · Editor of Doom — Changelog

## Queued
- Boom/MBF line actions and sector specials (most popular modern maps), DEHACKED patches, MUSINFO/music
- Custom art on the live library: store it in Supabase Storage instead of inside the map row once the server is connected
- Play straight from the /idgames archive by search (needs a CORS-friendly mirror or a tiny proxy)
- Go live: Supabase keys in `EOD/assets/config.js` so accounts, maps and forums are shared between visitors (waiting on owner)
- Live co-editing (two people on one map at once) via Supabase Realtime
- Map comments on each map, member profile pages, follow authors
- Built-in node builder so exported WADs also run in Chrome/Chocolate Doom
- Everything queued for the engine in No Shit Doom Editor (curve/grid drawing, blockmap speed-up, grates)

## v0.4.1 (vc10) — 2026-11-18 — bigger library, turning monsters, real firing animations
- Art library now **46 painted monsters** and **22 guns** (third GPT sheet added: 25 more creatures, a full-turn demon, pickups and firing sequences).
- **Spine Baron**: first monster with real angles (5 painted views, mirrored to all 8, picked by where you stand) and a painted 5-step death.
- Guns with **painted firing sequences** (Storm Minigun, Octagon Breacher, Void Cannon, Spark Grinder, Gore Saw, Pulse Rifle): the shot animates through every frame, timed to the gun's fire rate.
- New gun class **Thrown** (Hell Spear, Gut Knife, Buzz Disc; no ammo): the hand throws and the painted spear/knife/disc flies as the projectile. Bunker Buster fires its painted rocket.
- Floor pickups use the painted pickup art.
- `tools/cut_sheet3.py`: cutter for the mixed sheet (grid, rotation row, death row, pickups, measured firing strips).

## v0.4.0 (vc9) — 2026-11-18 — Pulse painted art library
- The generators now build from **painted Doom-style art** (from the GPT sheets James supplied: 20 monsters, 12 guns with idle/firing/side frames). Stored in `res/art/` (PNG + manifest.json, ~1.1 MB, loaded only when a map uses it).
- Monster generator: **Painted art** picker (20 bodies) plus color shift (hue), color strength, brightness, tint color and amount (Pulse red button), size, mirror. Rolls pick a body that fits the chosen body type and vary it. Motion is made from the one painting: walk lean/bob, attack lunge with flash, pain flash, 5-step death collapse with a blood pool.
- Weapon generator: **Painted art** picker (12 guns) with the same color/size/mirror controls plus "Keep hands their natural color". Idle and firing frames, small floor pickup.
- Every sprite is crushed into the Doom palette (Freedoom PLAYPAL, BSD) so it sits in the game like original art.
- "Old style (drawn by code)" still selectable. The code-drawn art is no longer the default.
- Playable HTML exports embed the painted art they use. GZDoom WAD exports include it as sprites.
- `tools/cut_sheets.py`: the cutter that turns a sheet into transparent sprites (background removal, frame splitting, Doom sizing).
- Known limits: one painted angle per monster (all 8 views show the front), motion is made by bending the painting, not drawn frames.
- Removed: the unfinished 3D clay renderer (kept only the palette tools).

## v0.3.3 (vc8) — 2026-11-17 — weapon art overhaul (space rifles and more)
- New gun art: shaded metal, glow, hands, and six **styles**: Classic military, **Space rifle** (emitter prongs, glow strips, energy coils, holo sight), **Railgun** (twin rails with glowing coils), Bio / hell-tech (organic shell, veins, glowing pods, teeth), Heavy industrial (rotary barrels, vents, hazard stripes), Retro raygun (rings, fins, emitter dish). Any class can wear any style.
- **Power slider 1–10** (peashooter → doomsday): makes the gun bigger and brighter and, if "Power changes the stats too" is on, scales damage, splash and kick with it. Damage sliders now go to 1000/2000.
- New look sliders/switches: size/bulk, glow strength, energy coils, emitter prongs, glow strips, panel lines, hazard stripes; "Side magazine / power cell".
- New class: **Railgun** (cells, one precise high-damage shot).
- Muzzle flashes match the gun: energy bursts with rays for energy styles, star flash for bullets. Pickups lying on the floor match the style.
- In-game weapon drawn a bit smaller so it doesn't cover the view.
- Tested in headless Chrome: a gallery of all 6 styles at power 1/4/7/10 plus firing frames, generator screens, in-game firing; no page errors.

## v0.3.2 (vc7) — 2026-11-17 — glass panes
- **🪟 Glass** on any two-sided line (Linedefs mode → select a line → Make glass / Glass settings). Every part is its own on/off switch with settings:
  - See-through on/off + how much the glass color covers what's behind (0–100%)
  - Tint on/off + color (Pulse red / Clear blue quick buttons); stained-glass pattern from the line's middle texture
  - Real reflection on/off (mirror ray of walls, steps, floor, ceiling, sky, other glass) + strength, "stronger from the side" (Fresnel) on/off, reflection distance
  - Shine streaks on/off
  - Breakable on/off + strength (hit points), cracks where it's hit, flying shards, shards stay on the floor, glass sounds, monster attacks can break it
  - Blocks walking on/off, stops bullets/fireballs/rockets on/off, monsters can see through on/off
  - Quick looks: Clear window, Mirror, Frosted, Stained, Bulletproof, Pulse red, Ghost pane; Remove glass
- Monsters and sprites behind glass are tinted by it; bullets, melee, projectiles and explosion splash all damage it; monsters' hitscan hits the glass first; explosions don't pass through intact glass.
- Glass lines draw light blue on the 2D map. Test map: a pane between the corridor and the yard (shoot it out).
- WAD export: glass becomes a translucent PNG middle texture (EODGLSxx in TX_START) with Boom/GZDoom line action 260 (translucent) and impassable while "blocks walking" is on. Breaking and reflection are EOD-engine only.
- Tested in headless Chrome: rendering (clear, angled, mirror, Pulse red), blocking, cracking, breaking (shards fly and settle), walk-through after break, WAD lumps, no page errors; ~3–5 ms per frame with glass on screen.

## v0.3.1 (vc6) — 2026-11-17 — weapon generator
- **🎲 Weapon generator** (Things mode toolbar, Thing browser, File menu): rolls a Doom-style gun. Classes: sidearm, shotgun, repeater, explosive, energy, super, melee. Every stat has a slider and its own reroll: damage, pellets, spread, fire rate, ammo type and cost, projectile speed/splash, range (melee), recoil, starting ammo on pickup. Options: name, color palette (Pulse red default), start with it, slot.
- Procedural first-person art (idle + fire frames with muzzle flash) and a pickup sprite; plain-words "fire story" preview of what one trigger pull does.
- **My weapons** (armory): edit, duplicate, delete; custom weapons are saved in the map (`M.wep`, ids 21000+), placed like any thing, picked up in the Demo, fired with recoil kick.
- WAD export adds DECORATE `Weapon` actors plus PNG sprites with grAb offsets (PWxxA0/B0, pickup PPxxA0) so GZDoom loads them.
- Tested in headless Chrome: 6 weapons of different classes picked up and fired, kills registered, WAD lumps present, no page errors.

## v0.3.0 (vc5) — 2026-11-17 — monster generator
- **🎲 Monster generator**: rolls a random enemy that fits the Doom look. Archetypes: imp, beast, floater, soldier, hulk, crawler, cyber; tiers fodder → boss. Adjustable health, speed, size, pain chance, melee damage, ranged attack (hitscan/projectile, damage, burst, wind-up, gaps, cooldown), aggression; each with reroll. Palette (Pulse red default) and name.
- Attack sequence preview in plain words; procedural sprite frames (walk, attack, pain, death).
- **My monsters** (bestiary); saved in the map (`M.mon`, types 20000+); DECORATE + sprite export for GZDoom.

## v0.2.2 (vc4) — 2026-11-17 — vanilla limits check (on/off)
- Settings → **Vanilla limits check: Off / On** (default Off), plus "Show the counters while playing" and "Pop up a warning when a view goes over".
- When on: live counters in the Demo and 3D Visual mode (visplanes ~N/128, drawsegs N/256, sprites N/128; green, red when over) and a warning toast where original Doom / Chocolate Doom would crash ("visplane overflow" etc.).
- **Scan this whole map now** (Settings, and Map Analysis when the check is on): stands at every sector and every player/monster spot, looks 8 ways (up to 4,000 views), lists the worst 12 spots; tap one to stand there in 3D Visual mode.
- Estimates: visplanes counted per unique floor/ceiling (height + flat + light, sky as one) and split when the same plane shows twice in a column; drawsegs = walls drawn; sprites = sprites actually visible. EOD's own engine and GZDoom have none of these limits.
- Tested: Freedoom MAP12 (7,245 lines) live counters + full scan (4,000 views, 14 flagged over drawsegs).

## v0.2.1 (vc3) — 2026-11-17 — your own walls and floors
- **My textures:** add your own picture (PNG/JPG/WebP/GIF) as a wall, a floor/ceiling or both. Controls: name, width, height, quick 32/64/128/256 sizes, keep shape, sharp-pixel vs smooth, live tiled preview. Manage them in File → My textures (replace, rename with optional update of every surface using it, delete with Undo). Also from the texture browser: "＋ Add my own".
- Custom art is saved inside the map (autosave, project file, Undo) and loads as the top art layer ("My textures").
- **Imported art survives saving:** when you open a map that brings its own textures, the ones the map uses are copied into the map automatically (also File → My textures → "Keep this map's imported art"). Art from your own IWAD and Freedoom is never copied.
- **WAD export** includes your textures as PNG lumps (TX_START/TX_END for walls, FF_START/FF_END for floors), which GZDoom reads.
- **Publishing:** maps with custom art show a permission box ("I made them or have permission"); unticked, the map is published without the art.
- **About** and **Check for updates** at the top of the File menu (version also shown in the top bar).
- Tested in headless Chrome: add a 128×128 PNG, paint it on room walls, play it, export WAD (TX lumps present), reload page (texture persists), My textures screen.

## v0.2.0 — 2026-11-17 — plays maps everyone has made
- **Open any map:** File → Open any map takes a .wad (PWAD or IWAD), an /idgames .zip, or a ZDoom .pk3 (maps/*.wad + PNG textures/flats/sprites). Multi-map files list every map with ✎ Edit (build off it) or ▶ Play. An import report shows lines, sectors, things, the map's own art, the art stack in use and any missing texture names.
- **Resource stack (top wins):** the map's own art (TEXTURE1/2 + PNAMES + patches, flats, sprites, sounds, loose patches, PK3 PNGs) → the player's own IWAD if they open one (memory only, never uploaded or published) → Freedoom art pack → EOD in-house art as the last fallback.
- **Freedoom art pack** (Freedoom 0.13.0, BSD license, credited): textures, flats, sprites and sounds trimmed into one 7.2 MB gzip file (`res/freedoom-res.wad.gz`), downloaded once and kept in the browser cache. Settings → Art pack: Freedoom (default) or EOD in-house (lightest, no download). License and credits in `res/`.
- **Engine:** real Doom picture/texture decoding (any texture size, tall patches), 8-angle monster sprites with walk/attack/pain/corpse frames, animated item sprites, projectile/explosion/puff/blood frames, first-person weapon sprites with muzzle flashes, animated flats (nukage, water, lava, blood, slime), per-map sky (SKY1/2/3, episode skies), Doom sounds from the art pack (synth sounds as fallback).
- **Speed for big maps:** per-frame column bucketing in the renderer and a 128-unit spatial grid for collision, sight, bullets, projectiles, triggers and sector lookups. Freedoom MAP15 (5,397 lines, 330 things) renders in ~7.5 ms per frame on desktop Chrome at phone-portrait size; game logic ~0.15 ms per tic.
- Tested in headless Chrome: Freedoom pack load, community-style PWAD + .zip import (3 maps, picker, Play/Edit), full IWAD import (32 maps listed, MAP15 played), sprites/weapon/flats render, no page errors.

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
