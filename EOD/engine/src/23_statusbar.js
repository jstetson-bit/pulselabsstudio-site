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
  if (S.statusBar !== 'slim' && G && G.mode === 'play' && sbReady()) return Math.round(32 * sbScale(W, H));
  return 20 * u;
}
function sbScale(W, H) { const big = { classic: 0.2, compact: 0.13 }[S.statusBar || 'classic'] || 0.2; return Math.min(W / 320, H * big / 32); }
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
/* ---- drawing ---- */
function drawStatusBar(g, W, H) {
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
  for (let i = 2; i <= 7; i++) { const k = i - 2, x = 111 + (k % 3) * 12, y = 4 + Math.floor(k / 3) * 10; put((p.has.has(i) || (i === 3 && p.has.has(8)) ? 'STYSNUM' : 'STGNUM') + i, x, y); }
  put(faceName(), 143, 0, true);
  big(p.armor, 221, 3, true);
  [['b', 0], ['y', 1], ['r', 2]].forEach(([k, i]) => { if (p.keys.has(k)) put('STKEYS' + i, 239, 3 + i * 10); });
  [['bullets', 5], ['shells', 11], ['cells', 23], ['rockets', 17]].forEach(([a, y]) => { small(p.ammo[a], 288, y, 'STYSNUM'); small(p.max[a], 314, y, 'STYSNUM'); });
  // EOD extras on the side bars: weapon name, kills / items
  if (x0 > 60) {
    const lines = [(wd ? wd.name : '').toUpperCase(), 'KILLS ' + G.kills + '/' + G.totK, 'ITEMS ' + G.items + '/' + G.totI];
    let fs = Math.min(bh / 4, 7 * s); g.font = `bold ${fs}px monospace`;
    const mw = Math.max(...lines.map(t => g.measureText(t).width)); if (mw > x0 - 16) fs *= (x0 - 16) / mw;
    if (fs >= 8) { g.font = `bold ${fs}px monospace`; g.textAlign = 'left'; g.fillStyle = '#fff'; lines.forEach((t, i) => g.fillText(t, 8, y0 + bh * (0.3 + i * 0.28))); }
  }
  return true;
}
