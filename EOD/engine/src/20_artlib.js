/* ================= PULSE ART LIBRARY: painted Doom-style monsters and guns =================
   Art lives in EOD/res/art (PNG sprites + manifest.json), loaded only when a map uses it.
   The generators pick a painted body or gun, then vary it: hue, saturation, brightness, tint, size, mirror.
   Monster motion (walk, attack, pain, death) is made from the one painting by leaning, squashing,
   flashing and collapsing it, pixel-exact. */
const ART_DIR = 'res/art/';
const ARTL = { man: null, manP: null, img: new Map(), wait: new Map() };
function artManifest() {
  if (ARTL.man) return Promise.resolve(ARTL.man);
  if (!ARTL.manP) ARTL.manP = fetch(ART_DIR + 'manifest.json').then(r => r.json()).then(j => (ARTL.man = j)).catch(() => (ARTL.man = { monsters: [], weapons: [] })).then(m => forgeMerge().then(() => m));
  return ARTL.manP;
}
function artMon(id) { return (ARTL.man && ARTL.man.monsters.find(m => m.id === id)) || (M && M.artMeta && M.artMeta[id] && M.artMeta[id].kind === 'monster' ? M.artMeta[id] : null); }
function artWep(id) { return (ARTL.man && ARTL.man.weapons.find(m => m.id === id)) || (M && M.artMeta && M.artMeta[id] && M.artMeta[id].kind === 'weapon' ? M.artMeta[id] : null); }
/* Pulse Forge art (same site, IndexedDB 'pulse-forge'): merged into the library */
ARTL.forge = {}; ARTL.forgeIds = new Set();
function forgeLoad() {
  return new Promise(res => { try { const r = indexedDB.open('pulse-forge', 1); r.onupgradeneeded = () => r.result.createObjectStore('art', { keyPath: 'id' }); r.onerror = () => res([]);
    r.onsuccess = () => { try { const t = r.result.transaction('art').objectStore('art').getAll(); t.onsuccess = () => res(t.result || []); t.onerror = () => res([]); } catch (e) { res([]); } }; } catch (e) { res([]); } });
}
async function forgeMerge() {
  if (!ARTL.man) return; const all = await forgeLoad();
  for (const o of all) {
    Object.assign(ARTL.forge, o.files || {}); if (ARTL.forgeIds.has(o.id)) continue; ARTL.forgeIds.add(o.id);
    const meta = Object.assign({}, o); delete meta.files; delete meta.dna; meta.name = '⚒ ' + o.name;
    (o.kind === 'weapon' ? ARTL.man.weapons : ARTL.man.monsters).push(meta);
  }
}
window.addEventListener('focus', () => { forgeMerge(); });
// returns a loaded Image or null (and starts loading). Embedded copies (playable exports) win.
function artImg(file) {
  const have = ARTL.img.get(file); if (have) return have;
  if (!ARTL.wait.has(file)) {
    const src = (M && M.artData && M.artData[file]) || ARTL.forge[file] || (window.NSDE_EMBED && NSDE_EMBED.map && NSDE_EMBED.map.artData && NSDE_EMBED.map.artData[file]) || ART_DIR + file;
    const im = new Image(); const p = new Promise(res => { im.onload = () => { ARTL.img.set(file, im); res(im); artLoaded(); }; im.onerror = () => res(null); });
    im.src = src; ARTL.wait.set(file, p);
  }
  return null;
}
function artLoadAll(files) { return Promise.all(files.map(f => { artImg(f); return ARTL.wait.get(f); })); }
let ART_TICK = 0;
function artLoaded() { ART_TICK++; if (typeof MONF !== 'undefined') MONF.clear(); if (typeof WEPF !== 'undefined') WEPF.clear(); if (typeof redraw === 'function') try { redraw(); } catch (e) { } }
// files a map needs
function artFilesFor(map) {
  const f = [];
  for (const d of Object.values(map.mon || {})) if (d.look && d.look.art) f.push(...monFiles(d.look.art));
  for (const d of Object.values(map.wep || {})) if (d.look && d.look.art) f.push(...wepFiles(d.look.art));
  return [...new Set(f)];
}
function monFiles(id) { const a = artMon(id); if (a && a.rots) { const o = []; for (let i = 1; i <= a.rots; i++) o.push('m_' + id + '_r' + i + '.png'); for (let i = 1; i <= (a.death || 0); i++) o.push('m_' + id + '_d' + i + '.png'); return o; } return ['m_' + id + '.png']; }
function wepFiles(id) { const a = artWep(id); if (!a) return []; return [...(a.frames || []), a.pick, a.proj].filter(Boolean); }
function artPreload() {
  // maps that use Forge art carry their own copy (art + its description) so other players see it
  for (const d of [...Object.values(M.mon || {}), ...Object.values(M.wep || {})]) { const id = d.look && d.look.art; if (!id || !ARTL.forgeIds.has(id)) continue; const meta = artMon(id) || artWep(id); if (!meta) continue; M.artMeta = M.artMeta || {}; if (!M.artMeta[id]) M.artMeta[id] = Object.assign({}, meta, { kind: d.hp != null ? 'monster' : 'weapon' }); M.artData = M.artData || {}; for (const f of (meta.kind === 'weapon' || d.hp == null ? wepFiles(id) : monFiles(id))) if (ARTL.forge[f] && !M.artData[f]) M.artData[f] = ARTL.forge[f]; }
  const f = artFilesFor(M); if (f.length) artManifest().then(() => artLoadAll(f)); }
