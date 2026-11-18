# Pulse Forge

**Live:** https://pulselabsstudio.com/forge/ · free · runs in any browser (phone, Windows, Android) · no account

## Why it exists
EOD's first monster and weapon generators drew art with code, and it looked bad (James: "It looks like a 3-year-old ate half of the crayon…").
Painted art from GPT looked like real Doom in under a minute. Pulse Forge is the program around the painter:
it designs the creature or gun, writes an exact art order, then cuts whatever the painter returns into game-ready Doom sprites and hands them to EOD.

## How it works
1. **DNA builder.** Monsters or Weapons. Type (James's list: humanoid, goblin, dog, spiked demon dog, eyeball, floating skull, bat, golem, robot, elemental, spider, crab, mecha crab, demon, ghost, knight, dark/darker/light caster, worm, dragon worm, plus wolf, spectral knight, alien insect, cybernetic revenant, armored beast). Size, colors, art style, behavior, family variant (Standard, Armored, Elite, Elemental, Boss). Every part is Yes / No / 🎲 with a 🔒 lock that Randomize respects. The seed is the DNA: same DNA, same order.
2. **Art order.** Plain text the painter follows: style lock, parts in/out, colors, and a fixed sheet layout on solid magenta #FF00FF (row 1 angles, row 2 walk, row 3 attack/pain, row 4 death; weapons: idle + firing row, pickup/projectile row). No text, borders or arrows, so a program can cut it.
3. **Cutter.** Drop or paste the picture. Finds the background color from the edges and floods it away, ignores thin lines (frames, shelves), joins nearby pieces, drops specks, orders drawings by rows, and labels each frame from the order's layout. Each frame is resized to Doom size (imp = 56) and crushed into the Doom palette. Every label can be changed. Grid mode for busy backgrounds.
4. **Send to EOD.** Saved in IndexedDB `pulse-forge` (same site as EOD). EOD merges it into its painted-art library (names start with ⚒). A map that uses Forge art carries its own copy (`M.artData` + `M.artMeta`), so other players see it.

## Painters
- Now: ChatGPT (best), OpenArt, ImagineArt, by copy and paste.
- Next: James's 3090 farm running an open image model (license must allow selling) trained on our sheets, called straight from Forge.

## Files
- `forge/src/index.src.html` → `python3 forge/src/build.py` → `forge/index.html` (inserts the Doom palette from EOD).
- Deploy copies `forge/` minus `src/` and `docs/`.
