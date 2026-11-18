# Pulse Forge changelog

## v0.1.0 — 2026-11-18 — kickoff
- DNA builder for monsters (26 types, 20 parts) and weapons (21 types, 20 parts): Yes / No / 🎲 per part, 🔒 locks, seed, Randomize, family variants, Save/Load DNA.
- Art order writer with a strict, cuttable sheet layout (magenta background, rows per animation).
- Cutter: auto background removal, thin-line removal, piece joining, speck filter, row ordering, labels from the order, Doom sizing and palette, grid mode, download frames.
- Send to EOD: Forge library in IndexedDB, shared with EOD (EOD 0.4.2). Library list with Load DNA and Delete.
- Pulse standards: ghost manual, invert, settings (dark/light/device on first run, text size, crash log), About, Check for updates, green check / red undo.
- Tested in headless Chrome: GPT sheet with 5 angles + death cut into 11 frames, labeled correctly, sent to EOD, rolled as a monster that turns in game.
