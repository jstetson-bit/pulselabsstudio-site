/* ================= GLASS (see-through, reflecting, breakable panes on two-sided lines) =================
   Saved on the line: M.l[i].glass = { ...GLASS_DEF overrides }. Every part is a switch with its own settings. */
const GLASS_DEF = {
  see: 1, op: 18,            // see-through on/off; how much the glass color covers what's behind (0-100)
  tint: 1, col: '#9fd8ff',   // tint on/off; glass color
  pat: 0,                    // use the line's middle texture as a pattern (stained / printed glass)
  refl: 1, rs: 35, fres: 1, rdist: 1024, // reflection on/off; strength 0-100; stronger at shallow angles; how far it reflects
  shine: 1,                  // shine streaks
  brk: 1, hp: 30, crack: 1, shards: 1, keep: 1, snd: 1, monBrk: 1, // breakable + its parts
  block: 1, bullets: 1, monSee: 1 // blocks movement; stops bullets/fire; monsters can see through
};
const GLASS_PRESETS = {
  'Clear window': {},
  'Mirror': { see: 0, op: 100, col: '#c8d2dc', rs: 85, fres: 0, shine: 0, brk: 1, hp: 20 },
  'Frosted': { op: 70, col: '#e6f0f5', rs: 10, shine: 0 },
  'Stained (middle texture)': { pat: 1, op: 55, rs: 15 },
  'Bulletproof': { brk: 0, op: 25, col: '#a8c8b0', rs: 30 },
  'Pulse red': { op: 35, col: '#c4141c', rs: 40 },
  'Ghost pane (walk through)': { block: 0, bullets: 0, monSee: 1, brk: 0, op: 12, rs: 25 }
};
function glassOf(L) { return L && L.glass ? Object.assign({}, GLASS_DEF, L.glass) : null; }
function hexRGB(h) { let x = (h || '#9fd8ff').replace('#', ''); if (x.length === 3) x = x.split('').map(c => c + c).join(''); const n = parseInt(x, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// per-play state for a scene line
function glassInit(L) {
  const g = glassOf(L); if (!g || L.s2 < 0) return null;
  const [r, gg, b] = hexRGB(g.col); g._r = g.tint ? r : 200; g._g = g.tint ? gg : 215; g._b = g.tint ? b : 225;
  g.hpMax = g.hp; g.broken = false; g.cm = null; return g;
}
function glassLive(l) { return l && l.gl && !l.gl.broken ? l.gl : null; }

/* ---------- renderer side ---------- */
let GLN = 0, GX = new Int32Array(1024), GA = new Int32Array(1024), GB = new Int32Array(1024), GT = new Float32Array(1024), GU = new Float32Array(1024), GI = new Int32Array(1024), GS = new Int32Array(1024), GRX = new Float32Array(1024), GRY = new Float32Array(1024);
function glassRec(x, ya, yb, t, u, li, ns, rdx, rdy) {
  if (GLN >= GX.length) { const g = n => { const a = new n.constructor(n.length * 2); a.set(n); return a; }; GX = g(GX); GA = g(GA); GB = g(GB); GT = g(GT); GU = g(GU); GI = g(GI); GS = g(GS); GRX = g(GRX); GRY = g(GRY); }
  GX[GLN] = x; GA[GLN] = ya; GB[GLN] = yb; GT[GLN] = t; GU[GLN] = u; GI[GLN] = li; GS[GLN] = ns; GRX[GLN] = rdx; GRY[GLN] = rdy; GLN++;
}
let RHS = new Float32Array(64), RHU = new Float32Array(64), RHI = new Int32Array(64), RHD = new Float32Array(64), RHN = 0, RSTAMP = new Int32Array(0), RST = 0;
// cast the mirrored ray from the pane and list every line it crosses (nearest first)
function reflectHits(sc, hx, hy, rx, ry, maxd, skip) {
  RHN = 0; const L = sc.lines, rl = Math.hypot(rx, ry), smax = maxd / rl;
  const add = (i) => {
    const l = L[i]; if (i === skip) return; const ex = l.ex, ey = l.ey, den = rx * ey - ry * ex; if (den > -1e-9 && den < 1e-9) return;
    const wx = l.ax - hx, wy = l.ay - hy, s = (wx * ey - wy * ex) / den; if (s <= 0.02 || s > smax) return;
    const v = (wx * ry - wy * rx) / den; if (v < 0 || v > 1) return;
    if (RHN >= RHS.length) { const g = n => { const a = new n.constructor(n.length * 2); a.set(n); return a; }; RHS = g(RHS); RHU = g(RHU); RHI = g(RHI); RHD = g(RHD); }
    RHS[RHN] = s; RHU[RHN] = v; RHI[RHN] = i; RHD[RHN] = den; RHN++;
  };
  const gr = (typeof G !== 'undefined' && G && G.sc === sc) ? G.grid : null;
  if (!gr) { for (let i = 0; i < L.length && i < 4000; i++) add(i); }
  else {
    if (RSTAMP.length < L.length) RSTAMP = new Int32Array(L.length); RST++;
    let solidAt = Infinity; const step = 48 / rl;
    for (let s = 0; s <= smax + step && s <= solidAt + step; s += step) {
      const px = hx + rx * s, py = hy + ry * s, cx = Math.floor((px - gr.x0) / GCS), cy = Math.floor((py - gr.y0) / GCS);
      if (cx < 0 || cy < 0 || cx >= gr.gw || cy >= gr.gh) { if (s > 0) break; else continue; }
      const c = gr.cells[cy * gr.gw + cx]; if (!c) continue;
      for (const i of c) { if (RSTAMP[i] === RST) continue; RSTAMP[i] = RST; const n0 = RHN; add(i); if (RHN > n0 && !L[i].s2 && RHS[n0] < solidAt) solidAt = RHS[n0]; }
    }
  }
  for (let i = 1; i < RHN; i++) { const s = RHS[i], u = RHU[i], k = RHI[i], d = RHD[i]; let j = i - 1; while (j >= 0 && RHS[j] > s) { RHS[j + 1] = RHS[j]; RHU[j + 1] = RHU[j]; RHI[j + 1] = RHI[j]; RHD[j + 1] = RHD[j]; j--; } RHS[j + 1] = s; RHU[j + 1] = u; RHI[j + 1] = k; RHD[j + 1] = d; }
}
function texAt(tex, lvl, u, v) { const sp = tex.shade(lvl), tw = tex.w, th = tex.h; let a = Math.floor(u) % tw; if (a < 0) a += tw; let b = Math.floor(v) % th; if (b < 0) b += th; return sp[b * tw + a]; }
// what the reflection shows at screen row y (or -1 for nothing)
function reflSample(sc, flats, sky, cam, hz, proj, y, t, ns, hx, hy, rx, ry) {
  const secs = sc.secs, L = sc.lines, dy = (y + 0.5) - hz; let cur = ns;
  const plane = (T) => {
    const S0 = secs[cur]; if (!S0) return -1; const floor = dy > 0; const f = floor ? flats[cur].f : flats[cur].c;
    if (!f) { const sp = sky.shade(15); return sp[(clamp(((y - hz + R.H * 0.6) * sky.h / R.H) | 0, 0, sky.h - 1)) * sky.w + (((Math.atan2(ry, rx) * -163) | 0) % sky.w + sky.w) % sky.w]; }
    const wx = hx + rx * (T - t), wy = hy + ry * (T - t);
    return texAt(f, shadeLvl(S0.li, T), wx, -wy);
  };
  for (let j = 0; j < RHN; j++) {
    const T = t + RHS[j], z = cam.z - dy * T / proj, S0 = secs[cur]; if (!S0) return -1;
    if (z < S0.fh && dy > 0) return plane((cam.z - S0.fh) * proj / dy);
    if (z > S0.ch && dy < 0) return plane((S0.ch - cam.z) * proj / -dy);
    const l = L[RHI[j]], front = RHD[j] < 0, near = front ? l.s1 : l.s2, far = front ? l.s2 : l.s1, side = near || l.s1;
    const lvl = shadeLvl(S0.li, T), tu = RHU[j] * l.len + (side ? side.xo : 0);
    if (!far) { const tex = side && side.midT; if (!tex) return 0xff202020; const ref = (l.f & 16) ? S0.fh + tex.h : S0.ch; return texAt(tex, lvl, tu, ref + side.yo - z); }
    const F = secs[far.sec]; if (!F) return -1;
    if (z > F.ch) { const tex = side && side.upT; if (!tex) return -1; const ref = (l.f & 8) ? S0.ch : F.ch + tex.h; return texAt(tex, lvl, tu, ref + side.yo - z); }
    if (z < F.fh) { const tex = side && side.loT; if (!tex) return -1; const ref = (l.f & 16) ? S0.ch : F.fh; return texAt(tex, lvl, tu, ref + side.yo - z); }
    const g2 = glassLive(l); if (g2) { const f = (lvl + 1) / 16; return (255 << 24) | ((g2._b * f) << 16) | ((g2._g * f) << 8) | (g2._r * f); }
    cur = far.sec;
  }
  if (dy > 0.5) return plane((cam.z - (secs[cur] || {}).fh) * proj / dy);
  if (dy < -0.5) return plane(((secs[cur] || {}).ch - cam.z) * proj / -dy);
  return -1;
}
function glassComposite(cam, sc, hz, proj, flats, sky) {
  if (!GLN) return;
  const X0 = R.x0, W = R.W, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi, cz = cam.z, secs = sc.secs;
  for (let n = GLN - 1; n >= 0; n--) {
    const x = GX[n], ya = GA[n], yb = GB[n], t = GT[n], l = sc.lines[GI[n]], g = l.gl, ns = GS[n], rdx = GRX[n], rdy = GRY[n];
    const S0 = secs[ns]; if (!S0 || !g) continue;
    const lvl = shadeLvl(S0.li, t), f = (lvl + 1) / 16, uu = GU[n] * l.len, step = t / proj;
    const op = g.see ? g.op / 100 : 1, tr = g._r * f, tg = g._g * f, tb = g._b * f;
    const side = l.s1, pat = g.pat && side && side.midT ? side.midT : null;
    // reflection setup for this column
    let k = 0, hx = 0, hy = 0, rx = 0, ry = 0;
    if (g.refl && g.rs > 0) {
      const ux = l.ex / l.len, uy = l.ey / l.len, dd = rdx * ux + rdy * uy; rx = 2 * dd * ux - rdx; ry = 2 * dd * uy - rdy;
      hx = cam.x + rdx * t; hy = cam.y + rdy * t;
      const cs = Math.abs(rdx * uy - rdy * ux) / Math.hypot(rdx, rdy);
      k = g.rs / 100 * (g.fres ? (0.35 + 0.65 * (1 - cs) * (1 - cs)) : 1);
      reflectHits(sc, hx, hy, rx, ry, g.rdist || 1024, GI[n]);
    }
    let z = cz - (ya + 0.5 - hz) * step;
    for (let y = ya; y <= yb; y++, z -= step) {
      const o = (x - X0) * R.H + y; if (dep[o] < t - 0.5) continue;
      const bc = buf[o]; let r, gg, b;
      let cr = tr, cg = tg, cb = tb;
      if (pat) { const c = texAt(pat, lvl, uu + side.xo, -z + side.yo); if (c >>> 24) { cr = c & 255; cg = (c >> 8) & 255; cb = (c >> 16) & 255; } }
      if (op >= 1) { r = cr; gg = cg; b = cb; }
      else { r = (bc & 255) * (1 - op) + cr * op; gg = ((bc >> 8) & 255) * (1 - op) + cg * op; b = ((bc >> 16) & 255) * (1 - op) + cb * op; }
      if (k > 0) { const rc = reflSample(sc, flats, sky, cam, hz, proj, y, t, ns, hx, hy, rx, ry); if (rc !== -1) { const kk = op >= 1 && !g.see ? Math.max(k, 0.0) : k; r = r * (1 - kk) + (rc & 255) * kk; gg = gg * (1 - kk) + ((rc >> 8) & 255) * kk; b = b * (1 - kk) + ((rc >> 16) & 255) * kk; } }
      if (g.shine) { const s = ((uu * 0.7 + z * 0.9) % 96 + 96) % 96; if (s < 2.5 || (s > 7 && s < 8.5)) { const a = 45 * f; r += a; gg += a; b += a; } }
      if (g.crack && g.cm) { const cx = Math.floor(uu), cy = Math.floor(z - g.cz0); if (cx >= 0 && cy >= 0 && cx < g.cw && cy < g.chh && g.cm[cy * g.cw + cx]) { const a = 0.75; r = r * (1 - a) + 235 * f * a; gg = gg * (1 - a) + 245 * f * a; b = b * (1 - a) + 255 * f * a; } }
      buf[o] = (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(gg | 0, 0, 255) << 8) | clamp(r | 0, 0, 255);
      dep[o] = t; pk[o] = 2; pi[o] = l.idx;
    }
  }
  GLN = 0;
}

/* ---------- game side ---------- */
function glassOpening(l) { const o = opening(l); return o; }
function glassCrackAt(l, px, py, pz, power) {
  const g = l.gl; if (!g.crack) return;
  const o = glassOpening(l);
  if (!g.cm) { g.cw = Math.max(1, Math.ceil(l.len)); g.cz0 = o.bot; g.chh = Math.max(1, Math.ceil(o.top - o.bot)); g.cm = new Uint8Array(g.cw * g.chh); }
  const u = clamp(((px - l.ax) * l.ex + (py - l.ay) * l.ey) / l.len, 0, l.len), cx = u, cy = pz - g.cz0;
  const set = (x, y) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < g.cw && y < g.chh) g.cm[y * g.cw + x] = 1; };
  const rays = 4 + Math.min(6, power / 6 | 0);
  for (let i = 0; i < rays; i++) {
    let a = Math.random() * 6.283, x = cx, y = cy; const len = 10 + Math.random() * (14 + power * 2);
    for (let s = 0; s < len; s++) { a += (Math.random() - 0.5) * 0.35; if (Math.random() < 0.04) { const b = a + (Math.random() - 0.5) * 1.6; let bx = x, by = y; for (let q = 0; q < 8; q++) { bx += Math.cos(b); by += Math.sin(b); set(bx, by); } } x += Math.cos(a); y += Math.sin(a); set(x, y); }
  }
  for (let a = 0; a < 6.283; a += 0.35) set(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
}
const SHARDC = new Map();
function shardImg(g, i) {
  const key = g.col + i; if (SHARDC.has(key)) return SHARDC.get(key);
  const [r, gg, b] = hexRGB(g.tint ? g.col : '#d8e8f0');
  const img = mkSprite('shard_' + key, 8, 8, (c, w, h) => { c.fillStyle = `rgb(${Math.min(255, r + 40)},${Math.min(255, gg + 40)},${Math.min(255, b + 40)})`; c.beginPath(); const pts = [[[1, 7], [7, 6], [3, 1]], [[0, 3], [7, 7], [5, 0]], [[2, 7], [6, 7], [4, 0]], [[0, 0], [7, 2], [1, 6]]][i & 3]; c.moveTo(...pts[0]); c.lineTo(...pts[1]); c.lineTo(...pts[2]); c.fill(); c.fillStyle = '#fff'; c.fillRect(pts[2][0], pts[2][1], 1, 2); });
  SHARDC.set(key, img); return img;
}
function breakGlass(l, px, py, pz) {
  const g = l.gl; if (!g || g.broken) return; g.broken = true;
  if (g.snd) sfx('glass');
  if (g.shards) {
    const o = glassOpening(l), n = clamp(Math.round(l.len * (o.top - o.bot) / 700), 10, 70);
    const nx = -l.ey / l.len, ny = l.ex / l.len, side = G.p ? Math.sign((G.p.x - l.ax) * nx + (G.p.y - l.ay) * ny) || 1 : 1;
    for (let i = 0; i < n; i++) {
      const u = Math.random(), x = l.ax + l.ex * u, y = l.ay + l.ey * u, z = o.bot + Math.random() * (o.top - o.bot);
      const push = (Math.random() * 3 + 1) * (Math.random() < 0.75 ? -side : side);
      G.fx.push({ k: 'shard', x, y, z, vx: nx * push + (Math.random() - 0.5) * 2, vy: ny * push + (Math.random() - 0.5) * 2, vz: Math.random() * 3, img: shardImg(g, i), scale: 0.45, t: g.keep ? 1e9 : 70 + (Math.random() * 40 | 0), t0: 1e9 });
    }
  }
  if (G.lineUsed) G.lineUsed.add('glass' + l.idx);
}
function damageGlass(l, dmg, px, py, pz, src) {
  const g = glassLive(l); if (!g) return;
  if (g.nearOnly && src === 'player' && G.p && Math.hypot(px - G.p.x, py - G.p.y) > g.nearOnly) { glassCrackAt(l, px, py, pz, 1); if (!G.nearMsg || G.tic - G.nearMsg > 105) { G.nearMsg = G.tic; msg('Too far to break the pipe. Get closer.'); } return; }
  if (src === 'mon' && !g.monBrk) { glassCrackAt(l, px, py, pz, 1); return; }
  if (!g.brk) { if (g.snd) sfx('glasshit', 0.5); glassCrackAt(l, px, py, pz, 2); if (src === 'player' && (!g.noBrkMsg || G.tic - g.noBrkMsg > 140)) { g.noBrkMsg = G.tic; msg('Bulletproof glass: it cracks, but it never breaks.'); } return; }
  g.hp -= dmg; glassCrackAt(l, px, py, pz, dmg);
  if (g.hp <= 0) breakGlass(l, px, py, pz); else if (g.snd) sfx('glasshit', 0.8);
}
// nearest intact glass that stops bullets between two points at height z (or null)
function glassBetween(ax, ay, az, bx, by, bz) {
  let best = null, bt = 2;
  gridEach(ax, ay, bx, by, l => { const g = glassLive(l); if (!g || !g.bullets) return; const r = lineCross(ax, ay, bx, by, l); if (!r || r.t >= bt) return; const o = opening(l), z = az + (bz - az) * r.t; if (z <= o.bot || z >= o.top) return; bt = r.t; best = { l, x: ax + (bx - ax) * r.t, y: ay + (by - ay) * r.t, z }; });
  return best;
}
function glassExplode(x, y, z, radius, maxd, src) {
  gridEach(x - radius, y - radius, x + radius, y + radius, l => { const g = glassLive(l); if (!g) return; const d = distSeg(x, y, l.ax, l.ay, l.bx, l.by); if (d >= radius) return; const o = opening(l); damageGlass(l, Math.max(1, Math.round(maxd * (1 - d / radius))), x, y, clamp(z, o.bot + 4, o.top - 4), src); });
}
function tickShards() {
  for (const f of G.fx) {
    if (f.k !== 'shard' || f.rest) continue;
    f.x += f.vx; f.y += f.vy; f.z += f.vz; f.vz -= 0.9;
    const si = gSectorAt(f.x, f.y), fh = si >= 0 ? G.secs[si].fh : f.z;
    if (f.z <= fh) { f.z = fh; if (Math.abs(f.vz) < 2) { f.rest = true; } f.vz = -f.vz * 0.25; f.vx *= 0.5; f.vy *= 0.5; }
  }
}

/* ---------- editor ---------- */
function glassLabel(L) { if (!L.glass) return 'Off'; const g = glassOf(L); const p = Object.entries(GLASS_PRESETS).find(([, v]) => Object.keys(GLASS_DEF).every(k => (Object.assign({}, GLASS_DEF, v))[k] === g[k])); return 'On' + (p ? ' · ' + p[0] : ' · custom'); }
function openGlass(ls) {
  const two = ls.filter(i => M.l[i] && M.l[i].s2 >= 0);
  if (!two.length) return toast('Glass goes on a line between two areas (a two-sided line). Split a room or draw the window as its own thin sector first.', 5000);
  let g = glassOf(M.l[two[0]]) || Object.assign({}, GLASS_DEF);
  const sw = (id, label, on, help) => `<label class="chk"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}>${label}</label>${help ? `<p class="hint">${help}</p>` : ''}`;
  const num = (id, label, val, min, max, step = 1, unit = '') => `<div class="f"><label>${label} <b id="${id}V">${val}${unit}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const body = () => `
<p class="hint">Glass sits on ${two.length} line${two.length > 1 ? 's' : ''}${two.length < ls.length ? ' (one-sided walls were skipped)' : ''}. Every part below can be switched on or off. See it in <b>3D Visual</b> mode or the Demo.</p>
<div class="h">Quick looks</div><div class="row">${Object.keys(GLASS_PRESETS).map(n => `<button data-gp="${esc(n)}">${esc(n)}</button>`).join('')}</div>
<div class="h">See-through</div>${sw('gSee', 'See through it', g.see, 'Off = solid glass (like a mirror or a milky panel).')}${num('gOp', 'Glass color covers what is behind', g.op, 0, 100, 1, '%')}
<div class="h">Color</div>${sw('gTint', 'Tint the glass', g.tint)}<div class="row"><label>Glass color <input type="color" id="gCol" value="${g.col}"></label><button id="gRed">Pulse red</button><button id="gBlue">Clear blue</button></div>${sw('gPat', 'Use the line\'s middle texture as a pattern (stained glass)', g.pat, 'Pick the pattern in the Middle texture box of the line.')}
<div class="h">Reflection</div>${sw('gRefl', 'Reflects the room', g.refl, 'A real mirror image of the walls, floor and ceiling.')}${num('gRs', 'Reflection strength', g.rs, 0, 100, 1, '%')}${sw('gFres', 'Stronger when you look at it from the side', g.fres)}${num('gRd', 'How far it reflects', g.rdist, 256, 4096, 64, ' units')}${sw('gShine', 'Shine streaks', g.shine)}
<div class="h">Breaking</div>${sw('gBrk', 'Can be broken', g.brk, 'Off = bulletproof (it still cracks a little).')}${num('gHp', 'Strength (hit points)', g.hp, 1, 500)}${sw('gCrack', 'Shows cracks where it gets hit', g.crack)}${sw('gShards', 'Shards fly when it breaks', g.shards)}${sw('gKeep', 'Shards stay on the floor', g.keep)}${sw('gSnd', 'Glass sounds', g.snd)}${sw('gMonBrk', 'Monster attacks can break it', g.monBrk)}
<div class="h">Blocking</div>${sw('gBlock', 'Blocks walking (until broken)', g.block)}${sw('gBul', 'Stops bullets, fireballs and rockets (until broken)', g.bullets)}${sw('gMonSee', 'Monsters can see you through it', g.monSee)}`;
  const read = b => {
    const c = id => b.querySelector('#' + id).checked ? 1 : 0, v = id => +b.querySelector('#' + id).value;
    g = { see: c('gSee'), op: v('gOp'), tint: c('gTint'), col: b.querySelector('#gCol').value, pat: c('gPat'), refl: c('gRefl'), rs: v('gRs'), fres: c('gFres'), rdist: v('gRd'), shine: c('gShine'), brk: c('gBrk'), hp: v('gHp'), crack: c('gCrack'), shards: c('gShards'), keep: c('gKeep'), snd: c('gSnd'), monBrk: c('gMonBrk'), block: c('gBlock'), bullets: c('gBul'), monSee: c('gMonSee') };
  };
  const wire = b => {
    b.innerHTML = body();
    b.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { const u = b.querySelector('#' + r.id + 'V'); u.textContent = r.value + (r.id === 'gOp' || r.id === 'gRs' ? '%' : r.id === 'gRd' ? ' units' : ''); });
    b.querySelectorAll('[data-gp]').forEach(btn => btn.onclick = () => { g = Object.assign({}, GLASS_DEF, GLASS_PRESETS[btn.dataset.gp]); wire(b); toast(btn.dataset.gp); });
    b.querySelector('#gRed').onclick = () => { read(b); g.col = '#c4141c'; g.tint = 1; wire(b); };
    b.querySelector('#gBlue').onclick = () => { read(b); g.col = '#9fd8ff'; g.tint = 1; wire(b); };
    const sync = () => { const on = (id, en) => b.querySelectorAll('#' + id).forEach(e => { e.disabled = !en; e.closest('.f, label') && (e.closest('.f, label').style.opacity = en ? 1 : 0.45); }); const ck = id => b.querySelector('#' + id).checked; on('gOp', ck('gSee')); on('gCol', ck('gTint')); ['gRs', 'gFres', 'gRd'].forEach(i => on(i, ck('gRefl'))); ['gHp', 'gShards', 'gKeep', 'gMonBrk'].forEach(i => on(i, ck('gBrk'))); };
    b.querySelectorAll('input[type=checkbox]').forEach(c => c.onchange = sync); sync();
  };
  const holder = document.createElement('div'); wire(holder);
  modal('🪟 Glass', holder, [
    { label: 'Remove glass', fn: () => { pushUndo(); ls.forEach(i => { if (M.l[i]) delete M.l[i].glass; }); mapChanged(); toast('Glass removed'); } },
    { ok: 1, fn: b => { read(b); pushUndo(); const save = {}; Object.keys(GLASS_DEF).forEach(k => { if (g[k] !== GLASS_DEF[k]) save[k] = g[k]; }); two.forEach(i => M.l[i].glass = save); mapChanged(); toast('Glass on ' + two.length + ' line' + (two.length > 1 ? 's' : '')); } },
    { cancel: 1 }
  ]);
}

/* ---------- export (GZDoom / Boom ports): translucent middle texture + impassable while intact ---------- */
function glassPng(g) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const [r, gg, b] = hexRGB(g.tint ? g.col : '#d8e8f0'); x.fillStyle = `rgba(${r},${gg},${b},${g.see ? Math.max(0.12, g.op / 100) : 1})`; x.fillRect(0, 0, 64, 128);
  if (g.shine) { x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 2; for (let i = -128; i < 128; i += 48) { x.beginPath(); x.moveTo(i, 128); x.lineTo(i + 128, 0); x.stroke(); } }
  const bin = atob(c.toDataURL('image/png').split(',')[1]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}
// returns { lumps:[[name,u8]], line(L)->{f,sp}, mid(sideIndex)->name|null }
function glassExportPlan(lines) {
  const names = new Map(), lumps = [], sideMid = new Map(), lineMod = new Map();
  lines.forEach(L => {
    const g = glassOf(L); if (!g || L.s2 < 0) return;
    const key = [g.col, g.tint, g.see, g.op, g.shine].join('|'); let n = names.get(key);
    if (!n) { n = 'EODGLS' + String(names.size + 1).padStart(2, '0'); names.set(key, n); lumps.push([n, glassPng(g)]); }
    if (!g.pat) { sideMid.set(L.s1, n); sideMid.set(L.s2, n); }
    lineMod.set(L, { f: g.block ? (L.f | 1) : L.f, sp: L.sp || (g.see ? 260 : 0) });
  });
  return { lumps, sideMid, lineMod };
}
