/* ================= DEMO GAME + VISUAL MODE ================= */
let G = null;
const WEAPONS = {
  1: { name: 'Chainsaw', ammo: null, rate: 4, dmg: [2, 20], pellets: 1, melee: 1, snd: 'chain' },
  2: { name: 'Pistol', ammo: 'bullets', use: 1, rate: 14, dmg: [5, 15], pellets: 1, spread: 0.01, snd: 'pistol' },
  3: { name: 'Shotgun', ammo: 'shells', use: 1, rate: 37, dmg: [5, 15], pellets: 7, spread: 0.09, snd: 'shotgun' },
  4: { name: 'Super Shotgun', ammo: 'shells', use: 2, rate: 57, dmg: [5, 15], pellets: 20, spread: 0.19, snd: 'shotgun' },
  5: { name: 'Chaingun', ammo: 'bullets', use: 1, rate: 4, dmg: [5, 15], pellets: 1, spread: 0.04, snd: 'chain' },
  6: { name: 'Rocket Launcher', ammo: 'rockets', use: 1, rate: 20, proj: 'rocket', snd: 'rocket' },
  7: { name: 'Plasma Rifle', ammo: 'cells', use: 1, rate: 3, proj: 'plasma', snd: 'plasma' },
  8: { name: 'BFG9000', ammo: 'cells', use: 40, rate: 60, proj: 'bfg', snd: 'plasma' }
};
const PROJ = { fire: { spd: 10, dmg: [3, 24] }, caco: { spd: 10, dmg: [5, 40] }, baron: { spd: 15, dmg: [8, 64] }, plasmam: { spd: 25, dmg: [5, 40] }, rocketm: { spd: 20, dmg: [20, 160], splash: 128 }, rocket: { spd: 20, dmg: [20, 160], splash: 128 }, plasma: { spd: 25, dmg: [5, 40] }, bfg: { spd: 25, dmg: [100, 800], splash: 160 } };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const KEYNAME = { b: 'blue', y: 'yellow', r: 'red' };

function startDemo(opts = {}) {
  const p1 = M.t.find(t => t.type === 1);
  if (!p1 && !opts.at) { toast('Place a Player 1 Start first (Things mode, double-tap, pick Player 1 Start)', 4000); return; }
  const start = opts.at || { x: p1.x, y: p1.y, a: p1.a };
  if (sectorAt(start.x, start.y) < 0) { toast('Player start is outside the map. Run Map Analysis.', 3500); return; }
  initGame(opts.visual ? 'visual' : 'play', start);
  if (opts.arrange) enterArrange();
}
function startVisual() {
  const p1 = M.t.find(t => t.type === 1);
  let at = null;
  if (sectorAt(E.view.x, E.view.y) >= 0) at = { x: E.view.x, y: E.view.y, a: p1 ? p1.a : 90 };
  else if (p1) at = { x: p1.x, y: p1.y, a: p1.a };
  else { const si = M.sec.findIndex(() => true); if (si < 0) return toast('Draw a sector first'); const li = sectorLines(si)[0]; const L = M.l[li]; const p = sampleSide(L, sideSec(L.s1) === si, 24); at = { x: p.x, y: p.y, a: 90 }; }
  initGame('visual', at);
}
function initGame(mode, start) {
  audio();
  const secs = M.sec.map(s => Object.assign({}, s, { base: s.li, mover: null }));
  const sc = buildScene(secs);
  G = { mode, sc, secs, tic: 0, ents: [], projs: [], fx: [], msgs: [], kills: 0, totK: 0, items: 0, totI: 0, secrets: 0, totS: 0, over: null, automap: false, flash: 0, bonus: 0, lineUsed: new Set(), acc: 0, last: performance.now(), t0: performance.now(), nbr: secs.map((_, i) => neighbors(i)), sideOrig: new Map() };
  secs.forEach(s => { if (s.sp === 9) G.totS++; });
  const skillBit = S.skill === 1 ? 1 : S.skill === 3 ? 4 : 2;
  let id = 0;
  M.t.forEach((t, ti) => {
    const d = THINGS[t.type]; if (!d || d.cat === 'player') return;
    if (mode === 'play' && (!(t.f & skillBit) || (t.f & 16))) return;
    const e = { id: id++, ti, x: t.x, y: t.y, z: 0, a: t.a * Math.PI / 180, d, type: t.type, r: d.r, h: d.h, alive: true, hp: d.hp || 0, state: 'idle', ambush: !!(t.f & 8), flip: false, cool: 30, pain: 0, atk: 0, dirT: 0, burst: 0, anim: 0 };
    e.sec = sectorAt(e.x, e.y); e.z = e.sec >= 0 ? secs[e.sec].fh : 0; if (d.float) e.z += 24;
    if (d.cat === 'monster') G.totK++;
    if (['weapon', 'ammo', 'health', 'armor', 'key'].includes(d.cat)) G.totI++;
    G.ents.push(e);
  });
  const s0 = sectorAt(start.x, start.y);
  G.p = { x: start.x, y: start.y, a: start.a * Math.PI / 180, z: secs[s0].fh, vz: 0, viewz: secs[s0].fh + 41, sec: s0, vx: 0, vy: 0, r: 16, h: 56, hp: 100, armor: 0, at: 0, ammo: { bullets: 50, shells: 0, rockets: 0, cells: 0 }, max: { bullets: 200, shells: 50, rockets: 50, cells: 300 }, w: 2, has: new Set([2]), keys: new Set(), cool: 0, bob: 0, fireT: 0, dead: false, hurt: 0, noclip: mode === 'visual', pitch: 0 };
  if (mode === 'visual') { G.p.has = new Set([2, 3, 4, 5, 6, 7]); }
  showGame();
  msg(mode === 'visual' ? '3D Visual mode: aim the crosshair at a surface, then use the buttons' : (M.name + ' — find the exit'));
  requestAnimationFrame(gameFrame);
}
function msg(t) { if (!G) return; G.msgs.push({ t, until: G.tic + 105 }); if (G.msgs.length > 4) G.msgs.shift(); }

