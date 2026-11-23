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

## v0.8.12 (vc32) — 2026-11-22 — crash guard ("Aw, Snap") and lighter glass traffic
- **Crash guard.** While you play, the game writes a small heartbeat every two seconds and clears it when you leave normally. If Chrome kills the tab mid-game ("Aw, Snap", STATUS_BREAKPOINT), the heartbeat is still there on the next load. The game then writes it to the crash log (version, map, detail, cores) and plays that session in safe mode: one core, detail no higher than 1280. A message says so. The next normal session goes back to your settings.
- **Glass cracks travel to the render cores only when they change.** Every cracked pane keeps a picture of its cracks (tens of KB each), and it was being copied to every core 35+ times a second. Now it's copied once per new crack. Less memory churn on big machines with many cores, which is the likeliest cause of the tab dying.
- Why: James got Chrome's "Aw, Snap! STATUS_BREAKPOINT" on the editor page during play. A one-hour soak here showed no leak in the game's own memory, so the fix is the biggest waste we found plus a safety net that records the next one.
- Checked: cracked glass still draws across the core strips; a faked tab death on reload turns on safe mode, shows the message and logs it. All demo maps and the Freedoom loader pass.

## v0.8.11 (vc31) — 2026-11-22 — gunfire lights the room; the lights trap explains itself
- **Gunfire, fireballs and explosions light up the room for a moment.** Your muzzle flash, a monster's shot, a fireball flying past and every blast brighten the area around them, then fade back. In a dark room the fight itself lights the place up. On by default; Menu → Detail → "Gunfire and fireballs light up the room for a moment" turns it off.
- **Kev's Water Plant: the lights trap now says so.** Dropping into the hall still kills the lights on purpose (it's a trap). Now the message line says "The lights die! Free The Clog from the pipe and kill him to bring them back." Killing him brings the lights back, as before.
- Why: James: "the lightning gets low and dies sometimes.. the creatures lighting it?" It wasn't the creatures: it was the trap with no word about it.
- Checked: the hall drops to the trap light when you cross into it and the message shows; one pistol shot brightens the hall and it fades back within about a third of a second. All demo maps and the Freedoom loader pass.

## v0.8.10 (vc30) — 2026-11-22 — monster infighting; no more giant corpse under your feet
- **Monster infighting, like the original Doom.** Monsters' shots now hit whatever is in the way, including other monsters. A monster hurt by another monster turns on it and fights it until one of them dies, then comes back for you. So you can bait them: stand so a zombie's line of fire runs through an imp, or so an imp's fireball lands on a demon, and let them tear into each other.
  - Doom rules kept: a fireball doesn't hurt a monster of the same kind (imps don't hurt imps with fireballs), but bullets do (zombies will shoot each other). Rocket and barrel blasts count too.
  - Hit a monster yourself while it's busy with another one and it turns back on you.
  - The Baron sealed in the water plant pipe ignores it all until he's out.
- **Flicker fix: floor junk right under you is no longer drawn.** A dead body, gibs or glass shards almost under your feet were drawn huge across the bottom of the screen and popped in and out as you moved, like a red damage flash. Low flat things within about one step of the camera are now skipped (Doom hides them the same way).
- Why: James, in the glass demo: "the screen is flickering here, and i thought it was damage, but it wasnt", and "can i bait enemies to attack other enemies like the original doom? ... monster infighting is what its called."
- Checked: a zombie shooting at you through an imp hits the imp; the imp turns and kills the zombie. All demo maps and the Freedoom loader pass.

## v0.8.9 (vc29) — 2026-11-22 — bulletproof glass says so
- **Bulletproof glass now tells you.** Shoot an unbreakable pane and the message line says "Bulletproof glass: it cracks, but it never breaks." (once every few seconds, per pane). It used to just keep cracking with no word, so it looked like a bug.
- **The glass demo names its panes** in the start message, left to right: clear, mirror, frosted, stained, bulletproof, Pulse red.
- Why: James shot the fifth pane in the glass demo until it was white with cracks and asked "indestructable?" Yes, on purpose: it's the Bulletproof preset, showing the editor's breakable on/off setting. Nothing in the game said so.
- Swept: the other glass that refuses to break (the water plant pipe from too far away) already says why.

