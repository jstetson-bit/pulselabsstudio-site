# EOD · Editor of Doom — Project Overview

**Owner:** Pulse Labs Studio · **Version:** 0.8.7 · **Started:** 2026-11-16 · **Repo:** `editor-of-doom` (GitHub Pages)

## Goal
A free, open web home for classic Doom mapping: an editor that feels like Ultimate Doom Builder, one-tap play on any device and input (touch, keyboard+mouse, Xbox/standard controllers), and a community map library + forums. Nothing like this existed when we checked (Nov 2026): DoomScroll plays WADs in a browser but has no editor or accounts; web editors (JZBuilder, WAD.js) are prototypes; SnapMap (Doom 2016) had the share/remix loop but only inside that game.

## Architecture
- **Static front end** (GitHub Pages): `index.html`, `maps.html`, `editor.html`, `forums.html`, `account.html` + `assets/`. No build step except the editor (`python3 engine/build.py` → `editor.html`).
- **Engine** (`engine/src`, from No Shit Doom Editor v1.0.0): map model, UDB-style modes, WAD import/export, procedural art, column raycaster renderer, game logic, touch UI. EOD additions: `12_input.js` (keyboard/mouse/controller + remapping), `13_eod.js` (publish, library, play/remix/wad links), `99_start.js` (boot last).
- **Backend** (`assets/backend.js`): one API (`EODB.*`) with two implementations, Supabase (live) and Local (localStorage). Pages never talk to Supabase directly.
- **Database** (`supabase/schema.sql`): profiles, maps (+ allow_remix, allow_download, preview, plays, score), map_versions (auto, last 20), votes (score trigger), forum_categories, threads, posts, reports. Row-level security: anyone reads public content; members write only their own; admins moderate. Posting and map creation are rate-limited in the database.
- **Game HUD** (`23_statusbar.js`): the classic Doom status bar drawn from Freedoom's ST* lumps (in `res/freedoom-res.wad.gz`): numbers, arms, keys, ammo table and the marine face (STF*: 5 hurt levels × straight/left/right, ouch, evil grin, rampage, god, dead). `hudHeight()` tells the weapon sprite and automap where the bar starts. Settings: Classic / Compact / Slim.
- **Demo maps** (`22_demomaps.js`): built in code. Horde options live on `M.start` (loadout, `hurt`, `power`, `waveAt`, `waveGap`); things with `wave: n` wait in `G.waveQ` and are released by `tickWaves()` in `09_game.js`.
- **Sealed bosses and pipe glass:** a trigger with `stuck: 1` marks its boss `e.stuck`; `tickMonsters` keeps it idle while every glass pane touching its sector is intact and frees it when one breaks. Glass options `monBrk:false` (monster fire only cracks it) and `nearOnly: <units>` (player shots from farther away only crack it) live in `damageGlass` (`18_glass.js`). Stairs need treads at least 32 deep (the player's body is 32 wide; a body touching two steps climbs both at once).
- **Freedoom maps** (`22_demomaps.js` FD_MAPS, `loadFreedoomMap`): `res/freedoom-maps.wad.gz` holds only THINGS/LINEDEFS/SIDEDEFS/VERTEXES/SECTORS of all 68 Freedoom maps (BSD). `editor.html?fd=MAP01&go=play`.
- **Map triggers** (`M.triggers`, `runTrigger` in 09_game.js): `{kill: thingIndex, msg, flat:{tag,ft,sp}, flow:{tag,dx,dy}, light:{tag,li}, open: tag, waves: true}`. Sector `flow:[dx,dy]` scrolls from the start.
- **Rendering** (`08_render.js`, `24_mtrender.js`): column raycaster into column-major buffers (`o = (x - R.x0) * H + y`) for a strip `[R.x0, R.x1)`. Single core: `rTranspose()` to the image. Multi-core: `mtSource()` copies the render functions into worker blobs; textures/sprites by id once; per frame camera + sectors + sprites; workers return ImageBitmap strips. The screen canvas `#gv` is device resolution; the 3D view `R.cv` (render resolution) is scaled onto it, HUD drawn on top. `S.hudStyle` classic/modern (`sbDrawModern`, `hqCanvas` = Scale2x×2).
- **Play flow:** library → `editor.html?play=<id>` → browser downloads the map JSON → game runs locally → exit returns to the library. Plays are counted with a server function.

## Map permissions
Each map has: public/draft, remix allowed, WAD download allowed. These are enforced in the site UI. Map data has to reach the player's browser to be played, so a determined person could still copy a public map; the permissions are the author's stated wishes plus moderation, like most map-sharing sites.

## Input defaults
| Action | Keyboard/mouse | Controller (Xbox layout) |
|---|---|---|
| Move / strafe | WASD, ↑↓ | Left stick, D-pad up/down |
| Turn | Mouse (locked), ←→ | Right stick, D-pad left/right |
| Look up / down | Mouse up/down, PageUp/PageDown, Home = straight | Right stick up/down, left-stick click = straight |
| Turn around 180° | X | Right-stick click |
| Fire | Left click, Ctrl | RT |
| Use / open | E, Space | A |
| Next / previous weapon | Q or wheel down / wheel up | RB or Y / LB |
| Automap | Tab | View |
| Release mouse / exit | Esc | Menu |

## Touch controls
Left stick (moves; sideways = strafe or turn, set in Controls), LOOK stick (turn + look up/down), ⟲ turn-around, FIRE (slide on it to aim), USE, WPN, MAP. Dragging on empty screen turns and looks. Tap the status bar ARMS numbers to pick a gun. Positions per layout (landscape / portrait / fold) in `CTL_DEF`, movable with Arrange. Look is `G.p.look` (−1..1) → render pitch = look × 0.42 × render height.

## Pulse Labs standards
Ghost "i" manual, invert beside it, settings cog (look on first visit, font, size, crash log), green check confirm / red undo arrow cancel (always last), US spelling, white text in dark menus.

## Legal notes
Unofficial fan project footer on every page. No id Software assets; EOD draws its own art. Members may only upload their own maps; Report + admin removal handle the rest. The name contains "Doom" (id Software trademark), which fan tools commonly do; rename if id ever objects.