/* ---------- world queries ---------- */
function secOf(x, y) { return sectorAt(x, y); }
function opening(l) { const f = G.secs[l.s1.sec], b = G.secs[l.s2.sec]; return { top: Math.min(f.ch, b.ch), bot: Math.max(f.fh, b.fh), lo: Math.min(f.fh, b.fh) }; }
function blockedBy(ent, nx, ny, isPlayer) {
  const r = ent.r, L = G.sc.lines;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (nx + r < Math.min(l.ax, l.bx) || nx - r > Math.max(l.ax, l.bx) || ny + r < Math.min(l.ay, l.by) || ny - r > Math.max(l.ay, l.by)) continue;
    const d = distSeg(nx, ny, l.ax, l.ay, l.bx, l.by); if (d >= r) continue;
    const d0 = distSeg(ent.x, ent.y, l.ax, l.ay, l.bx, l.by); if (d0 < r && d >= d0 - 0.01) continue;
    if (!l.s2) return l;
    if (l.f & 1) return l; if (!isPlayer && (l.f & 2)) return l;
    const o = opening(l);
    if (o.top - o.bot < ent.h) return l;
    if (o.bot - ent.z > 24 && !(ent.d && ent.d.float)) return l;
    if (o.top - (ent.d && ent.d.float ? ent.z : ent.z) < ent.h && !(ent.d && ent.d.float)) return l;
    if (!isPlayer && !(ent.d && ent.d.float) && ent.z - o.lo > 24) return l;
  }
  for (const e of G.ents) {
    if (e === ent || !e.alive || !(e.d.cat === 'monster' || e.d.solid)) continue;
    const d = Math.hypot(e.x - nx, e.y - ny), d0 = Math.hypot(e.x - ent.x, e.y - ent.y);
    if (d < e.r + r && d < d0) return e;
  }
  if (!isPlayer && G.p && !G.p.dead) { const d = Math.hypot(G.p.x - nx, G.p.y - ny), d0 = Math.hypot(G.p.x - ent.x, G.p.y - ent.y); if (d < G.p.r + r && d < d0) return G.p; }
  return null;
}
function tryMove(ent, dx, dy, isPlayer) {
  if (ent.noclip) { ent.x += dx; ent.y += dy; return true; }
  const steps = Math.ceil(Math.hypot(dx, dy) / (ent.r * 0.5)) || 1; let ok = true;
  for (let s = 0; s < steps; s++) {
    const sx = dx / steps, sy = dy / steps;
    if (!blockedBy(ent, ent.x + sx, ent.y + sy, isPlayer)) { ent.x += sx; ent.y += sy; continue; }
    ok = false;
    if (!blockedBy(ent, ent.x + sx, ent.y, isPlayer)) ent.x += sx; else if (!blockedBy(ent, ent.x, ent.y + sy, isPlayer)) ent.y += sy; else break;
  }
  return ok;
}
function lineCross(ax, ay, bx, by, l) { const r = segInter(ax, ay, bx, by, l.ax, l.ay, l.bx, l.by); return r && r.t >= 0 && r.t <= 1 && r.u >= 0 && r.u <= 1 ? r : null; }
function sight(ax, ay, az, bx, by, bz) {
  for (const l of G.sc.lines) {
    const r = lineCross(ax, ay, bx, by, l); if (!r) continue;
    if (!l.s2) return false;
    const o = opening(l); const z = az + (bz - az) * r.t;
    if (z <= o.bot || z >= o.top) return false;
  }
  return true;
}
function wallDistAlong(x, y, z, a, max) {
  const ex = x + Math.cos(a) * max, ey = y + Math.sin(a) * max; let best = max, hit = null;
  for (const l of G.sc.lines) {
    const r = lineCross(x, y, ex, ey, l); if (!r) continue; const d = r.t * max;
    if (d >= best) continue;
    if (!l.s2) { best = d; hit = l; continue; }
    const o = opening(l); if (z <= o.bot || z >= o.top) { best = d; hit = l; }
  }
  return { d: best, l: hit };
}

