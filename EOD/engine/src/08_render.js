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
    lines.push({ idx, ax: a.x, ay: a.y, bx: b.x, by: b.y, ex: b.x - a.x, ey: b.y - a.y, len: Math.hypot(b.x - a.x, b.y - a.y), s1: side(L.s1), s2: side(L.s2), f: L.f, sp: L.sp, tag: L.tag });
  });
  const flats = secs.map(s => ({ f: s.ft === 'F_SKY1' ? null : getTex(s.ft, true), c: s.ct === 'F_SKY1' ? null : getTex(s.ct, true) }));
  return { lines, secs, flats };
}
function refreshSideTex(sc, li) { const l = sc.lines.find(x => x.idx === li); if (!l) return; for (const s of [l.s1, l.s2]) { if (!s) continue; const d = M.sd[s.si]; Object.assign(s, { up: d.up, mid: d.mid, lo: d.lo, upT: d.up !== '-' ? getTex(d.up) : null, midT: d.mid !== '-' ? getTex(d.mid) : null, loT: d.lo !== '-' ? getTex(d.lo) : null }); } }
const HT = new Float32Array(8192), HU = new Float32Array(8192), HI = new Int32Array(8192), HD = new Float32Array(8192), ORD = new Int32Array(8192);
function shadeLvl(light, d) { const f = (light / 255) * 1.35 - d / 2200; return f <= 0.06 ? 0 : f >= 1 ? 15 : (f * 15) | 0; }
function render3D(cam, sc, sprites) {
  const W = R.W, H = R.H, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi;
  const hz = H / 2 + (cam.pitch || 0), proj = Math.max(W * 0.5, H * 0.42), plane = (W / 2) / proj;
  const ca = Math.cos(cam.a), sa = Math.sin(cam.a), L = sc.lines, n = Math.min(L.length, 8192), secs = sc.secs;
  const sky = getSky(), cz = cam.z, px = cam.x, py = cam.y;
  for (let x = 0; x < W; x++) {
    const cx = (2 * (x + 0.5) / W - 1) * plane, rdx = ca + sa * cx, rdy = sa - ca * cx;
    let nh = 0;
    for (let i = 0; i < n; i++) {
      const l = L[i], ex = l.ex, ey = l.ey, den = rdx * ey - rdy * ex;
      if (den > -1e-9 && den < 1e-9) continue;
      const wx = l.ax - px, wy = l.ay - py, t = (wx * ey - wy * ex) / den;
      if (t <= 0.05) continue;
      const u = (wx * rdy - wy * rdx) / den; if (u < 0 || u > 1) continue;
      HT[nh] = t; HU[nh] = u; HI[nh] = i; HD[nh] = den; ORD[nh] = nh; nh++;
    }
    for (let i = 1; i < nh; i++) { const k = ORD[i], tk = HT[k]; let j = i - 1; while (j >= 0 && HT[ORD[j]] > tk) { ORD[j + 1] = ORD[j]; j--; } ORD[j + 1] = k; }
    let top = 0, bot = H - 1, cur = cam.sec, solid = false;
    const skyCol = ((Math.atan2(rdy, rdx) * -163) | 0) & 255;
    for (let h = 0; h < nh && top <= bot; h++) {
      const k = ORD[h], l = L[HI[k]], t = HT[k], u = HU[k], front = HD[k] < 0;
      const near = front ? l.s1 : l.s2, far = front ? l.s2 : l.s1;
      const ns = near ? near.sec : cur; if (ns < 0 || !secs[ns]) break;
      const S0 = secs[ns], pr = proj / t, li = S0.li;
      const yc = hz - (S0.ch - cz) * pr, yf = hz - (S0.fh - cz) * pr;
      const y0 = Math.max(top, Math.ceil(yc)), y1 = Math.min(bot, Math.ceil(yf) - 1);
      // ceiling + floor of the near sector up to this line
      plane3(x, top, Math.min(bot, Math.ceil(yc) - 1), S0.ch, sc.flats[ns].c, li, rdx, rdy, cam, hz, proj, true, ns, sky, skyCol);
      plane3(x, Math.max(top, Math.ceil(yf)), bot, S0.fh, sc.flats[ns].f, li, rdx, rdy, cam, hz, proj, false, ns, sky, skyCol);
      const side = near || l.s1; const tu = u * l.len + (side ? side.xo : 0);
      const lvl = shadeLvl(li, t);
      if (!far) {
        const tex = side && side.midT; const ref = (l.f & 16) ? S0.fh + (tex ? tex.h : 128) : S0.ch;
        wall3(x, y0, y1, tex, tu, ref + (side ? side.yo : 0), cz, hz, t, proj, lvl, 2, l.idx);
        solid = true; break;
      }
      const F = secs[far.sec]; if (!F) break;
      const yfc = hz - (F.ch - cz) * pr, yff = hz - (F.fh - cz) * pr;
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
}
function plane3(x, ya, yb, h, tex, li, rdx, rdy, cam, hz, proj, ceil, si, sky, skyCol) {
  if (ya > yb) return;
  const W = R.W, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi;
  if (!tex) { // sky
    const sp = sky.shade(15), sh = R.H;
    for (let y = ya; y <= yb; y++) { const o = y * W + x; const v = clamp(((y - hz + sh * 0.6) * 128 / sh) | 0, 0, 127); buf[o] = sp[v * 256 + skyCol]; dep[o] = 1e9; pk[o] = ceil ? 5 : 4; pi[o] = si; }
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
  const sp = tex.shade(lvl), tw = tex.w, th = tex.h, col = Math.floor(tu) & (tw - 1);
  const step = t / proj; let z = cz - (ya + 0.5 - hz) * step;
  for (let y = ya; y <= yb; y++, z -= step) {
    const v = Math.floor(ref - z) & (th - 1); const o = y * W + x;
    buf[o] = sp[v * tw + col]; dep[o] = t; pk[o] = kind; pi[o] = idx;
  }
}
// sprites: [{x,y,z,img,flip,bright,fuzz,id}]
function drawSprites(cam, list, hz, proj) {
  const W = R.W, H = R.H, buf = R.buf, dep = R.dep, pk = R.pk, pi = R.pi, ca = Math.cos(cam.a), sa = Math.sin(cam.a);
  const vis = [];
  for (const s of list) { const dx = s.x - cam.x, dy = s.y - cam.y, d = dx * ca + dy * sa; if (d < 4) continue; vis.push([d, dx * sa - dy * ca, s]); }
  vis.sort((a, b) => b[0] - a[0]);
  const tic = (performance.now() / 50) | 0;
  for (const [d, side, s] of vis) {
    const img = s.img; if (!img) continue;
    const sc = proj / d, sw = img.w * sc, sh = img.h * sc, sx = W / 2 + side * sc, x0 = sx - sw / 2;
    const yt = hz - (s.z + img.h - cam.z) * sc;
    const xa = Math.max(0, Math.ceil(x0)), xb = Math.min(W - 1, Math.floor(x0 + sw)), ya = Math.max(0, Math.ceil(yt)), yb = Math.min(H - 1, Math.floor(yt + sh));
    if (xa > xb || ya > yb) continue;
    const sp = img.shade(s.bright ? 15 : shadeLvl(s.light || 160, d)), iw = img.w, ih = img.h;
    for (let x = xa; x <= xb; x++) {
      let u = ((x - x0) / sw * iw) | 0; if (s.flip) u = iw - 1 - u; if (u < 0 || u >= iw) continue;
      for (let y = ya; y <= yb; y++) {
        const o = y * W + x; if (dep[o] < d) continue;
        if (s.fuzz && ((x + y + tic) & 1)) continue;
        const v = ((y - yt) / sh * ih) | 0; if (v < 0 || v >= ih) continue;
        const c = sp[v * iw + u]; if (!c) continue;
        buf[o] = s.fuzz ? 0xff000000 : c; dep[o] = d; pk[o] = 6; pi[o] = s.id == null ? -1 : s.id;
      }
    }
  }
}
