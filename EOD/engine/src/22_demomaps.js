/* ================= DEMO MAPS (built in code, always available) ================= */
const DEMO_MAPS = {
  hangar: { name: 'Hangar of Shit', blurb: 'The classic test map: doors, a lift, nukage, a secret, a glass pane to shoot out.', build: () => buildSampleMap() },
  voodoo: { name: 'Voodoo Express', blurb: 'A voodoo doll on a conveyor opens the monster cages and the exit for you. Flip the switch and watch.', build: () => buildVoodooMap() },
  glass: { name: 'Glass Gallery', blurb: 'Six glass panes: clear, mirror, frosted, stained, bulletproof and Pulse red, with painted monsters behind them.', build: () => buildGlassMap() },
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
  M.hint = 'Six kinds of glass. Shoot them, look at them from the side, try the mirror.';
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
function loadDemo(id, play) {
  const d = DEMO_MAPS[id]; if (!d) return toast('No demo map called ' + id);
  return artManifest().then(() => { pushUndo(); d.build(); clearSel(); mapChanged(); zoomFit(); return artLoadAll(artFilesFor(M)); }).then(() => { if (typeof MONF !== 'undefined') MONF.clear(); if (play) startDemo(); else toast(d.name + ' loaded'); });
}
function openDemoMaps() {
  modal('Demo maps', `<p class="hint">Built into EOD. Play one, or open it in the editor to see how it is made.</p>${Object.entries(DEMO_MAPS).map(([id, d]) => `<div class="row" style="align-items:center"><div style="flex:3"><b>${esc(d.name)}</b><div class="hint">${esc(d.blurb)}</div></div><button class="demo" data-dp="${id}">▶ Play</button><button data-de="${id}">✎ Edit</button></div>`).join('')}`, [{ cancel: 1 }]);
  setTimeout(() => { document.querySelectorAll('[data-dp]').forEach(b => b.onclick = () => { closeModal(); loadDemo(b.dataset.dp, true); }); document.querySelectorAll('[data-de]').forEach(b => b.onclick = () => { closeModal(); loadDemo(b.dataset.de, false); }); }, 0);
}