/* ---------- sector movers ---------- */
function lowestAdjCeil(si) { let m = Infinity; G.nbr[si].forEach(n => m = Math.min(m, G.secs[n].ch)); return m === Infinity ? G.secs[si].ch : m; }
function lowestAdjFloor(si) { let m = G.secs[si].fh; G.nbr[si].forEach(n => m = Math.min(m, G.secs[n].fh)); return m; }
function highestAdjFloor(si) { let m = -Infinity; G.nbr[si].forEach(n => m = Math.max(m, G.secs[n].fh)); return m === -Infinity ? G.secs[si].fh : m; }
function nextHigherFloor(si) { const f = G.secs[si].fh; let m = Infinity; G.nbr[si].forEach(n => { const h = G.secs[n].fh; if (h > f) m = Math.min(m, h); }); return m === Infinity ? f : m; }
function doorOpen(si, o) {
  const s = G.secs[si]; if (!s) return;
  if (s.mover) { if (s.mover.k === 'door' && o.rep) { s.mover.st = s.mover.st === 'down' ? 'up' : 'down'; sfx('door'); } return; }
  s.mover = { k: 'door', st: 'up', top: lowestAdjCeil(si) - 4, spd: o.fast ? 8 : 2, wait: o.stay ? -1 : 150, t: 0 }; sfx('door');
}
function startLift(si, fast) { const s = G.secs[si]; if (s.mover) return; s.mover = { k: 'lift', st: 'down', low: lowestAdjFloor(si), high: s.fh, spd: fast ? 8 : 4, t: 0 }; sfx('door'); }
function startFloor(si, target) { const s = G.secs[si]; if (s.mover) return; s.mover = { k: 'floor', target, spd: 1 }; sfx('door'); }
function entsIn(si) { const out = G.ents.filter(e => e.alive && e.sec === si && e.d.cat === 'monster'); if (G.p.sec === si) out.push(G.p); return out; }
function tickMovers() {
  G.secs.forEach((s, si) => {
    const m = s.mover; if (!m) return;
    if (m.k === 'door') {
      if (m.st === 'up') { s.ch = Math.min(m.top, s.ch + m.spd); if (s.ch >= m.top) { if (m.wait < 0) s.mover = null; else { m.st = 'open'; m.t = m.wait; } } }
      else if (m.st === 'open') { if (--m.t <= 0) { m.st = 'down'; sfx('door'); } }
      else if (m.st === 'down') {
        const blocked = entsIn(si).some(e => s.ch - m.spd - e.z < e.h);
        if (blocked && s.ch - m.spd < s.fh + 56) { m.st = 'up'; return; }
        s.ch = Math.max(s.fh, s.ch - m.spd); if (s.ch <= s.fh) s.mover = null;
      }
    } else if (m.k === 'lift') {
      if (m.st === 'down') { s.fh = Math.max(m.low, s.fh - m.spd); if (s.fh <= m.low) { m.st = 'wait'; m.t = 105; } }
      else if (m.st === 'wait') { if (--m.t <= 0) { m.st = 'up'; sfx('door'); } }
      else { if (entsIn(si).some(e => s.ch - (s.fh + m.spd) < e.h)) { m.st = 'down'; return; } s.fh = Math.min(m.high, s.fh + m.spd); if (s.fh >= m.high) s.mover = null; }
    } else if (m.k === 'floor') {
      const d = m.target - s.fh; if (Math.abs(d) <= m.spd) { s.fh = m.target; s.mover = null; } else s.fh += Math.sign(d) * m.spd;
    }
  });
  // lighting effects
  G.secs.forEach((s, si) => {
    const b = s.base, t = G.tic; let lo = b; G.nbr[si].forEach(n => lo = Math.min(lo, G.secs[n].base)); if (lo === b) lo = Math.max(0, b - 64);
    switch (s.sp) {
      case 1: s.li = Math.random() < 0.06 ? lo : b; break;
      case 2: case 4: case 13: s.li = (t % 35) < 5 ? b : lo; break;
      case 3: case 12: s.li = (t % 70) < 5 ? b : lo; break;
      case 8: s.li = lo + (b - lo) * (0.5 + 0.5 * Math.sin(t / 12)); break;
      case 17: s.li = Math.random() < 0.15 ? lo + 16 : b; break;
    }
  });
}
function tagged(tag) { const out = []; if (!tag) return out; G.secs.forEach((s, i) => { if (s.tag === tag) out.push(i); }); return out; }
function activate(l, how, fromFront) {
  const sp = l.sp; if (!sp) return false;
  const key = l.idx;
  const WALK = new Set([2, 90, 86, 88, 10, 120, 38, 82, 5, 19, 97, 39, 52, 124, 35, 13]);
  const isWalk = WALK.has(sp);
  if ((how === 'walk') !== isWalk) return false;
  const once = new Set([31, 32, 33, 34, 118, 2, 103, 29, 10, 21, 18, 23, 38, 5, 101, 19, 102, 39, 35, 13, 11, 52, 51, 124]).has(sp);
  if (once && G.lineUsed.has(key)) return false;
  const back = l.s2 ? (fromFront ? l.s2.sec : l.s1.sec) : -1;
  const needKey = { 26: 'b', 27: 'y', 28: 'r', 32: 'b', 33: 'r', 34: 'y' }[sp];
  if (needKey && !G.p.keys.has(needKey)) { msg('You need a ' + KEYNAME[needKey] + ' key to open this door'); sfx('oof'); return true; }
  let did = true;
  if (DOOR_SPECIALS.has(sp)) { if (back < 0) return false; doorOpen(back, { rep: !once, stay: [31, 32, 33, 34, 118].includes(sp), fast: sp === 117 || sp === 118 }); }
  else if ([2, 103, 86, 61].includes(sp)) tagged(l.tag).forEach(s => doorOpen(s, { stay: true }));
  else if ([29, 63, 90].includes(sp)) tagged(l.tag).forEach(s => doorOpen(s, { stay: false }));
  else if ([62, 88, 10, 21, 120, 123].includes(sp)) tagged(l.tag).forEach(s => startLift(s, sp >= 120));
  else if (sp === 18) tagged(l.tag).forEach(s => startFloor(s, nextHigherFloor(s)));
  else if ([23, 38, 82].includes(sp)) tagged(l.tag).forEach(s => startFloor(s, lowestAdjFloor(s)));
  else if ([5, 101].includes(sp)) tagged(l.tag).forEach(s => startFloor(s, lowestAdjCeil(s)));
  else if ([19, 102].includes(sp)) tagged(l.tag).forEach(s => startFloor(s, highestAdjFloor(s)));
  else if ([97, 39].includes(sp)) { const secs = new Set(tagged(l.tag)); const dst = M.t.find(t => t.type === 14 && secs.has(sectorAt(t.x, t.y))); if (dst) { G.p.x = dst.x; G.p.y = dst.y; G.p.a = dst.a * Math.PI / 180; G.p.vx = G.p.vy = 0; G.flash = 8; sfx('tele'); } else did = false; }
  else if (sp === 35) tagged(l.tag).forEach(s => G.secs[s].li = G.secs[s].base = 35);
  else if (sp === 13) tagged(l.tag).forEach(s => G.secs[s].li = G.secs[s].base = 255);
  else if ([11, 52, 51, 124].includes(sp)) { endLevel([51, 124].includes(sp)); }
  else did = false;
  if (did && once) G.lineUsed.add(key);
  if (did && how === 'use' && l.s1) { // switch texture flip
    const d = M.sd[l.s1.si]; if (!G.sideOrig.has(l.s1.si)) G.sideOrig.set(l.s1.si, { up: d.up, mid: d.mid, lo: d.lo });
    const sw = n => /^SW1/.test(n) ? 'SW2' + n.slice(3) : /^SW2/.test(n) ? 'SW1' + n.slice(3) : n;
    const o = { up: l.s1.up, mid: l.s1.mid, lo: l.s1.lo };
    const n = { up: sw(o.up), mid: sw(o.mid), lo: sw(o.lo) };
    if (n.up !== o.up || n.mid !== o.mid || n.lo !== o.lo) { Object.assign(l.s1, n, { upT: n.up !== '-' ? getTex(n.up) : null, midT: n.mid !== '-' ? getTex(n.mid) : null, loT: n.lo !== '-' ? getTex(n.lo) : null }); sfx('switch'); }
  }
  return did;
}
function playerUse() {
  const p = G.p, ex = p.x + Math.cos(p.a) * 72, ey = p.y + Math.sin(p.a) * 72;
  const hits = [];
  for (const l of G.sc.lines) { const r = lineCross(p.x, p.y, ex, ey, l); if (r) hits.push([r.t, l]); }
  hits.sort((a, b) => a[0] - b[0]);
  for (const [, l] of hits) {
    const front = lineSide2(l, p.x, p.y) < 0;
    if (l.sp) { if (activate(l, 'use', front)) return; }
    if (!l.s2) { sfx('oof'); return; }
    const o = opening(l); if (o.top - o.bot <= 0) { sfx('oof'); return; }
  }
}
function lineSide2(l, x, y) { return l.ex * (y - l.ay) - l.ey * (x - l.ax); }