## v0.8.8 (vc28) — 2026-11-22 — Kev's Water Plant: hall back to its original form
- **The hall is back the way it was in 0.8.6:** the landing and drop from the first door, the west catwalk stairs only, no pillars, the chaingunner back on the east catwalk, the bullet box back in place. Removed: the three steps up from the drop, the east catwalk stairs and the four cover pillars.
- **Kept:** the Baron sealed inside the green pipe until you break it open up close (monster fire can't crack it, far shots only crack it).
- Why: James, after trying 0.8.7: "i cant jump up the stairs? put the room back in its orignal form".

## v0.8.7 (vc27) — 2026-11-22 — Kev's Water Plant: the demon is IN the pipe, and the room has counterplay
- **The Clog stays in the pipe.** The Baron now starts sealed inside the green glass pipe (he's why the water is green) and doesn't move or attack until the pipe is broken open. Monster fire can't crack it, and you can't snipe it from the hall: it only gives way to shots from close range (the message says "Too far to break the pipe. Get closer."). Break any pane and he's free: "The Clog is free! Kill it!"
- **A way back up from the drop.** The first room drops into the hall by three deep steps now (16 units each, treads 32 deep), so you can walk back up to the door. Earlier treads were too short for the player's body to clear, which is why the first try at stairs didn't work.
- **Stairs to the catwalk on both sides.** The east catwalk has a staircase too (the west one already did), so the shooters up top can be reached and fought on their level.
- **Cover in the hall.** Four tall pillars to duck behind: one by each catwalk stair and two in the middle of the walkway to the pump room.
- **Lighter up top.** The catwalk chaingunner is now an imp; the bullet box moved off the stairs.
- Why: James said there was no counterplay to the room, the drop was one-way, the glass container was empty, and the Baron was chasing him across the hall with no way to kite him. "Two of them": the other big grey-green one is the Hell Knight in a pump-room closet (half the Baron's health).
- Checked: walking up the new steps reaches the door landing; the east stairs reach the catwalk; the Baron stays idle in the pipe for 20 s while the room fights; far shots only crack the glass; a close shot breaks a pane and frees him. All demo maps and the Freedoom loader pass.

## v0.8.6 (vc26) — 2026-11-22 — boss health bar
- **Boss health bar.** The monster a level is waiting on now shows a red health bar with its name across the top of the screen once it wakes up or gets hit, so you can see every shot land. In Kev's Water Plant that's **The Clog**, the Baron stuck in the pipes.
- Why he felt unkillable: he's a Baron, 1,000 health (a zombie has 20), and he starts behind four panes of green glass that each soak up about 120 damage before they break. With the pistol that's about 100 hits. The Sawed-Off up close (~500 a blast) or the rocket launcher in the pump room is the way. The level's start message now says so.
- Checked: every monster in the water plant that can be seen can be hit (tested from 48 positions around each one); the Baron's glass breaks and he takes damage.

## v0.8.5 (vc25) — 2026-11-22 — Sawed-Off break-open reload, animated
- **A real break-action reload on the Sawed-Off**, about 1.6 s, step by step:
  1. **The barrels crack down** off the receiver on the hinge: the muzzles tip away and the steel breech face swings up toward you, showing both chambers with the spent shells' dull brass rims.
  2. **The ejectors kick:** both spent shells spring out, one to the left and one to the right, spinning, arcing up and falling away with gravity, with a puff of smoke from the chambers. (Doom II's break-open sound.)
  3. **Two fresh red shells** come up from your hand and slide into the chambers. (Load sound.)
  4. **The action snaps shut** with bright new brass in the chambers. (Close sound.)
- The two chambers line up with the bores in the painting automatically (the game finds the two dark bore circles in the art), so other break-action guns can use the same animation (`reloadAnim: 'break'`).
- Painted guns now get the same clean upscaling as the rest of the Modern look.

## v0.8.4 (vc24) — 2026-11-22 — in-game Menu and volume
- **In-game Menu** (☰ Menu in the top bar, or **Esc**): Resume, Restart level, Sound, Picture detail (Classic / Modern), Controls, Move the on-screen buttons, Manual, Quit to the editor. **The game pauses** while the menu or any panel is open. Esc no longer throws you straight back to the editor.
- **Sound panel**: Sound on/off plus five volume sliders: **Master**, **Your guns**, **Monsters**, **You** (getting hurt, pickups) and **World** (doors, switches, explosions, glass). Each slider plays a sample when you let go so you hear the level. Saved with your settings. Also reachable from the editor's Settings (🔊 Volume…).
- The top bar is now just ☰ Menu (+ Arrange on touch screens, manual and invert), since Restart / Detail / Controls moved into the menu.

## v0.8.3 (vc23) — 2026-11-22 — the Sawed-Off
- **New gun: Sawed-Off.** A short double barrel (our painted "Octagon Double Barrel" art). One pull fires **both barrels at once**: 2 shells, 24 pellets, wide spread. **Brutal up close and weak at range**: damage is ×2.2 point blank, normal at about 300 units, and down to ×0.4 far away. Tested: about 500 damage point blank (Doom's super shotgun does about 200), about 100 at 300 units, about 20 at 700.
- **Break-open reload after every blast**: the gun drops off screen, you hear it crack open, shells go in, it snaps shut (Doom II's own double-barrel sounds), and the AMMO box says RELOADING. About 1.7 seconds before you can fire again.
- Where to get it: on the shore at the start of **Kev's Water Plant**, in the summit armory on **King of Shit Hill**, and you start with it in **Chaingun Carnage**.
- **ARMS panel knows about painted guns now.** Each gun lives under a number by its type (shotguns under 3, launchers under 6, energy under 7…). Tap a number again to cycle through the guns that share it.
- Engine: custom guns can have a reload time (`reload`) and short-barrel falloff (`close`).

## v0.8.2 (vc22) — 2026-11-22 — shooting up, down and over ledges
- **Fix: bullets couldn't reach monsters above or below you.** Every bullet flew dead level at eye height, so anything up on a catwalk or down off a ledge was out of reach: the shot hit the ledge in between, even with the monster right in your crosshair. Bullets now aim up or down at the monster the auto-aim picked (like Doom's own auto-aim), or where you're looking if nothing is picked.
- **Fix: monsters partly behind a ledge or gap couldn't be targeted.** The game only checked whether it could see a monster's middle. Now it checks the body, then the head, then the legs, and aims at the first part it can see, so a monster showing only its head over a wall can still be shot. Rockets and plasma aim at that same visible part.
- Tested in Kev's Water Plant: shooting the catwalk monsters from the hall floor. Old build: 0 hits out of 10. New build: the shotgun guy dies in 6, the imp takes 10.

## v0.8.1 (vc21) — 2026-11-22 — status bar cleanup, face upgrade path
- **The tiny side text is gone.** Weapon name, kills and items were squeezed into the thin margins beside the bar and came out microscopic. Now the AMMO box is labeled with the gun you're holding (SHOTGUN, CHAINGUN…), and **KILLS · ITEMS · SECRETS** sit in the top bar next to the map name. Same for the Classic bar.
- **Full words in the ammo table:** BULLETS, SHELLS, ROCKETS, CELLS. The ammo your gun uses is red.
- **Keys box is labeled KEYS** and the three slots are outlined in their own colors (blue, yellow, red). A key you pick up fills its slot in.
- **Face upgrade path:** the game now looks for painted high-detail faces in `res/art/faces/` and uses them when they exist (falling back to Freedoom's face per expression). Art order sheet `docs/art/EOD-Marine-Face-Sheet-v001.pdf` (2 pages, 29 faces: 5 damage levels × straight/left/right/ouch/grin, plus rampage, god, dead), and `tools/cut_faces.py` cuts the returned sheets straight into the game.
- Turning around now says so on screen ("TURNED AROUND (⟲ / X key / right-stick click)"), since a sudden 180° spin can feel like being teleported.
- Checked: walked every route in Kev's Water Plant tic by tic (door, hall, basins, sluice, catwalk stairs): no position jumps; the sector lookup is correct at 2,400 sample points in that map (and in 3 others).

## v0.8.0 (vc20) — 2026-11-22 — all CPU cores, Modern look, sharp HUD, death-screen fix
- **Multi-core 3D view.** The screen is cut into vertical strips and each strip is drawn by its own worker, one per spare CPU core (up to 8). The workers run the exact same drawing code as before (copied from the page when they start, so the two can never drift apart). Textures and sprites are sent to them once; each frame they get only the camera, sector heights/lights and the sprite list, and hand back their strip as a ready-made picture that is just pasted on screen. It switches on by itself above about 800×400 on machines with 3+ cores. Detail ▸ "Use all CPU cores": Auto / Always / Off.
- **Classic or Modern look** (Detail button, top of the list). Classic = the 1993 chunky 320 picture and the pixel status bar. **Modern (new default)** = Auto detail, plus a new status bar drawn sharp at full screen resolution: big red numbers, HEALTH/ARMOR/AMMO labels, weapon numbers with the current one in a red chip, colored key chips, a clear ammo table, red-rimmed panels with chamfered corners. The marine's face and your gun are cleaned up with a pixel-art upscaler (Scale2x twice) so they're smooth, not blocky. Armor turns green/blue for green/blue armor.
- **The whole screen canvas is now full resolution.** Before, the status bar, gun and text were drawn at the 3D view's low resolution and stretched with it. Now only the 3D view is scaled; everything on top is drawn sharp.
- **Fix: couldn't click the YOU DIED buttons.** The mouse was still locked to the game when you died. The death and level-complete screens now release the mouse, and **Enter = try again, Esc = back to the editor**.
- **New Restart button** in the game's top bar (asks first: green check / red undo).
- **Kev's Water Plant: the lights-out trap** now dims the hall to about 40% instead of near-black, and the lights come back up when the Baron dies.
- Checked: all 7 demo maps and a Freedoom map play; multi-core output matches single-core (walls, flats, sky, sprites, all glass types, aim point).

## v0.7.3 (vc19) — 2026-11-22 — faster at high detail
- **The 3D view draws up to 2.3× faster at high detail.** The renderer works one screen column at a time, top to bottom, but it was storing pixels row by row. At big sizes every pixel landed far away in memory from the one before it, which stalls the CPU. The picture is now drawn into a column-ordered buffer and flipped into the screen image once per frame, in small 32×32 blocks.
- Measured on the slow 2-core test machine: 1920 wide went from 41 to 32 ms a frame, and 2560 wide from 164 to 70 ms. Auto detail will now settle one or two steps sharper on the same machine.
- Checked: walls, floors, sky, sprites, all six glass types and the aim/pick point all draw the same as before.

## v0.7.2 (vc18) — 2026-11-22 — sharper picture (Auto detail up to 4K)
- **Why it looked grainy:** EOD draws every pixel itself like the original Doom, and it was drawing a 320-pixel-wide picture and stretching it across the whole screen (8× on a 2560 screen, 12× on 4K).
- **New Picture detail levels:** Auto (new default), Classic 320, 640, 960, 1280, 1920, 2560 and **Native** (every real screen pixel, so 4K on a 4K monitor). The picture never uses more pixels than the screen really has (Windows scaling is taken into account).
- **Auto** times every frame: it starts at 960 and steps up while frames take under 6.5 ms, and steps down if they go over 14 ms, so it settles at the sharpest level the machine keeps smooth. It remembers where it settled.
- **Detail button** in the game's top bar opens the choices live (no need to leave the game), plus **Smooth the pixels when stretching** (softer, less blocky).
- Anyone who had the old Classic/Chunky/Sharp setting is moved to Auto once.
- Measured on the slow 2-core test machine: 960 = 11 ms, 1920 = 41 ms per frame. The drawing is one CPU core, so true 4K at full speed needs the work split across cores (next).

## v0.7.1 (vc17) — 2026-11-22 — water plant door fix
- **Fix: Kev's Water Plant entrance door only opened a crack.** A Doom door rises to the lowest ceiling of the sectors touching it, and the door was built right against the intake grate, whose ceiling is only 24 units up, so it stopped there. The door now sits 16 units clear of the grate on both sides and opens to 188 (full height). No secret, no trick: it was a build mistake.
- Checked: every door in all 7 demo maps opened by test and measured. All open to full height.

## v0.7.0 (vc16) — 2026-11-19 — King of Shit Hill, Kev's Water Plant, 68 Freedoom maps
- **Demo map 6: King of Shit Hill.** You start on a summit 432 units above a valley full of monsters (107, plus 3 more waves). There's a cliff edge to look over and an armory behind you with the new **Pulse Sniper** (Doom never had a sniper rifle; ours is painted, hits for 90–160 and reaches 6000 units), a rocket launcher, chaingun, double barrel, plasma rifle and ammo. Thin the valley out, then take the 18-step ramp down the east side to the exit at the south end. Monsters can climb that ramp too.
- **Demo map 7: Kev's Water Plant Concept.** Kevin's idea, laid out like the Lake Bloomington water treatment plant (lake intake → treatment hall → pump room → clearwell → out). The lake and intake channel are flowing green sludge that hurts. Inside, the treatment hall has two levels: catwalks with monsters above settling basins, and the lights die when you drop in (trap 1). Stepping into the pump room opens two monster closets (trap 2). A Baron is stuck in a green glass pipe junction: break the glass, kill him, and **every pool turns to clean blue water that stops hurting, the outflow starts flowing, the north door opens**, and two waves come at you in the clearwell yard on the way to the exit.
- **68 free community maps**: the complete Freedoom Phase 2 (MAP01–MAP32) and Phase 1 (E1M1–E4M9) campaigns, made by the Freedoom team under the 3-clause BSD licence (reuse allowed, credits linked on the page). Listed on the EOD front page with ▶ Play and ✎ Open. Links: `editor.html?fd=MAP01&go=play`. Map data is one 2.6 MB file fetched the first time and cached.
- Engine: **kill triggers** on demo maps (when a marked monster dies: change floors, start/stop flowing water, change lights, open doors, release waves); sectors can **flow** from the start; waves can be **held** until a trigger; rockets and plasma now **aim up and down** (at the auto-aimed monster, else where you are looking); long-range guns auto-aim and hit out to their own range.

## v0.6.1 (vc15) — 2026-11-19 — look up/down, LOOK stick, turn-around, more guns in Carnage
- **Turning and looking on a phone**: new **LOOK stick** for the right thumb (sideways turns, up/down looks up and down), a **⟲ turn-around** button (180° in a blink), and dragging on the screen or sliding on FIRE now looks up/down as well as turning. Before, turning was a hidden "drag on empty screen" and there was no way to look up or down at all.
- **Look up/down everywhere**: controller right stick up/down, mouse up/down (can turn off), PageUp/PageDown, Home = look straight, X = turn around (controller: right-stick click = turn around, left-stick click = look straight). All rebindable.
- **Controls panel**: a Touch screen section at the top: left stick sideways = **Strafe** or **Turn (classic arcade)**, show/hide the LOOK stick and ⟲, drag-to-look on/off, look speed, invert up/down, view springs back to center.
- **Pick a gun by tapping the status bar**: tap a number on the ARMS panel (2 = chainsaw, tap again for the pistol; 3 = shotgun / double barrel).
- **Chaingun Carnage** now also hands you the **chainsaw, double-barrel (super) shotgun and rocket launcher**, with 100 shells and 60 rockets, plus shell and rocket boxes behind you.
- Status bar **Auto** size (new default): Compact on short screens like a phone held sideways, Classic otherwise. Phone-sideways buttons moved up so they don't sit on the bar.
- The sky no longer smears into stripes when you look up.
- Manual: the touch controls section rewritten.

## v0.6.0 (vc14) — 2026-11-18 — the marine's face, Chaingun Carnage
- **Doom status bar**: the smiley is gone everywhere (the Slim bar uses the marine face too). The bottom bar is now the classic Doom bar (Freedoom art): ammo, health %, arms 2–7, armor %, keys, and all four ammo counts. Weapon name and kills/items show at the sides on wide screens.
- **The marine's face**: five levels of hurt from healthy to nearly dead (gets bloodier as health drops), looks toward whoever just shot you, the "ouch" face on a big hit, the evil grin when you grab a new gun, the rampage face when you hold fire, glowing eyes in god mode, and the dead face.
- Settings ▸ Status bar: **Classic** (full size), **Compact** (smaller), **Slim** (thin bar). Classic/Compact need the Freedoom art pack; without it the slim bar is used.
- **Demo map 5: Chaingun Carnage** — start on a firing deck at the far end with a chaingun, 999 bullets, 200 health and blue armor. 31 monsters stand in the canyon and **six waves (156 total)** pour in from the staging yard: zombiemen, imps, pinkies, shotgun guys, chaingunners. Spare bullets, two soulspheres and medikits behind you.
- New map options for horde maps (used by Chaingun Carnage, code-side for now): starting loadout (weapons, ammo, max ammo, health, armor), **waves** (things tagged with a wave number wait off-stage and come in when 14 or fewer are left or after 16 s), `hurt` (scales damage you take) and `power` (scales your damage).
- Tested: a bot that only holds fire and never picks anything up kills 134 of 156 and dies in the last wave, so a real player who grabs the soulspheres wins with it close.
- Fix: monster hitscan now passes who shot you (needed for the face to look at them).

## v0.5.0 (vc13) — 2026-11-18 — no-login hub, 4 demo maps, voodoo dolls, conveyors
- **New front page** (pulselabsstudio.com/EOD/): no sign-in. Big buttons: Play a quick demo, Create a monster, Create a weapon, Edit a map, See the maps, Pulse Forge; the four demo maps with ▶ Play / ✎ Open in editor. Ghost manual and invert on the page. The old account/community page moved to community.html.
- Editor links: `?demo=<id>` (open), `&go=play` (play), `?gen=monster`, `?gen=weapon`, `?new=1`, `?maps=1`. Straight-to-play links ask the light/dark question after the game instead of over it.
- **Demo maps** (built in code, File ▸ ▶ Demo maps): Hangar of Shit, **Voodoo Express**, **Glass Gallery**, **Bestiary Arena** (painted monsters and guns).
- **Voodoo dolls** (vanilla Doom rule): you spawn at the LAST Player 1 Start; every other one is a doll. Lines the doll walks over fire as if you did (doors, floors, teleports move the doll, exits end the level), items it touches are yours, damage floors hurt you, a crushed doll kills you. Optional messages ("Voodoo doll crossed: …"), Settings ▸ Voodoo dolls.
- **Conveyors** (Boom line actions, also work in GZDoom): 252 carry things on tagged floors, 253 carry + scroll the floor texture, 251 scroll only. The line's direction and length/32 set direction and speed. Player, monsters, items and dolls ride them; dolls keep sliding a little off the belt so they cross door tracks.
- Painted monsters/guns show nothing (instead of crashing) for the split second their art is still loading; demo maps wait for their art before starting.
- Manual: Voodoo doll entry.

## v0.4.3 (vc12) — 2026-11-18 — library grows to 74 monsters, 61 guns
- From four more sheets: **28 new monsters, every one with 5 painted angles (turns in all 8 directions) and a painted death** (Gore Eye, Azure Skull, Dawn Cleric, Magma Brute, Crimson Crusader, Blood Gargoyle, Jade Wraith, Void Sorcerer, Goblin Gunner, Flesh Brute, Iron Horn, Furnace Widow, Brain Maw, Bone Templar, Blue Specter, Crowned Void Skull, Blood Warlock, Fallen Seraph, Mist Wraith, War Crab, War Mech, Ember Golem, Red Paladin, Mecha Crab, Steel Trooper, Wing Fiend, Mecha Eye, Storm Golem).
- **39 new guns/blades** with painted firing frames. 8 whose frames came out glued together are hidden from the pickers until recut (marked `hide` in the manifest).
- Gun idle frames no longer pick the frame with the muzzle flash.
- Totals: 74 monsters (29 turn in 8 directions), 61 weapons (53 shown, 35 with painted firing animations).

## v0.4.2 (vc11) — 2026-11-18 — Pulse Forge art in EOD
- Art made in **Pulse Forge** (pulselabsstudio.com/forge) shows up in both generators' Painted art lists, marked ⚒ (read from the shared IndexedDB library, refreshed when you come back to the tab).
- A map that uses Forge art carries a copy of it (pictures + description) so published maps and playable exports show it to everyone.
- Forge monsters with 5 angles turn like the Spine Baron; 5 death frames replace the squash death.

## v0.4.1 (vc10) — 2026-11-18 — bigger library, turning monsters, real firing animations
- Art library now **46 painted monsters** and **22 guns** (third sheet added: 25 more creatures, a full-turn demon, pickups and firing sequences).
- **Spine Baron**: first monster with real angles (5 painted views, mirrored to all 8, picked by where you stand) and a painted 5-step death.
- Guns with **painted firing sequences** (Storm Minigun, Octagon Breacher, Void Cannon, Spark Grinder, Gore Saw, Pulse Rifle): the shot animates through every frame, timed to the gun's fire rate.
- New gun class **Thrown** (Hell Spear, Gut Knife, Buzz Disc; no ammo): the hand throws and the painted spear/knife/disc flies as the projectile. Bunker Buster fires its painted rocket.
- Floor pickups use the painted pickup art.
- `tools/cut_sheet3.py`: cutter for the mixed sheet (grid, rotation row, death row, pickups, measured firing strips).

## v0.4.0 (vc9) — 2026-11-18 — Pulse painted art library
- The generators now build from **painted Doom-style art** (from the sheets James supplied: 20 monsters, 12 guns with idle/firing/side frames). Stored in `res/art/` (PNG + manifest.json, ~1.1 MB, loaded only when a map uses it).
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
