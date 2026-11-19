/* ================= RESOURCE STACK: read art, sprites and sounds from any WAD / PK3 =================
   Stack (top wins): the map's own WAD/PK3 → the player's own IWAD (kept on their device only) →
   Freedoom (free, BSD license) → EOD in-house procedural art (always there as the last fallback). */
const RES = { packs: [], ver: 0, loading: null };
const TEXC2 = new Map(), SPRC = new Map();
function resChanged() { RES.ver++; TEXC2.clear(); SPRC.clear(); SNDC.clear(); if (G && G.sc) G.sc = buildScene(G.secs); if (window.refreshProps) refreshProps(); }
function lumpBytes(w, l) { return new Uint8Array(w.buf, l.pos, l.size); }
function packFromWad(w, name, kind) {
  const p = { name, kind, pal: null, tex: new Map(), patches: new Map(), flats: new Map(), sprites: new Map(), sounds: new Map(), imgTex: new Map(), imgFlat: new Map(), imgSpr: new Map() };
  let sec = null;
  for (const l of w.lumps) {
    const n = l.name;
    if (/^(P|PP|P\d)_START$/.test(n)) { sec = 'P'; continue; } if (/^(P|PP|P\d)_END$/.test(n)) { sec = null; continue; }
    if (/^(F|FF|F\d)_START$/.test(n)) { sec = 'F'; continue; } if (/^(F|FF|F\d)_END$/.test(n)) { sec = null; continue; }
    if (/^(S|SS)_START$/.test(n)) { sec = 'S'; continue; } if (/^(S|SS)_END$/.test(n)) { sec = null; continue; }
    if (n === 'SN_START') { sec = 'N'; continue; } if (n === 'SN_END') { sec = null; continue; }
    if (n === 'PLAYPAL' && l.size >= 768) { const b = lumpBytes(w, l), pal = new Uint32Array(256); for (let i = 0; i < 256; i++) pal[i] = rgb(b[i * 3], b[i * 3 + 1], b[i * 3 + 2]); p.pal = pal; continue; }
    if (!l.size) continue;
    if (sec === 'P') p.patches.set(n, lumpBytes(w, l));
    else if (sec === 'F') { if (l.size >= 4096) p.flats.set(n, lumpBytes(w, l)); }
    else if (sec === 'S') p.sprites.set(n, lumpBytes(w, l));
    else if (sec === 'N' || (/^DS/.test(n) && l.size > 8 && w.dv.getUint16(l.pos, true) === 3)) p.sounds.set(n, lumpBytes(w, l));
    else if (!sec && l.size > 8 && !MAP_LUMPS.has(n) && !p.patches.has(n) && looksLikePicture(w, l)) p.patches.set(n, lumpBytes(w, l)); // loose patches (common in PWADs)
  }
  const pn = w.lumps.find(l => l.name === 'PNAMES'); let names = [];
  if (pn) { const n = w.dv.getInt32(pn.pos, true); for (let i = 0; i < n; i++) names.push(rdName(w.dv, pn.pos + 4 + i * 8)); }
  for (const tn of ['TEXTURE1', 'TEXTURE2']) {
    const tl = w.lumps.find(l => l.name === tn); if (!tl || !names.length) continue;
    const dv = w.dv, b = tl.pos, n = dv.getInt32(b, true);
    for (let i = 0; i < n; i++) {
      const o = b + dv.getInt32(b + 4 + i * 4, true); const nm = rdName(dv, o), tw = dv.getInt16(o + 12, true), th = dv.getInt16(o + 14, true), pc = dv.getInt16(o + 20, true);
      const ps = []; for (let k = 0; k < pc; k++) { const q = o + 22 + k * 10; ps.push({ x: dv.getInt16(q, true), y: dv.getInt16(q + 2, true), patch: names[dv.getInt16(q + 4, true)] }); }
      if (!p.tex.has(nm)) p.tex.set(nm, { w: tw, h: th, ps });
    }
  }
  return p;
}
function looksLikePicture(w, l) { // cheap sanity check of the Doom picture header
  const dv = w.dv, wd = dv.getInt16(l.pos, true), ht = dv.getInt16(l.pos + 2, true);
  if (wd <= 0 || wd > 4096 || ht <= 0 || ht > 4096 || 8 + wd * 4 > l.size) return false;
  const c0 = dv.getUint32(l.pos + 8, true); return c0 >= 8 + wd * 4 && c0 < l.size;
}
function resPal() { for (const p of RES.packs) if (p.pal) return p.pal; return null; }
// Doom picture format → {w,h,ox,oy,px(alpha 0 = transparent)}
function decodePicture(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), w = dv.getInt16(0, true), h = dv.getInt16(2, true), ox = dv.getInt16(4, true), oy = dv.getInt16(6, true);
  const pal = resPal(), px = new Uint32Array(Math.max(1, w * h));
  if (!pal || w <= 0 || h <= 0) return null;
  for (let x = 0; x < w; x++) {
    let o = dv.getUint32(8 + x * 4, true), top = -1;
    for (let guard = 0; o < b.length && guard < 256; guard++) {
      let td = b[o]; if (td === 255) break;
      top = td <= top ? top + td : td; // tall patches
      const len = b[o + 1]; o += 3;
      for (let k = 0; k < len && o + k < b.length; k++) { const y = top + k; if (y >= 0 && y < h) px[y * w + x] = pal[b[o + k]]; }
      o += len + 1;
    }
  }
  const t = texObj(w, h, px); t.ox = ox; t.oy = oy; return t;
}
function findPatch(name, fromIdx) { for (let i = fromIdx; i < RES.packs.length; i++) { const b = RES.packs[i].patches.get(name); if (b) return b; } for (const p of RES.packs) { const b = p.patches.get(name); if (b) return b; } return null; }
function composeTexture(def, packIdx) {
  const W_ = def.w, H_ = def.h, px = new Uint32Array(W_ * H_);
  for (const pt of def.ps) {
    const pb = findPatch(pt.patch, packIdx); if (!pb) continue;
    const pic = decodePicture(pb); if (!pic) continue;
    for (let y = 0; y < pic.h; y++) { const ty = pt.y + y; if (ty < 0 || ty >= H_) continue; for (let x = 0; x < pic.w; x++) { const tx = pt.x + x; if (tx < 0 || tx >= W_) continue; const c = pic.px[y * pic.w + x]; if (c) px[ty * W_ + tx] = c; } }
  }
  return texObj(W_, H_, px);
}
function getTex(name, flat) {
  name = (name || '-').toUpperCase(); const k = (flat ? 'F:' : 'W:') + name;
  let t = TEXC2.get(k); if (t) return t;
  if (RES.packs.length) {
    const havePal = !!resPal();
    for (let i = 0; i < RES.packs.length && !t; i++) {
      const p = RES.packs[i];
      if (flat) {
        if (p.imgFlat.has(name)) t = p.imgFlat.get(name);
        else if (havePal && p.flats.has(name)) { const b = p.flats.get(name), pal = resPal(), px = new Uint32Array(4096); for (let j = 0; j < 4096; j++) px[j] = pal[b[j]]; t = texObj(64, 64, px); }
      } else {
        if (p.imgTex.has(name)) t = p.imgTex.get(name);
        else if (havePal && p.tex.has(name)) t = composeTexture(p.tex.get(name), i);
      }
    }
  }
  if (!t) t = getTexProc(name, flat);
  TEXC2.set(k, t); return t;
}
function getSky() {
  const n = M && M.name ? M.name : 'MAP01'; let s = 'SKY1';
  const m = n.match(/^MAP(\d\d)$/), e = n.match(/^E(\d)M\d$/);
  if (m) s = +m[1] >= 21 ? 'SKY3' : +m[1] >= 12 ? 'SKY2' : 'SKY1'; else if (e) s = 'SKY' + e[1];
  if (RES.packs.some(p => p.tex.has(s) || p.imgTex.has(s))) return getTex(s); if (RES.packs.some(p => p.tex.has('SKY1'))) return getTex('SKY1');
  return getSkyProc();
}
// animated flats: name ranges cycle every 8 tics
const FLAT_ANIMS = [['NUKAGE1', 'NUKAGE3'], ['FWATER1', 'FWATER4'], ['SWATER1', 'SWATER4'], ['LAVA1', 'LAVA4'], ['BLOOD1', 'BLOOD3'], ['RROCK05', 'RROCK08'], ['SLIME01', 'SLIME04'], ['SLIME05', 'SLIME08'], ['SLIME09', 'SLIME12']];
function animFlat(name, tic) {
  for (const [a, z] of FLAT_ANIMS) { const base = a.slice(0, -1); if (name.startsWith(base) && name.length === a.length) { const lo = +a.slice(-1), hi = +z.slice(-1), cur = +name.slice(-1); if (cur >= lo && cur <= hi) return base + (lo + ((cur - lo + Math.floor(tic / 8)) % (hi - lo + 1))); } }
  return name;
}
/* ---------- sprites ---------- */
function spriteLump(name) { for (const p of RES.packs) { if (p.imgSpr.has(name)) return { img: p.imgSpr.get(name) }; const b = p.sprites.get(name); if (b) return { bytes: b }; } return null; }
function spriteNames(prefix) { const out = new Set(); for (const p of RES.packs) { for (const n of p.sprites.keys()) if (n.startsWith(prefix)) out.add(n); for (const n of p.imgSpr.keys()) if (n.startsWith(prefix)) out.add(n); } return out; }
// returns {img, flip} for prefix+frame at rotation 1..8 (0 = any), or null when no pack has it
function getSpriteFrame(prefix, frame, rot) {
  const key = prefix + frame + rot; if (SPRC.has(key)) return SPRC.get(key);
  let res = null;
  if (RES.packs.length && resPal()) {
    const names = spriteNames(prefix + frame); const all = spriteNames(prefix);
    const tryName = (n, flip) => { const s = spriteLump(n); if (!s) return null; const img = s.img || decodePicture(s.bytes); return img ? { img, flip } : null; };
    res = tryName(prefix + frame + '0', false);
    if (!res) res = tryName(prefix + frame + (rot || 1), false);
    if (!res) for (const n of all) { if (n[6] === frame && n[7] === String(rot || 1)) { res = tryName(n, true); if (res) break; } }
    if (!res) for (const n of names) { res = tryName(n, false); if (res) break; }
  }
  SPRC.set(key, res); return res;
}
const DSPR = {
  3004: ['POSS', 'ABCD', 'EF', 'G', 'L'], 9: ['SPOS', 'ABCD', 'EF', 'G', 'L'], 65: ['CPOS', 'ABCD', 'EF', 'G', 'N'], 3001: ['TROO', 'ABCD', 'EFG', 'H', 'M'], 3002: ['SARG', 'ABCD', 'EFG', 'H', 'N'], 58: ['SARG', 'ABCD', 'EFG', 'H', 'N'],
  3006: ['SKUL', 'AB', 'CD', 'E', ''], 3005: ['HEAD', 'A', 'BCD', 'E', 'L'], 69: ['BOS2', 'ABCD', 'EFG', 'H', 'O'], 3003: ['BOSS', 'ABCD', 'EFG', 'H', 'O'], 68: ['BSPI', 'ABCDEF', 'GH', 'I', 'P'], 7: ['SPID', 'ABCDEF', 'GH', 'I', 'S'], 16: ['CYBR', 'ABCD', 'EF', 'G', 'P'],
  2001: ['SHOT', 'A'], 82: ['SGN2', 'A'], 2002: ['MGUN', 'A'], 2003: ['LAUN', 'A'], 2004: ['PLAS', 'A'], 2006: ['BFUG', 'A'], 2005: ['CSAW', 'A'], 2007: ['CLIP', 'A'], 2048: ['AMMO', 'A'], 2008: ['SHEL', 'A'], 2049: ['SBOX', 'A'], 2010: ['ROCK', 'A'], 2046: ['BROK', 'A'], 2047: ['CELL', 'A'], 17: ['CELP', 'A'], 8: ['BPAK', 'A'],
  2011: ['STIM', 'A'], 2012: ['MEDI', 'A'], 2014: ['BON1', 'ABCDCB'], 2013: ['SOUL', 'ABCDCB'], 83: ['MEGA', 'ABCD'], 2015: ['BON2', 'ABCDCB'], 2018: ['ARM1', 'AB'], 2019: ['ARM2', 'AB'],
  5: ['BKEY', 'AB'], 6: ['YKEY', 'AB'], 13: ['RKEY', 'AB'], 40: ['BSKU', 'AB'], 39: ['YSKU', 'AB'], 38: ['RSKU', 'AB'], 2035: ['BAR1', 'AB'], 2028: ['COLU', 'A'], 48: ['ELEC', 'A'], 30: ['COL1', 'A'], 46: ['TRED', 'ABCD'], 44: ['TBLU', 'ABCD'], 34: ['CAND', 'A'], 35: ['CBRA', 'A'], 10: ['PLAY', 'W']
};
const PSPR = { fire: ['BAL1', 'AB'], caco: ['BAL2', 'AB'], baron: ['BAL7', 'AB'], plasmam: ['APLS', 'AB'], rocketm: ['MISL', 'A'], rocket: ['MISL', 'A'], plasma: ['PLSS', 'AB'], bfg: ['BFS1', 'AB'] };
const FXSPR = { explode: ['MISL', 'BCD'], puff: ['PUFF', 'ABCD'], blood: ['BLUD', 'CBA'] };
const WSPR = { 1: ['SAWG', 'CD', 'AB', '', ''], 2: ['PISG', 'A', 'BC', 'PISF', 'A'], 3: ['SHTG', 'A', 'BCD', 'SHTF', 'AB'], 4: ['SHT2', 'A', 'BCDE', 'SHT2', 'I'], 5: ['CHGG', 'A', 'AB', 'CHGF', 'AB'], 6: ['MISG', 'A', 'B', 'MISF', 'ABCD'], 7: ['PLSG', 'A', 'A', 'PLSF', 'AB'], 8: ['BFGG', 'A', 'B', 'BFGF', 'AB'] };
function spriteRot(thingAng, tx, ty, cx, cy) { let r = Math.atan2(ty - cy, tx - cx) - thingAng + Math.PI + Math.PI / 8; r = ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return 1 + (Math.floor(r / (Math.PI / 4)) % 8); }
function spriteCanvas(img) { if (img.canvas) return img.canvas; const c = document.createElement('canvas'); c.width = img.w; c.height = img.h; const id = new ImageData(img.w, img.h); new Uint32Array(id.data.buffer).set(img.px); c.getContext('2d').putImageData(id, 0, 0); img.canvas = c; return c; }
/* ---------- sounds (Doom DMX format) ---------- */
const SNDC = new Map();
const SND_MAP = { pistol: 'DSPISTOL', shotgun: 'DSSHOTGN', chain: 'DSPISTOL', rocket: 'DSRLAUNC', plasma: 'DSPLASMA', explode: 'DSBAREXP', door: 'DSDOROPN', switch: 'DSSWTCHN', pickup: 'DSITEMUP', weapon: 'DSWPNUP', oof: 'DSNOWAY', pain: 'DSPLPAIN', die: 'DSPODTH1', fire: 'DSFIRSHT', tele: 'DSTELEPT', secret: 'DSGETPOW' };
function resSound(kind) {
  const lump = SND_MAP[kind]; if (!lump) return null; if (SNDC.has(lump)) return SNDC.get(lump);
  let buf = null; const ac = AC;
  for (const p of RES.packs) { const b = p.sounds.get(lump); if (b && ac && b.length > 24) { const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), rate = dv.getUint16(2, true), n = Math.min(dv.getUint32(4, true), b.length - 8); if (rate < 4000 || n < 32) break; const ab = ac.createBuffer(1, n - 32, rate), d = ab.getChannelData(0); for (let i = 0; i < n - 32; i++) d[i] = (b[8 + 16 + i] - 128) / 128; buf = ab; break; } }
  SNDC.set(lump, buf); return buf;
}
/* ---------- pack management ---------- */
function setPack(kind, pack) { RES.packs = RES.packs.filter(p => p.kind !== kind); if (pack) { const order = { custom: -1, map: 0, iwad: 1, freedoom: 2 }; RES.packs.push(pack); RES.packs.sort((a, b) => order[a.kind] - order[b.kind]); } resChanged(); }
const FREEDOOM_URL = 'res/freedoom-res.wad.gz?v=2';
async function loadFreedoom(silent) {
  if (RES.packs.some(p => p.kind === 'freedoom')) return true;
  if (RES.loading) return RES.loading;
  RES.loading = (async () => {
    try {
      if (!silent) toast('Loading Freedoom art (about 7 MB, only the first time)…', 6000);
      let resp = null, cache = null;
      try { cache = await caches.open('eod-res-v1'); cache.delete('res/freedoom-res.wad.gz'); resp = await cache.match(FREEDOOM_URL); } catch (e) { cache = null; }
      if (!resp) { resp = await fetch(FREEDOOM_URL); if (!resp.ok) throw new Error('HTTP ' + resp.status); if (cache) { try { await cache.put(FREEDOOM_URL, resp.clone()); } catch (e) { } } }
      const ds = new DecompressionStream('gzip'), buf = await new Response(resp.body.pipeThrough(ds)).arrayBuffer();
      setPack('freedoom', packFromWad(parseWad(buf), 'Freedoom', 'freedoom'));
      if (!silent) toast('Freedoom art loaded');
      return true;
    } catch (e) { logCrash('freedoom load: ' + (e.stack || e)); if (!silent) toast('Could not load the Freedoom art pack. Using EOD in-house art.', 5000); return false; }
    finally { RES.loading = null; }
  })();
  return RES.loading;
}
function applyArtSetting() { if ((S.artPack || 'freedoom') === 'freedoom') loadFreedoom(true); else setPack('freedoom', null); }
/* ---------- ZIP / PK3 reader (browser built-in inflate) ---------- */
async function readZip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf); let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Not a readable zip');
  const n = dv.getUint16(e + 10, true); let o = dv.getUint32(e + 16, true); const out = [];
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(o, true) !== 0x02014b50) break;
    const method = dv.getUint16(o + 10, true), csize = dv.getUint32(o + 20, true), nl = dv.getUint16(o + 28, true), xl = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lo = dv.getUint32(o + 42, true);
    const name = new TextDecoder().decode(u8.subarray(o + 46, o + 46 + nl)); o += 46 + nl + xl + cl;
    if (name.endsWith('/')) continue;
    out.push({ name, get: async () => { const ln = dv.getUint16(lo + 26, true), lx = dv.getUint16(lo + 28, true), st = lo + 30 + ln + lx, data = u8.slice(st, st + csize); if (method === 0) return data.buffer; if (method !== 8) throw new Error('Unsupported zip compression in ' + name); return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); } });
  }
  return out;
}
async function imageToTex(buf) { const bmp = await createImageBitmap(new Blob([buf])); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data, px = new Uint32Array(c.width * c.height); for (let i = 0; i < px.length; i++) px[i] = d[i * 4 + 3] > 100 ? rgb(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) : 0; const t = texObj(c.width, c.height, px); t.ox = c.width >> 1; t.oy = c.height; return t; }
