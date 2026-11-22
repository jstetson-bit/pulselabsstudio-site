# EOD · Editor of Doom — History

The story of how EOD came to be, in the owner's words where possible.

## 2026-11-16 · It starts as No Shit Doom Editor
- Asked: *"build a new program today… call it No Shit Doom Editor… capable of creating and editing Doom maps… all the tools in the editor… make an executable version… a single demo button… on-screen controls for my phone… 9:16 portrait, 16:9 landscape, and the Z Fold when it's unfolded."*
- Then: *"Take a look at… Ultimate Doom Builder… compare our product to that product. Incorporate all of its tools and structure… include a public test map… or create a quick test map."*
- Decided: one self-contained HTML app; UDB-style modes; own Doom-style engine for the Demo; test map "Hangar of Shit"; export Doom WAD + a playable HTML file.

## 2026-11-16 · Is there a web Doom editor already?
- Asked: *"is there any type of Doom editor hosted on the internet as a web page that people can… log in… maps to share… click it, edit, and utilize it?"*
- Found: DoomScroll plays maps in a browser (no editor); web editors are prototypes; SnapMap had share/remix but only inside Doom 2016.

## 2026-11-16 · EOD
- Asked: *"time to build EOD, or Editor of Doom… web-hosted… log in… sign up… free… forums… controller mapping and keyboard and mouse mapping… build the skeleton off the most popular Doom editor… put the whole website into GitHub."*
- Then: *"I want to be able to link a Xbox controller… map a mouse and keyboard… a map library… who is the creator… when it was created… permissions… build a skeleton off it or play it… I want to gift it to Kevin so he can run it."*
- Decided: static site + Supabase for accounts/data (local test mode until keys); Remix credits the original; map permissions; controller/KBM remapping saved to the account.

## 2026-11-17 · Live on pulselabsstudio.com/EOD
- Asked: *"tie it into pulselabstudios.com/EOD… as a test subject so I can be live and check it. Don't worry about safeguarding it with a password."*
- Then: *"a link now that brings me directly to this editor and to be able to play it in real time."*

## 2026-11-17 · Any map anyone has made
- Asked: *"bring in any maps that anyone has made… recognize it, put it into our editor, overlay all of the assets and resources, and be playable. The editor needs to be familiar, but ours. The engine needs to be familiar, but ours… all on free sources and stuff that I can't get sued over."*
- Decided: open .wad/.zip/.pk3; art stack = map's own art → player's own IWAD (device only) → Freedoom (BSD, credited) → in-house art. Big-map speed-ups.

## 2026-11-17 · Custom textures
- Asked: *"do we support custom texture ie walls"* → *"go"*.
- Decided: "My textures" (add, size, sharp/smooth, replace, rename, delete), saved inside the map, kept automatically for imported maps, exported into WADs, published only with the author's permission box.
- Asked: *"vis plane overflow. is this an issue for us"* → not for EOD's own engine (no visplane limit); only matters for people taking an exported WAD to vanilla Doom / Chocolate Doom. A limits check is queued.
- Asked: *"id like a turn that off or on feature"* → built the Vanilla limits check as an Off/On switch in Settings (counters, warnings, whole-map scan).

## 2026-11-17 · Monster and weapon generators
- Asked: *"add a monster generator that creates random enemies that fit the doomverse. health values . attack sequence. all that"* → built in 0.3.0.
- Asked: *"and. Weapon generator the same"* → built in 0.3.1 (classes, every stat on a slider with reroll, own art, GZDoom export).

## 2026-11-17 · Glass
- Asked: *"we need panes of glass that both reflect and can break as a texture"*, then *"glass must also be transparent"*, then *"all of those glass options can be choices on or off as you build"*.
- Decided: glass is a line setting with every part a switch (see-through, reflection, breakable, blocks movement, tint) plus sliders.
- Built in 0.3.2: glass on two-sided lines, real reflections, cracks where you shoot, shards, quick looks; GZDoom export as translucent glass.

## 2026-11-17 · Cooler guns
- Asked: *"Are there sliders where I could have a super strong weapon and the way it looks? Like, are you making spacer rifles? Because that would be cool if you made really cool looking guns, all variations of it."*
- Honest answer: the first gun art was plain blocks and there was no single "strength" slider. Built 0.3.3: six gun styles (space rifle, railgun, bio, heavy, raygun, classic) and a Power 1–10 slider that changes both the look and the stats.

## 2026-11-17/18 · The art reckoning
- James on the code-drawn art: *"It looks like a 3-year-old ate half of the crayon while he was using the other half to draw these"*, and asked for a side-by-side with real Doom art and an honest breakdown.
- The build compared against Freedoom: shapes made by code (boxes, ovals, gradients) can't match sculpted/photographed/hand-pixeled art.
- James: *"I want you to gain inspiration from their monsters. And that is what the generator should do"*, and Halo-style idea: take inspiration, change barrels and grips, *"it will be ours. But it has to be in the same art, style, flavor, and taste."*
- James showed image sheets (*"this was done in about 50 seconds"*), then two more (20 monsters, 12 weapons). *"These are examples… Your art generator needs to follow this… These are our weapons."*
- Built 0.4.0: those sheets became EOD's painted art library and both generators build from it. Next: a generator that makes NEW art in this style (see STATUS in CHANGELOG).
- Third sheet (25 creatures, a demon in 5 angles + death, pickups, firing sequences incl. thrown spear/knife/disc) → 0.4.1.
- James (on art tools): he has several art tools and the GPU farm; art direction decided in chat.
- James's generator spec: creature types (humanoid, goblin, dog, eyeball, bat, golem, robot, elemental, spider, crab, demon, ghost, knight, mecha crab, floating skull, dark caster, darker caster, light caster, spiked demon dog, worm, dragon worm) with yes/no parts (horns, wings, guns, pauldrons, shield, armor, weapon); weapons by barrel (long, short, mini barrels) and type (pulse cannon, 12 gauge, projectile, spear, bladed, saw). *"An actual program that would do that?"*
- An outside prototype for a Windows Forge program came in. Decided: Pulse Forge as its own web product (forge/), EOD reads its art (0.4.2).
- Four more sheets (angles + deaths for 28 creatures, ~39 weapon sequences). James: *"I'm trying to give you variety… if we were to chop these up, what does our creature database look like? What does our weapon database look like?"* → 0.4.3 library: 74 monsters, 61 weapons.

