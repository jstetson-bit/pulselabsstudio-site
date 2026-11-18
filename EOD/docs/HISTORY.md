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
- Claude compared against Freedoom: shapes made by code (boxes, ovals, gradients) can't match sculpted/photographed/hand-pixeled art.
- James: *"I want you to gain inspiration from their monsters. And that is what the generator should do"*, and Halo-style idea: take inspiration, change barrels and grips, *"it will be ours. But it has to be in the same art, style, flavor, and taste."*
- James showed GPT image sheets (*"GPT did this in about 50 seconds"*), then two more (20 monsters, 12 weapons). *"These are examples… Your art generator needs to follow this… These are our weapons."*
- Built 0.4.0: those sheets became EOD's painted art library and both generators build from it. Next: a generator that makes NEW art in this style (see STATUS in CHANGELOG).
