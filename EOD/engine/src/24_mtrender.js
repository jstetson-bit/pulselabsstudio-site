/* ================= MULTI-CORE 3D VIEW =================
   The 3D view is drawn one screen column at a time, and every column is independent.
   So the screen is cut into vertical strips and each strip is drawn by its own worker
   (one per spare CPU core). The workers run the very same render functions as the
   single-core path: their source is copied from this page when the workers start, so
   the two can never drift apart. Each worker hands back its strip as an ImageBitmap,
   which the main thread just pastes; nothing big is copied per frame.
   Textures and sprite pictures go to the workers once (by id) and stay there. */
const MT = { ws: [], n: 0, busy: false, failed: false, texId: new WeakMap(), texN: 0, sent: new Set(), sc: null, sceneV: 0, lineSig: null, strips: null, pending: 0, t0: 0, ms: 0, center: null, gen: 0 };

function mtThreads() { return Math.max(2, Math.min(8, (navigator.hardwareConcurrency || 4) - 1)); }
function mtWanted() {
  return !MT.failed && S.threads !== 'off' && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined'
    && (S.threads === 'on' || (navigator.hardwareConcurrency || 2) >= 3) && !LIM.on && R.W * R.H >= (S.threads === 'on' ? 0 : 300000);
}
function mtSource() {
  const fns = [shadeLvl, texObj, bucketLines, limPlane, render3D, plane3, wall3, drawSprites, glassRec, reflectHits, texAt, reflSample, glassComposite, glassLive];
  return `'use strict';
const clamp = ${clamp.toString()};
const R = { W: 0, H: 0, x0: 0, x1: 0, buf: null, dep: null, pk: null, pi: null };
let HT = new Float32Array(8192), HU = new Float32Array(8192), HI = new Int32Array(8192), HD = new Float32Array(8192), ORD = new Int32Array(8192);
let BX0 = new Int32Array(0), BX1 = new Int32Array(0), BCNT = new Int32Array(0), BOFF = new Int32Array(0), BLIST = new Int32Array(0);
const LIM = { on: false, keys: new Map(), segStamp: new Int32Array(0), frame: 0, segs: 0, sprites: 0, visplanes: 0 }; let texIdN = 0;
let GLN = 0, GX = new Int32Array(1024), GA = new Int32Array(1024), GB = new Int32Array(1024), GT = new Float32Array(1024), GU = new Float32Array(1024), GI = new Int32Array(1024), GS = new Int32Array(1024), GRX = new Float32Array(1024), GRY = new Float32Array(1024);
let RHS = new Float32Array(64), RHU = new Float32Array(64), RHI = new Int32Array(64), RHD = new Float32Array(64), RHN = 0, RSTAMP = new Int32Array(0), RST = 0;
const GCS = ${GCS};
let G = null, GLAST = null;
const TX = new Map(), GRAY = texObj(8, 8, new Uint32Array(64).fill(0xff505050));
function getSky() { return GRAY; }
function getTex() { return GRAY; }
function rTranspose() { }
${fns.map(f => f.toString()).join('\n')}
let L = [], SC = { lines: L, secs: [] }, OC = null, OX = null, OIMG = null;
const tx = id => id < 0 ? null : (TX.get(id) || GRAY);
function side(s) { return s ? { sec: s[0], xo: s[1], yo: s[2], upT: tx(s[3]), midT: tx(s[4]), loT: tx(s[5]) } : null; }
onmessage = e => {
  const m = e.data;
  for (const t of m.tex || []) { const o = texObj(t.w, t.h, t.px); if (t.ox != null) { o.ox = t.ox; o.oy = t.oy; } TX.set(t.id, o); }
  if (m.scene) { L = m.scene.map(a => ({ idx: a[0], ax: a[1], ay: a[2], bx: a[3], by: a[4], ex: a[3] - a[1], ey: a[4] - a[2], len: Math.hypot(a[3] - a[1], a[4] - a[2]), f: a[5], s1: side(a[6]), s2: side(a[7]), gl: null })); SC.lines = L; }
  for (const [i, s1, s2] of m.sides || []) { const l = L[i]; if (l) { l.s1 = side(s1); l.s2 = side(s2); } }
  if (!m.frame) return;
  const f = m.frame, W = f.W, H = f.H, sw = f.x1 - f.x0;
  for (const l of L) l.gl = null; for (const [i, g] of f.glass) if (L[i]) L[i].gl = g;
  if (!R.buf || R.buf.length !== sw * H) { R.buf = new Uint32Array(sw * H); R.dep = new Float32Array(sw * H); R.pk = new Uint8Array(sw * H); R.pi = new Int32Array(sw * H); }
  R.W = W; R.H = H; R.x0 = f.x0; R.x1 = f.x1;
  const secs = f.secs; G = { secs }; SC.secs = secs;
  const flats = f.flats.map(([a, b]) => ({ f: tx(a), c: tx(b) }));
  const sprites = f.sprites.map(s => (s.img = TX.get(s.img), s)).filter(s => s.img);
  const t0 = performance.now();
  render3D({ x: f.x, y: f.y, z: f.z, a: f.a, sec: f.sec, pitch: f.pitch, tic: f.tic, sky: tx(f.sky) || GRAY, flats }, SC, sprites);
  if (!OC || OC.width !== sw || OC.height !== H) { OC = new OffscreenCanvas(sw, H); OX = OC.getContext('2d'); OIMG = OX.createImageData(sw, H); }
  const out = new Uint32Array(OIMG.data.buffer), src = R.buf, B = 32;
  for (let x0 = 0; x0 < sw; x0 += B) { const x1 = Math.min(sw, x0 + B); for (let y0 = 0; y0 < H; y0 += B) { const y1 = Math.min(H, y0 + B); for (let y = y0; y < y1; y++) { let d = y * sw + x0, o = x0 * H + y; for (let x = x0; x < x1; x++, o += H) out[d++] = src[o]; } } }
  OX.putImageData(OIMG, 0, 0);
  const bmp = OC.transferToImageBitmap(), cx = W >> 1;
  let center = null; if (cx >= f.x0 && cx < f.x1) { const o = (cx - f.x0) * H + (H >> 1); center = { pk: R.pk[o], pi: R.pi[o] }; }
  postMessage({ gen: f.gen, x0: f.x0, W, H, bmp, ms: performance.now() - t0, center }, [bmp]);
};`;
}
function mtStart() {
  if (MT.ws.length) return true;
  try {
    const url = URL.createObjectURL(new Blob([mtSource()], { type: 'text/javascript' }));
    MT.n = mtThreads();
    for (let i = 0; i < MT.n; i++) { const w = new Worker(url); w.onmessage = mtResult; w.onerror = e => mtFail('worker: ' + (e.message || e)); MT.ws.push(w); }
    MT.sent = new Set(); MT.sc = null; MT.busy = false; return true;
  } catch (e) { mtFail(e.message); return false; }
}
function mtFail(why) { logCrash && logCrash('multi-core view off: ' + why); MT.failed = true; mtStop(); }
function mtStop() { MT.ws.forEach(w => w.terminate()); MT.ws = []; MT.busy = false; MT.strips = null; MT.sc = null; }
function mtId(o) { let id = MT.texId.get(o); if (id == null) { id = ++MT.texN; MT.texId.set(o, id); } return id; }
function mtTex(o, list) { if (!o || !o.px) return -1; const id = mtId(o); if (!MT.sent.has(id)) { MT.sent.add(id); list.push({ id, w: o.w, h: o.h, px: o.px.slice(), ox: o.ox, oy: o.oy }); } return id; }
function mtSide(s, list) { return s ? [s.sec, s.xo || 0, s.yo || 0, mtTex(s.upT, list), mtTex(s.midT, list), mtTex(s.loT, list)] : null; }
/* send this frame to every worker (each gets its own strip) */
function mtPost(cam, sprites) {
  const sc = G.sc, tex = [], msg = {};
  if (MT.sc !== sc) {
    MT.sc = sc; msg.scene = sc.lines.map(l => [l.idx, l.ax, l.ay, l.bx, l.by, l.f, mtSide(l.s1, tex), mtSide(l.s2, tex)]);
    MT.lineSig = sc.lines.map(l => [l.s1 && l.s1.upT, l.s1 && l.s1.midT, l.s1 && l.s1.loT, l.s2 && l.s2.upT, l.s2 && l.s2.midT, l.s2 && l.s2.loT]);
  } else {
    // switches and edits change wall textures: resend only the lines that changed
    const sides = [];
    sc.lines.forEach((l, i) => { const g = MT.lineSig[i], a = [l.s1 && l.s1.upT, l.s1 && l.s1.midT, l.s1 && l.s1.loT, l.s2 && l.s2.upT, l.s2 && l.s2.midT, l.s2 && l.s2.loT]; for (let k = 0; k < 6; k++) if (a[k] !== g[k]) { MT.lineSig[i] = a; sides.push([i, mtSide(l.s1, tex), mtSide(l.s2, tex)]); break; } });
    if (sides.length) msg.sides = sides;
  }
  const tic = (performance.now() / 28.57) | 0;
  const flats = sc.secs.map(s => [s.ft === 'F_SKY1' ? -1 : mtTex(getTex(animFlat(s.ft, tic), true), tex), s.ct === 'F_SKY1' ? -1 : mtTex(getTex(animFlat(s.ct, tic), true), tex)]);
  const secs = sc.secs.map(s => ({ fh: s.fh, ch: s.ch, li: s.li, ft: s.ft, ct: s.ct, sx: s.sx || 0, sy: s.sy || 0 }));
  const sky = mtTex(getSky(), tex);
  const spr = sprites.map(s => ({ x: s.x, y: s.y, z: s.z, img: mtTex(s.img, tex), flip: s.flip, bright: s.bright, fuzz: s.fuzz, scale: s.scale, light: s.light, id: s.id }));
  const glass = []; sc.lines.forEach((l, i) => { if (l.gl) glass.push([i, l.gl]); });
  const W = R.W, H = R.H, n = MT.ws.length, gen = ++MT.gen;
  MT.pending = n; MT.busy = true; MT.t0 = performance.now(); MT.strips = []; MT.center = MT.center || null;
  for (let i = 0; i < n; i++) {
    const x0 = Math.floor(W * i / n), x1 = Math.floor(W * (i + 1) / n);
    const m = { frame: { gen, W, H, x0, x1, x: cam.x, y: cam.y, z: cam.z, a: cam.a, sec: cam.sec, pitch: cam.pitch, tic, sky, flats, secs, sprites: spr, glass } };
    if (i === 0) Object.assign(m, msg, { tex }); else { if (msg.scene) m.scene = msg.scene; if (msg.sides) m.sides = msg.sides; m.tex = tex; }
    MT.ws[i].postMessage(m);
  }
}
function mtResult(e) {
  const r = e.data;
  if (r.gen !== MT.gen) { r.bmp.close(); return; }
  if (r.W === R.W && r.H === R.H) MT.strips.push(r); else r.bmp.close();
  if (r.center) MT.center = r.center;
  MT.ms = Math.max(MT.ms * 0, r.ms);
  if (--MT.pending === 0) {
    // paste the finished strips onto the 3D view canvas
    for (const s of MT.strips) { R.ctx.drawImage(s.bmp, s.x0, 0); s.bmp.close(); }
    MT.strips = []; MT.busy = false;
    autoRes(performance.now() - MT.t0);
  }
}
/* returns true when the multi-core path drew (or is drawing) this frame */
function mtDraw(cam, sprites) {
  if (!mtWanted()) { if (MT.ws.length) mtStop(); return false; }
  if (!mtStart()) return false;
  if (!MT.busy) mtPost(cam, sprites);
  return true;
}
function viewCenter() { return MT.ws.length && MT.center ? MT.center : { pk: R.pk[(R.W >> 1) * R.H + (R.H >> 1)], pi: R.pi[(R.W >> 1) * R.H + (R.H >> 1)] }; }
