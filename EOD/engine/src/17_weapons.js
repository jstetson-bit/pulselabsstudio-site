/* ================= WEAPON GENERATOR: random Doom-style guns, fully adjustable =================
   Lives in the map (M.wep[id] = def), pickups use thing numbers 21000+, the id is also the weapon id
   in the Demo. In-house procedural first-person + pickup sprites; exports to GZDoom DECORATE. */
const WEP_BASE = 21000;
const WCLASS = {
  sidearm: { n: 'Sidearm', kind: 'hit', ammo: 'bullets', pel: [1, 1], spr: [0, .02], rate: [8, 16], dmg: [5, 20], slot: 2, snd: 'pistol' },
  shotgun: { n: 'Shotgun', kind: 'hit', ammo: 'shells', pel: [5, 12], spr: [.06, .16], rate: [28, 50], dmg: [5, 15], slot: 3, snd: 'shotgun' },
  repeater: { n: 'Heavy repeater', kind: 'hit', ammo: 'bullets', pel: [1, 2], spr: [.02, .06], rate: [2, 5], dmg: [5, 15], slot: 4, snd: 'chain' },
  explosive: { n: 'Explosive launcher', kind: 'proj', ammo: 'rockets', proj: 'rocket', rate: [16, 34], dmg: [20, 160], slot: 5, snd: 'rocket' },
  energy: { n: 'Energy rifle', kind: 'proj', ammo: 'cells', proj: 'plasma', rate: [2, 6], dmg: [5, 40], slot: 6, snd: 'plasma' },
  thrown: { n: 'Thrown (spear, knife, disc)', kind: 'proj', ammo: null, proj: 'baron', rate: [16, 30], dmg: [15, 70], slot: 1, snd: 'chain' },
  railgun: { n: 'Railgun', kind: 'hit', ammo: 'cells', pel: [1, 1], spr: [0, .005], rate: [30, 55], dmg: [60, 220], slot: 6, snd: 'plasma' },
  super: { n: 'Superweapon', kind: 'proj', ammo: 'cells', proj: 'bfg', rate: [45, 70], dmg: [100, 600], slot: 7, snd: 'plasma' },
  melee: { n: 'Melee', kind: 'melee', ammo: null, rate: [6, 18], dmg: [10, 60], slot: 1, snd: 'chain' }
};
const WN1 = ['Hell', 'Blood', 'Iron', 'Ash', 'Brim', 'Rot', 'Hex', 'Wrath', 'Cinder', 'Skull', 'Ember', 'Grave', 'Scorch', 'Rust', 'Venom', 'Dread', 'Pulse', 'Thunder', 'Bone', 'Riot'];
const WN2 = { sidearm: ['Pistol', 'Revolver', 'Hand cannon', 'Repeater'], shotgun: ['Scattergun', 'Boomstick', 'Shotgun', 'Breacher'], repeater: ['Chaingun', 'Minigun', 'Ripper', 'Shredder'], explosive: ['Launcher', 'Mortar', 'Bombard', 'Cannon'], energy: ['Rifle', 'Lance', 'Arc gun', 'Projector', 'Carbine', 'Blaster'], thrown: ['Spear', 'Knife', 'Disc', 'Javelin'], railgun: ['Railgun', 'Rail lance', 'Spike driver', 'Gauss rifle'], super: ['Annihilator', 'Doomsday', 'Devastator', 'Obliterator'], melee: ['Cleaver', 'Saw', 'Maul', 'Fist'] };
const WAMMO = { bullets: 'Bullets', shells: 'Shells', rockets: 'Rockets', cells: 'Cells' };
const WPROJ = { rocket: 'Rocket (splash)', plasma: 'Plasma bolt', bfg: 'Big green ball', fire: 'Fireball', caco: 'Purple orb', baron: 'Green bolt' };
const WSND = { pistol: 'Pistol crack', shotgun: 'Shotgun boom', chain: 'Rapid rattle', rocket: 'Rocket whoosh', plasma: 'Energy zap' };
function rollWeapon(opts = {}, parts = { name: 1, look: 1, stats: 1 }, base) {
  const seed = opts.seed != null ? opts.seed : (Math.random() * 2 ** 31) | 0, r = monRng(seed);
  let cls = opts.cls && opts.cls !== 'random' ? opts.cls : mpick(r, Object.keys(WCLASS)), C = WCLASS[cls];
  const d = Object.assign({ v: 1 }, base || {}); d.cls = cls;
  if ((parts.look || !d.look) && ARTL.man && ARTL.man.weapons.length && opts.art !== '') { const a = opts.art ? artWep(opts.art) : artPickFor('weapons', opts.cls && opts.cls !== 'random' ? cls : null); if (a) { const big = r() < .2; d.look = { art: a.id, seed: (r() * 1e9) | 0, hue: r() < .55 ? 0 : Math.round((r() - .5) * (big ? 300 : 70)), sat: Math.round(85 + r() * 40), bri: Math.round(90 + r() * 20), tint: '#c4141c', tintAmt: 0, size: 1, mirror: false, length: 1, power: 4 }; if (!opts.cls || opts.cls === 'random') { cls = a.cls; C = WCLASS[cls]; d.cls = cls; } parts = Object.assign({}, parts, { look: 0 }); } }
  if (parts.name || !d.name) d.name = mpick(r, WN1) + ' ' + mpick(r, WN2[cls]);
  if (parts.look || !d.look) { const pal = mpick(r, [['#555b66', '#2a2a2a', '#ffd060'], ['#444', '#7a4a20', '#ffb020'], ['#6a7a5a', '#333', '#ff7a20'], ['#4a5a7a', '#222', '#60c0ff'], ['#3a6a3a', '#1a1a1a', '#60ff60'], ['#8a0a12', '#ffffff', '#ffffff'], ['#777', '#a33', '#ff4040']]); d.look = { seed: (r() * 1e9) | 0, body: pal[0], accent: pal[1], glow: pal[2], barrels: cls === 'repeater' ? mpick(r, [3, 4, 6]) : cls === 'shotgun' ? mpick(r, [1, 2]) : 1, length: +(0.7 + r() * 0.6).toFixed(2), scope: r() < .3, drum: cls === 'repeater' || r() < .2, stock: r() < .5,
    style: opts.style && opts.style !== 'random' ? opts.style : mpick(r, WSTYLE_BY[cls] || ['classic']), power: cls === 'super' ? 9 : cls === 'railgun' ? 7 : 2 + Math.round(r() * 5), bulk: +(0.85 + r() * 0.3).toFixed(2), glowAmt: 40 + Math.round(r() * 50), coils: Math.round(1 + r() * 4), prongs: r() < .7 ? 1 : 0, strips: r() < .75 ? 1 : 0, panels: 1, hazard: r() < .4 ? 1 : 0 }; }
  if (parts.stats || d.rate == null) {
    delete d.pb;
    d.kind = C.kind; d.ammo = C.ammo; d.use = cls === 'super' ? 40 : cls === 'shotgun' && r() < .3 ? 2 : 1;
    d.pellets = C.pel ? Math.round(between(r, C.pel)) : 1; d.spread = C.spr ? +between(r, C.spr).toFixed(3) : 0;
    d.rate = Math.round(between(r, C.rate)); d.dmg = [C.dmg[0], Math.round(between(r, [C.dmg[0] + 5, C.dmg[1]]))];
    d.proj = C.proj || null; d.projSpd = d.proj ? Math.round(between(r, [14, 30])) : 0; d.splash = d.proj === 'rocket' ? Math.round(between(r, [96, 160])) : d.proj === 'bfg' ? 160 : 0;
    d.range = cls === 'melee' ? Math.round(between(r, [64, 110])) : 0; d.recoil = Math.round(cls === 'shotgun' || cls === 'explosive' || cls === 'super' ? between(r, [4, 10]) : between(r, [0, 3]));
    d.snd = C.snd; d.give = cls === 'super' ? 40 : cls === 'energy' ? 40 : cls === 'explosive' ? 2 : cls === 'shotgun' ? 8 : 20; d.startWith = false;
  }
  d.seed = seed; return d;
}
/* ---------- procedural art (styles: classic, space, rail, bio, heavy, raygun) ---------- */
const WSTYLE = { classic: 'Classic military', space: 'Space rifle', rail: 'Railgun', bio: 'Bio / hell-tech', heavy: 'Heavy industrial', raygun: 'Retro raygun' };
const WSTYLE_BY = { sidearm: ['classic', 'space', 'raygun', 'heavy'], shotgun: ['classic', 'heavy', 'space', 'bio'], repeater: ['heavy', 'classic', 'space'], explosive: ['heavy', 'bio', 'space'], energy: ['space', 'rail', 'raygun', 'bio'], railgun: ['rail', 'space'], super: ['space', 'bio', 'rail', 'heavy'], melee: ['classic', 'space', 'bio', 'heavy'] };
function shadeHex(hex, f) { const [r, g, b] = hexRGB(hex), c = v => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); return `rgb(${c(r)},${c(g)},${c(b)})`; }
function alphaHex(hex, a) { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; }
function metalH(g, x0, x1, col) { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shadeHex(col, -.6)); gr.addColorStop(.3, shadeHex(col, .3)); gr.addColorStop(.5, shadeHex(col, .05)); gr.addColorStop(.8, shadeHex(col, -.3)); gr.addColorStop(1, shadeHex(col, -.7)); return gr; }
function metalV(g, y0, y1, col) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, shadeHex(col, .35)); gr.addColorStop(.45, shadeHex(col, 0)); gr.addColorStop(1, shadeHex(col, -.65)); return gr; }
function gPoly(g, pts, fill, stroke, lw = 1) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function gGlow(g, x, y, r, col, a = 1) { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(.25, alphaHex(col, a)); rg.addColorStop(1, alphaHex(col, 0)); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function gLine(g, x0, y0, x1, y1, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function gStrip(g, x0, y0, x1, y1, col, a) { gLine(g, x0, y0, x1, y1, alphaHex(col, a * .35), 4); gLine(g, x0, y0, x1, y1, alphaHex(col, a), 1.6); gLine(g, x0, y0, x1, y1, `rgba(255,255,255,${a * .6})`, .6); }
function lookDefaults(L, cls) {
  return Object.assign({ style: (WSTYLE_BY[cls] || ['classic'])[0], power: 4, bulk: 1, glowAmt: 60, coils: 2, prongs: 1, strips: 1, panels: 1, hazard: 0 }, L);
}
function drawHands(g, w, h, cx, spread, firing) {
  const sk = '#c08a68', y = h * .8 + (firing ? 2 : 0);
  [[-1], [1]].forEach(([sd]) => {
    const x = cx + sd * spread;
    gPoly(g, [[x - 12, h], [x - 10, y + 4], [x - 4, y], [x + 6, y + 2], [x + 10, y + 10], [x + 12, h]], metalH(g, x - 12, x + 12, sk), '#3a2014');
    for (let k = 0; k < 3; k++) gLine(g, x - 6 + k * 5, y + 3, x - 5 + k * 5, y + 9, 'rgba(60,30,20,.7)', 1);
    gPoly(g, [[x - 14, h], [x - 13, h - 6], [x + 13, h - 6], [x + 14, h]], '#4a5a3a', '#22301a');
  });
}
function muzzleFlash(g, x, y, d, L, big) {
  const energy = d.ammo === 'cells' || ['space', 'rail', 'raygun', 'bio'].includes(L.style);
  const r = (14 + L.power * 2.2) * (big ? 1.25 : 1);
  if (energy) { gGlow(g, x, y, r * 1.5, L.glow, .9); for (let i = 0; i < 6 + L.power; i++) { const a = i / (6 + L.power) * 6.283 + L.seed % 7; gLine(g, x, y, x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2, alphaHex(L.glow, .5), 1); } gGlow(g, x, y, r * .5, '#ffffff', 1); }
  else { g.fillStyle = 'rgba(255,200,60,.95)'; const n = 8; g.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * 6.283, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); } g.fill(); gGlow(g, x, y, r * .7, '#ffd060', 1); }
}
// first-person view: gun seen from behind, barrel pointing into the screen
function drawGunFP(g, w, h, d, firing) {
  const L = lookDefaults(d.look, d.cls), cx = w / 2, sz = (0.82 + L.power * 0.035) * L.bulk, len = L.length;
  const my = h * (0.08 + (1.4 - len) * 0.28) + (firing ? 6 : 0), ga = Math.min(1, (L.glowAmt / 100) * (0.6 + L.power * 0.06));
  const B = L.body, A = L.accent, GL = L.glow, kick = firing ? 5 : 0, base = h + 2;
  const bw = w * .3 * sz, nw = w * .075 * sz; // bottom half-width, muzzle half-width
  if (d.cls === 'melee') return drawMeleeFP(g, w, h, d, L, firing);
  if (firing) muzzleFlash(g, cx, my - 4, d, L, L.style === 'heavy' || d.cls === 'super');
  const st = L.style;
  if (st === 'rail') {
    gPoly(g, [[cx - bw, base], [cx - bw * .95, h * .66], [cx + bw * .95, h * .66], [cx + bw, base]], metalH(g, cx - bw, cx + bw, B), '#000');
    for (const sd of [-1, 1]) { const x0 = cx + sd * bw * .55, x1 = cx + sd * nw * 1.3; gPoly(g, [[x0 - 5, h * .7], [x1 - 2, my], [x1 + 2, my], [x0 + 5, h * .7]], metalH(g, Math.min(x0, x1) - 5, Math.max(x0, x1) + 5, A), '#000'); }
    const n = Math.max(1, L.coils + Math.floor(L.power / 3));
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, y = h * .68 + (my - h * .68) * t, hw = bw * .55 + (nw * 1.3 - bw * .55) * t; g.strokeStyle = alphaHex(GL, ga); g.lineWidth = 2.5 - t; g.beginPath(); g.ellipse(cx, y, hw, 2 + 2 * (1 - t), 0, 0, 7); g.stroke(); }
    gStrip(g, cx, h * .66, cx, my + 2, GL, ga * (firing ? 1 : .8));
    gGlow(g, cx, my + 2, 5 + L.power, GL, ga);
  } else if (st === 'bio') {
    g.fillStyle = metalH(g, cx - bw, cx + bw, B); g.beginPath(); g.moveTo(cx - bw, base); g.bezierCurveTo(cx - bw * 1.3, h * .6, cx - nw * 2.2, my + h * .2, cx - nw, my); g.lineTo(cx + nw, my); g.bezierCurveTo(cx + nw * 2.2, my + h * .2, cx + bw * 1.3, h * .6, cx + bw, base); g.closePath(); g.fill(); g.strokeStyle = shadeHex(B, -.7); g.stroke();
    for (let i = 0; i < 5; i++) { const sx = cx + (i - 2) * bw * .35; g.strokeStyle = alphaHex(A, .9); g.lineWidth = 1.4; g.beginPath(); g.moveTo(sx, base); g.quadraticCurveTo(sx + (i % 2 ? 8 : -8), h * .7, cx + (i - 2) * nw * .5, my + 6); g.stroke(); }
    const n = 2 + L.coils; for (let i = 0; i < n; i++) { const t = (i * 0.618 + L.seed % 10 / 10) % 1, y = h * .9 - t * (h * .9 - my - 12), x = cx + Math.sin(i * 2.4 + L.seed) * (bw * (1 - t * .6) * .6); gGlow(g, x, y, 4 + L.power * .5, GL, ga); }
    g.fillStyle = '#e8e0c8'; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, x = cx + Math.cos(a) * nw * 1.1, y = my + 3 + Math.sin(a) * 3; gPoly(g, [[x - 1.5, y], [cx + Math.cos(a) * nw * .4, my + 3 + Math.sin(a)], [x + 1.5, y]], '#e8e0c8'); }
    gGlow(g, cx, my + 3, nw * 1.2, GL, ga);
  } else if (st === 'heavy') {
    const tw = bw * 1.1, ty = h * .55;
    gPoly(g, [[cx - tw, base], [cx - tw, ty], [cx + tw, ty], [cx + tw, base]], metalH(g, cx - tw, cx + tw, B), '#000');
    gPoly(g, [[cx - tw, ty], [cx - tw * .7, ty - 10], [cx + tw * .7, ty - 10], [cx + tw, ty]], metalV(g, ty - 10, ty, B), '#000');
    if (L.hazard) { g.save(); g.beginPath(); g.rect(cx - tw, h * .6, tw * 2, 8); g.clip(); for (let x = -tw; x < tw; x += 8) gPoly(g, [[cx + x, h * .6 + 8], [cx + x + 4, h * .6], [cx + x + 8, h * .6], [cx + x + 4, h * .6 + 8]], '#f0c020'); g.restore(); g.strokeStyle = '#000'; g.strokeRect(cx - tw, h * .6, tw * 2, 8); }
    for (let i = 0; i < 4; i++) { g.fillStyle = '#111'; g.fillRect(cx - tw + 6, h * .72 + i * 5, tw * .5, 2); g.fillRect(cx + tw * .5 - 6, h * .72 + i * 5, tw * .5, 2); }
    const nb = Math.max(1, L.barrels), rr = nw * 1.6, by = my + 8;
    gPoly(g, [[cx - tw * .7, ty - 10], [cx - rr * 1.2, by], [cx + rr * 1.2, by], [cx + tw * .7, ty - 10]], metalH(g, cx - tw * .7, cx + tw * .7, A), '#000');
    g.fillStyle = metalH(g, cx - rr * 1.3, cx + rr * 1.3, B); g.beginPath(); g.ellipse(cx, by, rr * 1.3, rr * .9, 0, 0, 7); g.fill(); g.strokeStyle = '#000'; g.stroke();
    for (let i = 0; i < nb; i++) { const a = i / nb * 6.283 + (firing ? .5 : 0), x = cx + (nb > 1 ? Math.cos(a) * rr * .7 : 0), y = by + (nb > 1 ? Math.sin(a) * rr * .45 : 0); g.fillStyle = '#050505'; g.beginPath(); g.ellipse(x, y, rr * (nb > 1 ? .28 : .6), rr * (nb > 1 ? .2 : .42), 0, 0, 7); g.fill(); }
    if (L.strips) gStrip(g, cx - tw + 3, ty + 2, cx - tw + 3, base, GL, ga * .8), gStrip(g, cx + tw - 3, ty + 2, cx + tw - 3, base, GL, ga * .8);
  } else if (st === 'raygun') {
    g.fillStyle = metalH(g, cx - bw, cx + bw, B); g.beginPath(); g.ellipse(cx, h * .86, bw * .9, h * .22, 0, 0, 7); g.fill(); g.strokeStyle = '#000'; g.stroke();
    for (const sd of [-1, 1]) gPoly(g, [[cx + sd * bw * .6, h * .8], [cx + sd * bw * 1.25, h * .62], [cx + sd * bw * 1.15, h * .95], [cx + sd * bw * .7, h]], metalH(g, cx - bw * 1.3, cx + bw * 1.3, A), '#000');
    gPoly(g, [[cx - nw * 1.4, h * .7], [cx - nw * .8, my + 6], [cx + nw * .8, my + 6], [cx + nw * 1.4, h * .7]], metalH(g, cx - nw * 1.4, cx + nw * 1.4, B), '#000');
    const n = 2 + L.coils; for (let i = 0; i < n; i++) { const t = (i + .5) / n, y = h * .7 + (my + 6 - h * .7) * t, hw = nw * (1.9 - t * .8); g.fillStyle = metalH(g, cx - hw, cx + hw, A); g.beginPath(); g.ellipse(cx, y, hw, 2.6, 0, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = .8; g.stroke(); }
    g.strokeStyle = metalH(g, cx - nw * 2.2, cx + nw * 2.2, A); g.lineWidth = 2; g.beginPath(); g.ellipse(cx, my + 4, nw * 2.2, 4, 0, 0, 7); g.stroke();
    gGlow(g, cx, my + 4, nw * 1.6, GL, ga); gGlow(g, cx, h * .8, 6 + L.power * .6, GL, ga * .8);
  } else if (st === 'space') {
    const sh = h * .62;
    gPoly(g, [[cx - bw, base], [cx - bw * 1.08, h * .78], [cx - bw * .62, sh], [cx - nw * 1.5, my + 14], [cx - nw, my], [cx + nw, my], [cx + nw * 1.5, my + 14], [cx + bw * .62, sh], [cx + bw * 1.08, h * .78], [cx + bw, base]], metalH(g, cx - bw * 1.1, cx + bw * 1.1, B), '#050505');
    gPoly(g, [[cx - bw * .45, base], [cx - bw * .4, h * .7], [cx - nw * .7, my + 16], [cx + nw * .7, my + 16], [cx + bw * .4, h * .7], [cx + bw * .45, base]], metalH(g, cx - bw * .45, cx + bw * .45, A), 'rgba(0,0,0,.6)');
    if (L.panels) { g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = .8; for (const t of [.25, .55, .8]) { const y = base + (my - base) * t, hw = bw * (1 - t * .85); g.beginPath(); g.moveTo(cx - hw, y); g.lineTo(cx - hw * .5, y - 3); g.moveTo(cx + hw, y); g.lineTo(cx + hw * .5, y - 3); g.stroke(); } }
    if (L.strips) for (const sd of [-1, 1]) gStrip(g, cx + sd * bw * .8, h * .92, cx + sd * nw * 1.25, my + 12, GL, ga);
    const n = L.coils; for (let i = 0; i < n; i++) { const t = .18 + i * .6 / Math.max(1, n), y = base + (my - base) * t, hw = bw * (1 - t * .85) * .42; g.fillStyle = alphaHex(GL, ga); g.fillRect(cx - hw, y - 1.5, hw * 2, 3); g.fillStyle = `rgba(255,255,255,${ga * .7})`; g.fillRect(cx - hw * .7, y - .5, hw * 1.4, 1); }
    if (L.prongs) for (const sd of [-1, 1]) gPoly(g, [[cx + sd * nw * .7, my + 6], [cx + sd * nw * 1.6, my - 10 - L.power], [cx + sd * nw * 1.1, my - 12 - L.power], [cx + sd * nw * .2, my + 2]], metalH(g, cx - nw * 2, cx + nw * 2, A), '#000');
    gGlow(g, cx, my - 2, nw * (.9 + L.power * .12), GL, ga);
  } else { // classic
    gPoly(g, [[cx - bw, base], [cx - bw * .85, h * .58], [cx + bw * .85, h * .58], [cx + bw, base]], metalH(g, cx - bw, cx + bw, B), '#000');
    gPoly(g, [[cx - bw * .85, h * .58], [cx - bw * .6, h * .5], [cx + bw * .6, h * .5], [cx + bw * .85, h * .58]], metalV(g, h * .5, h * .58, B), '#000');
    const n = Math.max(1, Math.min(L.barrels, 3)), sp = nw * 1.6;
    for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * sp, x0 = cx + off * 2.2, x1 = cx + off; gPoly(g, [[x0 - nw * 1.2, h * .52], [x1 - nw * .7, my], [x1 + nw * .7, my], [x0 + nw * 1.2, h * .52]], metalH(g, Math.min(x0, x1) - nw * 1.2, Math.max(x0, x1) + nw * 1.2, '#3a3a3a'), '#000'); g.fillStyle = '#000'; g.beginPath(); g.ellipse(x1, my + 1, nw * .45, 1.6, 0, 0, 7); g.fill(); }
    if (L.strips) gStrip(g, cx, h * .55, cx, h * .95, GL, ga * .7);
    gPoly(g, [[cx - 3, my - 4], [cx - 2, my - 9], [cx + 2, my - 9], [cx + 3, my - 4]], '#111');
  }
  // shared extras
  if (L.scope && st !== 'heavy') { const sy = h * .48, sw = bw * .45; gPoly(g, [[cx - sw, sy + 10], [cx - sw * .8, sy], [cx + sw * .8, sy], [cx + sw, sy + 10]], metalH(g, cx - sw, cx + sw, '#222'), '#000'); g.fillStyle = alphaHex(GL, .35); g.fillRect(cx - sw * .55, sy + 2, sw * 1.1, 6); g.strokeStyle = alphaHex(GL, .95); g.lineWidth = 1; g.strokeRect(cx - 3, sy + 3, 6, 4); gLine(g, cx, sy + 2, cx, sy + 8, alphaHex(GL, .9), .6); }
  if (L.drum) { const x = cx + bw * .95, y = h * .8, r = bw * .32; g.fillStyle = metalH(g, x - r, x + r, A); g.beginPath(); g.ellipse(x, y, r, r * 1.3, 0, 0, 7); g.fill(); g.strokeStyle = '#000'; g.stroke(); if (d.ammo === 'cells' || st !== 'classic') { g.fillStyle = alphaHex(GL, ga); g.fillRect(x - r * .3, y - r * .8, r * .6, r * 1.6); } }
  drawHands(g, w, h, cx, bw * .8, firing);
}
function drawMeleeFP(g, w, h, d, L, firing) {
  const cx = w / 2 + (firing ? -10 : 0), tip = h * (0.04 + (1.4 - L.length) * 0.2) - (firing ? 8 : 0), bw = w * .07 * (0.85 + L.power * .03) * L.bulk, ga = Math.min(1, L.glowAmt / 100 + L.power * .03);
  if (L.style === 'space') { gGlow(g, cx, (tip + h * .5) / 2, bw * 3, L.glow, ga * .5); gPoly(g, [[cx - bw * .7, h * .52], [cx, tip], [cx + bw * .7, h * .52]], alphaHex(L.glow, .9)); gPoly(g, [[cx - bw * .25, h * .52], [cx, tip + 6], [cx + bw * .25, h * .52]], '#fff'); }
  else if (L.style === 'heavy') { const r = bw * 2.6, y = h * .32; g.fillStyle = metalH(g, cx - r, cx + r, L.body); g.beginPath(); g.arc(cx, y, r, 0, 7); g.fill(); g.strokeStyle = '#000'; g.stroke(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + (firing ? .2 : 0); gPoly(g, [[cx + Math.cos(a) * r, y + Math.sin(a) * r], [cx + Math.cos(a + .2) * (r + 5), y + Math.sin(a + .2) * (r + 5)], [cx + Math.cos(a + .39) * r, y + Math.sin(a + .39) * r]], '#ccc'); } g.fillStyle = L.accent; g.beginPath(); g.arc(cx, y, r * .3, 0, 7); g.fill(); }
  else if (L.style === 'bio') { g.fillStyle = metalH(g, cx - bw, cx + bw, L.body); g.beginPath(); g.moveTo(cx - bw, h * .55); g.quadraticCurveTo(cx - bw * 2, h * .25, cx, tip); g.quadraticCurveTo(cx + bw * .5, h * .3, cx + bw, h * .55); g.fill(); for (let i = 0; i < 3; i++) gGlow(g, cx - bw * .3, h * (.3 + i * .08), 3 + L.power * .4, L.glow, ga); }
  else { gPoly(g, [[cx - bw, h * .52], [cx - bw * .5, tip + 10], [cx, tip], [cx + bw * .5, tip + 10], [cx + bw, h * .52]], metalH(g, cx - bw, cx + bw, L.body), '#000'); gLine(g, cx, tip + 4, cx, h * .5, 'rgba(255,255,255,.6)', 1); if (L.strips) gStrip(g, cx - bw * .6, h * .5, cx - bw * .2, tip + 12, L.glow, ga); }
  gPoly(g, [[cx - bw * 1.6, h * .56], [cx - bw * 1.6, h * .5], [cx + bw * 1.6, h * .5], [cx + bw * 1.6, h * .56]], metalV(g, h * .5, h * .56, L.accent), '#000');
  gPoly(g, [[cx - bw * .5, h * .56], [cx - bw * .5, h * .8], [cx + bw * .5, h * .8], [cx + bw * .5, h * .56]], metalH(g, cx - bw * .5, cx + bw * .5, L.accent), '#000');
  drawHands(g, w, h, cx, bw * .2, firing);
}
// pickup: side view lying on the floor
function drawGunSide(g, w, h, d) {
  const L = lookDefaults(d.look, d.cls), st = L.style, ga = Math.min(1, L.glowAmt / 100 + L.power * .03), B = L.body, A = L.accent, GL = L.glow, my = h * .45;
  if (d.cls === 'melee') { gPoly(g, [[0, my - 2], [w * .3, my - 3], [w * .3, my + 3], [0, my + 2]], metalV(g, my - 3, my + 3, A), '#000'); gPoly(g, [[w * .3, my - 4], [w, my], [w * .3, my + 4]], st === 'space' ? alphaHex(GL, .9) : metalV(g, my - 4, my + 4, B), '#000'); return; }
  if (L.stock) gPoly(g, [[0, my - 2], [w * .22, my - 3], [w * .22, h * .85], [w * .06, h * .9]], metalV(g, my - 3, h * .9, A), '#000');
  const t = st === 'space' ? [[w * .18, h * .25], [w * .62, h * .2], [w * .9, my - 1], [w, my - 1], [w, my + 3], [w * .6, h * .7], [w * .18, h * .7]] : st === 'bio' ? [[w * .15, h * .3], [w * .5, h * .12], [w * .95, my - 2], [w, my + 2], [w * .55, h * .8], [w * .15, h * .7]] : st === 'heavy' ? [[w * .12, h * .15], [w * .7, h * .15], [w * .7, h * .35], [w, h * .35], [w, h * .6], [w * .7, h * .6], [w * .7, h * .8], [w * .12, h * .8]] : st === 'raygun' ? [[w * .2, h * .25], [w * .55, h * .3], [w * .85, my - 2], [w, my - 4], [w, my + 6], [w * .85, my + 3], [w * .55, h * .7], [w * .2, h * .75]] : [[w * .18, h * .25], [w * .6, h * .25], [w * .6, my - 2], [w, my - 2], [w, my + 3], [w * .6, my + 3], [w * .6, h * .65], [w * .18, h * .65]];
  gPoly(g, t, metalV(g, 0, h, B), '#000');
  gPoly(g, [[w * .3, h * .62], [w * .38, h * .62], [w * .34, h], [w * .27, h]], metalV(g, h * .6, h, A), '#000');
  if (st === 'rail') { gLine(g, w * .55, my - 2, w, my - 2, A, 2); gLine(g, w * .55, my + 3, w, my + 3, A, 2); for (let i = 0; i < L.coils + 2; i++) gLine(g, w * (.6 + i * .08), my - 2, w * (.6 + i * .08), my + 3, alphaHex(GL, ga), 1.5); }
  if (L.strips || st === 'space') gStrip(g, w * .22, h * .45, w * .62, h * .38, GL, ga);
  if (L.drum) { g.fillStyle = metalV(g, h * .55, h, A); g.beginPath(); g.ellipse(w * .48, h * .78, w * .07, h * .22, 0, 0, 7); g.fill(); }
  if (L.scope) { gPoly(g, [[w * .3, h * .05], [w * .55, h * .05], [w * .55, h * .22], [w * .3, h * .22]], '#111'); g.fillStyle = alphaHex(GL, .8); g.fillRect(w * .52, h * .08, 2, h * .1); }
  gGlow(g, w * .97, my, 3 + L.power * .3, GL, ga * .8);
}
function drawGun(g, w, h, d, firing, side) { return side ? drawGunSide(g, w, h, d) : drawGunFP(g, w, h, d, firing); }
const WEPF = new Map();
function weaponArt(id, d) {
  const key = id + JSON.stringify(d.look) + d.cls; let a = WEPF.get(key); if (a) return a;
  if (d.look.art && !artWep(d.look.art)) { const ph = SPR.artWait || (SPR.artWait = mkSprite('artWait', 1, 1, () => { })); return { idle: ph, fire: ph, pick: ph }; }
  if (d.look.art) { const af = artWepFrames(d, id); if (af) { af.pick.ox = af.pick.w >> 1; af.pick.oy = af.pick.h; WEPF.set(key, af); return af; } }
  const W_ = 160, H_ = 120;
  a = { idle: mkSprite('w' + id + 'a', W_, H_, (g, w, h) => drawGun(g, w, h, d, false)), fire: mkSprite('w' + id + 'b', W_, H_, (g, w, h) => drawGun(g, w, h, d, true)), pick: mkSprite('w' + id + 'p', Math.round(48 + 24 * d.look.length), 20, (g, w, h) => drawGun(g, w, h, d, false, true)) };
  ['w' + id + 'a', 'w' + id + 'b', 'w' + id + 'p'].forEach(k => delete SPR[k]);
  a.pick.ox = a.pick.w >> 1; a.pick.oy = a.pick.h; WEPF.set(key, a); return a;
}
function weaponPickupImg(type, d) { return weaponArt(type, d).pick; }
/* hand-painted weapon frames (Coach Gun, Carbine): placed where the artist painted them, a procedural muzzle flash,
   and a reload that plays the painted frames (break open, load) with our flying shells on top */
