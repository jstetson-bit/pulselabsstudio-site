/* ================= DEMO MAPS (built in code, always available) ================= */
const DEMO_MAPS = {
  hangar: { name: 'Hangar of Shit', blurb: 'The classic test map: doors, a lift, nukage, a secret, a glass pane to shoot out.', build: () => buildSampleMap() },
  voodoo: { name: 'Voodoo Express', blurb: 'A voodoo doll on a conveyor opens the monster cages and the exit for you. Flip the switch and watch.', build: () => buildVoodooMap() },
  glass: { name: 'Glass Gallery', blurb: 'Six glass panes: clear, mirror, frosted, stained, bulletproof and Pulse red, with painted monsters behind them.', build: () => buildGlassMap() },
  hill: { name: 'King of Shit Hill', blurb: 'You hold the summit. Snipe, rocket and chaingun the horde in the valley below, thin them out, then fight your way down the ramp to the exit.', build: () => buildHillMap() },
  water: { name: "Kev's Water Plant Concept", blurb: "Kevin's idea, based on the Lake Bloomington water plant. Green sludge flows in. Fight inside, break the demon out of the plumbing and kill him, and the water runs blue again. Then fight your way out.", build: () => buildWaterMap() },
  chaingun: { name: 'Chaingun Carnage', blurb: 'You start at the far end with a chaingun and a mountain of bullets. Over 100 of them come for you. Burn it all down.', build: () => buildChaingunMap() },
  uac: { name: 'UAC Corridor', blurb: 'The hallway from the new gun art, built to play: grated floor, orange ceiling lights, amber floor lights, computer bays, a control room and a hall at the end.', build: () => buildUacMap() },
  arena: { name: 'Bestiary Arena', blurb: 'An open-sky arena full of painted monsters from the art library, and painted guns to pick up.', build: () => buildArenaMap() }
};
function demoRect(x0, y0, x1, y1, props) { const s = drawShape(rectPts(x0, y0, x1, y1), true); if (props) Object.assign(M.sec[s], props); return s; }
function demoLine(x0, y0, x1, y1) { return findLine(findVertex(x0, y0), findVertex(x1, y1)); }
function demoWalls(map) { M.l.forEach(L => { if (L.s1 >= 0 && L.s2 < 0) { const d = M.sd[L.s1], w = map[d.sec]; if (w && d.mid !== 'DOORTRAK' && !/^SW/.test(d.mid)) d.mid = w; } }); }
// a closed door sector that only a tag can open (no hand-opening)
function tagDoor(si, tag) { makeDoor(si); M.sec[si].tag = tag; for (const li of sectorLines(si)) { const L = M.l[li]; if (L.s2 >= 0) { L.sp = 0; L.tag = 0; } } }
function demoMonster(art, seed, tier) { const d = rollMonster({ art, tier: tier || 'soldier', seed }); if (art && artMon(art)) { d.look.art = art; d.look.hue = 0; d.look.sat = 100; d.look.bri = 100; d.look.size = 1; d.look.mirror = false; } const t = nextMonType(); M.mon = M.mon || {}; M.mon[t] = d; return t; }
function demoWeapon(art, seed) { const d = rollWeapon({ art, seed }); if (art && artWep(art)) { d.look.art = art; d.look.hue = 0; d.look.sat = 100; d.look.bri = 100; } const id = nextWepId(); M.wep = M.wep || {}; M.wep[id] = d; return id; }

