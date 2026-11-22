/* ================= CLASSIC STATUS BAR + MARINE FACE =================
   Uses Freedoom's own status bar art (BSD): STBAR, big red numbers, weapon numbers, keys, and the
   marine face that gets bloodier in 5 stages, looks around, turns toward whoever hurt you,
   grimaces on big hits, grins when you grab a weapon, rages when you hold the trigger, and dies.
   Falls back to the simple bar when the art pack is off. */
const SBPIC = new Map();
function sbPic(name) {
  if (SBPIC.has(name)) return SBPIC.get(name);
  let pic = null; if (resPal()) { const b = findPatch(name, 0); if (b) { const t = decodePicture(b); if (t) pic = { img: t, c: spriteCanvas(t) }; } }
  if (pic || resPal()) SBPIC.set(name, pic); return pic;
}
function sbReady() { return !!(RES.packs.length && resPal() && sbPic('STBAR') && sbPic('STFST00')); }
// height of the status bar on screen; weapons and the automap sit above it
function hudHeight(W, H) {
  const u = Math.max(1, Math.round(W / 320));
  if (S.statusBar !== 'slim' && G && G.mode === 'play' && (sbReady() || hudModern())) return Math.round(32 * sbScale(W, H));
  return 20 * u;
}
function sbScale(W, H) { const mode = !S.statusBar || S.statusBar === 'auto' ? (innerHeight < 560 ? 'compact' : 'classic') : S.statusBar; const big = { classic: 0.2, compact: 0.13 }[mode] || 0.2; return Math.min(W / 320, H * big / 32); }
/* ---- face brain (runs every tic) ---- */
function faceLevel(p) { return clamp(Math.floor((100 - clamp(p.hp, 0, 100)) * 5 / 101), 0, 4); }
function faceHurt(dmg, src) {
  if (!G || !G.p) return; const p = G.p, f = G.face || (G.face = {});
  if (dmg >= 20) { f.kind = 'OUCH'; f.until = G.tic + 35; return; }
  if (src && src.x != null) {
    let d = Math.atan2(src.y - p.y, src.x - p.x) - p.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    f.kind = Math.abs(d) < 0.5 ? 'KILL' : d > 0 ? 'TL' : 'TR';
  } else f.kind = 'KILL';
  f.until = G.tic + 35;
}
function faceGrin() { if (!G || !G.p) return; const f = G.face || (G.face = {}); f.kind = 'EVL'; f.until = G.tic + 70; }
function faceTick() {
  const p = G.p, f = G.face || (G.face = { look: 0, next: 0 });
  p.fireHeld = IN.fire && !p.dead ? (p.fireHeld || 0) + 1 : 0;
  if (G.tic >= (f.next || 0)) { f.look = Math.floor(Math.random() * 3); f.next = G.tic + 17 + Math.floor(Math.random() * 18); }
}
function faceName() {
  const p = G.p, f = G.face || {}, l = faceLevel(p);
  if (p.dead) return 'STFDEAD0';
  if (p.god) return 'STFGOD0';
  if (f.until > G.tic) { if (f.kind === 'OUCH') return 'STFOUCH' + l; if (f.kind === 'EVL') return 'STFEVL' + l; if (f.kind === 'KILL') return 'STFKILL' + l; if (f.kind === 'TL') return 'STFTL' + l + '0'; if (f.kind === 'TR') return 'STFTR' + l + '0'; }
  if ((p.fireHeld || 0) > 70) return 'STFKILL' + l;
  return 'STFST' + l + (f.look || 0);
}
/* ---- Modern look: everything drawn sharp at full screen resolution ---- */
function hudModern() { return S.hudStyle === 'modern'; }
// Scale2x twice: pixel art blown up 4x with its edges cleaned (no blur, no jaggies); cached per picture
function hqCanvas(img) {
  if (img.hqc) return img.hqc; const src = spriteCanvas(img);
  const up = (c) => { const w = c.width, h = c.height, a = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer), o = document.createElement('canvas'); o.width = w * 2; o.height = h * 2; const od = o.getContext('2d').createImageData(w * 2, h * 2), b = new Uint32Array(od.data.buffer), W2 = w * 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const E = a[y * w + x], B = y ? a[(y - 1) * w + x] : E, Hh = y < h - 1 ? a[(y + 1) * w + x] : E, D = x ? a[y * w + x - 1] : E, F = x < w - 1 ? a[y * w + x + 1] : E;
      let e0 = E, e1 = E, e2 = E, e3 = E; if (B !== Hh && D !== F) { e0 = D === B ? D : E; e1 = B === F ? F : E; e2 = D === Hh ? D : E; e3 = Hh === F ? F : E; }
      const o0 = y * 2 * W2 + x * 2; b[o0] = e0; b[o0 + 1] = e1; b[o0 + W2] = e2; b[o0 + W2 + 1] = e3; }
    o.getContext('2d').putImageData(od, 0, 0); return o; };
  return img.hqc = up(up(src));
}
function chopRect(g, x, y, w, h, c) { g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h); g.lineTo(x, y + h); g.lineTo(x, y + c); g.closePath(); }
function sbDrawModern(g, W, H) {
  const p = G.p, wd = WEAPONS[p.w], s = sbScale(W, H), bh = Math.round(32 * s), bw = Math.min(W, 320 * s * 1.0), x0 = Math.round((W - bw) / 2), y0 = H - bh, k = bw / 320;
  const RED = '#e0262d', DIM = 'rgba(255,255,255,.28)', F = (px, wgt = 900) => `${wgt} ${Math.round(px)}px "Arial Black", "Segoe UI", Impact, sans-serif`;
  // full-width plate
  const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, '#1b1416'); gr.addColorStop(1, '#0b0809'); g.fillStyle = gr; g.fillRect(0, y0, W, bh);
  g.fillStyle = RED; g.fillRect(0, y0, W, Math.max(2, Math.round(s * 0.6)));
  const box = (bx, bwid, label) => { const X = x0 + bx * k, Y = y0 + 3 * k, Wd = bwid * k, Hd = bh - 6 * k; chopRect(g, X, Y, Wd, Hd, 4 * k); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill(); g.strokeStyle = 'rgba(224,38,45,.75)'; g.lineWidth = Math.max(1, k * 0.6); g.stroke();
    if (label) { g.font = F(4.6 * k, 700); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(label, X + Wd / 2, Y + Hd - 2.2 * k); } return { X, Y, Wd, Hd }; };
  const num = (b, v, pct, col) => { g.font = F(15 * k); g.textAlign = 'center'; g.fillStyle = col || RED; g.shadowColor = 'rgba(224,38,45,.55)'; g.shadowBlur = 4 * k; const t = String(Math.max(0, v | 0)) + (pct ? '%' : ''); g.fillText(t, b.X + b.Wd / 2, b.Y + b.Hd * 0.62); g.shadowBlur = 0; };
  // fit a label inside a box width
  const fit = (t, maxW, px, wgt) => { g.font = F(px, wgt); const w = g.measureText(t).width; if (w > maxW) g.font = F(px * maxW / w, wgt); };
  // AMMO box is labeled with the gun you're holding
  const wname = ((wd && wd.name) || 'AMMO').toUpperCase();
  const a = box(1, 44, ''); fit(wname, a.Wd - 4 * k, 4.6 * k, 800); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(wname, a.X + a.Wd / 2, a.Y + a.Hd - 2.2 * k);
  if (wd && wd.ammo) num(a, p.ammo[wd.ammo]); else { g.font = F(10 * k); g.fillStyle = DIM; g.textAlign = 'center'; g.fillText('∞', a.X + a.Wd / 2, a.Y + a.Hd * 0.6); }
  num(box(47, 48, 'HEALTH'), p.hp, true, p.hp <= 25 ? '#ff4040' : RED);
  // arms 2-7 (tap one to pick it)
  const ar = box(97, 37, ''); G.armsRect = { x: ar.X, y: ar.Y, w: ar.Wd, h: ar.Hd };
  for (let i = 2; i <= 7; i++) { const c = (i - 2) % 3, r = Math.floor((i - 2) / 3), cx = ar.X + ar.Wd * (c + 0.5) / 3, cy = ar.Y + ar.Hd * (r + 0.5) / 2, have = p.has.has(i) || (i === 3 && p.has.has(4)) || (i === 2 && p.has.has(1)), cur = p.w === i || (i === 3 && p.w === 4) || (i === 2 && p.w === 1);
    if (cur) { chopRect(g, cx - 5 * k, cy - 5.5 * k, 10 * k, 11 * k, 2 * k); g.fillStyle = RED; g.fill(); }
    g.font = F(8 * k); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = cur || have ? '#fff' : DIM; g.fillText(String(i), cx, cy + 0.5 * k); g.textBaseline = 'alphabetic'; }
  // the marine
  const fb = box(136, 33, ''); faceDraw(g, fb);
  num(box(171, 48, 'ARMOR'), p.armor, true, p.at === 2 ? '#4d8bff' : p.armor ? '#3fbf4a' : RED);
  // keycards: an empty slot shows the key's color as an outline, a key you hold fills in
  const kb = box(221, 20, 'KEYS');
  [['b', '#3b6cff'], ['y', '#f2c200'], ['r', '#ff3030']].forEach(([kk, c], i) => { const X = kb.X + kb.Wd * 0.2, Y = kb.Y + kb.Hd * (0.1 + i * 0.22), w = kb.Wd * 0.6, h = kb.Hd * 0.15; chopRect(g, X, Y, w, h, 1.5 * k);
    if (p.keys.has(kk)) { g.fillStyle = c; g.fill(); } else { g.strokeStyle = c; g.globalAlpha = 0.45; g.lineWidth = Math.max(1, k * 0.5); g.stroke(); g.globalAlpha = 1; } });
  // ammo table with full words; the one your gun uses is red
  const tb = box(243, 76, '');
  [['BULLETS', 'bullets'], ['SHELLS', 'shells'], ['ROCKETS', 'rockets'], ['CELLS', 'cells']].forEach(([lab, a2], i) => { const Y = tb.Y + tb.Hd * (0.2 + i * 0.235), cur = wd && wd.ammo === a2;
    fit('ROCKETS', tb.Wd * 0.4, 4.8 * k, 800); g.textAlign = 'left'; g.fillStyle = cur ? RED : '#fff'; g.fillText(lab, tb.X + 3 * k, Y + 1.6 * k);
    g.textAlign = 'right'; g.font = F(5.4 * k, 800); g.fillStyle = cur ? RED : '#fff'; g.fillText(`${p.ammo[a2] | 0}`, tb.X + tb.Wd * 0.7, Y + 1.8 * k); g.fillStyle = DIM; g.fillText(`/ ${p.max[a2] | 0}`, tb.X + tb.Wd - 3 * k, Y + 1.8 * k); });
  sbStats();
  g.textAlign = 'left'; return true;
}
// kills / items / secrets live in the top bar (they were cramped in the side margins)
function sbStats() { const el = $('#gStats'); if (!el || !G) return; const t = `KILLS ${G.kills}/${G.totK} · ITEMS ${G.items}/${G.totI}` + (G.totS ? ` · SECRETS ${G.secrets}/${G.totS}` : ''); if (el.textContent !== t) el.textContent = t; }
// the face: a painted high-detail face if the art pack has one (res/art/faces), otherwise Freedoom's, cleaned up
const FACEHD = { m: null, imgs: new Map(), tried: false };
// painted face keys: <kind>_<level>, kinds: straight left right ouch grin (levels 0-4), hitleft hitright rampage god dead
function faceKey(name) {
  if (name === 'STFDEAD0') return ['dead']; if (name === 'STFGOD0') return ['god'];
  let m = name.match(/^STF(OUCH|EVL|KILL)(\d)$/); if (m) { const l = +m[2], k = { OUCH: 'ouch', EVL: 'grin', KILL: 'rampage' }[m[1]]; return k === 'rampage' ? ['rampage_' + (l <= 2 ? 0 : 4), 'grin_' + l] : [k + '_' + l, 'straight_' + l]; }
  m = name.match(/^STFT([LR])(\d)0$/); if (m) { const l = +m[2], s = m[1] === 'L' ? 'left' : 'right'; return ['hit' + s, s + '_' + l, 'straight_' + l]; }
  m = name.match(/^STFST(\d)(\d)$/); if (m) { const l = +m[1]; return [['straight', 'left', 'right'][+m[2]] + '_' + l, 'straight_' + l]; }
  return [];
}
function faceHD(name) {
  if (!FACEHD.tried) { FACEHD.tried = true; fetch('res/art/faces/faces.json').then(r => r.ok ? r.json() : null).then(m => { if (!m) return; FACEHD.m = m; for (const n of m.faces || []) { const im = new Image(); im.onload = () => FACEHD.imgs.set(n, im); im.src = 'res/art/faces/' + n + '.png'; } }).catch(() => { }); }
  for (const k of faceKey(name)) { const im = FACEHD.imgs.get(k); if (im) return im; }
  return null;
}
function faceDraw(g, fb) {
  const name = faceName(), hd = faceHD(name);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (hd) { const sc = Math.min(fb.Wd / hd.width, fb.Hd / hd.height); g.drawImage(hd, fb.X + (fb.Wd - hd.width * sc) / 2, fb.Y + (fb.Hd - hd.height * sc) / 2, hd.width * sc, hd.height * sc); }
  else { const fp = sbPic(name); if (fp) { const img = fp.img, sc = Math.min(fb.Wd / img.w, fb.Hd / img.h) * 0.98; g.drawImage(hqCanvas(img), fb.X + (fb.Wd - img.w * sc) / 2, fb.Y + (fb.Hd - img.h * sc) / 2, img.w * sc, img.h * sc); } }
  g.imageSmoothingEnabled = false;
}
/* ---- drawing ---- */
function drawStatusBar(g, W, H) {
  if (G) G.armsRect = null;
  if (hudModern() && S.statusBar !== 'slim' && G.mode === 'play') return sbDrawModern(g, W, H);
  if (S.statusBar === 'slim' || !sbReady()) return false;
  const s = sbScale(W, H), bw = 320 * s, bh = 32 * s, x0 = Math.round((W - bw) / 2), y0 = Math.round(H - bh), p = G.p, wd = WEAPONS[p.w];
  g.imageSmoothingEnabled = false;
  if (x0 > 0) { g.fillStyle = '#1e1c1a'; g.fillRect(0, y0, W, bh); g.fillStyle = '#3a3632'; g.fillRect(0, y0, W, Math.max(1, s)); }
  const put = (name, x, y, useOff) => { const pc = sbPic(name); if (!pc) return 0; const ox = useOff ? pc.img.ox || 0 : 0, oy = useOff ? pc.img.oy || 0 : 0; g.drawImage(pc.c, x0 + (x - ox) * s, y0 + (y - oy) * s, pc.img.w * s, pc.img.h * s); return pc.img.w; };
  put('STBAR', 0, 0);
  const big = (n, rx, y, pct) => { // right-aligned big red number
    let x = rx; if (pct) put('STTPRCNT', rx, y);
    const str = String(Math.max(0, n | 0)); for (let i = str.length - 1; i >= 0; i--) { const pc = sbPic('STTNUM' + str[i]); const w = pc ? pc.img.w : 14; x -= w; put('STTNUM' + str[i], x, y); }
  };
  const small = (n, rx, y, pre) => { const str = String(Math.max(0, n | 0)); let x = rx; for (let i = str.length - 1; i >= 0; i--) { const pc = sbPic(pre + str[i]); const w = pc ? pc.img.w : 4; x -= w; put(pre + str[i], x, y); } };
  if (wd && wd.ammo) big(p.ammo[wd.ammo], 44, 3);
  big(p.hp, 90, 3, true);
  // weapon numbers 2-7: yellow = you have it
  if (sbPic('STARMS')) put('STARMS', 104, 0);
  G.armsRect = { x: x0 + 104 * s, y: y0, w: 40 * s, h: 32 * s };
  for (let i = 2; i <= 7; i++) { const k = i - 2, x = 111 + (k % 3) * 12, y = 4 + Math.floor(k / 3) * 10; put((p.has.has(i) || (i === 3 && p.has.has(8)) ? 'STYSNUM' : 'STGNUM') + i, x, y); }
  put(faceName(), 143, 0, true);
  big(p.armor, 221, 3, true);
  [['b', 0], ['y', 1], ['r', 2]].forEach(([k, i]) => { if (p.keys.has(k)) put('STKEYS' + i, 239, 3 + i * 10); });
  [['bullets', 5], ['shells', 11], ['cells', 23], ['rockets', 17]].forEach(([a, y]) => { small(p.ammo[a], 288, y, 'STYSNUM'); small(p.max[a], 314, y, 'STYSNUM'); });
  // EOD extras on the side bars: weapon name, kills / items
  sbStats();
  return true;
}