function drawPaintedWeapon(g, W, H, art, d, bx, by) {
  const p = G.p, A = art.meta, hh = hudHeight(W, H), s = Math.min(W / 320, (H - hh) / 168) * 0.95, sp = s * 320 / art.basis;
  let f = art.frames[0], rot = 0, lift = 0, k = -1;
  const reloading = p.reloadT > 0 && !p.reloadDelay && p.reloadW === p.w && p.reload0;
  if (reloading) {
    k = 1 - p.reloadT / p.reload0; const R = A.reload || [];
    if (R.length >= 2) { // painted reload frames spread over the middle of the reload (weights in reloadW)
      if (k < 0.1) { rot = -0.10 * ease(k / 0.1); lift = -10 * ease(k / 0.1); }
      else if (k < 0.86) { const Wt = A.reloadW || R.map(() => 1), tot = Wt.reduce((a, b) => a + b, 0); let acc = 0, u = (k - 0.1) / 0.76 * tot, i = 0; while (i < R.length - 1 && u >= acc + Wt[i]) acc += Wt[i++]; f = art.frames[R[i]] || f; p.reloadSeg = i; }
      else if (A.closeFrame != null && art.frames[A.closeFrame] && k < 0.95) { f = art.frames[A.closeFrame]; lift = -6 * (1 - (k - 0.86) / 0.09); } // the painted snap shut
      else { const t = ease((k - (A.closeFrame != null ? 0.95 : 0.86)) / (A.closeFrame != null ? 0.05 : 0.14)); rot = -0.22 * (1 - t) * (A.closeFrame != null ? 0.3 : 1); lift = -14 * (1 - t) * (A.closeFrame != null ? 0.3 : 1); }
    } else { const t = Math.sin(Math.min(1, k) * Math.PI); lift = 70 * t; rot = 0.25 * t; } // no painted reload yet: dip down and back
  }
  const kick = p.fireT > 0 ? (p.fireT / (p.fireT0 || 6)) : 0;
  // shouldered guns: carried off to the side while you walk, brought up to the center the moment you fire, held there while you keep shooting
  const aimGun = A.aimFrame != null && art.frames[A.aimFrame], now = performance.now();
  if (aimGun && !reloading && kick > 0) p.aimUntil = now + (A.aimHold || 600);
  const aiming = aimGun && !reloading && (kick > 0 || (p.aimUntil && now < p.aimUntil));
  if (aiming) { f = art.frames[A.aimFrame]; if (p.fireT === p.fireT0) p.shotAlt = !p.shotAlt;
    if (kick > 0.5 && A.aimFireFrame != null && art.frames[A.aimFireFrame]) { const fb = A.aimFireFrameB != null && art.frames[A.aimFireFrameB]; f = (p.shotAlt || !fb) ? art.frames[A.aimFireFrame] : fb; } // painted flashes A/B alternate shot to shot
    lift -= 4 * kick; }
  else if (!reloading && kick) { lift -= 10 * kick; rot -= 0.05 * kick; if (A.fireFrame != null && kick > 0.6 && art.frames[A.fireFrame]) f = art.frames[A.fireFrame];
    else if (A.recoilFrame != null && art.frames[A.recoilFrame]) { f = art.frames[A.recoilFrame]; lift += 6 * kick; rot += 0.03 * kick; } // the painted kick already lifts the gun
    if (A.smoke && kick < 0.6 && !p.wispOut) { p.wispOut = true; const mf = art.frames[0], mdw = mf.w * sp, mdh = mf.h * sp, mcx = W / 2 + mf.place.dx * sp + bx;
      (G.wisps = G.wisps || []).push({ x: mcx - mdw / 2 + A.muzzle[0] * mdw, y: H - hh + by - mdh + A.muzzle[1] * mdh, t: 0, s: sp, flip: Math.random() < 0.5 }); } }
  if (!kick) p.wispOut = false;
  const dw = f.w * sp, dh = f.h * sp, cx = W / 2 + f.place.dx * sp + bx, yb = H - hh + by - f.place.dy * sp - lift * sp;
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.translate(cx, yb); g.rotate(rot); g.drawImage(f.im, -dw / 2, -dh, dw, dh);
  // muzzle flash on the ready frame
  const onAim = aimGun && f === art.frames[A.aimFrame], MZ = onAim ? A.muzzleAim : A.muzzle;
  if (kick > 0.45 && (onAim || f === art.frames[0]) && MZ && A.fireFrame == null) {
    const mx = -dw / 2 + MZ[0] * dw, my = -dh + MZ[1] * dh, r = (A.id === 'coach' ? 70 : 46) * sp * (0.7 + 0.5 * Math.random());
    if (p.flashSeed == null) p.flashSeed = Math.random();
    const fi = (A.flashAlt && p.flashSeed > 0.5 && ARTL.img.get(A.flashAlt)) || (A.flash && ARTL.img.get(A.flash));
    if (fi) { // the painted star burst, a little different every shot
      if (p.flashSeed == null) p.flashSeed = Math.random(); const fw = (A.flashW || 90) * sp * (0.85 + 0.3 * p.flashSeed), fh = fw * fi.height / fi.width;
      g.save(); g.translate(mx, my); g.rotate((p.flashSeed - 0.5) * 0.6); g.imageSmoothingEnabled = false; g.drawImage(fi, -fw / 2, -fh / 2, fw, fh); g.restore();
    } else {
    const gr = g.createRadialGradient(mx, my, 0, mx, my, r); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.25, 'rgba(255,214,90,.95)'); gr.addColorStop(0.6, 'rgba(255,120,20,.55)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = r * (i % 2 ? 0.45 : 1) * (0.8 + Math.random() * 0.4); g.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
    }
  }
  // brass flies out to the right on every rifle shot (carried, aimed or the painted firing frame)
  { const aimAny = aimGun && (f === art.frames[A.aimFrame] || f === art.frames[A.aimFireFrame]), E = aimAny ? A.ejectAim : (f === art.frames[0] ? A.eject : null);
    if (kick > 0.45 && E && !p.casingOut) { p.casingOut = true; const ex = cx + (-dw / 2 + E[0] * dw), ey = yb - dh + E[1] * dh; (G.shells = G.shells || []).push({ x: ex, y: ey, vx: (6 + Math.random() * 3) * s, vy: -(7 + Math.random() * 3) * s, rot: 0, vr: 0.4, len: 9 * s, t: 0, brass: 1 }); } }
  if (!kick) { p.casingOut = false; p.flashSeed = null; }
  if (!reloading) p.reloadSeg = -1;
  g.restore();
  // break open: kick the two spent shells out of the chambers on the painted open frame
  // painted shells: when the last painted shell frame ends, our shells carry on from where the painting left them and fall away
  if (reloading && A.shellsOut && !p.ejected && p.reloadSeg >= (A.reload || []).length - 1) {
    p.ejected = true; const fo = art.frames[(A.reload || [])[(A.reload || []).length - 2]] || f, odw = fo.w * sp, odh = fo.h * sp, ocx = W / 2 + fo.place.dx * sp + bx, oy = H - hh + by - fo.place.dy * sp - odh;
    A.shellsOut.forEach(([sx, sy, dir]) => (G.shells = G.shells || []).push({ x: ocx - odw / 2 + sx * odw, y: oy + sy * odh, vx: dir * (4 + Math.random() * 2) * s, vy: -(2 + Math.random() * 2) * s, rot: dir * 0.6, vr: dir * (0.2 + Math.random() * 0.15), len: 0.09 * odw, t: 0 }));
  }
  if (reloading && A.bores && k >= 0.2 && !p.ejected) {
    p.ejected = true; const fo = art.frames[(A.reload || [1])[0]] || f, odw = fo.w * sp, odh = fo.h * sp, ocx = W / 2 + fo.place.dx * sp + bx, oy = H - hh + by - fo.place.dy * sp - odh;
    A.bores.forEach(([bx2, by2], i) => { const x = ocx - odw / 2 + bx2 * odw, y = oy + by2 * odh, dir = i ? 1 : -1, r = (A.boreR || 0.035) * odw;
      (G.shells = G.shells || []).push({ x, y, vx: dir * (5 + Math.random() * 3) * s, vy: -(10 + Math.random() * 4) * s, rot: 0, vr: dir * (0.25 + Math.random() * 0.2), len: r * 2.8, t: 0 });
      (G.smoke = G.smoke || []).push({ x, y, r: r * 0.3, t: 0 }); });
  }
  // gun smoke curling up from the barrels after a shot (painted wisp), rising and fading
  const wi = A.smoke && ARTL.img.get(A.smoke);
  if (wi && G.wisps && G.wisps.length) { const now = performance.now(), dt = Math.min(3, ((now - (G.wispT || now)) / (1000 / 35)) || 1); G.wispT = now;
    G.wisps = G.wisps.filter(q => (q.t += dt) < 40);
    G.wisps.forEach(q => { const k = q.t / 40, ww = 105 * 0.9 * q.s * (0.8 + k * 0.5), wh = ww; g.save(); g.globalAlpha = 0.85 * (1 - k); g.imageSmoothingEnabled = false;
      g.translate(q.x + (q.flip ? -1 : 1) * k * 10 * q.s, q.y - k * 30 * q.s); if (q.flip) g.scale(-1, 1); g.drawImage(wi, -ww * 0.3, -ww, ww, wh); g.restore(); }); }
  g.imageSmoothingEnabled = false; shellFx(g, W, H, s);
}
function drawCustomWeapon(g, W, H, u, bx, by) {
  const p = G.p, d = WEAPONS[p.w].custom, art = weaponArt(p.w, d); if (art.painted) return drawPaintedWeapon(g, W, H, art, d, bx, by);
  let img = p.fireT > 2 ? art.fire : art.idle;
  if (art.seq && p.fireT > 0) { const t0 = p.fireT0 || 6, k = Math.min(art.seq.length - 1, Math.floor((t0 - p.fireT) / t0 * art.seq.length)); img = art.seq[k]; }
  const hh = hudHeight(W, H), s = Math.min(W / 320, (H - hh) / 168) * 0.95, modern = typeof hudModern === 'function' && hudModern();
  const c = modern ? hqCanvas(img) : spriteCanvas(img); g.imageSmoothingEnabled = modern; if (modern) g.imageSmoothingQuality = 'high';
  const dw = img.w * s, dh = img.h * s, x0 = W / 2 - dw / 2 + bx, yb = H - hh + by + (p.fireT > 3 ? 3 * s : 0);
  if (d.reloadAnim === 'break' && p.reloadT > 0 && !p.reloadDelay && p.reloadW === p.w && p.reload0) breakReload(g, W, H, hh, art.idle, c, dw, dh, x0, yb, s);
  else g.drawImage(c, x0, yb - dh, dw, dh);
  g.imageSmoothingEnabled = false; shellFx(g, W, H, s);
}
/* ---------- break-action reload: the barrels crack down off the receiver, the spent shells spring out
   left and right, two fresh ones go in, and the action snaps shut ---------- */
