/* ================= 3D RENDERER (column raycaster over linedefs, Doom-style portals) ================= */
const R = { W: 0, H: 0 };
function rSetup(w, h) {
  if (R.W === w && R.H === h) return;
  R.W = w; R.H = h; R.cv = document.createElement('canvas'); R.cv.width = w; R.cv.height = h;
  R.ctx = R.cv.getContext('2d'); R.img = R.ctx.createImageData(w, h); R.buf = new Uint32Array(R.img.data.buffer);
  R.dep = new Float32Array(w * h); R.pk = new Uint8Array(w * h); R.pi = new Int32Array(w * h);
}
// scene: static per-play snapshot of lines with resolved textures; secs = live sector array (heights change)
function buildScene(secs) {
  const lines = [];
  M.l.forEach((L, idx) => {
    if (L.s1 < 0) return; const a = M.v[L.v1], b = M.v[L.v2];
    const side = s => { if (s < 0) return null; const d = M.sd[s]; return { sec: d.sec, si: s, xo: d.xo, yo: d.yo, up: d.up, mid: d.mid, lo: d.lo, upT: d.up !== '-' ? getTex(d.up) : null, midT: d.mid !== '-' ? getTex(d.mid) : null, loT: d.lo !== '-' ? getTex(d.lo) : null }; };
    lines.push({ idx, ax: a.x, ay: a.y, bx: b.x, by: b.y, ex: b.x - a.x, ey: b.y - a.y, len: Math.hypot(b.x - a.x, b.y - a.y), s1: side(L.s1), s2: side(L.s2), f: L.f, sp: L.sp, tag: L.tag, gl: glassInit(L) });
  });
  return { lines, secs };
}
function refreshSideTex(sc, li) { const l = sc.lines.find(x => x.idx === li); if (!l) return; for (const s of [l.s1, l.s2]) { if (!s) continue; const d = M.sd[s.si]; Object.assign(s, { up: d.up, mid: d.mid, lo: d.lo, upT: d.up !== '-' ? getTex(d.up) : null, midT: d.mid !== '-' ? getTex(d.mid) : null, loT: d.lo !== '-' ? getTex(d.lo) : null }); } }
let HT = new Float32Array(8192), HU = new Float32Array(8192), HI = new Int32Array(8192), HD = new Float32Array(8192), ORD = new Int32Array(8192);
let BX0 = new Int32Array(0), BX1 = new Int32Array(0), BCNT = new Int32Array(0), BOFF = new Int32Array(0), BLIST = new Int32Array(0);
function shadeLvl(light, d) { const f = (light / 255) * 1.35 - d / 2200; return f <= 0.06 ? 0 : f >= 1 ? 15 : (f * 15) | 0; }
// per frame: which lines can be hit in which screen columns (keeps big community maps fast)
function bucketLines(cam, L, W, proj) {
  const n = L.length, ca = Math.cos(cam.a), sa = Math.sin(cam.a), NEAR = 0.05, half = W / 2;
  if (BX0.length < n) { BX0 = new Int32Array(n); BX1 = new Int32Array(n); }
  if (BCNT.length < W + 1) { BCNT = new Int32Array(W + 1); BOFF = new Int32Array(W + 1); }
  BCNT.fill(0); let total = 0;
  for (let i = 0; i < n; i++) {
    const l = L[i]; let ax = l.ax - cam.x, ay = l.ay - cam.y, bx = l.bx - cam.x, by = l.by - cam.y;
    let da = ax * ca + ay * sa, db = bx * ca + by * sa, sa_ = ax * sa - ay * ca, sb_ = bx * sa - by * ca;
    if (da < NEAR && db < NEAR) { BX0[i] = 1; BX1[i] = 0; continue; }
    if (da < NEAR) { const t = (NEAR - da) / (db - da); sa_ += (sb_ - sa_) * t; da = NEAR; }
    else if (db < NEAR) { const t = (NEAR - db) / (da - db); sb_ += (sa_ - sb_) * t; db = NEAR; }
    const xa = half + sa_ / da * proj, xb = half + sb_ / db * proj;
    let lo = Math.floor(Math.min(xa, xb)) - 1, hi = Math.ceil(Math.max(xa, xb)) + 1;
    if (lo < 0) lo = 0; if (hi > W - 1) hi = W - 1; if (lo > hi) { BX0[i] = 1; BX1[i] = 0; continue; }
    BX0[i] = lo; BX1[i] = hi; for (let x = lo; x <= hi; x++) BCNT[x]++; total += hi - lo + 1;
  }
  if (BLIST.length < total) BLIST = new Int32Array(Math.ceil(total * 1.3) + 64);
  let acc = 0; for (let x = 0; x < W; x++) { BOFF[x] = acc; acc += BCNT[x]; } BOFF[W] = acc;
  const fill = BCNT; fill.fill(0);
  for (let i = 0; i < n; i++) { const lo = BX0[i], hi = BX1[i]; for (let x = lo; x <= hi; x++) BLIST[BOFF[x] + fill[x]++] = i; }
}
// Vanilla limits estimate (visplanes / drawsegs / sprites) — only when the check is switched on
const LIM = { on: false, keys: new Map(), segStamp: new Int32Array(0), frame: 0, segs: 0, sprites: 0, visplanes: 0 };
let texIdN = 0;
function limPlane(x, h, tex, light, ceil) {
  const key = tex ? (h + '|' + (tex.id || (tex.id = ++texIdN)) + '|' + light) : 'sky';
  const r = LIM.keys.get(key);
  if (!r) LIM.keys.set(key, { col: x, n: 1, max: 1 });
  else if (r.col === x) { r.n++; if (r.n > r.max) r.max = r.n; }
  else { r.col = x; r.n = 1; }
}
function render3D(cam, sc, sprites) {
  if (LIM.on) { LIM.keys.clear(); LIM.frame++; LIM.segs = 0; if (LIM.segStamp.length < sc.lines.length) LIM.segStamp = new Int32Array(sc.lines.length); }
  const W = R.W, H = R.H, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi;
  const hz = H / 2 + (cam.pitch || 0), proj = Math.max(W * 0.5, H * 0.42), plane = (W / 2) / proj;
  const ca = Math.cos(cam.a), sa = Math.sin(cam.a), L = sc.lines, secs = sc.secs;
  const sky = getSky(), cz = cam.z, px = cam.x, py = cam.y, tic = (performance.now() / 28.57) | 0;
  const flats = secs.map(s => ({ f: s.ft === 'F_SKY1' ? null : getTex(animFlat(s.ft, tic), true), c: s.ct === 'F_SKY1' ? null : getTex(animFlat(s.ct, tic), true) }));
  bucketLines(cam, L, W, proj); GLN = 0;
  for (let x = 0; x < W; x++) {
    const cx = (2 * (x + 0.5) / W - 1) * plane, rdx = ca + sa * cx, rdy = sa - ca * cx;
    let nh = 0; const b0 = BOFF[x], b1 = BOFF[x + 1];
    if (b1 - b0 > HT.length) { const m = (b1 - b0) * 2; HT = new Float32Array(m); HU = new Float32Array(m); HI = new Int32Array(m); HD = new Float32Array(m); ORD = new Int32Array(m); }
    for (let q = b0; q < b1; q++) {
      const i = BLIST[q], l = L[i], ex = l.ex, ey = l.ey, den = rdx * ey - rdy * ex;
      if (den > -1e-9 && den < 1e-9) continue;
      const wx = l.ax - px, wy = l.ay - py, t = (wx * ey - wy * ex) / den;
      if (t <= 0.05) continue;
      const u = (wx * rdy - wy * rdx) / den; if (u < 0 || u > 1) continue;
      HT[nh] = t; HU[nh] = u; HI[nh] = i; HD[nh] = den; ORD[nh] = nh; nh++;
    }
    for (let i = 1; i < nh; i++) { const k = ORD[i], tk = HT[k]; let j = i - 1; while (j >= 0 && HT[ORD[j]] > tk) { ORD[j + 1] = ORD[j]; j--; } ORD[j + 1] = k; }
    let top = 0, bot = H - 1, cur = cam.sec, solid = false;
    const skyCol = (Math.atan2(rdy, rdx) * -163) | 0;
    for (let h = 0; h < nh && top <= bot; h++) {
      const k = ORD[h], l = L[HI[k]], t = HT[k], u = HU[k], front = HD[k] < 0;
      const near = front ? l.s1 : l.s2, far = front ? l.s2 : l.s1;
      const ns = near ? near.sec : cur; if (ns < 0 || !secs[ns]) break;
      const S0 = secs[ns], pr = proj / t, li = S0.li;
      if (LIM.on && LIM.segStamp[HI[k]] !== LIM.frame) { LIM.segStamp[HI[k]] = LIM.frame; LIM.segs++; }
      const yc = hz - (S0.ch - cz) * pr, yf = hz - (S0.fh - cz) * pr;
      const y0 = Math.max(top, Math.ceil(yc)), y1 = Math.min(bot, Math.ceil(yf) - 1);
      plane3(x, top, Math.min(bot, Math.ceil(yc) - 1), S0.ch, flats[ns].c, li, rdx, rdy, cam, hz, proj, true, ns, sky, skyCol);
      plane3(x, Math.max(top, Math.ceil(yf)), bot, S0.fh, flats[ns].f, li, rdx, rdy, cam, hz, proj, false, ns, sky, skyCol);
      const side = near || l.s1; const tu = u * l.len + (side ? side.xo : 0);
      const lvl = shadeLvl(li, t);
      if (!far) {
        const tex = side && side.midT; const ref = (l.f & 16) ? S0.fh + (tex ? tex.h : 128) : S0.ch;
        wall3(x, y0, y1, tex, tu, ref + (side ? side.yo : 0), cz, hz, t, proj, lvl, 2, l.idx);
        solid = true; break;
      }
      const F = secs[far.sec]; if (!F) break;
      const yfc = hz - (F.ch - cz) * pr, yff = hz - (F.fh - cz) * pr;
      if (l.gl && !l.gl.broken) { const ga = Math.max(top, Math.ceil(Math.max(yc, yfc))), gb = Math.min(bot, Math.ceil(Math.min(yf, yff)) - 1); if (ga <= gb) glassRec(x, ga, gb, t, u, HI[k], ns, rdx, rdy); }
      const skyBoth = S0.ct === 'F_SKY1' && F.ct === 'F_SKY1';
      if (F.ch < S0.ch) {
        const a0 = y0, a1 = Math.min(bot, Math.ceil(yfc) - 1);
        if (skyBoth) plane3(x, a0, a1, S0.ch, null, li, rdx, rdy, cam, hz, proj, true, ns, sky, skyCol);
        else { const tex = side && side.upT; const ref = (l.f & 8) ? S0.ch : F.ch + (tex ? tex.h : 128); wall3(x, a0, a1, tex, tu, ref + (side ? side.yo : 0), cz, hz, t, proj, lvl, 1, l.idx); }
      }
      if (F.fh > S0.fh) {
        const a0 = Math.max(top, Math.ceil(yff)), tex = side && side.loT; const ref = (l.f & 16) ? S0.ch : F.fh;
        wall3(x, a0, y1, tex, tu, ref + (side ? side.yo : 0), cz, hz, t, proj, lvl, 3, l.idx);
      }
      top = Math.max(top, Math.ceil(Math.max(yc, yfc)));
      bot = Math.min(bot, Math.ceil(Math.min(yf, yff)) - 1);
      cur = far.sec;
    }
    if (!solid) for (let y = top; y <= bot; y++) { const o = y * W + x; buf[o] = 0xff000000; dep[o] = 1e9; pk[o] = 0; }
  }
  if (sprites) drawSprites(cam, sprites, hz, proj);
  glassComposite(cam, sc, hz, proj, flats, sky);
  if (LIM.on) { let v = 0; for (const r of LIM.keys.values()) v += r.max; LIM.visplanes = v; }
}
function plane3(x, ya, yb, h, tex, li, rdx, rdy, cam, hz, proj, ceil, si, sky, skyCol) {
  if (ya > yb) return;
  if (LIM.on) limPlane(x, h, tex, li, ceil);
  const W = R.W, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi;
  if (!tex) { // sky
    const sp = sky.shade(15), sh = R.H, sw = sky.w, sth = sky.h, col = ((skyCol % sw) + sw) % sw;
    for (let y = ya; y <= yb; y++) { const o = y * W + x; const v = clamp(((y - hz + sh * 0.6) * sth / sh) | 0, 0, sth - 1); buf[o] = sp[v * sw + col]; dep[o] = 1e9; pk[o] = ceil ? 5 : 4; pi[o] = si; }
    return;
  }
  const dz = ceil ? h - cam.z : cam.z - h; if (dz <= 0) return;
  const tp = tex.px; let lastL = -1, sp = null;
  for (let y = ya; y <= yb; y++) {
    const dy = ceil ? (hz - (y + 0.5)) : ((y + 0.5) - hz); if (dy <= 0) continue;
    const d = dz * proj / dy; const wx = cam.x + rdx * d, wy = cam.y + rdy * d;
    const l = shadeLvl(li, d); if (l !== lastL) { sp = tex.shade(l); lastL = l; }
    const o = y * W + x; buf[o] = sp[((Math.floor(-wy) & 63) << 6) | (Math.floor(wx) & 63)]; dep[o] = d; pk[o] = ceil ? 5 : 4; pi[o] = si;
    void tp;
  }
}
function wall3(x, ya, yb, tex, tu, ref, cz, hz, t, proj, lvl, kind, idx) {
  if (ya > yb) return;
  const W = R.W, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi;
  if (!tex) { for (let y = ya; y <= yb; y++) { const o = y * W + x; buf[o] = 0xff202020; dep[o] = t; pk[o] = kind; pi[o] = idx; } return; }
  const sp = tex.shade(lvl), tw = tex.w, th = tex.h, col = ((Math.floor(tu) % tw) + tw) % tw;
  const step = t / proj; let z = cz - (ya + 0.5 - hz) * step;
  for (let y = ya; y <= yb; y++, z -= step) {
    let v = Math.floor(ref - z) % th; if (v < 0) v += th; const o = y * W + x;
    buf[o] = sp[v * tw + col]; dep[o] = t; pk[o] = kind; pi[o] = idx;
  }
}
// sprites: [{x,y,z,img,flip,bright,fuzz,id}]
function drawSprites(cam, list, hz, proj) {
  const W = R.W, H = R.H, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi, ca = Math.cos(cam.a), sa = Math.sin(cam.a);
  const vis = [];
  for (const s of list) { const dx = s.x - cam.x, dy = s.y - cam.y, d = dx * ca + dy * sa; if (d < 4) continue; vis.push([d, dx * sa - dy * ca, s]); }
  vis.sort((a, b) => b[0] - a[0]); if (LIM.on) LIM.sprites = 0;
  const tic = (performance.now() / 50) | 0;
  for (const [d, side, s] of vis) {
    const img = s.img; if (!img) continue;
    const sc = proj / d * (s.scale || 1), sw = img.w * sc, sh = img.h * sc, sx = W / 2 + side * (proj / d);
    const ox = img.ox != null ? img.ox : img.w / 2, oy = img.oy != null ? img.oy : img.h;
    const x0 = s.flip ? sx - (img.w - ox) * sc : sx - ox * sc;
    const yt = hz - (s.z - cam.z) * (proj / d) - oy * sc;
    const xa = Math.max(0, Math.ceil(x0)), xb = Math.min(W - 1, Math.floor(x0 + sw)), ya = Math.max(0, Math.ceil(yt)), yb = Math.min(H - 1, Math.floor(yt + sh));
    if (xa > xb || ya > yb) continue;
    let drew = false;
    const sp = img.shade(s.bright ? 15 : shadeLvl(s.light || 160, d)), iw = img.w, ih = img.h;
    for (let x = xa; x <= xb; x++) {
      let u = ((x - x0) / sw * iw) | 0; if (s.flip) u = iw - 1 - u; if (u < 0 || u >= iw) continue;
      for (let y = ya; y <= yb; y++) {
        const o = y * W + x; if (dep[o] < d) continue;
        if (s.fuzz && ((x + y + tic) & 1)) continue;
        const v = ((y - yt) / sh * ih) | 0; if (v < 0 || v >= ih) continue;
        const c = sp[v * iw + u]; if (!c) continue;
        buf[o] = s.fuzz ? 0xff000000 : c; dep[o] = d; pk[o] = 6; pi[o] = s.id == null ? -1 : s.id; drew = true;
      }
    }
    if (LIM.on && drew) LIM.sprites++;
  }
}