## 2026-11-18 · Front door, demo maps, voodoo dolls
- James: *"I don't want a login screen or anything at the moment. I want it to just be able to be all the options available the second I go to the website… choose play a quick demo or create a monster, create a weapon, or edit a map or see a map. How many maps do we have? We should definitely have a demo map. We should have a few demo maps."*
- On Kevin's idea: *"Kevin was talking about something about a voodoo doll… some type of placeholder put on a elevator or escalator. It moves down the channel and holds a placement and presses a button… getting to it ends the level immediately."*
- Built 0.5.0: no-login hub page, four demo maps (Hangar, Voodoo Express, Glass Gallery, Bestiary Arena), voodoo dolls and conveyors working the classic Doom way.

## 2026-11-18 · The marine and the chaingun
- James: *"We have a smiley face guy at the bottom. He needs to be more Doom-ish. So some kind of soldier guy, you know, with the face when he gets hurt. He goes through the various degrees of being hurt."*
- And: *"I would love a chain gun. Let's do one where you start off on the other side and you're just mowing down a whole bunch of fucking dudes with a whole bunch of full chain gun ammo. And just a fun way to just burn everything down with a chain gun and just see what happens."*
- Built 0.6.0: the real Doom status bar with the marine's face (5 hurt levels, looks at the shooter, ouch, grin, rampage, god, dead) and demo map 5, Chaingun Carnage: 156 monsters in six waves, you with a chaingun and 999 bullets. Tuned so you deal 2.5× damage and take 0.2×, because at plain Doom numbers 100+ monsters killed the player in 10 seconds.

## 2026-11-19 · Turning, looking, and the classic guns
- James after Chaingun Carnage: *"Okay, that was fun. Now, I would like a double barrel shotgun. And I would like a 240 saw, a rocket launcher, and how do I turn? I can strafe left and right, but I don't know how to turn. Can I look up? Can I look down?"*
- On the screen controls: *"adapt the screen controls to include a look down, a look up, and U-turn maybe… If you press up, that's forward. If you press back, that's going reverse… I don't know how to turn around. I don't have a mouse to do it."*
- Found: turning on touch was a hidden drag-on-empty-screen, and nobody could look up/down on any input. The double barrel, chainsaw and rocket launcher already existed in the engine, just not in the demo.
- Built 0.6.1: a LOOK stick + ⟲ turn-around button, look up/down on every input, a choice of strafe or classic-arcade turning on the left stick, tap-the-status-bar gun picking, and those three guns (with ammo) in Chaingun Carnage.

## 2026-11-19 · King of Shit Hill, Kev's water plant, community maps
- James: *"I want another one called King of the Hill, or call it King of Shit Hill… have a precipice that you can look up and over, and you can gun everybody down from up top… a few weapons up there, some long-range weapons. Was there ever a sniper rifle in Doom? Probably not, right? If there is, put one up there. Put a rocket launcher up there, the chain gun, of course… you have to thin the crowd out before you start going down."*
- *"Look at some online maps, too… free maps, demo maps, things that people have made that said, go ahead and use it… get as many maps as we can."*
- Kevin's idea, as James told it: *"he wants to enter a water plant, and the idea is that when you start, the water that's flowing into the plant is green… you come across a demon or something that's stuck in the plumbing, so you have to break him out and shoot him out. And then when you do, the water turns blue, and then it starts flowing again, and then you have to fight your way out to the other side… It's like dual layered, this top layer, bottom layer… name it Kev's Water Plant Concept. And the water plant that he's talking about is in Bloomington, Illinois."*
- Decided: Doom never had a sniper rifle, so EOD got its own (Pulse Sniper, painted Marksman Rifle art). The water plant follows the real Lake Bloomington plant's flow (lake intake, treatment, pumping, clearwell), built as a game level. For free maps, Freedoom's BSD licence explicitly allows reuse, so all 68 Freedoom maps went in. Most other community maps have their own permission text per WAD, so they need checking one by one.
- Built 0.7.0.

## 2026-11-22 · The door that only opened a crack
- James: *"inside Kevin's water level, that door to the right doesn't open all the way. It just opens a fraction. Is there a secret, or is it just improperly tuned…?"*
- It was a mistake: the door touched the low intake grate, and Doom doors stop at the lowest neighboring ceiling. Moved the door clear of the grate and tested every door in every demo map. 0.7.1.

## 2026-11-22 · "This looks pretty grainy"
- James (screenshot from the water plant on his 4K screen): *"this looks prety grainy. can we do something about it in 4k?"*
- Cause: the game drew 320 pixels wide and stretched them. Built 0.7.2: Auto detail (steps up to whatever his machine keeps smooth), fixed levels up to Native 4K, an in-game Detail button, and optional smoothing. Next: split the drawing across CPU cores so 4K runs at full speed.
- Same day, 0.7.3: the renderer stored pixels in the wrong order for how it draws them, which got much worse at high resolution. Fixed; 1440p-class detail is about 2.3× faster.