function buildVoodooMap() {
  M = emptyMap(); M.name = 'MAP02'; M.mon = {}; M.wep = {};
  M.hint = 'Hit the switch on the south wall. A voodoo doll rides a conveyor next door and opens things for you.';
  const S0 = demoRect(0, 0, 512, 384, { fh: 0, ch: 128, li: 192, ft: 'FLOOR5_2', ct: 'CEIL3_5' });
  const Nic = demoRect(224, -16, 288, 0, { fh: 0, ch: 72, li: 192 });
  const D1 = demoRect(224, 384, 288, 400, { fh: 0, ch: 128, li: 160 });
  const Ar = demoRect(0, 400, 576, 960, { fh: 0, ch: 192, li: 176, ft: 'FLOOR7_1', ct: 'F_SKY1' });
  const C1 = demoRect(0, 720, 96, 880, { fh: 0, ch: 128, li: 120 }), P1 = demoRect(96, 720, 112, 880, { fh: 128, ch: 128, li: 120, tag: 3 });
  const C2 = demoRect(480, 720, 576, 880, { fh: 0, ch: 128, li: 120 }), P2 = demoRect(464, 720, 480, 880, { fh: 128, ch: 128, li: 120, tag: 3 });
  const X = demoRect(224, 960, 352, 976, { fh: 0, ch: 128, li: 160 });
  const E = demoRect(224, 976, 352, 1104, { fh: 0, ch: 128, li: 224, ft: 'FLAT14' });
  // the doll's track (sealed off from the player)
  const T0 = demoRect(640, 0, 704, 96, { fh: 0, ch: 128, li: 200, tag: 10, ft: 'FLAT5_4' });
  const Gt = demoRect(640, 96, 704, 112, { fh: 0, ch: 128, li: 200 });
  const T1 = demoRect(640, 112, 704, 400, { fh: 0, ch: 128, li: 200, tag: 10, ft: 'FLAT5_4' });
  const T2 = demoRect(640, 400, 704, 800, { fh: 0, ch: 128, li: 200, tag: 10, ft: 'FLAT5_4' });
  const T3 = demoRect(640, 800, 704, 1024, { fh: 0, ch: 128, li: 200, tag: 10, ft: 'FLAT5_4' });
  const K = demoRect(760, 0, 776, 96, { fh: 0, ch: 64, li: 120 }); // conveyor control line lives here
  makeDoor(D1); tagDoor(Gt, 2); tagDoor(X, 4);
  demoWalls({ [S0]: 'STARTAN3', [Nic]: 'STARTAN3', [Ar]: 'STONE2', [C1]: 'STONE2', [C2]: 'STONE2', [E]: 'STARTAN3', [T0]: 'SUPPORT3', [T1]: 'SUPPORT3', [T2]: 'SUPPORT3', [T3]: 'SUPPORT3', [K]: 'SUPPORT3' });
  [P1, P2].forEach(si => sectorLines(si).forEach(li => { const L = M.l[li]; for (const s of [L.s1, L.s2]) if (s >= 0) { M.sd[s].lo = 'STONE2'; M.sd[s].up = 'STONE2'; } }));
  // switch opens the doll's gate
  let li = demoLine(224, -16, 288, -16); if (li >= 0) { M.l[li].sp = 103; M.l[li].tag = 2; M.sd[M.l[li].s1].mid = 'SW1COMP'; }
  // doll lines: lower the cage walls, then open the exit door
  li = demoLine(640, 400, 704, 400); if (li >= 0) { M.l[li].sp = 38; M.l[li].tag = 3; }
  li = demoLine(640, 800, 704, 800); if (li >= 0) { M.l[li].sp = 2; M.l[li].tag = 4; }
  // conveyor: a 96-long line pointing north, 3 units per tic
  for (const [a, b] of [[[760, 0], [760, 96]], [[776, 0], [776, 96]]]) { const k = demoLine(a[0], a[1], b[0], b[1]); if (k < 0) continue; const L = M.l[k], v1 = M.v[L.v1], v2 = M.v[L.v2]; if (v2.y > v1.y) { L.sp = 252; L.tag = 10; break; } }
  if (!M.l.some(L => L.sp === 252)) { const k = demoLine(760, 0, 760, 96); if (k >= 0) { const L = M.l[k]; if (M.v[L.v2].y < M.v[L.v1].y) flipLine(L); L.sp = 252; L.tag = 10; } }
  li = demoLine(224, 1104, 352, 1104); if (li >= 0) { M.l[li].sp = 11; M.sd[M.l[li].s1].mid = 'SW1EXIT'; }
  const T = (type, x, y, a = 90, f = 7) => M.t.push({ x, y, a, type, f });
  T(1, 672, 48, 90);            // the voodoo doll (any Player 1 Start that is not the last one)
  T(2001, 256, 200); T(2008, 200, 200); T(2008, 312, 200); T(2011, 64, 64); T(2048, 448, 64);
  T(3001, 40, 760, 0); T(3001, 40, 840, 0); T(3001, 536, 760, 180); T(3001, 536, 840, 180);
  T(3004, 200, 900, 270); T(3004, 380, 900, 270); T(2012, 288, 1040);
  T(1, 256, 64, 90);            // YOU: the last Player 1 Start
  compact();
}
function buildGlassMap() {
  M = emptyMap(); M.name = 'MAP03'; M.mon = {}; M.wep = {};
  M.hint = 'Six kinds of glass, left to right: clear, mirror, frosted, stained, bulletproof (cracks but never breaks) and Pulse red. Shoot them, look from the side, try the mirror.';
  const H = demoRect(0, 0, 768, 512, { fh: 0, ch: 160, li: 192, ft: 'FLOOR4_8', ct: 'CEIL5_2' });
  const looks = ['Clear window', 'Mirror', 'Frosted', 'Stained (middle texture)', 'Bulletproof', 'Pulse red'];
  const arts = ['gore_eye', 'crimson_crusader', 'jade_wraith', 'void_sorcerer', 'war_mech', 'blood_gargoyle'];
  const al = [];
  for (let i = 0; i < 6; i++) { const x0 = 16 + i * 128; al.push(demoRect(x0, 512, x0 + 112, 640, { fh: 0, ch: 160, li: 160 + (i % 2) * 32, ft: 'FLAT5_3' })); }
  const ex = demoRect(768, 224, 784, 288, { fh: 0, ch: 96, li: 192 });
  demoWalls({ [H]: 'STARTAN2', [ex]: 'STARTAN2', ...Object.fromEntries(al.map(s => [s, 'MARBLE1'])) });
  for (let i = 0; i < 6; i++) { const x0 = 16 + i * 128, k = demoLine(x0, 512, x0 + 112, 512); if (k < 0) continue; const P = GLASS_PRESETS[looks[i]]; M.l[k].glass = Object.assign({}, P); if (looks[i].startsWith('Stained')) for (const s of [M.l[k].s1, M.l[k].s2]) if (s >= 0) M.sd[s].mid = 'MARBFAC3'; }
  const k = demoLine(784, 224, 784, 288); if (k >= 0) { M.l[k].sp = 11; M.sd[M.l[k].s1].mid = 'SW1EXIT'; }
  const T = (type, x, y, a = 90, f = 7) => M.t.push({ x, y, a, type, f });
  arts.forEach((a, i) => T(demoMonster(a, 700 + i, 'soldier'), 72 + i * 128, 590, 270, 15));
  T(2001, 300, 120); T(2008, 340, 120); T(2008, 420, 120); T(2002, 460, 120); T(2048, 500, 120); T(2012, 700, 80);
  T(1, 384, 64, 90);
  compact();
}
function buildArenaMap() {
  M = emptyMap(); M.name = 'MAP04'; M.mon = {}; M.wep = {};
  M.hint = 'Painted guns are on the floor ahead. Grab one and clear the arena.';
  const A = demoRect(0, 0, 1024, 1024, { fh: 0, ch: 320, li: 208, ft: 'RROCK09', ct: 'F_SKY1' });
  const C = demoRect(416, 416, 608, 608, { fh: 24, ch: 320, li: 224, ft: 'FLAT1_1', ct: 'F_SKY1' });
  const N = demoRect(480, 1024, 544, 1040, { fh: 0, ch: 96, li: 192 });
  demoWalls({ [A]: 'ROCK3', [C]: 'ROCK3', [N]: 'ROCK3' });
  sectorLines(C).forEach(li => { const L = M.l[li]; for (const s of [L.s1, L.s2]) if (s >= 0) M.sd[s].lo = 'ROCK3'; });
  const k = demoLine(480, 1040, 544, 1040); if (k >= 0) { M.l[k].sp = 11; M.sd[M.l[k].s1].mid = 'SW1EXIT'; }
  const T = (type, x, y, a = 90, f = 7) => M.t.push({ x, y, a, type, f });
  ['storm_minigun', 'void_cannon', 'octagon_shotgun', 'spear'].forEach((w, i) => T(demoWeapon(w, 40 + i), 380 + i * 88, 220));
  const mons = ['spine_baron', 'magma_brute', 'fallen_seraph', 'mecha_crab', 'azure_skull', 'goblin_gunner', 'bone_templar', 'storm_golem', 'wing_fiend', 'brain_maw'];
  mons.forEach((m, i) => { const ang = i / mons.length * Math.PI * 2, r = 300; T(demoMonster(m, 900 + i, i % 3 === 0 ? 'heavy' : 'soldier'), 512 + Math.cos(ang) * r, 660 + Math.sin(ang) * r * 0.8, 270, 15); });
  T(2048, 300, 120); T(2048, 724, 120); T(2018, 512, 120); T(2047, 512, 160); T(2012, 512, 512); T(2014, 470, 470); T(2014, 554, 554); T(2018, 200, 200); T(2019, 824, 824);
  T(1, 512, 64, 90);
  compact();
}
function buildChaingunMap() {
  M = emptyMap(); M.name = 'MAP05'; M.mon = {}; M.wep = {};
  M.hint = 'Hold FIRE. Six waves are coming. Tap the numbers on the bar to switch guns: 2 = chainsaw (again = pistol), 4 = double barrel, 5 = chaingun, 6 = rockets.';
  const SO = demoSawedOff(71), CB = demoCarbine(72);
  M.start = { weapons: [1, 4, 5, 6, SO, CB], ammo: { bullets: 999, shells: 100, rockets: 60 }, max: { bullets: 999, shells: 200, rockets: 150 }, w: 5, hp: 200, armor: 200, at: 2, waveAt: 14, waveGap: 16, hurt: 0.2, power: 2.5 };
  // you: a firing deck at the south end; them: a long open canyon, then a staging yard where the waves pour in
  const Deck = demoRect(0, 0, 1024, 256, { fh: 24, ch: 320, li: 208, ft: 'FLAT20', ct: 'F_SKY1' });
  const Can = demoRect(0, 256, 1024, 2304, { fh: 0, ch: 320, li: 176, ft: 'RROCK19', ct: 'F_SKY1' });
  const Yard = demoRect(64, 2304, 960, 2816, { fh: 0, ch: 320, li: 144, ft: 'RROCK19', ct: 'F_SKY1' });
  const Ex = demoRect(448, -16, 576, 0, { fh: 24, ch: 160, li: 208 });
  demoWalls({ [Deck]: 'METAL2', [Can]: 'ROCK4', [Yard]: 'ROCK4', [Ex]: 'METAL2' });
  sectorLines(Deck).forEach(li => { const L = M.l[li]; for (const sd of [L.s1, L.s2]) if (sd >= 0) M.sd[sd].lo = 'METAL2'; });
  const k = demoLine(448, -16, 576, -16); if (k >= 0) { M.l[k].sp = 11; M.sd[M.l[k].s1].mid = 'SW1EXIT'; }
  const T = (type, x, y, a = 90, f = 7, wave = 0) => M.t.push(wave ? { x, y, a, type, f, wave } : { x, y, a, type, f });
  const row = (type, cnt, y, wave, x0 = 96, x1 = 928) => { for (let i = 0; i < cnt; i++) T(type, x0 + (i + 0.5) * ((x1 - x0) / cnt) + ((y * 7 + i * 53) % 36) - 18, y, 270, 7, wave); };
  // first wave: already standing in the canyon
  row(3004, 8, 1200, 0); row(3001, 6, 1360, 0); row(3004, 8, 1520, 0); row(3001, 6, 1700, 0); row(3002, 3, 1850, 0);
  // the rest storm out of the yard in waves
  const W = [[[3004, 10], [3001, 6]], [[3001, 8], [3002, 5], [9, 4]], [[3004, 12], [9, 6], [65, 2]], [[3002, 8], [3001, 10]], [[9, 8], [65, 4], [3001, 8]], [[3002, 10], [3001, 10], [65, 4], [3004, 10]]];
  W.forEach((g, wi) => { let y = 2400; g.forEach(([type, cnt]) => { for (let o = 0; o < cnt; o += 10) { row(type, Math.min(10, cnt - o), y, wi + 1, 120, 900); y += 70; } }); });
  for (let i = 0; i < 8; i++) T(2048, 96 + i * 120, 36);
  for (let i = 0; i < 4; i++) { T(2049, 150 + i * 240, 96); T(2046, 270 + i * 240, 96); }
  T(2013, 160, 200); T(2013, 864, 200); T(2012, 360, 60); T(2012, 664, 60); T(2012, 60, 140); T(2012, 964, 140); T(2019, 512, 60); T(8, 940, 220);
  T(1, 512, 140, 90);
  compact();
}
/* UAC Corridor: the tech hallway from James's new gun paintings, made playable */
function buildUacMap() {
  M = emptyMap(); M.name = 'MAP08'; M.mon = {}; M.wep = {};
  M.hint = 'UAC Corridor. Grab the carbine and the shotgun, work up the hallway, clear the control room on the right (the Sawed-Off is in there), then open the big door at the end. Exit is on the far wall of the hall.';
  const W = 'STARTAN3', TECH = 'STARTAN3';
  const St = demoRect(0, 0, 384, 256, { fh: 0, ch: 128, li: 176, ft: 'FLOOR4_8', ct: 'CEIL3_5' });
  const C = demoRect(64, 256, 320, 1792, { fh: 0, ch: 128, li: 136, ft: 'FCGRATE1', ct: 'CEIL5_1' });
  // recessed orange ceiling lights down the middle of the hallway
  const lights = []; for (let y = 352; y < 1760; y += 256) lights.push(demoRect(160, y, 224, y + 64, { fh: 0, ch: 140, li: 224, ft: 'FCGRATE1', ct: 'TLITE6_6' }));
  // computer bays in the right wall, amber light slots low in the left wall
  const bays = [480, 992, 1504].map(y => demoRect(320, y, 344, y + 128, { fh: 24, ch: 104, li: 176, ft: 'FLAT20', ct: 'CEIL5_1' }));
  const slots = []; for (let y = 416; y < 1760; y += 256) slots.push(demoRect(48, y, 64, y + 96, { fh: 8, ch: 28, li: 255, ft: 'FLAT20', ct: 'FLAT20' }));
  // control room off the right side
  const D2 = demoRect(320, 1184, 336, 1280, { fh: 0, ch: 128, li: 136, ft: 'FLAT20', ct: 'FLAT20' });
  const R = demoRect(336, 1056, 832, 1472, { fh: 0, ch: 160, li: 160, ft: 'FLOOR0_6', ct: 'CEIL3_4' });
  const Rdesk = demoRect(560, 1200, 720, 1264, { fh: 40, ch: 160, li: 176, ft: 'FLAT14', ct: 'CEIL3_4' });
  // the big door and the hall
  const D3 = demoRect(64, 1792, 320, 1808, { fh: 0, ch: 128, li: 136, ft: 'FLAT20', ct: 'FLAT20' });
  const H = demoRect(-160, 1808, 544, 2400, { fh: 0, ch: 224, li: 168, ft: 'FLOOR4_8', ct: 'CEIL3_5' });
  const Hstep = demoRect(-160, 2144, 544, 2192, { fh: 16, ch: 224, li: 172, ft: 'FLOOR4_8', ct: 'CEIL3_5' });
  const Hup = demoRect(-160, 2192, 544, 2400, { fh: 32, ch: 224, li: 176, ft: 'FLOOR4_8', ct: 'CEIL3_5' });
  const Ex = demoRect(128, 2400, 256, 2416, { fh: 32, ch: 136, li: 200 });
  makeDoor(D2); makeDoor(D3);
  const wall = { [St]: W, [C]: TECH, [R]: 'COMPTALL', [H]: W, [Hstep]: W, [Hup]: W, [Ex]: W, [Rdesk]: 'COMPSTA1' };
  bays.forEach(b => wall[b] = 'COMPSTA1'); slots.forEach(b => wall[b] = 'LITEYEL1');
  demoWalls(wall);
  const skin = { [Rdesk]: 'COMPSTA2', [Hup]: 'STEP1', [Hstep]: 'STEP1' }; bays.forEach(b => skin[b] = 'SHAWN2'); slots.forEach(b => skin[b] = TECH);
  demoSkin(skin, 'SUPPORT3');
  // the big door's faces
  sectorLines(D3).forEach(li => { const L = M.l[li]; for (const sd of [L.s1, L.s2]) if (sd >= 0 && M.sd[sd].up !== '-') M.sd[sd].up = 'BIGDOOR2'; });
  const k = demoLine(128, 2416, 256, 2416); if (k >= 0) { M.l[k].sp = 11; M.sd[M.l[k].s1].mid = 'SW1EXIT'; }
  const SO = demoSawedOff(73), CB = demoCarbine(74);
  const T = (type, x, y, a = 90, f = 7) => M.t.push({ x, y, a, type, f });
  // start
  T(1, 192, 96, 90); T(2001, 96, 190); T(CB, 192, 170); T(2048, 300, 120); T(2008, 290, 190); T(2018, 192, 210);
  // hallway
  T(3004, 150, 620, 270); T(3004, 250, 760, 270); T(3004, 190, 980, 270); T(9, 140, 1160, 270); T(9, 260, 1330, 270);
  T(3001, 190, 1560, 270); T(3001, 120, 1700, 270); T(3002, 240, 1640, 270); T(58, 150, 1460, 270, 6);
  T(2008, 100, 900); T(2012, 280, 1080); T(2048, 120, 1400);
  // control room
  T(65, 760, 1120, 180); T(65, 760, 1420, 180); T(3001, 480, 1110, 180); T(3001, 480, 1430, 180); T(3004, 640, 1340, 180); T(9, 650, 1140, 180);
  T(SO, 640, 1232); T(2049, 420, 1240); T(2002, 780, 1260); T(2048, 780, 1310); T(2012, 420, 1300); T(2019, 800, 1080); T(2035, 380, 1100); T(2035, 380, 1410);
  // the hall: a welcoming party
  T(3001, -60, 1960, 0); T(3001, 440, 1960, 180); T(9, 80, 2240, 270); T(9, 300, 2240, 270); T(3002, 190, 2000, 270); T(3002, 250, 2060, 270);
  T(3005, 190, 2300, 270, 6); T(65, -100, 2300, 270); T(65, 480, 2300, 270); T(69, 190, 2340, 270, 4);
  T(2046, -120, 1860); T(2049, 500, 1860); T(2012, 190, 2200); T(2013, -120, 2360, 90, 6);
  compact();
}
/* give two-sided lines their upper/lower textures (steps, ledges, pools) from a per-sector table */
function demoSkin(tex, def) { M.l.forEach(L => { if (L.s1 < 0 || L.s2 < 0) return; for (const sd of [L.s1, L.s2]) { const d = M.sd[sd], t = tex[d.sec] || def; if (d.lo === '-') d.lo = t; if (d.up === '-') d.up = t; } }); }
/* Sawed-Off: short double barrel, both barrels in one pull, huge up close, break-open reload after every blast */
function demoSawedOff(seed) {
  const id = demoWeapon(artWep('coach') ? 'coach' : 'dbl1', seed), d = M.wep[id];
  Object.assign(d, { name: 'Sawed-Off', kind: 'hit', ammo: 'shells', use: 2, rate: 10, reload: 56, reloadAnim: 'break', pellets: 24, spread: 0.16, dmg: [6, 16], close: 1, recoil: 9, give: 16, snd: 'dshtgn', proj: null, splash: 0, range: 0 });
  return id;
}
/* Carbine: hand-painted black rifle, 30-round magazine, quick and accurate */
function demoCarbine(seed) {
  const id = demoWeapon(artWep('carbine') ? 'carbine' : 'pulse_rifle', seed), d = M.wep[id];
  Object.assign(d, { name: 'Carbine', kind: 'hit', ammo: 'bullets', use: 1, rate: 4, pellets: 1, spread: 0.025, dmg: [12, 22], recoil: 2, give: 30, mag: 30, magReload: 48, snd: 'pistol', proj: null, splash: 0, range: 0, longRange: 3000 });
  return id;
}
/* a long-range painted rifle for the summit (Doom never had one) */
function demoSniper(seed) {
  const id = demoWeapon('marksman_rifle', seed), d = M.wep[id];
  Object.assign(d, { name: 'Pulse Sniper', kind: 'hit', ammo: 'bullets', use: 1, rate: 30, pellets: 1, spread: 0, dmg: [90, 160], recoil: 7, give: 40, longRange: 6000, proj: null, splash: 0, range: 0 });
  return id;
}
function buildHillMap() {
  M = emptyMap(); M.name = 'MAP06'; M.mon = {}; M.wep = {};
  M.hint = 'You hold the summit. Grab the guns behind you, thin out the valley, then take the ramp (east side) down to the exit (south end).';
  M.start = { hp: 100, armor: 100, at: 1, hurt: 0.35, power: 1.2, waveAt: 22, waveGap: 35, waveFirst: 40 };
  const RK = 'ROCK4', T = (type, x, y, a = 270, f = 7, wave = 0) => M.t.push(wave ? { x, y, a, type, f, wave } : { x, y, a, type, f });
  // the valley (fh 0) and the south strip by the exit
  const V = demoRect(0, 0, 1792, 2048, { fh: 0, ch: 640, li: 208, ft: 'RROCK19', ct: 'F_SKY1' });
  const V2 = demoRect(1792, 0, 2048, 320, { fh: 0, ch: 640, li: 176, ft: 'RROCK19', ct: 'F_SKY1' });
  // the ramp down the east side: 18 steps of 24
  const steps = []; for (let k = 0; k < 18; k++) steps.push(demoRect(1792, 2048 - (k + 1) * 96, 2048, 2048 - k * 96, { fh: 432 - (k + 1) * 24, ch: 640, li: 192, ft: 'RROCK09', ct: 'F_SKY1' }));
  // the summit (fh 432): a cliff edge over the valley, a ridge to the ramp, an armory behind
  const Sm = demoRect(640, 2048, 1408, 2560, { fh: 432, ch: 640, li: 224, ft: 'RROCK09', ct: 'F_SKY1' });
  const Rg = demoRect(1408, 2048, 2048, 2304, { fh: 432, ch: 640, li: 208, ft: 'RROCK09', ct: 'F_SKY1' });
  const Ar = demoRect(832, 2560, 1216, 2752, { fh: 432, ch: 560, li: 192, ft: 'FLOOR4_8', ct: 'CEIL5_2' });
  // cover in the valley
  const cover = [[300, 500], [700, 900], [1200, 600], [400, 1400], [1000, 1300], [1500, 1100], [800, 300], [1400, 1700]].map(([x, y]) => demoRect(x, y, x + 96, y + 96, { fh: 72, ch: 640, li: 176, ft: 'FLAT5_4', ct: 'F_SKY1' }));
  const Ex = demoRect(896, -16, 1152, 0, { fh: 0, ch: 128, li: 208 });
  const wall = { [Ar]: 'METAL2', [Ex]: 'METAL2' }; cover.forEach(c => wall[c] = 'SUPPORT3');
  demoWalls(Object.assign({ [V]: RK, [V2]: RK, [Sm]: RK, [Rg]: RK }, Object.fromEntries(steps.map(s => [s, RK])), wall));
  demoSkin(Object.fromEntries(cover.map(c => [c, 'SUPPORT3'])), RK);
  const k = demoLine(896, -16, 1152, -16); if (k >= 0) { M.l[k].sp = 11; M.sd[M.l[k].s1].mid = 'SW1EXIT'; }
  // the summit armory: long-range guns + ammo
  T(demoSniper(61), 1024, 2700, 270); T(demoSawedOff(72), 760, 2620); T(2003, 900, 2620); T(2002, 1148, 2620); T(82, 1024, 2600); T(2004, 1150, 2720);
  for (let i = 0; i < 4; i++) { T(2048, 870 + i * 100, 2470); T(2046, 870 + i * 100, 2400); }
  T(2049, 760, 2300); T(2049, 1290, 2300); T(17, 1290, 2450); T(2019, 760, 2450); T(2012, 1700, 2200); T(2012, 1900, 2200);
  T(1, 1024, 2350, 270);
  // the horde in the valley
  const row = (type, n, y, x0, x1, wave = 0) => { for (let i = 0; i < n; i++) T(type, x0 + (i + 0.5) * (x1 - x0) / n + ((y * 3 + i * 41) % 30) - 15, y, 90, 7, wave); };
  row(3004, 10, 1800, 80, 1700); row(3001, 8, 1650, 80, 1700); row(9, 8, 1450, 80, 1700); row(3004, 10, 1250, 80, 1700); row(3002, 6, 1100, 200, 1600);
  row(3001, 8, 900, 80, 1700); row(65, 4, 750, 200, 1600); row(69, 3, 550, 300, 1500); row(66, 3, 400, 300, 1500); row(3003, 1, 220, 1000, 1100);
  [[348, 548], [748, 948], [1248, 648], [448, 1448], [1048, 1348], [1548, 1148]].forEach(([x, y], i) => T(i % 2 ? 65 : 9, x, y));
  // waves pour in from the south once the valley thins out
  row(3004, 10, 120, 100, 1700, 1); row(3001, 8, 200, 100, 1700, 1); row(3002, 6, 120, 300, 1500, 2); row(9, 6, 200, 300, 1500, 2); row(66, 2, 160, 600, 1200, 2); row(67, 2, 160, 400, 1400, 3); row(3001, 10, 220, 100, 1700, 3); row(69, 3, 120, 500, 1300, 3);
  compact();
}
function buildWaterMap() {
  M = emptyMap(); M.name = 'MAP07'; M.mon = {}; M.wep = {};
  M.hint = "Kev's Water Plant: the water is green. Get inside, find what is clogging the plumbing, break it out and kill it. He's tough: bring the Sawed-Off or the rockets from the pump room.";
  M.start = { hp: 100, waveHold: true, waveAt: 6, waveGap: 25, hurt: 0.6 };
  const T = (type, x, y, a = 90, f = 7, wave = 0) => M.t.push(wave ? { x, y, a, type, f, wave } : { x, y, a, type, f });
  const G10 = { ft: 'NUKAGE1', sp: 7, tag: 10 }; // green, hurts; turns blue later
  // 1. Lake Bloomington shore + raw-water intake channel (flowing in, green)
  const Lake = demoRect(0, 0, 1536, 512, Object.assign({ fh: -16, ch: 512, li: 176, ct: 'F_SKY1', flow: [0, 1.5] }, G10));
  const Shore = demoRect(0, 512, 1536, 768, { fh: 0, ch: 512, li: 192, ft: 'GRASS1', ct: 'F_SKY1' });
  const WalkW = demoRect(512, 768, 640, 1536, { fh: 0, ch: 512, li: 176, ft: 'FLAT5_4', ct: 'F_SKY1' });
  const Chan = demoRect(640, 768, 896, 1536, Object.assign({ fh: -16, ch: 512, li: 176, ct: 'F_SKY1', flow: [0, 2] }, G10));
  const WalkE = demoRect(896, 768, 1024, 1536, { fh: 0, ch: 512, li: 176, ft: 'FLAT5_4', ct: 'F_SKY1' });
  const Grate = demoRect(640, 1536, 896, 1552, Object.assign({ fh: -16, ch: 24, li: 144, ct: 'FLAT20', flow: [0, 2] }, G10));
  const Door1 = demoRect(912, 1536, 1008, 1552, { fh: 0, ch: 128, li: 160, ft: 'FLAT20', ct: 'FLAT20' });
  // 2. Treatment hall (lower floor -64): settling basins, a sluice, catwalks above (upper layer)
  const Hall = demoRect(256, 1552, 1280, 2304, { fh: -64, ch: 192, li: 176, ft: 'FLOOR0_6', ct: 'CEIL5_2', tag: 40 });
  const Ves = demoRect(896, 1552, 1024, 1616, { fh: -40, ch: 192, li: 176, ft: 'FLAT20', ct: 'CEIL5_2', tag: 40 });
  const BasW = demoRect(352, 1700, 608, 2200, Object.assign({ fh: -80, ch: 192, li: 160, ct: 'CEIL5_2' }, G10, { tag: 10 }));
  const Slu = demoRect(640, 1552, 896, 2304, Object.assign({ fh: -80, ch: 192, li: 160, ct: 'CEIL5_2' }, G10));
  const BasE = demoRect(1056, 1700, 1184, 2200, Object.assign({ fh: -80, ch: 192, li: 160, ct: 'CEIL5_2' }, G10));
  const CatW = demoRect(256, 1720, 320, 2304, { fh: 64, ch: 192, li: 200, ft: 'FLOOR4_8', ct: 'CEIL5_2', tag: 40 });
  const CatE = demoRect(1216, 1720, 1280, 2304, { fh: 64, ch: 192, li: 200, ft: 'FLOOR4_8', ct: 'CEIL5_2', tag: 40 });
  const stW = []; for (let i = 0; i < 6; i++) stW.push(demoRect(256, 1552 + i * 28, 320, 1580 + i * 28, { fh: -64 + (i + 1) * 21 + (i === 5 ? 2 : 0), ch: 192, li: 190, ft: 'FLOOR4_8', ct: 'CEIL5_2', tag: 40 }));
  // 3. Pump room with the clogged plumbing junction (glass pipe) and two monster closets
  const Gap = demoRect(704, 2304, 832, 2320, { fh: -64, ch: 96, li: 160, ft: 'FLAT20', ct: 'FLAT20' });
  const Pump = demoRect(512, 2320, 1024, 2688, { fh: -64, ch: 160, li: 144, ft: 'FLOOR0_6', ct: 'CEIL5_2' });
  const Pipe = demoRect(704, 2440, 832, 2568, { fh: -64, ch: 96, li: 112, ft: 'NUKAGE1', ct: 'FLAT20', tag: 10 });
  const ClW = demoRect(400, 2420, 496, 2600, { fh: -64, ch: 96, li: 96, ft: 'FLAT20', ct: 'FLAT20' });
  const DW = demoRect(496, 2480, 512, 2560, { fh: -64, ch: 96, li: 96, ft: 'FLAT20', ct: 'FLAT20' });
  const ClE = demoRect(1040, 2420, 1136, 2600, { fh: -64, ch: 96, li: 96, ft: 'FLAT20', ct: 'FLAT20' });
  const DE = demoRect(1024, 2480, 1040, 2560, { fh: -64, ch: 96, li: 96, ft: 'FLAT20', ct: 'FLAT20' });
  const Door2 = demoRect(704, 2688, 832, 2704, { fh: -64, ch: 64, li: 160, ft: 'FLAT20', ct: 'FLAT20' });
  // 4. Clearwell yard (outflow, still until the plumbing is clear) and the exit
  const Yard = demoRect(256, 2704, 1280, 3328, { fh: -64, ch: 448, li: 192, ft: 'FLAT5_4', ct: 'F_SKY1' });
  const Out = demoRect(640, 2704, 896, 3328, Object.assign({ fh: -80, ch: 448, li: 192, ct: 'F_SKY1' }, G10, { tag: 12 }));
  const Ex = demoRect(704, 3328, 832, 3344, { fh: -64, ch: 64, li: 208 });
  M.sec[Out].sp = 7; M.sec[Out].tag = 12;
  demoWalls({ [Lake]: 'ROCK4', [Shore]: 'ROCK4', [WalkW]: 'BRICK7', [WalkE]: 'BRICK7', [Chan]: 'BRICK7', [Grate]: 'BRICK7', [Door1]: 'BRICK7', [Hall]: 'STARTAN3', [Ves]: 'STARTAN3', [CatW]: 'STARTAN3', [CatE]: 'STARTAN3', [Gap]: 'METAL2', [Pump]: 'PIPEWAL2', [Pipe]: 'PIPE2', [ClW]: 'PIPEWAL1', [ClE]: 'PIPEWAL1', [DW]: 'PIPEWAL1', [DE]: 'PIPEWAL1', [Door2]: 'METAL2', [Yard]: 'BRICK7', [Out]: 'BRICK7', [Ex]: 'METAL2' });
  stW.forEach(s => sectorLines(s));
  demoSkin({ [Grate]: 'MIDGRATE', [Pipe]: 'PIPE4', [CatW]: 'SUPPORT3', [CatE]: 'SUPPORT3' }, 'BRICK7');
  // the grate over the intake: water passes, you don't
  sectorLines(Grate).forEach(li => { const L = M.l[li]; if (L.s2 >= 0) for (const sd of [L.s1, L.s2]) M.sd[sd].up = 'PIPE4'; });
  tagDoor(Door1, 0); M.sec[Door1].tag = 0; sectorLines(Door1).forEach(li => { const L = M.l[li]; if (L.s2 >= 0) L.sp = 1; });
  tagDoor(DW, 20); tagDoor(DE, 20); tagDoor(Door2, 30);
  // the clogged pipe: green glass all round, the demon stuck inside
  sectorLines(Pipe).forEach(li => { const L = M.l[li]; if (L.s2 >= 0) L.glass = Object.assign({}, GLASS_PRESETS['Clear window'], { col: '#4a9a2a', op: 55, rs: 20, hp: 120, monBrk: false, nearOnly: 320 }); });
  // traps: drop into the hall and the lights die; step into the pump room and the closets open
  const tl = demoLine(896, 1616, 1024, 1616); if (tl >= 0) { M.l[tl].sp = 35; M.l[tl].tag = 40; M.l[tl].lightTo = 104; M.l[tl].msg = 'The lights die! Free The Clog from the pipe and kill him to bring them back.'; }
  const tp = demoLine(704, 2320, 832, 2320); if (tp >= 0) { M.l[tp].sp = 2; M.l[tp].tag = 20; }
  const k = demoLine(704, 3344, 832, 3344); if (k >= 0) { M.l[k].sp = 11; M.sd[M.l[k].s1].mid = 'SW1EXIT'; }
  // things
  T(1, 768, 600, 90);
  T(demoSawedOff(73), 700, 640); T(2049, 820, 640);
  T(2001, 600, 640); T(2008, 900, 640); T(2008, 960, 640); T(2011, 300, 620);
  [[560, 1000, 3004], [960, 1100, 3004], [560, 1300, 9], [960, 1400, 3001], [300, 700, 3004], [1300, 700, 3001], [960, 1250, 3004], [560, 1450, 3001]].forEach(([x, y, t]) => T(t, x, y, 90));
  T(2018, 700, 700); T(2011, 840, 700);
  [[288, 1900, 3001], [288, 2200, 9], [1248, 1900, 3001], [1248, 2150, 65], [480, 1640, 3002], [1100, 1640, 3002], [800, 2250, 3004], [1150, 2270, 3004]].forEach(([x, y, t]) => T(t, x, y, 270));
  T(2002, 1100, 1580); T(2048, 1150, 1600); T(2012, 450, 2270); T(2049, 450, 1600); T(2001, 1150, 2250);
  T(3002, 448, 2470, 0, 7); T(3002, 448, 2560, 0, 7); T(69, 1088, 2510, 180, 7);
  T(2048, 600, 2360); T(2046, 940, 2360); T(2003, 940, 2650); T(2012, 600, 2650);
  const bi = M.t.length; T(3003, 768, 2504, 270, 7 | 8);
  M.triggers = [{ kill: bi, boss: 'The Clog (Baron in the pipes)', stuck: 1, msg: 'The plumbing is clear! The water runs blue and flows again. Now get out.', flat: { tag: 10, ft: 'FWATER1', sp: 0 }, flow: { tag: 12, dx: 0, dy: 2 }, light: { tag: 40, li: 192 }, open: 30, waves: true }];
  M.triggers.push({ kill: bi, flat: { tag: 12, ft: 'FWATER1', sp: 0 } });
  // the way out: waves come for you in the clearwell yard once the water runs
  [[400, 3100, 3004], [1150, 3100, 3004], [400, 2900, 3001], [1150, 2900, 3001], [500, 3200, 9], [1050, 3200, 9], [768, 3250, 3002]].forEach(([x, y, t]) => T(t, x, y, 270, 7, 1));
  [[350, 3000, 65], [1180, 3000, 65], [600, 3150, 3001], [940, 3150, 3001], [450, 2800, 3002], [1080, 2800, 3002], [768, 3100, 69]].forEach(([x, y, t]) => T(t, x, y, 270, 7, 2));
  compact();
}
function loadDemo(id, play) {
  const d = DEMO_MAPS[id]; if (!d) return toast('No demo map called ' + id);
  return artManifest().then(() => { pushUndo(); d.build(); clearSel(); mapChanged(); zoomFit(); return artLoadAll(artFilesFor(M)); }).then(() => { if (typeof MONF !== 'undefined') MONF.clear(); if (play) startDemo(); else toast(d.name + ' loaded'); });
}
const FD_MAPS = [["MAP01","Hydroelectric Plant"],["MAP02","Filtration Tunnels"],["MAP03","Crude Processing Center"],["MAP04","Containment Bay"],["MAP05","Sludge Burrow"],["MAP06","Janus Terminal"],["MAP07","Logic Gate"],["MAP08","Astronomy Complex"],["MAP09","Datacenter"],["MAP10","Deadly Outlands"],["MAP11","Dimensional Rift Observatory"],["MAP12","Railroads"],["MAP13","Station Earth"],["MAP14","Nuclear Zone"],["MAP15","Hostile Takeover"],["MAP16","Urban Jungle"],["MAP17","City Capitol"],["MAP18","Aquatics Lab"],["MAP19","Sewage Control"],["MAP20","Blood Ember Fortress"],["MAP21","Under Realm"],["MAP22","Remanasu"],["MAP23","Underground Facility"],["MAP24","Abandoned Teleporter Lab"],["MAP25","Persistence of Memory"],["MAP26","Dark Depths"],["MAP27","Palace of Red"],["MAP28","Grim Redoubt"],["MAP29","Melting Point"],["MAP30","Jaws of Defeat"],["MAP31","Be Quiet"],["MAP32","Not Sure"],["E1M1","Outer Prison"],["E1M2","Communications Center"],["E1M3","Waste Disposal"],["E1M4","Supply Depot"],["E1M5","Armory"],["E1M6","Training Facility"],["E1M7","Xenobiotic Materials Lab"],["E1M8","Outpost Quarry"],["E1M9","Nutrient Recycling"],["E2M1","Elemental Gate"],["E2M2","Shifter"],["E2M3","Reclaimed Facilities"],["E2M4","Flooded Installation"],["E2M5","Underground Hub"],["E2M6","Hidden Sector"],["E2M7","Control Complex"],["E2M8","Containment Cell"],["E2M9","Fortress 31"],["E3M1","Land of the Lost"],["E3M2","Geothermal Tunnels"],["E3M3","Sacrificial Bastion"],["E3M4","Oblation Temple"],["E3M5","Infernal Hallows"],["E3M6","Igneous Intrusion"],["E3M7","No Regrets"],["E3M8","Ancient Lair"],["E3M9","Acquainted With Grief"],["E4M1","Maintenance Area"],["E4M2","Research Complex"],["E4M3","Central Computing"],["E4M4","Hydroponic Facility"],["E4M5","Engineering Station"],["E4M6","Command Center"],["E4M7","Waste Treatment"],["E4M8","Launch Bay"],["E4M9","Operations"]];
/* Freedoom maps (BSD licence, freedoom.github.io): fetched on demand from res/freedoom-maps.wad.gz */
let FD_WAD = null;
async function fdWad() {
  if (FD_WAD) return FD_WAD;
  const url = 'res/freedoom-maps.wad.gz?v=1'; let resp = null, cache = null;
  try { cache = await caches.open('eod-res-v1'); resp = await cache.match(url); } catch (e) { cache = null; }
  if (!resp) { resp = await fetch(url); if (!resp.ok) throw new Error('HTTP ' + resp.status); if (cache) { try { await cache.put(url, resp.clone()); } catch (e) { } } }
  const buf = await new Response(resp.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return FD_WAD = parseWad(buf);
}
async function loadFreedoomMap(name, play) {
  toast('Loading Freedoom ' + name + '…', 2000);
  try {
    const w = await fdWad(), m = wadMaps(w).find(x => x.name === name); if (!m) return toast('No Freedoom map called ' + name);
    const r = loadWadMap(w, m); pushUndo(); M = r.map; M.name = name; const nm = (FD_MAPS.find(x => x[0] === name) || [])[1]; if (nm) M.hint = name + ': ' + nm + ' (Freedoom, BSD licence)';
    compact(); clearSel(); mapChanged(); zoomFit();
    if ((S.artPack || 'freedoom') === 'freedoom' && typeof loadFreedoom === 'function') await loadFreedoom(true);
    if (play) setTimeout(() => startDemo(), 50); else toast(name + (nm ? ': ' + nm : '') + ' loaded');
  } catch (e) { toast('Could not load the Freedoom maps: ' + e.message, 5000); }
}
function openDemoMaps() {
  modal('Demo maps', `<p class="hint">Built into EOD. Play one, or open it in the editor to see how it is made.</p>${Object.entries(DEMO_MAPS).map(([id, d]) => `<div class="row" style="align-items:center"><div style="flex:3"><b>${esc(d.name)}</b><div class="hint">${esc(d.blurb)}</div></div><button class="demo" data-dp="${id}">▶ Play</button><button data-de="${id}">✎ Edit</button></div>`).join('')}`, [{ cancel: 1 }]);
  setTimeout(() => { document.querySelectorAll('[data-dp]').forEach(b => b.onclick = () => { closeModal(); loadDemo(b.dataset.dp, true); }); document.querySelectorAll('[data-de]').forEach(b => b.onclick = () => { closeModal(); loadDemo(b.dataset.de, false); }); }, 0);
}