/* ---------- recolor ---------- */
function hueMatrix(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
  0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
  0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072];
}
function recolor(data, L) {
  const hue = L.hue || 0, sat = (L.sat != null ? L.sat : 100) / 100, bri = (L.bri != null ? L.bri : 100) / 100, ta = (L.tintAmt || 0) / 100;
  if (!hue && sat === 1 && bri === 1 && !ta) return;
  const m = hueMatrix(hue), [tr, tg, tb] = hexRGB(L.tint || '#c4141c');
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue; let r = data[i], g = data[i + 1], b = data[i + 2];
    if (L.keepSkin && r > g && g > b && r - b > 35 && (g - b) > (r - g) * 0.35 && r > 70) continue; // hands stay hands
    if (hue) { const R = r * m[0] + g * m[1] + b * m[2], G_ = r * m[3] + g * m[4] + b * m[5], B = r * m[6] + g * m[7] + b * m[8]; r = R; g = G_; b = B; }
    if (sat !== 1) { const l = r * 0.3 + g * 0.59 + b * 0.11; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
    if (ta) { const l = (r * 0.3 + g * 0.59 + b * 0.11) / 255; r = r * (1 - ta) + tr * l * 1.4 * ta; g = g * (1 - ta) + tg * l * 1.4 * ta; b = b * (1 - ta) + tb * l * 1.4 * ta; }
    data[i] = r * bri; data[i + 1] = g * bri; data[i + 2] = b * bri;
  }
}
// draw image -> recolored RGBA at scale (nearest for crisp pixels)
function artPixels(im, L, scale, mirror) {
  const w = Math.max(1, Math.round(im.width * scale)), h = Math.max(1, Math.round(im.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.imageSmoothingEnabled = scale < 1; if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(im, 0, 0, w, h); const d = g.getImageData(0, 0, w, h);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 120 ? 255 : 0;
  recolor(d.data, L); return { w, h, rgba: d.data };
}
/* ---------- monster frames from one painting ---------- */
function poseFrame(src, kind, k) {
  // kind: walk(0-3) attack(0-1) pain dead(0-4); returns {w,h,rgba} with feet at bottom-center
  const { w, h, rgba } = src;
  let shear = 0, sy = 1, sx = 1, lift = 0, flash = 0, red = 0, dark = 0, pool = 0;
  if (kind === 'walk') { shear = [0, 2, 0, -2][k]; lift = [0, 1, 0, 1][k]; sy = [1, .98, 1, .98][k]; }
  if (kind === 'attack') { shear = k ? 4 : -3; sx = k ? 1.04 : 1; sy = k ? 1.02 : .99; flash = k ? 45 : 15; }
  if (kind === 'pain') { shear = -3; flash = 70; red = .25; }
  if (kind === 'dead') { sy = [.82, .62, .44, .3, .2][k]; sx = [1.06, 1.14, 1.22, 1.3, 1.36][k]; red = .15 + k * .08; dark = k * .07; pool = k + 1; }
  const W = Math.ceil(w * sx + Math.abs(shear) * 2 + 2 + (pool ? w * .2 : 0)), H = Math.ceil(h * sy + lift + 2);
  const out = new Uint8ClampedArray(W * H * 4), cx = W / 2;
  if (pool) { const pr = w * (.22 + pool * .05), py = H - 2; for (let y = Math.max(0, py - 3); y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - cx) / pr, dy = (y - py) / 2.2; if (dx * dx + dy * dy < 1) { const o = (y * W + x) * 4; out[o] = 110 - ((x * 7 + y * 3) % 5) * 6; out[o + 1] = 8; out[o + 2] = 6; out[o + 3] = 255; } } }
  const dh = Math.round(h * sy), dw = Math.round(w * sx);
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.min(h - 1, Math.floor(y / sy)), t = 1 - y / dh, off = Math.round(shear * t);
    const ty = H - 1 - lift - (dh - 1 - y); if (ty < 0 || ty >= H) continue;
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.min(w - 1, Math.floor(x / sx)), i = (sy0 * w + sx0) * 4; if (!rgba[i + 3]) continue;
      const tx = Math.round(cx - dw / 2 + x + off); if (tx < 0 || tx >= W) continue;
      const o = (ty * W + tx) * 4; let r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (flash) { r += flash; g += flash * .8; b += flash * .6; }
      if (red) { r = r * (1 - red) + 150 * red; g *= 1 - red; b *= 1 - red; }
      if (dark) { r *= 1 - dark; g *= 1 - dark; b *= 1 - dark; }
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return { w: W, h: H, rgba: out };
}
function artMonFrames(d, rot) {
  const L = d.look, a = artMon(L.art); if (!a) return null;
  let file = 'm_' + L.art + '.png', mir = !!L.mirror;
  if (a.rots) { const r = rot || 1, map = a.rots >= 5 ? [1, 2, 3, 4, 5, 4, 3, 2] : [1, 1, 1, 1, 1, 1, 1, 1], idx = map[r - 1]; file = 'm_' + L.art + '_r' + idx + '.png'; if (r > 5 && a.rots >= 5) mir = !mir; }
  const im = artImg(file); if (!im) return null;
  const base = a.rots ? artImg('m_' + L.art + '_r1.png') || im : im;
  const scale = (a.h / base.height) * (L.size || 1), src = artPixels(im, L, scale, mir);
  const f = {}, FR = 'ABCDEFGHIJKL';
  if (a.death) { const dl = []; for (let i = 1; i <= a.death; i++) { const di = artImg('m_' + L.art + '_d' + i + '.png'); if (di) dl.push(di); } if (dl.length >= 5) { const pk = dl.slice(0, 5); const poses = [['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['attack', 0], ['attack', 1], ['pain', 0]]; poses.forEach(([kind, k], i) => { const p = poseFrame(src, kind, k); f[FR[i]] = clayToSprite(p, p.w >> 1, p.h, { dither: 5, rim: false, contrast: 1.04 }); }); pk.forEach((di, i) => { const p = artPixels(di, L, scale, mir); f[FR[7 + i]] = clayToSprite(p, p.w >> 1, p.h, { dither: 5, rim: false, contrast: 1.04 }); }); f._art = true; return f; } }
  const poses = [['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['attack', 0], ['attack', 1], ['pain', 0], ['dead', 0], ['dead', 1], ['dead', 2], ['dead', 3], ['dead', 4]];
  poses.forEach(([kind, k], i) => { const p = poseFrame(src, kind, k); f[FR[i]] = clayToSprite(p, p.w >> 1, p.h, { dither: 5, rim: false, contrast: 1.04 }); });
  f._art = true; f._h = src.h; f._w = src.w; return f;
}
function artWepFrames(d, id) {
  const L = d.look, a = artWep(L.art); if (!a) return null;
  const fr = (a.frames || []).map(f => artImg(f)), pk = artImg(a.pick), pj = a.proj ? artImg(a.proj) : null;
  if (fr.some(x => !x) || !pk || (a.proj && !pj)) return null;
  const sc0 = (L.size || 1) * 0.66, L0 = Object.assign({ keepSkin: L.keepSkin !== false }, L), mk0 = (im, s) => { const p = artPixels(im, L0, s, L.mirror); return clayToSprite(p, p.w >> 1, p.h, { dither: 4, rim: false, contrast: 1.03 }); };
  const out = { idle: mk0(fr[0], sc0), seq: (a.fire || [1]).map(i => mk0(fr[i] || fr[0], sc0)), pick: mk0(pk, 1) };
  out.fire = out.seq[0];
  if (pj && id != null) { const p = artPixels(pj, L, 0.55, false), s = clayToSprite(p, p.w >> 1, p.h >> 1, { dither: 3, rim: false }); SPR['p_cw' + id] = s; }
  return out;
}
// sizes for collision when a painted body is used
function artMonSize(d) { const a = artMon(d.look.art); if (!a) return null; const s = d.look.size || 1, h = Math.round(a.h * s), w = Math.round((a.w || a.h * .8) * (a.h / (a.h)) * s); return { r: clamp(Math.round(w / 2.6), 12, 64), h }; }
function artPickFor(kind, want) { // random library entry, preferring a matching archetype / class
  const list = ARTL.man ? ARTL.man[kind].filter(x => !x.hide) : []; if (!list.length) return null;
  const key = kind === 'monsters' ? 'arch' : 'cls', match = want ? list.filter(x => x[key] === want) : [];
  const pool = match.length ? match : list; return pool[Math.floor(Math.random() * pool.length)];
}
function artOptions(kind) { const list = ARTL.man ? ARTL.man[kind].filter(x => !x.hide) : []; return Object.assign({ '': kind === 'monsters' ? 'Old style (drawn by code)' : 'Old style (drawn by code)' }, Object.fromEntries(list.map(x => [x.id, x.name]))); }
