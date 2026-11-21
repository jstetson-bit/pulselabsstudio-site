/* ================= MONSTER GENERATOR: random Doom-style enemies, fully adjustable =================
   Each monster lives in the map (M.mon[type] = def), uses thing numbers 20000+, gets in-house
   procedural sprites (walk A-D, attack E-F, pain G, death H-K, corpse L) rebuilt from its settings,
   fights with the normal Demo monster behavior, and exports to GZDoom as a DECORATE actor + PNG sprites. */
const MON_BASE = 20000;
const ARCHETYPES = {
  imp: { name: 'Clawed devil', atk: 'proj+melee', proj: 'fire', spd: [2, 2.8], size: [0.9, 1.15], float: false },
  beast: { name: 'Charging beast', atk: 'melee', spd: [3.6, 5.2], size: [1, 1.4], float: false },
  floater: { name: 'Floating horror', atk: 'proj+melee', proj: 'caco', spd: [2, 3], size: [1, 1.5], float: true },
  soldier: { name: 'Possessed soldier', atk: 'hit', spd: [2, 2.6], size: [0.95, 1.1], float: false },
  hulk: { name: 'Hulking brute', atk: 'proj+melee', proj: 'baron', spd: [2.2, 3], size: [1.2, 1.8], float: false },
  crawler: { name: 'Spider crawler', atk: 'proj', proj: 'plasmam', spd: [2.8, 3.8], size: [1.1, 1.8], float: false },
  cyber: { name: 'Cyber warlord', atk: 'proj', proj: 'rocketm', spd: [2.6, 3.6], size: [1.6, 2.2], float: false }
};
const TIERS = { fodder: { n: 'Fodder', hp: [20, 60], dmg: [3, 15], pain: [.6, .9] }, soldier: { n: 'Soldier', hp: [60, 160], dmg: [4, 24], pain: [.45, .75] }, heavy: { n: 'Heavy', hp: [160, 500], dmg: [6, 40], pain: [.25, .55] }, elite: { n: 'Elite', hp: [500, 1200], dmg: [8, 64], pain: [.1, .3] }, boss: { n: 'Boss', hp: [2000, 5000], dmg: [20, 120], pain: [.03, .12] } };
const PALETTES = [['#7a5030', '#e8d8b0', '#ff3000'], ['#c86478', '#5a1020', '#ffff40'], ['#4d5a3c', '#b8a48a', '#ff2020'], ['#c0282a', '#2a0505', '#30a0ff'], ['#9a7b5a', '#ddd', '#40ff40'], ['#556', '#9ab', '#ff4040'], ['#8a1010', '#ffffff', '#ffffff'], ['#3a2a40', '#c060ff', '#ff60ff'], ['#5a5a50', '#d0b040', '#ff8000'], ['#2a2a2a', '#c00000', '#ff0000']];
const N1 = ['Hell', 'Blood', 'Gore', 'Ash', 'Bone', 'Pit', 'Brim', 'Rot', 'Iron', 'Flesh', 'Hex', 'Vile', 'Wrath', 'Plague', 'Cinder', 'Skull', 'Howl', 'Ember', 'Grave', 'Scorch', 'Rust', 'Venom', 'Doom', 'Dread'];
const N2 = ['fiend', 'spawn', 'maw', 'brute', 'stalker', 'knight', 'ghoul', 'wraith', 'reaver', 'hound', 'crawler', 'titan', 'shrike', 'butcher', 'horror', 'drone', 'mancer', 'ripper', 'warden', 'gaunt', 'lord', 'beast', 'husk', 'tyrant'];
const PROJ_STYLES = { fire: 'Fireball (imp)', caco: 'Purple orb (caco)', baron: 'Green bolt (baron)', plasmam: 'Plasma (arachnotron)', rocketm: 'Rocket (cyber)' };
const DROPS = { 0: 'Nothing', 2007: 'Clip', 2008: 'Shells', 2001: 'Shotgun', 2002: 'Chaingun', 2011: 'Stimpack', 2012: 'Medikit', 2014: 'Health bonus', 2015: 'Armor bonus', 2047: 'Energy cell', 2010: 'Rocket' };
function monRng(seed) { return mulberry(seed >>> 0); }
const mpick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, [a, b]) => a + (b - a) * r();
function rollMonster(opts = {}, parts = { look: 1, stats: 1, attack: 1, name: 1 }, base) {
  const seed = opts.seed != null ? opts.seed : (Math.random() * 2 ** 31) | 0, r = monRng(seed);
  let arch = opts.arch && opts.arch !== 'random' ? opts.arch : mpick(r, Object.keys(ARCHETYPES)), A = ARCHETYPES[arch];
  const tier = opts.tier && opts.tier !== 'random' ? opts.tier : mpick(r, ['fodder', 'fodder', 'soldier', 'soldier', 'heavy', 'elite']), T = TIERS[tier];
  const d = Object.assign({ v: 1 }, base || {}); d.arch = arch; d.tier = tier;
  if ((parts.look || !d.look) && ARTL.man && ARTL.man.monsters.length && opts.art !== '') { const a = opts.art ? artMon(opts.art) : (artPickFor('monsters', opts.arch && opts.arch !== 'random' ? arch : null)); if (a) { if (!opts.arch || opts.arch === 'random') { arch = a.arch; A = ARCHETYPES[arch]; d.arch = arch; } const big = r() < .25; d.look = { art: a.id, seed: (r() * 1e9) | 0, hue: r() < .5 ? 0 : Math.round((r() - .5) * (big ? 300 : 60)), sat: Math.round(80 + r() * 50), bri: Math.round(85 + r() * 30), tint: '#c4141c', tintAmt: 0, size: +(0.9 + r() * 0.3).toFixed(2), mirror: r() < .3 }; parts = Object.assign({}, parts, { look: 0 }); } }
  if (parts.name || !d.name) { const n2 = mpick(r, N2); d.name = mpick(r, N1) + ' ' + n2[0].toUpperCase() + n2.slice(1); }
  if (parts.look || !d.look) { const pal = mpick(r, PALETTES); d.look = { seed: (r() * 1e9) | 0, body: pal[0], accent: pal[1], eyes: pal[2], horns: r() < .6, spikes: r() < .5, eyesN: 1 + Math.floor(r() * 3), arms: arch === 'floater' || arch === 'crawler' ? 0 : 2, size: +between(r, A.size).toFixed(2), legs: arch === 'crawler' ? 4 : arch === 'floater' ? 0 : 2 }; }
  if (parts.stats || d.hp == null) {
    d.hp = Math.round(between(r, T.hp) / 5) * 5; d.spd = +between(r, A.spd).toFixed(1); d.pain = +between(r, T.pain).toFixed(2);
    d.aggro = +(0.7 + r() * 0.8).toFixed(2); d.float = A.float; d.fuzz = arch === 'beast' && r() < .2; d.drop = arch === 'soldier' ? mpick(r, [2007, 2008, 2001]) : r() < .3 ? mpick(r, [2011, 2014, 2015]) : 0;
  }
  if (parts.attack || !d.atk) {
    d.atk = A.atk; const dm = T.dmg;
    d.dmg = [Math.round(dm[0]), Math.round(between(r, [dm[0] + 4, dm[1]]))];
    d.melee = d.atk === 'melee' || d.atk.includes('melee') ? [Math.round(dm[0] * 1.2), Math.round(dm[1] * 1.3)] : null;
    d.pellets = d.atk === 'hit' ? mpick(r, [1, 1, 2, 3, 3, 5]) : 1;
    d.burst = mpick(r, [1, 1, 1, 2, 3, 4]); if (tier === 'boss') d.burst = mpick(r, [3, 4, 6]);
    d.burstGap = mpick(r, [3, 4, 6, 8]); d.windup = mpick(r, [6, 8, 10, 14, 18]);
    d.coolMin = Math.round(between(r, [20, 50])); d.coolVar = Math.round(between(r, [10, 50]));
    d.proj = A.proj || null; if (d.proj && r() < .25) d.proj = mpick(r, Object.keys(PROJ_STYLES));
    d.projSpd = d.proj ? Math.round(between(r, [8, 22])) : 0; d.splash = d.proj === 'rocketm' ? 128 : (r() < .15 && d.proj ? 64 : 0);
  }
  d.seed = seed; return d;
}
function monSize(d) { if (d.look.art) { const z = artMonSize(d); if (z) return z; } const s = d.look.size || 1; return { r: Math.round(20 * s), h: Math.round(56 * s) }; }
/* ---------- procedural sprites ---------- */
const MONF = new Map();
function monFrames(type, d, rot) {
  const key = type + ':' + JSON.stringify(d.look) + d.arch + (rot ? ':' + rot : '');
  let f = MONF.get(key); if (f) return f;
  if (d.look.art) { const af = artMonFrames(d, rot); if (af) { MONF.set(key, af); return af; } artPreload(); const ph = SPR.artWait || (SPR.artWait = mkSprite('artWait', 1, 1, () => { })); const o = {}; 'ABCDEFGHIJKL'.split('').forEach(k => o[k] = ph); return o; }
  const sz = d.look.size || 1, W_ = Math.round((d.arch === 'crawler' ? 90 : d.arch === 'floater' ? 60 : 48) * sz), H_ = Math.round((d.arch === 'crawler' ? 56 : 66) * sz);
  f = {}; const FR = 'ABCDEFGHIJKL';
  for (let i = 0; i < FR.length; i++) {
    const key2 = 'mon' + type + FR[i];
    const pose = i < 4 ? { walk: i } : i < 6 ? { attack: i - 3 } : i === 6 ? { pain: 1 } : { death: i - 7 };
    const t = mkSprite(key2, W_, H_, (g, w, h) => drawMonster(g, w, h, d, pose)); delete SPR[key2];
    t.ox = w2(W_); t.oy = H_; f[FR[i]] = t;
  }
  MONF.set(key, f); return f;
  function w2(x) { return x >> 1; }
}
function drawMonster(g, w, h, d, pose) {
  const L = d.look, r = monRng(L.seed), dead = pose.death != null, k = dead ? pose.death : 0;
  g.save();
  if (dead) { // collapse: tilt, sink, blood
    g.fillStyle = '#700a0a'; g.beginPath(); g.ellipse(w / 2, h - 3, w * (0.2 + k * 0.08), 3 + k, 0, 0, 7); g.fill();
    if (k >= 4) { g.fillStyle = L.body; g.beginPath(); g.ellipse(w / 2, h - 6, w * 0.38, h * 0.08, 0, 0, 7); g.fill(); g.fillStyle = L.accent; g.fillRect(w * .3, h - 9, w * .4, 3); g.restore(); return; }
    g.translate(w / 2, h); g.rotate((k * 0.35) * (r() < .5 ? -1 : 1)); g.scale(1, 1 - k * 0.18); g.translate(-w / 2, -h);
  }
  const step = pose.walk != null ? [0, 1, 0, -1][pose.walk] : 0, atk = pose.attack || 0;
  const body = L.body, acc = L.accent, eye = pose.attack === 2 ? '#fff' : L.eyes;
  const shade = (c, f) => { const n = parseInt(c.slice(1).padEnd(6, c.slice(-1)), 16); const R = ((n >> 16) & 255) * f, G_ = ((n >> 8) & 255) * f, B = (n & 255) * f; return `rgb(${R | 0},${G_ | 0},${B | 0})`; };
  if (d.arch === 'floater') {
    const cy = h * 0.45 + step * 1.5, rad = Math.min(w, h) * 0.42;
    g.fillStyle = body; g.beginPath(); g.arc(w / 2, cy, rad, 0, 7); g.fill();
    g.fillStyle = shade(body, .6); g.beginPath(); g.arc(w / 2 + rad * .25, cy + rad * .25, rad * .7, 0, 7); g.fill();
    g.fillStyle = body; g.beginPath(); g.arc(w / 2 - rad * .1, cy - rad * .1, rad * .75, 0, 7); g.fill();
    if (L.spikes) { g.fillStyle = acc; for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 6); g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * rad * .9, cy + Math.sin(a) * rad * .9); g.lineTo(w / 2 + Math.cos(a) * rad * 1.25, cy + Math.sin(a) * rad * 1.25); g.lineTo(w / 2 + Math.cos(a + .15) * rad * .9, cy + Math.sin(a + .15) * rad * .9); g.fill(); } }
    for (let i = 0; i < L.eyesN; i++) { const ex = w / 2 + (i - (L.eyesN - 1) / 2) * rad * .5; g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, cy - rad * .25, rad * .16, 0, 7); g.fill(); g.fillStyle = eye; g.beginPath(); g.arc(ex, cy - rad * .25, rad * .08, 0, 7); g.fill(); }
    g.fillStyle = '#200'; g.beginPath(); g.ellipse(w / 2, cy + rad * .35, rad * (.35 + atk * .1), rad * (.12 + atk * .12), 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(w / 2 - rad * .3 + i * rad * .11, cy + rad * .28, 2, 3);
    if (atk === 2) { g.fillStyle = 'rgba(255,220,120,.9)'; g.beginPath(); g.arc(w / 2, cy + rad * .35, rad * .2, 0, 7); g.fill(); }
  } else if (d.arch === 'crawler') {
    g.strokeStyle = shade(body, .5); g.lineWidth = Math.max(2, w * .04);
    for (let i = 0; i < 4; i++) { const lx = w * (.08 + i * .28), ph = (i % 2 ? step : -step) * 3; g.beginPath(); g.moveTo(w / 2, h * .55); g.lineTo(lx, h * .45 + ph); g.lineTo(lx + (i < 2 ? -4 : 4), h); g.stroke(); }
    g.fillStyle = body; g.beginPath(); g.ellipse(w / 2, h * .42, w * .26, h * .3, 0, 0, 7); g.fill();
    g.fillStyle = acc; g.fillRect(w * .4, h * .5, w * .2, h * .12);
    if (atk) { g.fillStyle = atk === 2 ? '#fff' : '#ccc'; g.fillRect(w * .44, h * .6, w * .12, h * .08); }
    for (let i = 0; i < L.eyesN; i++) { g.fillStyle = eye; g.fillRect(w * .42 + i * w * .06, h * .3, w * .04, h * .05); }
  } else {
    const big = d.arch === 'hulk' || d.arch === 'cyber', beast = d.arch === 'beast';
    const tw = w * (big ? .6 : beast ? .66 : .46), tx = (w - tw) / 2, ty = h * (beast ? .3 : .28), th = h * (beast ? .38 : .38);
    // legs
    g.fillStyle = shade(body, .75);
    const lg = (x, off) => g.fillRect(x, ty + th - 2 + off, tw * .3, h - (ty + th) + 2 - off);
    lg(tx + tw * .06, step > 0 ? 3 : 0); lg(tx + tw * .64, step < 0 ? 3 : 0);
    // torso
    g.fillStyle = body; g.beginPath(); g.moveTo(tx, ty + th); g.lineTo(tx - tw * .05, ty + th * .2); g.quadraticCurveTo(w / 2, ty - th * .15, tx + tw * 1.05, ty + th * .2); g.lineTo(tx + tw, ty + th); g.closePath(); g.fill();
    g.fillStyle = shade(body, .8); g.fillRect(w / 2 - tw * .08, ty + th * .25, tw * .16, th * .7);
    if (L.spikes) { g.fillStyle = acc; for (let i = 0; i < 4; i++) { const sx = tx + tw * (.15 + i * .23); g.beginPath(); g.moveTo(sx, ty + th * .15); g.lineTo(sx + tw * .06, ty - th * .12); g.lineTo(sx + tw * .12, ty + th * .15); g.fill(); } }
    // arms
    if (L.arms) {
      g.fillStyle = shade(body, .9); const aw = tw * .24, ah = th * .9;
      const arm = (x, raise) => { g.save(); g.translate(x + aw / 2, ty + th * .12); g.rotate(raise); g.fillRect(-aw / 2, 0, aw, ah); g.fillStyle = acc; if (d.atk === 'hit' || d.arch === 'cyber') { g.fillStyle = '#333'; g.fillRect(-aw * .3, ah * .7, aw * .6, ah * .5); } else { for (let c = 0; c < 3; c++) g.fillRect(-aw / 2 + c * aw * .4, ah, aw * .2, ah * .2); } g.restore(); };
      arm(tx - aw * .9, atk ? -0.9 - atk * .3 : 0.15 + step * .1); arm(tx + tw - aw * .1, atk ? -0.6 : -0.15 - step * .1);
      if (atk === 2 && d.atk !== 'melee') { g.fillStyle = d.atk === 'hit' ? '#ffd060' : 'rgba(255,200,80,.95)'; g.beginPath(); g.arc(tx - aw * .2, ty - th * .25, Math.max(4, tw * .14), 0, 7); g.fill(); }
    }
    // head
    const hr = (beast ? tw * .3 : tw * .28), hx = w / 2, hy = ty - hr * (beast ? 0 : .55);
    g.fillStyle = beast ? body : shade(body, 1.1); g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
    if (beast || atk) { g.fillStyle = '#200'; g.fillRect(hx - hr * .7, hy + hr * .15, hr * 1.4, hr * (beast ? .55 : .3) + atk * 2); g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(hx - hr * .6 + i * hr * .23, hy + hr * .15, Math.max(1, hr * .1), hr * .2); }
    if (L.horns) { g.fillStyle = acc; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(hx + s * hr * .5, hy - hr * .6); g.lineTo(hx + s * hr * 1.1, hy - hr * 1.5); g.lineTo(hx + s * hr * .8, hy - hr * .4); g.fill(); }); }
    for (let i = 0; i < L.eyesN; i++) { g.fillStyle = eye; const ex = hx + (i - (L.eyesN - 1) / 2) * hr * .5; g.fillRect(ex - hr * .14, hy - hr * .3, hr * .28, hr * .2); }
    if (d.arch === 'cyber') { g.fillStyle = '#888'; g.fillRect(tx + tw * .55, ty + th * .3, tw * .5, th * .25); }
  }
  if (pose.pain) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, 0, w, h); }
  g.restore();
}
/* ---------- registry ---------- */
let MON_SIG = '';
function syncMonsters() {
  if (typeof artPreload === 'function') artPreload();
  const sig = JSON.stringify(M.mon || {}); if (sig === MON_SIG) return; MON_SIG = sig;
  for (const k in THINGS) if (THINGS[k].custom) delete THINGS[k];
  for (const [type, d] of Object.entries(M.mon || {})) {
    const sz = monSize(d), t = +type, kind = 'cm' + type;
    if (d.proj) { const base = PROJ[d.proj] || PROJ.fire; PROJ[kind] = { spd: d.projSpd || base.spd, dmg: d.dmg, splash: d.splash || 0 }; if (!SPR['p_' + kind]) { const cols = { fire: ['#fff6a0', '#ff4000'], caco: ['#ffd0ff', '#a020c0'], baron: ['#e0ffe0', '#20c040'], plasmam: ['#e0f8ff', '#20a0ff'], rocketm: ['#fff', '#f60'] }[d.proj] || ['#fff', d.look.eyes]; mkSprite('p_' + kind, 14, 14, g => { const rg = g.createRadialGradient(7, 7, 1, 7, 7, 7); rg.addColorStop(0, cols[0]); rg.addColorStop(1, d.look.eyes || cols[1]); g.fillStyle = rg; g.beginPath(); g.arc(7, 7, 7, 0, 7); g.fill(); }); } }
    defT(t, d.name, 'monster', sz.r, sz.h, null, { hp: d.hp, spd: d.spd, atk: d.atk === 'melee' ? 'melee' : d.atk.startsWith('hit') ? 'hit' : 'proj', proj: d.proj ? kind : null, pellets: d.pellets, burst: d.burst, burstGap: d.burstGap, windup: d.windup, coolMin: d.coolMin, coolVar: d.coolVar, aggro: d.aggro, dmg: d.dmg, melee: d.melee, pain: d.pain, float: d.float, fuzz: d.fuzz, drop: d.drop || null, custom: d });
  }
}
function attackStory(d) {
  const sec = t => (t / 35).toFixed(1) + 's';
  const what = d.atk === 'melee' ? 'claws you in close' : d.atk.startsWith('hit') ? `fires ${d.pellets} bullet${d.pellets > 1 ? 's' : ''} per shot` : `throws a ${(PROJ_STYLES[d.proj] || 'projectile').toLowerCase()} (speed ${d.projSpd}${d.splash ? ', splash ' + d.splash : ''})`;
  return `Sees you → walks (frames A-D) → winds up ${sec(d.windup)} (frame E) → ${what}${d.atk === 'melee' ? '' : ` × ${d.burst}${d.burst > 1 ? ', ' + sec(d.burstGap) + ' apart' : ''}`} for ${d.dmg[0]}-${d.dmg[1]} damage (frame F)${d.melee && d.atk !== 'melee' ? ` · up close it claws for ${d.melee[0]}-${d.melee[1]}` : ''} → rests ${sec(d.coolMin)}-${sec(d.coolMin + d.coolVar)} → repeats. Gets hurt (G) ${Math.round(d.pain * 100)}% of hits · dies in 4 frames (H-K) → corpse (L).`;
}
/* ---------- generator screen ---------- */
function openMonsterGen(editType) {
  let d = editType ? JSON.parse(JSON.stringify(M.mon[editType])) : rollMonster({});
  let anim = 0, raf = 0, seq = 'all';
  const pv = () => document.getElementById('mgPrev');
  const frameSeq = { walk: 'ABCD', attack: 'EEFF', pain: 'GG', death: 'HIJKLLLL', all: 'ABCDABCDEEFFGGABHIJKLLLL' };
  const draw = () => {
    const c = pv(); if (!c) { cancelAnimationFrame(raf); return; }
    const f = monFrames('prev', d), s = frameSeq[seq], fr = s[Math.floor(anim / 9) % s.length], img = f[fr];
    const g = c.getContext('2d'); g.fillStyle = '#16161b'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#2a2a33'; g.fillRect(0, c.height - 18, c.width, 18);
    const sc = Math.min((c.width - 20) / img.w, (c.height - 30) / img.h, 4); g.imageSmoothingEnabled = false;
    g.drawImage(spriteCanvas(img), (c.width - img.w * sc) / 2, c.height - 14 - img.h * sc, img.w * sc, img.h * sc);
    g.fillStyle = '#ffd400'; g.font = 'bold 12px monospace'; g.fillText('frame ' + fr, 6, 14);
    anim++; raf = requestAnimationFrame(draw);
  };
  const sel = (id, opts, val) => `<select id="${id}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${String(k) === String(val) ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  const num = (id, label, val, min, max, step = 1) => `<div class="f"><label>${label} <b id="${id}V">${val}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const render = b => {
    b.innerHTML = `<canvas id="mgPrev" width="300" height="220" style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto;border-radius:10px;image-rendering:pixelated"></canvas>
    <div class="row" style="justify-content:center">${Object.keys(frameSeq).map(k => `<button data-seq="${k}" class="${seq === k ? 'on' : ''}">${k === 'all' ? 'Full sequence' : k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
    <div class="row" style="justify-content:center"><button id="mgAll" class="demo">🎲 Roll a new monster</button><button data-re="name">🎲 Name</button><button data-re="look">🎲 Look</button><button data-re="stats">🎲 Stats</button><button data-re="attack">🎲 Attack</button></div>
    <div class="f"><label>Name</label><input id="mgName" maxlength="40" value="${esc(d.name)}"></div>
    <div class="f"><label>Body type</label>${sel('mgArch', Object.fromEntries(Object.entries(ARCHETYPES).map(([k, v]) => [k, v.name])), d.arch)}</div>
    <div class="f"><label>Threat tier</label>${sel('mgTier', Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, v.n])), d.tier)}</div>
    <div class="h">Look</div>
    <div class="f"><label>Painted art</label>${sel('mgArt', artOptions('monsters'), d.look.art || '')}</div>
    ${d.look.art ? `${num('mgHue', 'Color shift (hue)', d.look.hue || 0, -180, 180)}${num('mgSat', 'Color strength (saturation %)', d.look.sat != null ? d.look.sat : 100, 0, 200)}${num('mgBri', 'Brightness %', d.look.bri != null ? d.look.bri : 100, 40, 160)}
    <div class="row"><label>Tint color <input type="color" id="mgTint" value="${d.look.tint || '#c4141c'}"></label><button id="mgTintRed">Pulse red</button></div>${num('mgTintA', 'Tint amount %', d.look.tintAmt || 0, 0, 100)}
    ${num('mgASize', 'Size', d.look.size || 1, 0.5, 2.5, 0.05)}<label class="chk"><input type="checkbox" id="mgMirror" ${d.look.mirror ? 'checked' : ''}>Mirror (face the other way)</label>` : ''}
    <p class="hint">${d.look.art ? 'The settings below only apply to the old code-drawn style.' : ''}</p><div class="row"><label>Body <input type="color" id="mgCB" value="${d.look.body}"></label><label>Accent <input type="color" id="mgCA" value="${d.look.accent}"></label><label>Eyes <input type="color" id="mgCE" value="${d.look.eyes}"></label><button id="mgPulse">Pulse red & white</button></div>
    ${num('mgSize', 'Size', d.look.size, 0.6, 2.5, 0.05)}${num('mgEyes', 'Eyes', d.look.eyesN, 1, 4)}
    <label class="chk"><input type="checkbox" id="mgHorns" ${d.look.horns ? 'checked' : ''}>Horns</label><label class="chk"><input type="checkbox" id="mgSpikes" ${d.look.spikes ? 'checked' : ''}>Spikes</label>
    <div class="h">Stats</div>
    ${num('mgHp', 'Health', d.hp, 5, 6000, 5)}${num('mgSpd', 'Speed', d.spd, 0.5, 8, 0.1)}${num('mgPain', 'Flinch chance (pain)', d.pain, 0, 1, 0.01)}${num('mgAggro', 'Aggression', d.aggro, 0.3, 3, 0.05)}
    <label class="chk"><input type="checkbox" id="mgFloat" ${d.float ? 'checked' : ''}>Flies / floats</label><label class="chk"><input type="checkbox" id="mgFuzz" ${d.fuzz ? 'checked' : ''}>Shadowy (spectre-style, hard to see)</label>
    <div class="f"><label>Drops when killed</label>${sel('mgDrop', DROPS, d.drop || 0)}</div>
    <div class="h">Attack sequence</div>
    <div class="f"><label>Attack type</label>${sel('mgAtk', { melee: 'Melee only (claws/bite)', hit: 'Gun (hitscan)', 'hit+melee': 'Gun + claws', proj: 'Projectile', 'proj+melee': 'Projectile + claws' }, d.atk)}</div>
    ${num('mgDmin', 'Damage min', d.dmg[0], 1, 200)}${num('mgDmax', 'Damage max', d.dmg[1], 1, 300)}
    ${num('mgPel', 'Bullets per shot (gun)', d.pellets, 1, 9)}${num('mgBurst', 'Shots per attack (burst)', d.burst, 1, 10)}${num('mgGap', 'Time between burst shots (tics)', d.burstGap, 2, 20)}
    ${num('mgWind', 'Wind-up before attacking (tics, 35 = 1s)', d.windup, 2, 40)}${num('mgCool', 'Rest after attacking (tics)', d.coolMin, 5, 120)}${num('mgCoolV', 'Rest randomness (tics)', d.coolVar, 0, 120)}
    <div class="f"><label>Projectile</label>${sel('mgProj', PROJ_STYLES, d.proj || 'fire')}</div>
    ${num('mgPSpd', 'Projectile speed', d.projSpd || 10, 4, 30)}${num('mgSplash', 'Splash radius (0 = none)', d.splash || 0, 0, 256, 8)}
    <div class="card" style="padding:8px;border:1px solid var(--line);border-radius:10px;margin-top:8px"><b>Attack sequence:</b> <span id="mgStory"></span></div>`;
    b.querySelector('#mgStory').textContent = attackStory(d);
    const bind = (id, fn, ev = 'input') => { const e = b.querySelector('#' + id); if (!e) return; e.addEventListener(ev, () => { fn(e); const v = b.querySelector('#' + id + 'V'); if (v) v.textContent = e.value; b.querySelector('#mgStory').textContent = attackStory(d); }); };
    bind('mgName', e => d.name = e.value.slice(0, 40));
    bind('mgArch', e => { d = rollMonster({ arch: e.value, tier: d.tier, seed: d.seed }, { look: 1, stats: 0, attack: 1, name: 0 }, d); render(b); }, 'change');
    bind('mgTier', e => { d = rollMonster({ arch: d.arch, tier: e.value, seed: d.seed }, { look: 0, stats: 1, attack: 1, name: 0 }, d); render(b); }, 'change');
    bind('mgCB', e => d.look.body = e.value); bind('mgCA', e => d.look.accent = e.value); bind('mgCE', e => d.look.eyes = e.value);

    bind('mgArt', e => { if (e.value) { const keep = d.look.art ? d.look : { hue: 0, sat: 100, bri: 100, tint: '#c4141c', tintAmt: 0, size: 1, mirror: false }; d.look = Object.assign({}, keep, { art: e.value }); } else { d = rollMonster({ arch: d.arch, tier: d.tier, art: '' }, { look: 1, stats: 0, attack: 0, name: 0 }, d); } render(b); }, 'change');
    bind('mgHue', e => d.look.hue = +e.value); bind('mgSat', e => d.look.sat = +e.value); bind('mgBri', e => d.look.bri = +e.value); bind('mgTint', e => d.look.tint = e.value); bind('mgTintA', e => d.look.tintAmt = +e.value); bind('mgASize', e => d.look.size = +e.value); bind('mgMirror', e => d.look.mirror = e.checked, 'change');
    { const tr = b.querySelector('#mgTintRed'); if (tr) tr.onclick = () => { d.look.tint = '#c4141c'; d.look.tintAmt = Math.max(d.look.tintAmt || 0, 45); render(b); }; }
    bind('mgSize', e => d.look.size = +e.value); bind('mgEyes', e => d.look.eyesN = +e.value);
    bind('mgHorns', e => d.look.horns = e.checked, 'change'); bind('mgSpikes', e => d.look.spikes = e.checked, 'change');
    bind('mgHp', e => d.hp = +e.value); bind('mgSpd', e => d.spd = +e.value); bind('mgPain', e => d.pain = +e.value); bind('mgAggro', e => d.aggro = +e.value);
    bind('mgFloat', e => d.float = e.checked, 'change'); bind('mgFuzz', e => d.fuzz = e.checked, 'change'); bind('mgDrop', e => d.drop = +e.value, 'change');
    bind('mgAtk', e => { d.atk = e.value; if (e.value.includes('melee') && !d.melee) d.melee = [d.dmg[0], d.dmg[1]]; if (e.value.startsWith('proj') && !d.proj) { d.proj = 'fire'; d.projSpd = 10; } }, 'change');
    bind('mgDmin', e => { d.dmg[0] = +e.value; if (d.dmg[1] < d.dmg[0]) d.dmg[1] = d.dmg[0]; if (d.melee) d.melee[0] = Math.round(d.dmg[0] * 1.2); });
    bind('mgDmax', e => { d.dmg[1] = Math.max(+e.value, d.dmg[0]); if (d.melee) d.melee[1] = Math.round(d.dmg[1] * 1.3); });
    bind('mgPel', e => d.pellets = +e.value); bind('mgBurst', e => d.burst = +e.value); bind('mgGap', e => d.burstGap = +e.value);
    bind('mgWind', e => d.windup = +e.value); bind('mgCool', e => d.coolMin = +e.value); bind('mgCoolV', e => d.coolVar = +e.value);
    bind('mgProj', e => d.proj = e.value, 'change'); bind('mgPSpd', e => d.projSpd = +e.value); bind('mgSplash', e => d.splash = +e.value);
    b.querySelector('#mgPulse').onclick = () => { d.look.body = '#8a0a12'; d.look.accent = '#ffffff'; d.look.eyes = '#ffffff'; render(b); };
    b.querySelector('#mgAll').onclick = () => { d = rollMonster({}); render(b); };
    b.querySelectorAll('[data-re]').forEach(x => x.onclick = () => { const p = { name: 0, look: 0, stats: 0, attack: 0 }; p[x.dataset.re] = 1; d = rollMonster({ arch: d.arch, tier: d.tier }, p, d); render(b); });
    b.querySelectorAll('[data-seq]').forEach(x => x.onclick = () => { seq = x.dataset.seq; anim = 0; b.querySelectorAll('[data-seq]').forEach(y => y.classList.toggle('on', y === x)); });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
  };
  const box = modal(editType ? 'Edit monster: ' + d.name : 'Monster generator', '', [
    { ok: 1, title: 'Save to this map', fn: () => { cancelAnimationFrame(raf); const t = editType || nextMonType(); pushUndo(); M.mon = M.mon || {}; M.mon[t] = d; mapChanged(); E.thingType = +t; toast(d.name + ' saved as thing #' + t + '. Double-tap in Things mode to place it.', 5000); setMode('things'); } },
    { cancel: 1, fn: () => cancelAnimationFrame(raf) }]);
  window.__modalClose = () => cancelAnimationFrame(raf);
  render(box);
}
function nextMonType() { let t = MON_BASE + 1; while ((M.mon || {})[t]) t++; return t; }
function openBestiary() {
  const list = Object.entries(M.mon || {});
  modal('Custom monsters in this map · ' + list.length, `<div class="row"><button id="bsNew" class="demo">🎲 Generate a monster</button></div>
    <div class="list">${list.map(([t, d]) => `<div class="row"><canvas data-pv="${t}" width="48" height="48" style="width:48px;height:48px;image-rendering:pixelated;background:#111;border-radius:6px"></canvas><b style="flex:1">${esc(d.name)}<br><span class="hint">#${t} · ${TIERS[d.tier].n} ${ARCHETYPES[d.arch].name.toLowerCase()} · ${d.hp} HP · ${M.t.filter(x => x.type === +t).length} placed</span></b><button data-place="${t}">Place</button><button data-edit="${t}">Edit</button><button data-del="${t}">Delete</button></div>`).join('') || '<p class="hint">None yet. Generate one, tweak it, save it, then place it like any other thing.</p>'}</div>`, [{ cancel: 1 }], b => {
    b.querySelectorAll('[data-pv]').forEach(c => { const d = M.mon[c.dataset.pv], img = monFrames(c.dataset.pv, d).A, g = c.getContext('2d'), s = Math.min(48 / img.w, 48 / img.h); g.imageSmoothingEnabled = false; g.drawImage(spriteCanvas(img), (48 - img.w * s) / 2, 48 - img.h * s, img.w * s, img.h * s); });
    b.querySelector('#bsNew').onclick = () => { closeModal(); setTimeout(() => openMonsterGen(), 30); };
    b.querySelectorAll('[data-place]').forEach(x => x.onclick = () => { closeModal(); E.thingType = +x.dataset.place; setMode('things'); toast('Double-tap to place ' + M.mon[x.dataset.place].name); });
    b.querySelectorAll('[data-edit]').forEach(x => x.onclick = () => { closeModal(); setTimeout(() => openMonsterGen(x.dataset.edit), 30); });
    b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { const t = x.dataset.del, n = M.t.filter(z => z.type === +t).length; modal('Delete ' + M.mon[t].name + '?', `<p>${n ? n + ' placed in the map will be removed too. ' : ''}One Undo brings it back.</p>`, [{ ok: 1, fn: () => { pushUndo(); delete M.mon[t]; M.t = M.t.filter(z => z.type !== +t); mapChanged(); setTimeout(openBestiary, 50); } }, { cancel: 1 }]); });
  });
}
/* ---------- GZDoom export: DECORATE + PNG sprites ---------- */
function monsterExportLumps() {
  const out = { decorate: '', sprites: [] }; const list = Object.entries(M.mon || {}); if (!list.length) return out;
  const SOUND = { imp: 'imp', beast: 'demon', floater: 'caco', soldier: 'grunt', hulk: 'baron', crawler: 'baby', cyber: 'cyber' };
  const PROJACT = { fire: 'DoomImpBall', caco: 'CacodemonBall', baron: 'BaronBall', plasmam: 'ArachnotronPlasma', rocketm: 'Rocket' };
  const DROPN = { 2007: 'Clip', 2008: 'Shell', 2001: 'Shotgun', 2002: 'Chaingun', 2011: 'Stimpack', 2012: 'Medikit', 2014: 'HealthBonus', 2015: 'ArmorBonus', 2047: 'Cell', 2010: 'RocketAmmo' };
  const dec = src => { const b64 = src.split(',')[1] || '', bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  let txt = '// Generated by EOD · Editor of Doom (Pulse Labs Studio) — custom monsters for GZDoom\n';
  list.forEach(([t, d], i) => {
    const pre = 'PX' + (i + 1).toString(36).toUpperCase().padStart(2, '0'), sz = monSize(d), f = monFrames(t, d), snd = SOUND[d.arch] || 'imp';
    'ABCDEFGHIJKL'.split('').forEach(fr => { const c = spriteCanvas(f[fr]); out.sprites.push([pre + fr + '0', pngGrab(dec(c.toDataURL('image/png')), f[fr].w >> 1, f[fr].h - 2)]); });
    const cls = 'EOD_' + d.name.replace(/[^A-Za-z0-9]/g, '') + '_' + t;
    const melee = d.melee ? `  Melee:\n    ${pre} E ${Math.max(2, d.windup >> 1)} A_FaceTarget\n    ${pre} F 6 A_CustomMeleeAttack(random(${d.melee[0]}, ${d.melee[1]}), "${snd === 'grunt' ? 'imp' : snd}/melee")\n    Goto See\n` : '';
    let missile = '';
    if (d.atk !== 'melee') {
      const shot = d.atk.startsWith('hit') ? `A_CustomBulletAttack(${(4 + d.pellets).toFixed(1)}, 0, ${d.pellets}, ${Math.max(1, Math.round((d.dmg[0] + d.dmg[1]) / 6))}, "BulletPuff")` : `A_CustomMissile("${PROJACT[d.proj] || 'DoomImpBall'}", ${Math.round(sz.h * .57)}, 0)`;
      missile = `  Missile:\n    ${pre} E ${d.windup} A_FaceTarget\n` + Array.from({ length: d.burst }, (_, k) => `    ${pre} F ${k < d.burst - 1 ? d.burstGap : 8} Bright ${shot}\n`).join('') + `    Goto See\n`;
    }
    txt += `\nActor ${cls} ${t}\n{\n  Tag "${d.name.replace(/"/g, '')}"\n  Health ${d.hp}\n  Radius ${sz.r}\n  Height ${sz.h}\n  Speed ${Math.max(1, Math.round(d.spd * 3.6))}\n  PainChance ${Math.round(d.pain * 255)}\n  Mass ${Math.round(100 + d.hp)}\n  Monster\n  +FLOORCLIP\n${d.float ? '  +FLOAT\n  +NOGRAVITY\n' : ''}${d.fuzz ? '  +SHADOW\n  RenderStyle OptFuzzy\n' : ''}  SeeSound "${snd}/sight"\n  PainSound "${snd}/pain"\n  DeathSound "${snd}/death"\n  ActiveSound "${snd}/active"\n  AttackSound "${snd}/attack"\n  Obituary "%o was ripped apart by a ${d.name.replace(/"/g, '')}."\n${d.drop && DROPN[d.drop] ? `  DropItem "${DROPN[d.drop]}"\n` : ''}  States\n  {\n  Spawn:\n    ${pre} AB 10 A_Look\n    Loop\n  See:\n    ${pre} AABBCCDD ${Math.max(2, Math.round(4 - d.spd / 3))} A_Chase\n    Loop\n${melee}${missile}  Pain:\n    ${pre} G 3\n    ${pre} G 3 A_Pain\n    Goto See\n  Death:\n    ${pre} H 5\n    ${pre} I 5 A_Scream\n    ${pre} J 5 A_NoBlocking\n    ${pre} K 5\n    ${pre} L -1\n    Stop\n  }\n}\n`;
  });
  out.decorate = txt; return out;
}