/* ---------- combat ---------- */
function damageMonster(e, dmg, src) {
  if (!e.alive) return;
  e.hp -= dmg;
  G.fx.push({ x: e.x, y: e.y, z: e.z + e.h * 0.6, img: SPR.blood, t: 10 });
  if (e.hp <= 0) {
    e.alive = false; e.state = 'dead';
    if (e.d.barrel) { explode(e.x, e.y, e.z + 20, 128, 128, src); return; }
    if (e.d.cat === 'monster') { G.kills++; sfx('die'); if (e.d.drop) G.ents.push({ id: 9000 + G.ents.length, x: e.x + 8, y: e.y, z: e.z, d: THINGS[e.d.drop], type: e.d.drop, r: 20, h: 16, alive: true, dropped: true, sec: e.sec }); }
    return;
  }
  if (e.d.cat === 'monster') { e.state = 'chase'; if (Math.random() < e.d.pain) { e.pain = 8; e.atk = 0; sfx('pain', .5); } }
}
function damagePlayer(dmg) {
  const p = G.p; if (p.dead || G.mode !== 'play') return;
  if (S.skill === 1) dmg = dmg >> 1;
  let save = p.at === 2 ? (dmg >> 1) : p.at === 1 ? Math.floor(dmg / 3) : 0; if (save > p.armor) save = p.armor; p.armor -= save; if (!p.armor) p.at = 0;
  p.hp -= dmg - save; p.hurt = Math.min(30, p.hurt + dmg); sfx('pain', .7); rumble(Math.min(1, 0.3 + dmg / 40), 140);
  if (p.hp <= 0) { p.hp = 0; p.dead = true; G.over = { k: 'dead' }; showOver(); }
}
function explode(x, y, z, radius, maxd, src) {
  G.fx.push({ x, y, z: z - 24, img: SPR.explode, t: 14, bright: 1 }); sfx('explode');
  for (const e of G.ents) { if (!e.alive || !(e.hp > 0)) continue; const d = Math.hypot(e.x - x, e.y - y) - e.r; if (d < radius && sight(x, y, z, e.x, e.y, e.z + e.h / 2)) damageMonster(e, Math.max(1, Math.round(maxd * (1 - Math.max(0, d) / radius))), src); }
  if (G.p) { const d = Math.hypot(G.p.x - x, G.p.y - y) - G.p.r; if (d < radius && sight(x, y, z, G.p.x, G.p.y, G.p.z + 32)) damagePlayer(Math.round(maxd * (1 - Math.max(0, d) / radius) * (src === 'player' ? 0.5 : 1))); }
}
function hitscan(a, dmg) {
  const p = G.p, z = p.viewz - 8, w = wallDistAlong(p.x, p.y, z, a, 2048);
  const c = Math.cos(a), s = Math.sin(a); let best = null, bd = w.d;
  for (const e of G.ents) {
    if (!e.alive || !(e.hp > 0)) continue; const dx = e.x - p.x, dy = e.y - p.y, al = dx * c + dy * s; if (al <= 0 || al >= bd) continue;
    if (Math.abs(dx * s - dy * c) < e.r && sight(p.x, p.y, z, e.x, e.y, e.z + e.h * 0.5)) { best = e; bd = al; }
  }
  if (best) { damageMonster(best, dmg, 'player'); return true; }
  G.fx.push({ x: p.x + c * (w.d - 4), y: p.y + s * (w.d - 4), z: z - 4, img: SPR.puff, t: 6, bright: 1 });
  return false;
}
function autoAim(a) {
  const p = G.p; let best = a, bd = 0.09;
  for (const e of G.ents) { if (!e.alive || e.d.cat !== 'monster') continue; const ang = Math.atan2(e.y - p.y, e.x - p.x); let d = Math.abs(((ang - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); const dist = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd && dist < 2000 && sight(p.x, p.y, p.viewz, e.x, e.y, e.z + e.h / 2)) { bd = d; best = ang; } }
  return best;
}
function fireWeapon() {
  const p = G.p, w = WEAPONS[p.w];
  if (p.cool > 0) return;
  if (w.ammo && p.ammo[w.ammo] < w.use) { const order = [7, 6, 4, 5, 3, 2, 1]; const nw = order.find(i => p.has.has(i) && (!WEAPONS[i].ammo || p.ammo[WEAPONS[i].ammo] >= WEAPONS[i].use)); if (nw && nw !== p.w) { p.w = nw; msg(WEAPONS[nw].name); } else sfx('oof'); p.cool = 10; return; }
  if (w.ammo) p.ammo[w.ammo] -= w.use;
  p.cool = w.rate; p.fireT = 6; sfx(w.snd);
  const a = autoAim(p.a);
  if (w.melee) { const ww = wallDistAlong(p.x, p.y, p.viewz - 8, a, 72); for (const e of G.ents) if (e.alive && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 72 + e.r && Math.hypot(e.x - p.x, e.y - p.y) < ww.d + e.r) { damageMonster(e, rnd(...w.dmg), 'player'); break; } }
  else if (w.proj) { spawnProj('player', w.proj, p.x, p.y, p.viewz - 12, a, 0); }
  else for (let i = 0; i < w.pellets; i++) hitscan(a + (Math.random() - 0.5) * 2 * w.spread * (w.pellets > 1 || p.w === 5 || p.refire ? 1 : 0), rnd(...w.dmg));
  p.refire = true;
  // wake monsters by sound
  G.ents.forEach(e => { if (e.alive && e.d.cat === 'monster' && e.state === 'idle' && !e.ambush && Math.hypot(e.x - p.x, e.y - p.y) < 1400) e.state = 'chase'; });
}
function spawnProj(owner, kind, x, y, z, a, vzz) {
  const P = PROJ[kind]; G.projs.push({ owner, kind, x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, z, vx: Math.cos(a) * P.spd, vy: Math.sin(a) * P.spd, vz: vzz || 0, img: SPR['p_' + kind] || SPR.p_fire, t: 0 });
}
function tickProjs() {
  for (const pr of G.projs) {
    if (pr.dead) continue; pr.t++;
    const P = PROJ[pr.kind], steps = 3;
    for (let s = 0; s < steps && !pr.dead; s++) {
      const nx = pr.x + pr.vx / steps, ny = pr.y + pr.vy / steps, nz = pr.z + pr.vz / steps;
      let hitWall = false;
      for (const l of G.sc.lines) { const r = lineCross(pr.x, pr.y, nx, ny, l); if (!r) continue; if (!l.s2) { hitWall = true; break; } const o = opening(l); if (nz <= o.bot || nz >= o.top) { hitWall = true; break; } }
      const si = sectorAt(nx, ny); if (si < 0 || nz < G.secs[si].fh || nz > G.secs[si].ch) hitWall = true;
      if (!hitWall) {
        if (pr.owner === 'player') { for (const e of G.ents) { if (!e.alive || !(e.hp > 0)) continue; if (Math.hypot(e.x - nx, e.y - ny) < e.r + 8 && nz > e.z - 8 && nz < e.z + e.h + 8) { damageMonster(e, rnd(...P.dmg), 'player'); hitWall = true; break; } } }
        else { const p = G.p; if (Math.hypot(p.x - nx, p.y - ny) < p.r + 8 && nz > p.z - 8 && nz < p.z + p.h + 8) { damagePlayer(rnd(...P.dmg)); hitWall = true; } }
      }
      if (hitWall) { pr.dead = true; if (P.splash) explode(pr.x, pr.y, pr.z, P.splash, P.splash, pr.owner); else G.fx.push({ x: pr.x, y: pr.y, z: pr.z - 8, img: pr.img, t: 6, bright: 1 }); break; }
      pr.x = nx; pr.y = ny; pr.z = nz;
    }
    if (pr.t > 400) pr.dead = true;
  }
  G.projs = G.projs.filter(p => !p.dead);
}
function tickMonsters() {
  const p = G.p;
  for (const e of G.ents) {
    if (!e.alive || e.d.cat !== 'monster') continue;
    e.anim++; if (e.anim % 8 === 0) e.flip = !e.flip;
    if (e.state === 'idle') { if ((G.tic + e.id) % 6 === 0 && !p.dead) { const dist = Math.hypot(p.x - e.x, p.y - e.y), ang = Math.atan2(p.y - e.y, p.x - e.x); const fov = Math.abs(((ang - e.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.6 || dist < 128; if (dist < 2400 && fov && sight(e.x, e.y, e.z + 41, p.x, p.y, p.viewz)) { e.state = 'chase'; e.cool = 20 + rnd(0, 20); } } continue; }
    if (p.dead) continue;
    if (e.pain > 0) { e.pain--; continue; }
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy); e.a = Math.atan2(dy, dx);
    if (e.atk > 0) { if (--e.atk === 0) monsterAttack(e, dist); continue; }
    if (e.cool > 0) e.cool--;
    if ((G.tic + e.id) % 4 === 0) e.los = sight(e.x, e.y, e.z + 41, p.x, p.y, p.viewz);
    const meleeR = e.r + p.r + 24;
    if (e.los && e.cool <= 0) {
      if (e.d.melee && dist < meleeR) { e.atk = 8; e.cool = 25; continue; }
      if (e.d.atk !== 'melee' && Math.random() < (dist < 600 ? 0.07 : 0.03)) { e.atk = 10; e.burst = e.d.burst || 1; e.cool = 35 + rnd(0, 40); continue; }
    }
    // movement
    if (e.dirT > 0) e.dirT--;
    const ang = e.dirT > 0 ? e.dir : e.a, sp = e.d.spd;
    if (dist > meleeR - 8 || e.dirT > 0) {
      if (!tryMove(e, Math.cos(ang) * sp, Math.sin(ang) * sp, false)) { e.dir = e.a + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random()); e.dirT = 12 + rnd(0, 20); }
    }
    if (e.d.float) { const tz = clamp(p.z + 16, G.secs[Math.max(0, e.sec)].fh, G.secs[Math.max(0, e.sec)].ch - e.h); e.z += clamp(tz - e.z, -2, 2); }
    const s2 = sectorAt(e.x, e.y); if (s2 >= 0) e.sec = s2;
  }
}
function monsterAttack(e, dist) {
  const p = G.p, d = e.d;
  if (d.melee && dist < e.r + p.r + 30) { damagePlayer(rnd(...d.melee)); sfx('oof', .6); return; }
  if (d.atk === 'melee') return;
  if (!sight(e.x, e.y, e.z + 41, p.x, p.y, p.viewz)) return;
  e.flash = 4;
  if (d.atk === 'hit') { sfx('pistol', .5); for (let i = 0; i < d.pellets; i++) { const miss = clamp(0.4 + dist / 2500, 0.4, 0.85); if (Math.random() > miss) damagePlayer(rnd(...d.dmg)); } }
  else { const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.08; const t = dist / PROJ[d.proj].spd; spawnProj('mon', d.proj, e.x, e.y, e.z + (d.float ? 24 : 32), a, ((p.z + 32) - (e.z + 32)) / Math.max(1, t)); sfx('fire', .5); }
  if (--e.burst > 0) e.atk = 4;
}
function tickPickups() {
  const p = G.p;
  for (const e of G.ents) {
    if (!e.alive || !e.d.give && e.d.cat !== 'key') continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > 32 || Math.abs(e.z - p.z) > 24) continue;
    const g = e.d.give || {}; let took = false;
    if (e.d.cat === 'key') { p.keys.add(e.d.key); took = true; }
    if (g.hp) { if (p.hp < g.max) { p.hp = Math.min(g.max, p.hp + g.hp); took = true; } }
    if (g.armor !== undefined) { if (p.armor < (g.amax || 200)) { p.armor = Math.min(g.amax || 200, p.armor + g.armor); p.at = Math.max(p.at, g.at || 1); if (g.armor >= 100) p.at = g.at; took = true; } }
    if (g.backpack && !p.backpack) { p.backpack = 1; for (const k in p.max) p.max[k] *= 2; took = true; }
    for (const k of ['bullets', 'shells', 'rockets', 'cells']) if (g[k]) { const amt = e.dropped ? Math.ceil(g[k] / 2) : g[k]; if (p.ammo[k] < p.max[k]) { p.ammo[k] = Math.min(p.max[k], p.ammo[k] + amt); took = true; } }
    if (g.w) { if (!p.has.has(g.w)) { p.has.add(g.w); p.w = g.w; took = true; sfx('weapon'); } }
    if (!took) continue;
    e.alive = false; if (!e.dropped) G.items++; G.bonus = 6; msg('Picked up ' + (e.d.name.match(/^[AEIOU]/) ? 'an ' : 'a ') + e.d.name.toLowerCase() + '.'); if (!g.w) sfx('pickup');
  }
}
function endLevel(secret) { if (G.over) return; G.over = { k: 'exit', secret, time: (performance.now() - G.t0) / 1000 }; showOver(); }

/* ---------- per-tic ---------- */
const IN = { fwd: 0, str: 0, turn: 0, fire: false, use: false, keys: new Set(), up: 0 };
function gameTic() {
  if (GL.arrange) return;
  if (G.over) { pollInput(); return; }
  const p = G.p; G.tic++;
  // input
  const pin = pollInput(); if (!G) return; const fwd = pin.fwd, str = pin.str, turn = pin.turn;
  p.a += turn + IN.turn; IN.turn = 0;
  const speed = G.mode === 'visual' ? 14 : 9, ca = Math.cos(p.a), sa = Math.sin(p.a);
  const mx = (ca * fwd + sa * str) * speed, my = (sa * fwd - ca * str) * speed;
  p.vx += (mx - p.vx) * 0.35; p.vy += (my - p.vy) * 0.35;
  const ox = p.x, oy = p.y;
  if (!p.dead && (Math.abs(p.vx) > 0.01 || Math.abs(p.vy) > 0.01)) tryMove(p, p.vx, p.vy, true);
  const ns = sectorAt(p.x, p.y);
  if (ns < 0 && !p.noclip) { p.x = ox; p.y = oy; } else if (ns >= 0) p.sec = ns;
  const S0 = G.secs[p.sec];
  // walk triggers
  if (G.mode === 'play' && (ox !== p.x || oy !== p.y)) for (const l of G.sc.lines) { if (!l.sp) continue; if (lineCross(ox, oy, p.x, p.y, l)) activate(l, 'walk', lineSide2(l, ox, oy) < 0); }
  // vertical
  if (G.mode === 'visual') { p.z = S0.fh + IN.up * 0; }
  if (p.z > S0.fh) { p.vz -= 1; p.z += p.vz; if (p.z <= S0.fh) { p.z = S0.fh; p.vz = 0; } } else { p.z = S0.fh; p.vz = 0; }
  if (p.z + p.h > S0.ch && S0.ch - S0.fh >= p.h) p.z = S0.ch - p.h;
  const moving = Math.hypot(p.vx, p.vy); p.bob += moving * 0.07;
  const target = p.z + 41 + (G.mode === 'play' ? Math.sin(p.bob) * Math.min(4, moving * 0.5) : 0);
  p.viewz += (target - p.viewz) * (target < p.viewz ? 0.6 : 0.35); if (p.viewz > S0.ch - 4) p.viewz = S0.ch - 4;
  if (G.mode === 'play') {
    if (p.cool > 0) p.cool--; if (p.fireT > 0) p.fireT--;
    if ((IN.fire || IN.firePad) && !p.dead) fireWeapon(); else p.refire = false;
    if (IN.use) { IN.use = false; playerUse(); }
    tickMonsters(); tickProjs(); tickPickups();
    // sector damage / secrets
    if (p.z <= S0.fh + 1) {
      const dmg = { 5: 10, 7: 5, 16: 20, 4: 20, 11: 20 }[S0.sp];
      if (dmg && G.tic % 32 === 0) damagePlayer(dmg);
      if (S0.sp === 11 && p.hp <= 10) endLevel(false);
      if (S0.sp === 9) { S0.sp = 0; G.secrets++; msg('A secret is revealed!'); sfx('secret'); }
    }
    if (p.hurt > 0) p.hurt--; if (G.bonus > 0) G.bonus--; if (G.flash > 0) G.flash--;
  } else if (IN.use) { IN.use = false; }
  tickMovers();
  G.ents.forEach(e => { if (!e.alive) return; if (!e.d.float) { const s = e.sec >= 0 ? G.secs[e.sec] : null; if (s) e.z = s.fh; } });
  G.fx.forEach(f => f.t--); G.fx = G.fx.filter(f => f.t > 0);
  G.msgs = G.msgs.filter(m => m.until > G.tic);
}
function gameFrame(now) {
  if (!G || $('#game').hidden) return;
  try {
    const dt = Math.min(250, now - G.last); G.last = now; G.acc += dt;
    while (G.acc >= 1000 / 35) { G.acc -= 1000 / 35; gameTic(); }
    drawGame();
  } catch (e) { logCrash('game: ' + e.stack); toast('Demo hit an error (saved to crash log): ' + e.message, 5000); exitGame(); return; }
  requestAnimationFrame(gameFrame);
}
