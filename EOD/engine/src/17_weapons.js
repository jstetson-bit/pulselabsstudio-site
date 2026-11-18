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
  super: { n: 'Superweapon', kind: 'proj', ammo: 'cells', proj: 'bfg', rate: [45, 70], dmg: [100, 600], slot: 7, snd: 'plasma' },
  melee: { n: 'Melee', kind: 'melee', ammo: null, rate: [6, 18], dmg: [10, 60], slot: 1, snd: 'chain' }
};
const WN1 = ['Hell', 'Blood', 'Iron', 'Ash', 'Brim', 'Rot', 'Hex', 'Wrath', 'Cinder', 'Skull', 'Ember', 'Grave', 'Scorch', 'Rust', 'Venom', 'Dread', 'Pulse', 'Thunder', 'Bone', 'Riot'];
const WN2 = { sidearm: ['Pistol', 'Revolver', 'Hand cannon', 'Repeater'], shotgun: ['Scattergun', 'Boomstick', 'Shotgun', 'Breacher'], repeater: ['Chaingun', 'Minigun', 'Ripper', 'Shredder'], explosive: ['Launcher', 'Mortar', 'Bombard', 'Cannon'], energy: ['Rifle', 'Lance', 'Arc gun', 'Projector'], super: ['Annihilator', 'Doomsday', 'Devastator', 'Obliterator'], melee: ['Cleaver', 'Saw', 'Maul', 'Fist'] };
const WAMMO = { bullets: 'Bullets', shells: 'Shells', rockets: 'Rockets', cells: 'Cells' };
const WPROJ = { rocket: 'Rocket (splash)', plasma: 'Plasma bolt', bfg: 'Big green ball', fire: 'Fireball', caco: 'Purple orb', baron: 'Green bolt' };
const WSND = { pistol: 'Pistol crack', shotgun: 'Shotgun boom', chain: 'Rapid rattle', rocket: 'Rocket whoosh', plasma: 'Energy zap' };
function rollWeapon(opts = {}, parts = { name: 1, look: 1, stats: 1 }, base) {
  const seed = opts.seed != null ? opts.seed : (Math.random() * 2 ** 31) | 0, r = monRng(seed);
  const cls = opts.cls && opts.cls !== 'random' ? opts.cls : mpick(r, Object.keys(WCLASS)), C = WCLASS[cls];
  const d = Object.assign({ v: 1 }, base || {}); d.cls = cls;
  if (parts.name || !d.name) d.name = mpick(r, WN1) + ' ' + mpick(r, WN2[cls]);
  if (parts.look || !d.look) { const pal = mpick(r, [['#555b66', '#2a2a2a', '#ffd060'], ['#444', '#7a4a20', '#ffb020'], ['#6a7a5a', '#333', '#ff7a20'], ['#4a5a7a', '#222', '#60c0ff'], ['#3a6a3a', '#1a1a1a', '#60ff60'], ['#8a0a12', '#ffffff', '#ffffff'], ['#777', '#a33', '#ff4040']]); d.look = { seed: (r() * 1e9) | 0, body: pal[0], accent: pal[1], glow: pal[2], barrels: cls === 'repeater' ? mpick(r, [3, 4, 6]) : cls === 'shotgun' ? mpick(r, [1, 2]) : 1, length: +(0.7 + r() * 0.6).toFixed(2), scope: r() < .3, drum: cls === 'repeater' || r() < .2, stock: r() < .5 }; }
  if (parts.stats || d.rate == null) {
    d.kind = C.kind; d.ammo = C.ammo; d.use = cls === 'super' ? 40 : cls === 'shotgun' && r() < .3 ? 2 : 1;
    d.pellets = C.pel ? Math.round(between(r, C.pel)) : 1; d.spread = C.spr ? +between(r, C.spr).toFixed(3) : 0;
    d.rate = Math.round(between(r, C.rate)); d.dmg = [C.dmg[0], Math.round(between(r, [C.dmg[0] + 5, C.dmg[1]]))];
    d.proj = C.proj || null; d.projSpd = d.proj ? Math.round(between(r, [14, 30])) : 0; d.splash = d.proj === 'rocket' ? Math.round(between(r, [96, 160])) : d.proj === 'bfg' ? 160 : 0;
    d.range = cls === 'melee' ? Math.round(between(r, [64, 110])) : 0; d.recoil = Math.round(cls === 'shotgun' || cls === 'explosive' || cls === 'super' ? between(r, [4, 10]) : between(r, [0, 3]));
    d.snd = C.snd; d.give = cls === 'super' ? 40 : cls === 'energy' ? 40 : cls === 'explosive' ? 2 : cls === 'shotgun' ? 8 : 20; d.startWith = false;
  }
  d.seed = seed; return d;
}
/* ---------- procedural art ---------- */
const WEPF = new Map();
function drawGun(g, w, h, d, firing, side) {
  const L = d.look, len = L.length, cx = w / 2;
  if (side) { // pickup (side view)
    g.fillStyle = L.accent; if (L.stock) g.fillRect(0, h * .35, w * .22, h * .35);
    g.fillStyle = L.body; g.fillRect(w * .18, h * .25, w * .45, h * .45); g.fillRect(w * .3, h * .6, w * .1, h * .4);
    for (let i = 0; i < Math.min(3, L.barrels); i++) g.fillRect(w * .6, h * (.28 + i * .12), w * .4 * len + 2, h * .1);
    if (L.drum) { g.fillStyle = L.accent; g.beginPath(); g.arc(w * .45, h * .78, h * .2, 0, 7); g.fill(); }
    if (L.scope) { g.fillStyle = '#111'; g.fillRect(w * .3, h * .08, w * .25, h * .14); }
    g.fillStyle = L.glow; g.fillRect(w * .5, h * .35, w * .06, h * .1); return;
  }
  if (d.cls === 'melee') { // blade / saw / maul
    g.fillStyle = '#c99a7a'; g.fillRect(cx - w * .08, h * .62, w * .16, h * .38);
    g.fillStyle = L.accent; g.fillRect(cx - w * .05, h * .45, w * .1, h * .25);
    g.fillStyle = L.body; g.beginPath(); g.moveTo(cx - w * .14, h * .48); g.lineTo(cx, h * (.05 - (firing ? .04 : 0)) + (1 - len) * h * .2); g.lineTo(cx + w * .14, h * .48); g.fill();
    g.fillStyle = L.glow; g.fillRect(cx - 1, h * .15, 2, h * .3); return;
  }
  const bw = w * (0.12 + 0.05 * Math.min(L.barrels, 3)), top = h * (0.18 + (1 - len) * 0.25);
  if (firing) { const rg = g.createRadialGradient(cx, top, 2, cx, top, w * .22); rg.addColorStop(0, '#fff'); rg.addColorStop(.4, L.glow); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(cx, top, w * .22, 0, 7); g.fill(); }
  g.fillStyle = '#c99a7a'; g.fillRect(cx - w * .14, h * .72, w * .28, h * .28);
  g.fillStyle = L.body; g.beginPath(); g.moveTo(cx - bw * 1.4, h); g.lineTo(cx - bw * .9, h * .55); g.lineTo(cx + bw * .9, h * .55); g.lineTo(cx + bw * 1.4, h); g.fill();
  const n = L.barrels; for (let i = 0; i < n; i++) { const bx = cx - bw / 2 + (n > 1 ? i * bw / (n - 1) : bw / 2) - (n > 1 ? 0 : 0); g.fillStyle = i % 2 ? L.body : '#3a3a3a'; g.fillRect((n > 1 ? bx : cx) - bw / (n > 2 ? n : 2.4), top + (firing ? 6 : 0), bw / (n > 2 ? n * .55 : 1.2), h * .6); }
  g.fillStyle = L.accent; g.fillRect(cx - bw * .7, h * .6, bw * 1.4, h * .08);
  if (L.drum) { g.fillStyle = L.accent; g.beginPath(); g.arc(cx + bw * 1.1, h * .78, bw * .7, 0, 7); g.fill(); }
  if (L.scope) { g.fillStyle = '#111'; g.fillRect(cx - bw * .35, top + h * .12, bw * .7, h * .16); g.fillStyle = L.glow; g.fillRect(cx - bw * .15, top + h * .14, bw * .3, h * .04); }
  g.fillStyle = L.glow; g.fillRect(cx - 2, h * .5, 4, h * .04);
}
function weaponArt(id, d) {
  const key = id + JSON.stringify(d.look) + d.cls; let a = WEPF.get(key); if (a) return a;
  const W_ = 130, H_ = 100;
  a = { idle: mkSprite('w' + id + 'a', W_, H_, (g, w, h) => drawGun(g, w, h, d, false)), fire: mkSprite('w' + id + 'b', W_, H_, (g, w, h) => drawGun(g, w, h, d, true)), pick: mkSprite('w' + id + 'p', Math.round(44 + 20 * d.look.length), 16, (g, w, h) => drawGun(g, w, h, d, false, true)) };
  ['w' + id + 'a', 'w' + id + 'b', 'w' + id + 'p'].forEach(k => delete SPR[k]);
  a.pick.ox = a.pick.w >> 1; a.pick.oy = a.pick.h; WEPF.set(key, a); return a;
}
function weaponPickupImg(type, d) { return weaponArt(type, d).pick; }
function drawCustomWeapon(g, W, H, u, bx, by) {
  const p = G.p, d = WEAPONS[p.w].custom, art = weaponArt(p.w, d), img = p.fireT > 2 ? art.fire : art.idle;
  const s = Math.min(W / 320, (H - 20 * u) / 168) * 1.15, c = spriteCanvas(img);
  g.imageSmoothingEnabled = false; g.drawImage(c, W / 2 - img.w * s / 2 + bx, H - 20 * u - img.h * s + by + (p.fireT > 3 ? 3 * s : 0), img.w * s, img.h * s);
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
    b.innerHTML = `<canvas id="wgPrev" width="320" height="200" style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto;border-radius:10px;image-rendering:pixelated"></canvas>
    <div class="row" style="justify-content:center"><button id="wgAll" class="demo">🎲 Roll a new weapon</button><button data-re="name">🎲 Name</button><button data-re="look">🎲 Look</button><button data-re="stats">🎲 Stats</button></div>
    <div class="f"><label>Name</label><input id="wgName" maxlength="40" value="${esc(d.name)}"></div>
    <div class="f"><label>Class</label>${sel('wgCls', Object.fromEntries(Object.entries(WCLASS).map(([k, v]) => [k, v.n])), d.cls)}</div>
    <div class="h">Look</div>
    <div class="row"><label>Body <input type="color" id="wgCB" value="${d.look.body}"></label><label>Accent <input type="color" id="wgCA" value="${d.look.accent}"></label><label>Glow <input type="color" id="wgCG" value="${d.look.glow}"></label><button id="wgPulse">Pulse red & white</button></div>
    ${num('wgBar', 'Barrels', d.look.barrels, 1, 6)}${num('wgLen', 'Length', d.look.length, 0.5, 1.4, 0.05)}
    <label class="chk"><input type="checkbox" id="wgScope" ${d.look.scope ? 'checked' : ''}>Scope</label><label class="chk"><input type="checkbox" id="wgDrum" ${d.look.drum ? 'checked' : ''}>Drum magazine</label><label class="chk"><input type="checkbox" id="wgStock" ${d.look.stock ? 'checked' : ''}>Stock</label>
    <div class="h">Firing</div>
    <div class="f"><label>Fires</label>${sel('wgKind', { hit: 'Bullets (hitscan)', proj: 'Projectiles', melee: 'Melee (no ammo)' }, d.kind)}</div>
    ${num('wgDmin', 'Damage min', d.dmg[0], 1, 400)}${num('wgDmax', 'Damage max', d.dmg[1], 1, 800)}
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
    bind('wgBar', e => d.look.barrels = +e.value); bind('wgLen', e => d.look.length = +e.value);
    bind('wgScope', e => d.look.scope = e.checked, 'change'); bind('wgDrum', e => d.look.drum = e.checked, 'change'); bind('wgStock', e => d.look.stock = e.checked, 'change');
    bind('wgKind', e => { d.kind = e.value; if (d.kind === 'proj' && !d.proj) { d.proj = 'rocket'; d.projSpd = 20; } if (d.kind === 'melee') { d.ammo = null; d.range = d.range || 72; } }, 'change');
    bind('wgDmin', e => { d.dmg[0] = +e.value; if (d.dmg[1] < d.dmg[0]) d.dmg[1] = d.dmg[0]; }); bind('wgDmax', e => d.dmg[1] = Math.max(+e.value, d.dmg[0]));
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
    out.sprites.push([pre + 'A0', pngGrab(dec(spriteCanvas(art.idle)), Math.round(art.idle.w / 2 - 159), Math.round(art.idle.h - 168))]);
    out.sprites.push([pre + 'B0', pngGrab(dec(spriteCanvas(art.fire)), Math.round(art.fire.w / 2 - 159), Math.round(art.fire.h - 168))]);
    out.sprites.push([pk + 'A0', pngGrab(dec(spriteCanvas(art.pick)), art.pick.w >> 1, art.pick.h)]);
    const shot = d.kind === 'melee' ? `A_CustomPunch(random(${d.dmg[0]}, ${d.dmg[1]}), 1, 0, "BulletPuff", ${d.range || 72})` : d.kind === 'proj' ? `A_FireCustomMissile("${PJ[d.proj] || 'Rocket'}")` : `A_FireBullets(${(d.spread * 57.3).toFixed(1)}, ${(d.spread * 28.6).toFixed(1)}, ${d.pellets > 1 ? d.pellets : -1}, ${Math.max(1, Math.round((d.dmg[0] + d.dmg[1]) / 6))}, "BulletPuff")`;
    const cls = 'EOD_W_' + d.name.replace(/[^A-Za-z0-9]/g, '') + '_' + id;
    txt += `\nActor ${cls} : Weapon ${id}\n{\n  Tag "${d.name.replace(/"/g, '')}"\n  Weapon.SelectionOrder ${400 + i}\n  Weapon.SlotNumber ${WCLASS[d.cls].slot}\n${d.ammo ? `  Weapon.AmmoType "${AM[d.ammo]}"\n  Weapon.AmmoUse ${d.use}\n  Weapon.AmmoGive ${d.give}\n` : '  +WEAPON.NOAUTOAIM\n'}  AttackSound "${SN[d.snd] || 'weapons/pistol'}"\n  Inventory.PickupMessage "You got the ${d.name.replace(/"/g, '')}!"\n  States\n  {\n  Ready:\n    ${pre} A 1 A_WeaponReady\n    Loop\n  Deselect:\n    ${pre} A 1 A_Lower\n    Loop\n  Select:\n    ${pre} A 1 A_Raise\n    Loop\n  Fire:\n    ${pre} B 2 Bright ${shot}\n    ${pre} A ${Math.max(1, d.rate - 2)}\n    ${pre} A 0 A_ReFire\n    Goto Ready\n  Spawn:\n    ${pk} A -1\n    Stop\n  }\n}\n`;
  });
  out.decorate = txt; return out;
}
