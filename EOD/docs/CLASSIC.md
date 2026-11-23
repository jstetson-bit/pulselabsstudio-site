# EOD Classic — the compatibility editor

**Version 0.1.0 (vc1)** · live at https://pulselabsstudio.com/EOD/classic.html · linked from the EOD hub.

## Why it exists
James, 2026-11-22: *"We need to build a pure vanilla doom compatibility editor. still all online and everything else, but no new tricks, just inventive ways to achieve the same goals with those tools. I want to be able to build maps that are compatible with vanilla, boom, UDMF, MDF21. ID24. I want to leave the site as is, but I want another link on the page for this project."*

EOD stays as it is (its own engine, glass, painted monsters and guns, triggers, waves). EOD Classic uses the same drawing tools with none of that: only what the target format really has.

## How it works
- **Target format per map** (top bar button, File → Target format): Vanilla Doom II · Boom · MBF21 · ID24 · UDMF (Doom namespace). Each level includes the ones before it (vanilla < boom < mbf < mbf21 < id24).
- **Action list** follows the format: EOD's plain names for the classic actions, the spec's names for Boom/MBF/MBF21/ID24 additions. Boom generalized actions (0x2F80–0x7FFF) are accepted by the check (a builder for them is on the roadmap).
- **Thing browser** shows only what the format has: all of Doom II's things (including the ones EOD's own engine can't draw yet, placed for export), Boom's pushers/pullers, MBF's dog, ID24's new monsters and props (those need id24res.wad in the port).
- **Map check** (File → Check map): EOD-only content (glass, generated monsters/weapons, triggers, picture textures), actions/sector types/flags the format doesn't have, unknown things (vanilla stops with "P_SpawnMapThing: Unknown type"), textures and flats missing from the game files (vanilla stops with "R_TextureNumForName"), map slot (MAP01–MAP32), coordinates past ±32767, long lines, and the node counts against the limits (segs, vertices, sidedefs, blockmap size).
- **Export**: binary formats get a real BSP (SEGS/SSECTORS/NODES), BLOCKMAP and REJECT from EOD's own node builder; every export runs a self-check that walks the tree like the game does. UDMF writes TEXTMAP (namespace "doom"); the port builds its own nodes.
- **Own storage:** autosave, backup and prefabs are kept apart from the full EOD editor (`eodc.` keys).

## Tested (2026-11-22)
- Freedoom MAP01, MAP07, MAP15, MAP29 rebuilt with the node builder: load and render in Chocolate Doom and DSDA-Doom (complevel 2); self-check 0 wrong points of 8,040.
- A Boom map (conveyor voodoo doll) in DSDA-Doom complevel 9.
- UDMF export round-trips through the importer with identical counts. DSDA-Doom only reads its own "dsda" UDMF namespace, so the Doom-namespace UDMF is for GZDoom / Eternity / EDGE-Classic / Helion.

## Roadmap (OPEN, nothing promised)
- **Test in real vanilla in the browser:** Chocolate Doom built for the web, playing the map with the free Freedoom game files.
- Boom generalized action builder (pick trigger, target, speed… instead of a number).
- DSDA namespace UDMF (Hexen-style actions) next to the Doom namespace.
- TEXTURE1/PNAMES packing so a classic map can carry its own textures.
- MAPINFO / UMAPINFO, DEHACKED / DEHEXTRA / ID24HACKED editing.
- Classic map library and publishing (the "online and everything else" part).
- Name: "EOD Classic" is a working name.

## Sources
- Format tables: Boom Standards feature-set specs (github.com/elf-alchemist/boom-standards), via `EOD/tools/gen_formats.py`.
- UDMF: UDMF 1.1 specification.

## Version history
- **0.1.0 (vc1), 2026-11-22** — first build: page and hub link, format picker, per-format action list / thing browser / map check, node builder + blockmap + reject, UDMF export, own storage.
