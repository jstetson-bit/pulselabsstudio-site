# Pulse Forge — how it came to be

## 2026-11-17/18 · Born out of EOD's art problem
- EOD's code-drawn monsters and guns were rejected: *"It looks like a 3-year-old ate half of the crayon while he was using the other half to draw these fucking images."*
- James wanted a generator that takes inspiration and makes original art in the same style: *"gain inspiration from their monsters… it will be ours. But it has to be in the same art, style, flavor, and taste."*
- GPT painted Doom-style sheets in about 50 seconds. James: *"These are examples… Your art generator needs to follow this… build the program that generates this."*
- James's spec: creature types (humanoid, goblin, dog, eyeball, bat, golem, robot, elemental, spider, crab, demon, ghost, knight, mecha crab, floating skull, dark caster, darker caster, light caster, spiked demon dog, worm, dragon worm) with yes/no horns, wings, guns, pauldrons, shield, armor, weapon; weapons by barrel (long, short, mini) and type (pulse cannon, 12 gauge, projectile, spear, bladed, saw). *"An actual program that would do that?"*
- On painters: *"I have OpenArt and I have ImagineArt. But GPT does art the best… I have the farm. I have all the 3090s that we could probably easily do a generator with."*
- GPT proposed a Windows Python/Qt "Creature & Weapon Forge" with DNA locking and a hybrid approach, and shared a prompt-builder prototype.
- Decided: one web app (works on his phone on the road, on PCs and inside EOD) named **Pulse Forge**, its own product with a page and card; DNA locking and families adopted from GPT's idea; the cutter built in; farm painter next.