// where the two bores are on the painting (darkest blobs, left and right of center), cached per picture
function boresOf(img) {
  if (img.bores) return img.bores;
  const px = img.px, w = img.w, h = img.h, L = []; let n = 0, xs = 0;
  for (let y = 0; y < h * 0.75; y++) for (let x = 0; x < w; x++) { const c = px[y * w + x]; if (!(c >>> 24)) continue; n++; xs += x; const l = (c & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + ((c >> 16) & 255) * 0.11; L.push([l, x, y]); }
  const cx = n ? xs / n : w / 2; L.sort((a, b) => a[0] - b[0]); const dark = L.slice(0, Math.max(8, Math.floor(L.length * 0.07)));
  const side = sgn => { const pts = dark.filter(([, x]) => sgn < 0 ? x < cx : x >= cx); if (pts.length < 3) return null; let sx = 0, sy = 0; pts.forEach(([, x, y]) => { sx += x; sy += y; }); return { x: sx / pts.length / w, y: sy / pts.length / h, r: Math.max(0.05, Math.sqrt(pts.length / Math.PI) / w) }; };
  const a = side(-1) || { x: 0.4, y: 0.45, r: 0.09 }, b = side(1) || { x: 0.6, y: 0.45, r: 0.09 }; const r = Math.min(0.14, Math.max(a.r, b.r));
  return img.bores = [{ x: a.x, y: a.y, r }, { x: b.x, y: b.y, r }];
}
const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
function drawShell(g, x, y, len, rot, spent, endOn, brass) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (brass) { const w = len * 0.36, gb = g.createLinearGradient(0, -w / 2, 0, w / 2); gb.addColorStop(0, '#f3d77a'); gb.addColorStop(1, '#8a6a1a'); g.fillStyle = gb; g.fillRect(-len / 2, -w / 2, len, w); g.fillStyle = '#5a4416'; g.fillRect(len / 2 - len * 0.12, -w / 2, len * 0.12, w); g.restore(); return; }
  if (endOn) { // seen from the back: brass rim with a primer dot
    const r = len * 0.32; g.fillStyle = spent ? '#7a5c18' : '#c9a227'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.fillStyle = spent ? '#4a3a12' : '#e8c95a'; g.beginPath(); g.arc(0, 0, r * 0.72, 0, 7); g.fill(); g.fillStyle = '#5a4416'; g.beginPath(); g.arc(0, 0, r * 0.22, 0, 7); g.fill();
  } else { const w = len * 0.42, hb = len * 0.3;
    const gr = g.createLinearGradient(0, -w / 2, 0, w / 2); gr.addColorStop(0, spent ? '#7a1418' : '#e0262d'); gr.addColorStop(1, spent ? '#3a0a0c' : '#7a0d12');
    g.fillStyle = gr; g.fillRect(-len / 2 + hb, -w / 2, len - hb, w);
    const gb = g.createLinearGradient(0, -w / 2, 0, w / 2); gb.addColorStop(0, '#f0d270'); gb.addColorStop(1, '#8a6a1a'); g.fillStyle = gb; g.fillRect(-len / 2, -w / 2 - len * 0.03, hb, w + len * 0.06);
    if (spent) { g.fillStyle = 'rgba(20,20,20,.6)'; g.fillRect(len / 2 - len * 0.08, -w / 2, len * 0.08, w); } }
  g.restore();
}
function breakReload(g, W, H, hh, idle, c, dw, dh, x0, yb, s) {
  const p = G.p, k = 1 - p.reloadT / p.reload0;
  const o = k < 0.16 ? ease(k / 0.16) : k > 0.86 ? 1 - ease((k - 0.86) / 0.14) : 1; // how far the barrels are cracked open
  const sq = 1 - 0.42 * o, drop = dh * 0.05 * o, tilt = -0.05 * o, cx = x0 + dw / 2;
  // the gun: pivots at the hinge (bottom center); muzzles tip down = foreshortened
  g.save(); g.translate(cx, yb + drop); g.rotate(tilt); g.scale(1, sq); g.drawImage(c, -dw / 2, -dh, dw, dh); g.restore();
  if (o < 0.25) return;
  // the open breech: two chambers facing you
  const B = boresOf(idle), ch = B.map(b => ({ x: cx + (b.x - 0.5) * dw + Math.sin(tilt) * (1 - b.y) * dh, y: yb + drop - (1 - b.y) * dh * sq - dh * 0.16 * o, r: b.r * dw * 1.05 }));
  const a = Math.min(1, (o - 0.25) / 0.4); g.globalAlpha = a;
  // the breech face of the barrel block, tipped up toward you
  { const pad = ch[0].r * 1.0, X = Math.min(ch[0].x, ch[1].x) - ch[0].r - pad, X2 = Math.max(ch[0].x, ch[1].x) + ch[0].r + pad, Y = Math.min(ch[0].y, ch[1].y) - ch[0].r - pad * 0.8, Y2 = Math.max(ch[0].y, ch[1].y) + ch[0].r + pad * 0.8;
    const gr = g.createLinearGradient(0, Y, 0, Y2); gr.addColorStop(0, '#8a8d94'); gr.addColorStop(0.5, '#4a4c52'); gr.addColorStop(1, '#232428');
    g.fillStyle = gr; g.beginPath(); const rr = pad; g.moveTo(X + rr, Y); g.lineTo(X2 - rr, Y); g.quadraticCurveTo(X2, Y, X2, Y + rr); g.lineTo(X2, Y2 - rr); g.quadraticCurveTo(X2, Y2, X2 - rr, Y2); g.lineTo(X + rr, Y2); g.quadraticCurveTo(X, Y2, X, Y2 - rr); g.lineTo(X, Y + rr); g.quadraticCurveTo(X, Y, X + rr, Y); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = Math.max(1, pad * 0.15); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(X + rr, Y + pad * 0.12, X2 - X - 2 * rr, pad * 0.12); }
  ch.forEach(q => { g.fillStyle = '#0b0b0b'; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); g.strokeStyle = '#5a5a5e'; g.lineWidth = Math.max(1, q.r * 0.18); g.stroke(); });
  // spent shells sit there until the ejectors kick them out
  if (k < 0.24) ch.forEach(q => drawShell(g, q.x, q.y, q.r * 2.6, 0, true, true));
  else if (!p.ejected) { p.ejected = true; ch.forEach((q, i) => { const dir = i ? 1 : -1; (G.shells = G.shells || []).push({ x: q.x, y: q.y, vx: dir * (5 + Math.random() * 3) * s, vy: -(9 + Math.random() * 4) * s, rot: 0, vr: dir * (0.25 + Math.random() * 0.2), len: q.r * 2.6, t: 0 }); (G.smoke = G.smoke || []).push({ x: q.x, y: q.y, r: q.r, t: 0 }); }); }
  // two fresh shells come up from your hand and slide in
  if (k >= 0.42) ch.forEach((q, i) => { const t = ease((k - 0.42 - i * 0.06) / 0.28); if (t <= 0) return; const y = H + q.r * 4 + (q.y - H - q.r * 4) * t, x = q.x + (i ? 1 : -1) * q.r * 3 * (1 - t);
    if (t < 1) drawShell(g, x, y, q.r * 2.6 * (1.6 - 0.6 * t), -Math.PI / 2 + (1 - t) * 0.4 * (i ? 1 : -1), false, false); else drawShell(g, q.x, q.y, q.r * 2.6, 0, false, true); });
  g.globalAlpha = 1;
}
// spent shells in flight + a puff of smoke from the chambers (screen space, gravity, spin)
function shellFx(g, W, H, s) {
  const now = performance.now(), dt = Math.min(3, ((now - (G.shellT || now)) / (1000 / 35)) || 1); G.shellT = now;
  if (G.smoke) { G.smoke = G.smoke.filter(m => (m.t += dt) < 22); G.smoke.forEach(m => { g.fillStyle = `rgba(200,200,200,${0.35 * (1 - m.t / 22)})`; g.beginPath(); g.arc(m.x, m.y - m.t * 2 * s, m.r * (1 + m.t / 8), 0, 7); g.fill(); }); }
  if (!G.shells || !G.shells.length) return;
  G.shells = G.shells.filter(q => q.y < H + 80 && (q.t += dt) < 120);
  G.shells.forEach(q => { q.vy += 0.9 * s * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; drawShell(g, q.x, q.y, q.len, q.rot, true, false, q.brass); });
}
/* ---------- registry ---------- */
let WEP_SIG = '';
function syncWeapons() {
  const sig = JSON.stringify(M.wep || {}); if (sig === WEP_SIG) return; WEP_SIG = sig;
  for (const k in WEAPONS) if (WEAPONS[k].custom) delete WEAPONS[k];
  for (const k in THINGS) if (THINGS[k].cw) delete THINGS[k];
  for (const [id, d] of Object.entries(M.wep || {})) {
    const kind = 'cw' + id;
    if (d.kind === 'proj') { PROJ[kind] = { spd: d.projSpd || 20, dmg: d.dmg, splash: d.splash || 0 }; const col = { rocket: ['#fff', '#f80'], plasma: ['#e0f8ff', '#3070ff'], bfg: ['#efe', '#2c2'], fire: ['#fff6a0', '#ff4000'], caco: ['#ffd0ff', '#a020c0'], baron: ['#e0ffe0', '#20c040'] }[d.proj] || ['#fff', d.look.glow]; mkSprite('p_' + kind, d.proj === 'bfg' ? 26 : 12, d.proj === 'bfg' ? 26 : 12, (g, w) => { const rg = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); rg.addColorStop(0, col[0]); rg.addColorStop(1, d.look.glow || col[1]); g.fillStyle = rg; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill(); }); }
    WEAPONS[id] = { name: d.name, ammo: d.ammo, use: d.use, rate: d.rate, dmg: d.dmg, pellets: d.pellets, spread: d.spread, proj: d.kind === 'proj' ? kind : null, melee: d.kind === 'melee' ? 1 : 0, range: d.range, snd: d.snd, recoil: d.recoil, custom: d };
    const give = { w: +id }; if (d.ammo) give[d.ammo] = d.give;
    defT(+id, d.name, 'weapon', 20, 16, null, { give, cw: d });
  }
  if (typeof WEPF !== 'undefined') WEPF.clear();
}
function fireStory(d) {
  const sec = t => (t / 35).toFixed(2) + 's';
  const what = d.kind === 'melee' ? `swings for ${d.dmg[0]}-${d.dmg[1]} (reach ${d.range})` : d.kind === 'hit' ? `fires ${d.pellets} bullet${d.pellets > 1 ? 's' : ''} (spread ${(d.spread * 57.3).toFixed(1)}°) for ${d.dmg[0]}-${d.dmg[1]} each` : `launches a ${(WPROJ[d.proj] || 'projectile').toLowerCase()} (speed ${d.projSpd}${d.splash ? ', splash ' + d.splash : ''}) for ${d.dmg[0]}-${d.dmg[1]}`;
  return `Pull the trigger → ${what} → kicks ${d.recoil || 0} → ready again in ${sec(d.rate)} (${Math.round(35 / d.rate * 60)} shots a minute)${d.ammo ? ` · uses ${d.use} ${d.ammo} per shot, pickup gives ${d.give}` : ' · no ammo'}.`;
}
function openWeaponGen(editId) {
  let d = editId ? JSON.parse(JSON.stringify(M.wep[editId])) : rollWeapon({});
  let anim = 0, raf = 0;
  const draw = () => {
    const c = document.getElementById('wgPrev'); if (!c) { cancelAnimationFrame(raf); return; }
    const art = weaponArt('prev', d), firing = (anim % 70) < 6 || (d.rate < 8 && (anim % 70) < 40 && (anim % d.rate) < 3);
    const g = c.getContext('2d'); g.fillStyle = '#2a1a14'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#3a2a24'; g.fillRect(0, c.height * .55, c.width, c.height);
    const img = firing ? art.fire : art.idle, s = c.height / img.h * .9; g.imageSmoothingEnabled = false;
    g.drawImage(spriteCanvas(img), c.width / 2 - img.w * s / 2, c.height - img.h * s + (firing ? 4 : 0), img.w * s, img.h * s);
    const pk = art.pick; g.drawImage(spriteCanvas(pk), 8, 8, pk.w * 2, pk.h * 2);
    anim++; raf = requestAnimationFrame(draw);
  };
  const sel = (id, opts, val) => `<select id="${id}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${String(k) === String(val) ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  const num = (id, label, val, min, max, step = 1) => `<div class="f"><label>${label} <b id="${id}V">${val}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const render = b => {
    d.look = lookDefaults(d.look, d.cls); const L = d.look;
    b.innerHTML = `<canvas id="wgPrev" width="320" height="200" style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto;border-radius:10px;image-rendering:pixelated"></canvas>
    <div class="row" style="justify-content:center"><button id="wgAll" class="demo">🎲 Roll a new weapon</button><button data-re="name">🎲 Name</button><button data-re="look">🎲 Look</button><button data-re="stats">🎲 Stats</button></div>
    <div class="f"><label>Name</label><input id="wgName" maxlength="40" value="${esc(d.name)}"></div>
    <div class="f"><label>Class</label>${sel('wgCls', Object.fromEntries(Object.entries(WCLASS).map(([k, v]) => [k, v.n])), d.cls)}</div>
    <div class="h">Look</div>
    <div class="f"><label>Painted art</label>${sel('wgArt', artOptions('weapons'), d.look.art || '')}</div>
    ${d.look.art ? `${num('wgHue', 'Color shift (hue)', d.look.hue || 0, -180, 180)}${num('wgSat', 'Color strength (saturation %)', d.look.sat != null ? d.look.sat : 100, 0, 200)}${num('wgBri', 'Brightness %', d.look.bri != null ? d.look.bri : 100, 40, 160)}
    <div class="row"><label>Tint color <input type="color" id="wgTint" value="${d.look.tint || '#c4141c'}"></label><button id="wgTintRed">Pulse red</button></div>${num('wgTintA', 'Tint amount %', d.look.tintAmt || 0, 0, 100)}
    ${num('wgASize', 'Size', d.look.size || 1, 0.5, 2.5, 0.05)}<label class="chk"><input type="checkbox" id="wgMirror" ${d.look.mirror ? 'checked' : ''}>Mirror (face the other way)</label><label class="chk"><input type="checkbox" id="wgSkin" ${d.look.keepSkin !== false ? 'checked' : ''}>Keep hands their natural color</label>` : ''}
    <p class="hint">${d.look.art ? 'The settings below only apply to the old code-drawn style.' : ''}</p>
    <div class="row"><label>Body <input type="color" id="wgCB" value="${d.look.body}"></label><label>Accent <input type="color" id="wgCA" value="${d.look.accent}"></label><label>Glow <input type="color" id="wgCG" value="${d.look.glow}"></label><button id="wgPulse">Pulse red & white</button></div>
    <div class="f"><label>Style</label>${sel('wgStyle', WSTYLE, L.style)}</div>
    ${num('wgPow', 'Power (1 = peashooter, 10 = doomsday)', L.power, 1, 10)}<label class="chk"><input type="checkbox" id="wgPowStats" ${d.powStats !== false ? 'checked' : ''}>Power changes the stats too (damage, splash, kick)</label>
    ${num('wgBulk', 'Size / bulk', L.bulk, 0.6, 1.5, 0.05)}${num('wgGlowA', 'Glow strength', L.glowAmt, 0, 100)}${num('wgCoils', 'Energy coils / glow bands', L.coils, 0, 8)}
    ${num('wgBar', 'Barrels', d.look.barrels, 1, 6)}${num('wgLen', 'Length', d.look.length, 0.5, 1.4, 0.05)}
    <label class="chk"><input type="checkbox" id="wgScope" ${d.look.scope ? 'checked' : ''}>Scope / holo sight</label><label class="chk"><input type="checkbox" id="wgDrum" ${d.look.drum ? 'checked' : ''}>Side magazine / power cell</label><label class="chk"><input type="checkbox" id="wgStock" ${d.look.stock ? 'checked' : ''}>Stock</label>
    <label class="chk"><input type="checkbox" id="wgProngs" ${L.prongs ? 'checked' : ''}>Emitter prongs (space rifle)</label><label class="chk"><input type="checkbox" id="wgStrips" ${L.strips ? 'checked' : ''}>Glow strips</label><label class="chk"><input type="checkbox" id="wgPanels" ${L.panels ? 'checked' : ''}>Panel lines</label><label class="chk"><input type="checkbox" id="wgHaz" ${L.hazard ? 'checked' : ''}>Hazard stripes (heavy)</label>
    <div class="h">Firing</div>
    <div class="f"><label>Fires</label>${sel('wgKind', { hit: 'Bullets (hitscan)', proj: 'Projectiles', melee: 'Melee (no ammo)' }, d.kind)}</div>
    ${num('wgDmin', 'Damage min', d.dmg[0], 1, 1000)}${num('wgDmax', 'Damage max', d.dmg[1], 1, 2000)}
    ${num('wgPel', 'Bullets per shot', d.pellets, 1, 24)}${num('wgSpr', 'Spread (degrees)', Math.round(d.spread * 573) / 10, 0, 20, 0.5)}
    ${num('wgRate', 'Delay between shots (tics, 35 = 1s)', d.rate, 1, 90)}${num('wgRecoil', 'Recoil kick', d.recoil, 0, 20)}
    <div class="f"><label>Projectile</label>${sel('wgProj', WPROJ, d.proj || 'rocket')}</div>
    ${num('wgPSpd', 'Projectile speed', d.projSpd || 20, 4, 40)}${num('wgSplash', 'Splash radius (0 = none)', d.splash || 0, 0, 256, 8)}${num('wgRange', 'Melee reach', d.range || 72, 40, 160)}
    <div class="h">Ammo</div>
    <div class="f"><label>Ammo type</label>${sel('wgAmmo', Object.assign({ '': 'None' }, WAMMO), d.ammo || '')}</div>
    ${num('wgUse', 'Ammo per shot', d.use, 1, 50)}${num('wgGive', 'Ammo in the pickup', d.give, 0, 200)}
    <div class="f"><label>Sound</label>${sel('wgSnd', WSND, d.snd)}</div>
    <label class="chk"><input type="checkbox" id="wgStart" ${d.startWith ? 'checked' : ''}>Player starts with it</label>
    <div class="card" style="padding:8px;border:1px solid var(--line);border-radius:10px;margin-top:8px"><b>Firing sequence:</b> <span id="wgStory"></span></div>`;
    const story = () => b.querySelector('#wgStory').textContent = fireStory(d); story();
    const bind = (id, fn, ev = 'input') => { const e = b.querySelector('#' + id); if (!e) return; e.addEventListener(ev, () => { fn(e); const v = b.querySelector('#' + id + 'V'); if (v) v.textContent = e.value; story(); }); };
    bind('wgName', e => d.name = e.value.slice(0, 40));
    bind('wgCls', e => { d = rollWeapon({ cls: e.value, seed: d.seed }, { name: 0, look: 1, stats: 1 }, d); render(b); }, 'change');
    bind('wgCB', e => d.look.body = e.value); bind('wgCA', e => d.look.accent = e.value); bind('wgCG', e => d.look.glow = e.value);

    bind('wgArt', e => { if (e.value) { const keep = d.look.art ? d.look : { hue: 0, sat: 100, bri: 100, tint: '#c4141c', tintAmt: 0, size: 1, mirror: false }; d.look = Object.assign({}, keep, { art: e.value }); } else { d = rollWeapon({ cls: d.cls, art: '' }, { name: 0, look: 1, stats: 0 }, d); } render(b); }, 'change');
    bind('wgHue', e => d.look.hue = +e.value); bind('wgSat', e => d.look.sat = +e.value); bind('wgBri', e => d.look.bri = +e.value); bind('wgTint', e => d.look.tint = e.value); bind('wgTintA', e => d.look.tintAmt = +e.value); bind('wgASize', e => d.look.size = +e.value); bind('wgMirror', e => d.look.mirror = e.checked, 'change'); bind('wgSkin', e => d.look.keepSkin = e.checked, 'change');
    { const tr = b.querySelector('#wgTintRed'); if (tr) tr.onclick = () => { d.look.tint = '#c4141c'; d.look.tintAmt = Math.max(d.look.tintAmt || 0, 45); render(b); }; }
    bind('wgStyle', e => d.look.style = e.value, 'change'); bind('wgBulk', e => d.look.bulk = +e.value); bind('wgGlowA', e => d.look.glowAmt = +e.value); bind('wgCoils', e => d.look.coils = +e.value);
    bind('wgProngs', e => d.look.prongs = e.checked ? 1 : 0, 'change'); bind('wgStrips', e => d.look.strips = e.checked ? 1 : 0, 'change'); bind('wgPanels', e => d.look.panels = e.checked ? 1 : 0, 'change'); bind('wgHaz', e => d.look.hazard = e.checked ? 1 : 0, 'change');
    bind('wgPowStats', e => d.powStats = e.checked, 'change');
    bind('wgPow', e => { const p = +e.value; if (d.powStats !== false) { if (!d.pb) d.pb = { p: d.look.power, dmg: d.dmg.slice(), splash: d.splash || 0, recoil: d.recoil || 0 }; const f = x => 0.4 + 0.3 * x, k = f(p) / f(d.pb.p); d.dmg = [Math.max(1, Math.round(d.pb.dmg[0] * k)), Math.max(1, Math.round(d.pb.dmg[1] * k))]; if (d.pb.splash) d.splash = Math.min(256, Math.round(d.pb.splash * Math.sqrt(k))); d.recoil = Math.min(20, Math.round(d.pb.recoil * Math.sqrt(k))); ['wgDmin', 'wgDmax', 'wgSplash', 'wgRecoil'].forEach((id, i) => { const el = b.querySelector('#' + id); if (el) { el.value = [d.dmg[0], d.dmg[1], d.splash, d.recoil][i]; b.querySelector('#' + id + 'V').textContent = el.value; } }); } d.look.power = p; });
    bind('wgBar', e => d.look.barrels = +e.value); bind('wgLen', e => d.look.length = +e.value);
    bind('wgScope', e => d.look.scope = e.checked, 'change'); bind('wgDrum', e => d.look.drum = e.checked, 'change'); bind('wgStock', e => d.look.stock = e.checked, 'change');
    bind('wgKind', e => { d.kind = e.value; if (d.kind === 'proj' && !d.proj) { d.proj = 'rocket'; d.projSpd = 20; } if (d.kind === 'melee') { d.ammo = null; d.range = d.range || 72; } }, 'change');
    bind('wgDmin', e => { delete d.pb; d.dmg[0] = +e.value; if (d.dmg[1] < d.dmg[0]) d.dmg[1] = d.dmg[0]; }); bind('wgDmax', e => { delete d.pb; d.dmg[1] = Math.max(+e.value, d.dmg[0]); });
    bind('wgPel', e => d.pellets = +e.value); bind('wgSpr', e => d.spread = +e.value / 57.3); bind('wgRate', e => d.rate = +e.value); bind('wgRecoil', e => d.recoil = +e.value);
    bind('wgProj', e => d.proj = e.value, 'change'); bind('wgPSpd', e => d.projSpd = +e.value); bind('wgSplash', e => d.splash = +e.value); bind('wgRange', e => d.range = +e.value);
    bind('wgAmmo', e => d.ammo = e.value || null, 'change'); bind('wgUse', e => d.use = +e.value); bind('wgGive', e => d.give = +e.value);
    bind('wgSnd', e => d.snd = e.value, 'change'); bind('wgStart', e => d.startWith = e.checked, 'change');
    b.querySelector('#wgPulse').onclick = () => { d.look.body = '#8a0a12'; d.look.accent = '#ffffff'; d.look.glow = '#ffffff'; render(b); };
    b.querySelector('#wgAll').onclick = () => { d = rollWeapon({}); render(b); };
    b.querySelectorAll('[data-re]').forEach(x => x.onclick = () => { const p = { name: 0, look: 0, stats: 0 }; p[x.dataset.re] = 1; d = rollWeapon({ cls: d.cls }, p, d); render(b); });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
  };
  const box = modal(editId ? 'Edit weapon: ' + d.name : 'Weapon generator', '', [
    { ok: 1, title: 'Save to this map', fn: () => { cancelAnimationFrame(raf); const id = editId || nextWepId(); pushUndo(); M.wep = M.wep || {}; M.wep[id] = d; mapChanged(); E.thingType = +id; toast(d.name + ' saved (pickup thing #' + id + '). Double-tap in Things mode to place it.', 5000); setMode('things'); } },
    { cancel: 1, fn: () => cancelAnimationFrame(raf) }]);
  window.__modalClose = () => cancelAnimationFrame(raf);
  render(box);
}
function nextWepId() { let t = WEP_BASE + 1; while ((M.wep || {})[t]) t++; return t; }
function openArmory() {
  const list = Object.entries(M.wep || {});
  modal('Custom weapons in this map · ' + list.length, `<div class="row"><button id="arNew" class="demo">🎲 Generate a weapon</button></div>
    <div class="list">${list.map(([t, d]) => `<div class="row"><canvas data-pv="${t}" width="64" height="32" style="width:64px;height:32px;image-rendering:pixelated;background:#111;border-radius:6px"></canvas><b style="flex:1">${esc(d.name)}<br><span class="hint">#${t} · ${WCLASS[d.cls].n} · ${d.dmg[0]}-${d.dmg[1]} dmg${d.startWith ? ' · starts with it' : ''} · ${M.t.filter(x => x.type === +t).length} placed</span></b><button data-place="${t}">Place</button><button data-edit="${t}">Edit</button><button data-del="${t}">Delete</button></div>`).join('') || '<p class="hint">None yet.</p>'}</div>`, [{ cancel: 1 }], b => {
    b.querySelectorAll('[data-pv]').forEach(c => { const img = weaponArt(c.dataset.pv, M.wep[c.dataset.pv]).pick, g = c.getContext('2d'), s = Math.min(64 / img.w, 32 / img.h); g.imageSmoothingEnabled = false; g.drawImage(spriteCanvas(img), (64 - img.w * s) / 2, (32 - img.h * s) / 2, img.w * s, img.h * s); });
    b.querySelector('#arNew').onclick = () => { closeModal(); setTimeout(() => openWeaponGen(), 30); };
    b.querySelectorAll('[data-place]').forEach(x => x.onclick = () => { closeModal(); E.thingType = +x.dataset.place; setMode('things'); toast('Double-tap to place the ' + M.wep[x.dataset.place].name); });
    b.querySelectorAll('[data-edit]').forEach(x => x.onclick = () => { closeModal(); setTimeout(() => openWeaponGen(x.dataset.edit), 30); });
    b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { const t = x.dataset.del; modal('Delete ' + M.wep[t].name + '?', '<p>Placed pickups are removed too. One Undo brings it back.</p>', [{ ok: 1, fn: () => { pushUndo(); delete M.wep[t]; M.t = M.t.filter(z => z.type !== +t); mapChanged(); setTimeout(openArmory, 50); } }, { cancel: 1 }]); });
  });
}
/* ---------- PNG offsets (grAb) so GZDoom places exported sprites correctly ---------- */
function pngGrab(u8, ox, oy) {
  const data = new Uint8Array(8), dv = new DataView(data.buffer); dv.setInt32(0, ox); dv.setInt32(4, oy);
  const type = new TextEncoder().encode('grAb'), crcIn = new Uint8Array(12); crcIn.set(type); crcIn.set(data, 4);
  const chunk = new Uint8Array(20), cv = new DataView(chunk.buffer); cv.setUint32(0, 8); chunk.set(type, 4); chunk.set(data, 8); cv.setUint32(16, crc32(crcIn));
  const out = new Uint8Array(u8.length + 20); out.set(u8.subarray(0, 33)); out.set(chunk, 33); out.set(u8.subarray(33), 53); return out;
}
function weaponExportLumps() {
  const out = { decorate: '', sprites: [] }, list = Object.entries(M.wep || {}); if (!list.length) return out;
  const AM = { bullets: 'Clip', shells: 'Shell', rockets: 'RocketAmmo', cells: 'Cell' }, PJ = { rocket: 'Rocket', plasma: 'PlasmaBall', bfg: 'BFGBall', fire: 'DoomImpBall', caco: 'CacodemonBall', baron: 'BaronBall' };
  const SN = { pistol: 'weapons/pistol', shotgun: 'weapons/shotgf', chain: 'weapons/chngun', rocket: 'weapons/rocklf', plasma: 'weapons/plasmaf' };
  const dec = c => { const b64 = c.toDataURL('image/png').split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  let txt = '\n// EOD custom weapons\n';
  list.forEach(([id, d], i) => {
    const pre = 'PW' + (i + 1).toString(36).toUpperCase().padStart(2, '0'), pk = 'PP' + (i + 1).toString(36).toUpperCase().padStart(2, '0'), art = weaponArt(id, d);
    // painted frames (full-color pictures) are drawn straight onto a canvas; scaled from their 640-wide basis to Doom's 320
    const cv = f => { if (!f.painted) return spriteCanvas(f); const k = 320 / (art.basis || 320), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(f.w * k)); c.height = Math.max(1, Math.round(f.h * k)); c.getContext('2d').drawImage(f.im, 0, 0, c.width, c.height); return c; };
    if (art.painted) { const sc = 320 / (art.basis || 320); [art.idle, art.fire].forEach(f => { f.w0 = f.w; }); art.idle = Object.assign({}, art.idle, { w: Math.round(art.idle.w * sc), h: Math.round(art.idle.h * sc) }); art.fire = Object.assign({}, art.fire, { w: Math.round(art.fire.w * sc), h: Math.round(art.fire.h * sc) }); }
    const spriteCanvasX = f => (f.painted ? cv(f) : spriteCanvas(f));
    out.sprites.push([pre + 'A0', pngGrab(dec(spriteCanvasX(art.idle)), Math.round(art.idle.w / 2 - 159), Math.round(art.idle.h - 168))]);
    out.sprites.push([pre + 'B0', pngGrab(dec(spriteCanvasX(art.fire)), Math.round(art.fire.w / 2 - 159), Math.round(art.fire.h - 168))]);
    out.sprites.push([pk + 'A0', pngGrab(dec(spriteCanvas(art.pick)), art.pick.w >> 1, art.pick.h)]);
    const shot = d.kind === 'melee' ? `A_CustomPunch(random(${d.dmg[0]}, ${d.dmg[1]}), 1, 0, "BulletPuff", ${d.range || 72})` : d.kind === 'proj' ? `A_FireCustomMissile("${PJ[d.proj] || 'Rocket'}")` : `A_FireBullets(${(d.spread * 57.3).toFixed(1)}, ${(d.spread * 28.6).toFixed(1)}, ${d.pellets > 1 ? d.pellets : -1}, ${Math.max(1, Math.round((d.dmg[0] + d.dmg[1]) / 6))}, "BulletPuff")`;
    const cls = 'EOD_W_' + d.name.replace(/[^A-Za-z0-9]/g, '') + '_' + id;
    txt += `\nActor ${cls} : Weapon ${id}\n{\n  Tag "${d.name.replace(/"/g, '')}"\n  Weapon.SelectionOrder ${400 + i}\n  Weapon.SlotNumber ${WCLASS[d.cls].slot}\n${d.ammo ? `  Weapon.AmmoType "${AM[d.ammo]}"\n  Weapon.AmmoUse ${d.use}\n  Weapon.AmmoGive ${d.give}\n` : '  +WEAPON.NOAUTOAIM\n'}  AttackSound "${SN[d.snd] || 'weapons/pistol'}"\n  Inventory.PickupMessage "You got the ${d.name.replace(/"/g, '')}!"\n  States\n  {\n  Ready:\n    ${pre} A 1 A_WeaponReady\n    Loop\n  Deselect:\n    ${pre} A 1 A_Lower\n    Loop\n  Select:\n    ${pre} A 1 A_Raise\n    Loop\n  Fire:\n    ${pre} B 2 Bright ${shot}\n    ${pre} A ${Math.max(1, d.rate - 2)}\n    ${pre} A 0 A_ReFire\n    Goto Ready\n  Spawn:\n    ${pk} A -1\n    Stop\n  }\n}\n`;
  });
  out.decorate = txt; return out;
}
