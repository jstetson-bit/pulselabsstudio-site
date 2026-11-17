/* ================= PROCEDURAL ART (original, no id Software assets) ================= */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rgb = (r, g, b) => (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255);
function texObj(w, h, px) {
  const o = { w, h, px, sh: [] };
  o.shade = function (l) { // 0..15
    let a = this.sh[l]; if (a) return a;
    a = new Uint32Array(this.px.length); const f = (l + 1) / 16;
    for (let i = 0; i < a.length; i++) { const c = this.px[i]; const al = c >>> 24; if (!al) { a[i] = 0; continue; } a[i] = (al << 24) | ((((c >> 16) & 255) * f) << 16) | ((((c >> 8) & 255) * f) << 8) | ((c & 255) * f); }
    this.sh[l] = a; return a;
  };
  return o;
}
function nameColor(n) {
  const K = [['NUKAGE', [70, 170, 40]], ['SLIME', [80, 150, 40]], ['WATER', [40, 80, 170]], ['LAVA', [230, 90, 20]], ['BLOOD', [150, 10, 10]], ['BROWN', [118, 84, 56]], ['BRN', [110, 78, 50]], ['STARG', [110, 128, 110]], ['STARB', [130, 110, 85]], ['STAR', [150, 148, 140]], ['GRAY', [125, 125, 125]], ['GSTONE', [90, 115, 90]], ['STONE', [118, 112, 104]], ['ROCKRED', [140, 45, 30]], ['RROCK', [120, 55, 35]], ['GRNROCK', [70, 100, 60]], ['RED', [150, 35, 30]], ['GREN', [60, 120, 60]], ['GRN', [70, 115, 60]], ['MARB', [80, 110, 85]], ['SKIN', [160, 105, 85]], ['WOOD', [115, 72, 40]], ['TEK', [85, 105, 100]], ['COMP', [55, 65, 95]], ['BLU', [40, 60, 150]], ['YEL', [190, 160, 40]], ['LITE', [215, 215, 200]], ['TLITE', [200, 200, 190]], ['METAL', [105, 100, 92]], ['SUPPORT', [100, 92, 80]], ['PIPE', [95, 95, 90]], ['ASH', [100, 95, 90]], ['SP_HOT', [170, 60, 20]], ['BRICK', [135, 62, 45]], ['DOOR', [125, 118, 108]], ['PLAT', [95, 95, 90]], ['EXIT', [170, 30, 30]], ['GRASS', [60, 120, 40]], ['DEM', [110, 40, 40]], ['GATE', [120, 40, 120]], ['STEP', [110, 105, 95]], ['FLAT20', [110, 110, 115]], ['FLAT14', [40, 40, 140]], ['CEIL', [105, 105, 100]], ['FLOOR', [100, 92, 82]], ['FLAT', [110, 104, 96]], ['MFLR', [90, 80, 70]]];
  for (const [k, c] of K) if (n.includes(k)) return c;
  const h = hashStr(n); return [70 + (h & 63), 70 + ((h >> 6) & 63), 70 + ((h >> 12) & 63)];
}
const TEXC = {};
function getTexProc(name, flat) {
  name = (name || '-').toUpperCase(); const k = (flat ? 'F:' : 'W:') + name;
  return TEXC[k] || (TEXC[k] = flat ? makeFlat(name) : makeWall(name));
}
function makeWall(n) {
  const W = 64, H = 128, px = new Uint32Array(W * H), R = mulberry(hashStr(n)), c = nameColor(n);
  const nz = () => (R() - 0.5);
  const put = (x, y, r, g, b) => { px[y * W + x] = rgb(r, g, b); };
  let style = 'panel';
  if (/^SW[12]/.test(n)) style = 'switch';
  else if (n.includes('DOORTRAK') || n.includes('PLAT')) style = 'track';
  else if (n.includes('DOOR')) style = 'door';
  else if (/BRICK|BROWN|BRN|ROCK|STONE|MARB|ASH|SP_HOT|GSTONE|ICK|SKIN/.test(n)) style = n.includes('BRICK') || n.includes('BROWN1') ? 'brick' : 'stone';
  else if (/COMP|TEK/.test(n)) style = 'tech';
  else if (/LITE/.test(n)) style = 'lite';
  else if (/WOOD/.test(n)) style = 'wood';
  else if (/SUPPORT|METAL|PIPE/.test(n)) style = 'metal';
  else if (/GRATE/.test(n)) style = 'grate';
  else if (/EXITSIGN/.test(n)) style = 'exitsign';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let k = 1 + nz() * 0.18, [r, g, b] = c;
    switch (style) {
      case 'brick': { const row = y >> 4, off = (row & 1) * 16, bx = (x + off) & 31; if ((y & 15) === 0 || bx === 0) k *= 0.45; else if ((y & 15) === 1 || bx === 1) k *= 1.25; break; }
      case 'stone': { const row = y >> 5, off = (row & 1) * 24, bx = ((x + off) % 48 + 48) % 48; const ed = Math.min(y & 31, 31 - (y & 31), bx, 47 - bx); k *= ed < 1 ? 0.5 : ed < 3 ? 0.8 : 1 + Math.sin(x * 0.7 + y * 0.3) * 0.06; break; }
      case 'tech': { const px2 = x & 31, py2 = y & 31; if (px2 === 0 || py2 === 0) k *= 0.5; else if (px2 < 3 || py2 < 3) k *= 1.2; if (px2 > 8 && px2 < 24 && py2 > 8 && py2 < 22) { k = 0.35; if (((x * 7 + y * 13) % 11) === 0) { r = 255 * R(); g = 200; b = 60; k = 1; } } break; }
      case 'door': { k *= ((y & 15) === 0) ? 0.55 : 1; if (x === 31 || x === 32) k *= 0.4; if (y > 50 && y < 70 && x > 22 && x < 42) { r = 180; g = 40; b = 40; } break; }
      case 'track': { k *= (y & 7) < 4 ? 1.15 : 0.6; if (x < 4 || x > 59) k *= 0.6; r = 160; g = 150; b = 40; if ((x + y) & 8) { r = 40; g = 40; b = 40; } break; }
      case 'switch': { [r, g, b] = [110, 110, 118]; if (x > 18 && x < 46 && y > 40 && y < 80) { k = 0.55; if (x > 26 && x < 38 && y > (n[2] === '1' ? 46 : 60) && y < (n[2] === '1' ? 60 : 74)) { r = n[2] === '1' ? 220 : 40; g = n[2] === '1' ? 40 : 220; b = 40; k = 1; } } if (n.includes('EXIT') && y > 16 && y < 34 && x > 8 && x < 56) { r = 200; g = 30; b = 30; k = ((x >> 2) + (y >> 2)) & 1 ? 1 : 0.8; } break; }
      case 'lite': { const d = Math.abs(x - 32); k = d < 20 ? 1.35 - d / 60 : 0.6; break; }
      case 'wood': { k *= 0.85 + Math.sin(y * 0.25 + Math.sin(x * 0.4) * 2) * 0.15; if ((x & 15) === 0) k *= 0.5; break; }
      case 'metal': { if ((x & 15) === 0) k *= 0.6; if ((y & 31) === 2 && (x & 7) === 4) k = 1.6; k *= 0.9 + (y / H) * 0.2; break; }
      case 'grate': { if ((x & 7) > 1 && (y & 7) > 1) { px[y * W + x] = 0; continue; } break; }
      case 'exitsign': { [r, g, b] = [30, 20, 20]; if (y > 8 && y < 40 && x > 4 && x < 60) { r = 220; g = 30; b = 30; } break; }
      default: { // starbase-style panel
        const py2 = y & 63; if (py2 === 0 || (x & 63) === 0) k *= 0.5; else if (py2 < 2) k *= 1.25;
        if (n.startsWith('STAR') && py2 > 40 && py2 < 46) k *= 0.7;
        if ((x === 8 || x === 56) && (py2 === 8 || py2 === 56)) k = 1.5;
      }
    }
    put(x, y, r * k, g * k, b * k);
  }
  return texObj(W, H, px);
}
function makeFlat(n) {
  const W = 64, H = 64, px = new Uint32Array(W * H), R = mulberry(hashStr(n)), c = nameColor(n);
  const liquid = /NUKAGE|WATER|LAVA|BLOOD|SLIME/.test(n), rock = /ROCK|GRASS|MFLR|DEM/.test(n), light = /TLITE|LIGHT/.test(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let k = 1 + (R() - 0.5) * 0.2, [r, g, b] = c;
    if (liquid) k = 0.75 + 0.25 * Math.sin(x * 0.3 + Math.sin(y * 0.2) * 3) * Math.cos(y * 0.25);
    else if (rock) k *= 0.8 + 0.3 * Math.abs(Math.sin(x * 0.13 + y * 0.07) * Math.cos(y * 0.11 - x * 0.05));
    else if (light) { const d = Math.hypot(x - 32, y - 32); k = d < 14 ? 1.5 : d < 18 ? 0.5 : 0.85; }
    else if (n === 'STEP1' || n.includes('PLAT')) k *= (y & 7) < 2 ? 0.6 : 1;
    else { const t = /FLOOR5|FLAT5|CEIL1/.test(n) ? 16 : 32; if (x % t === 0 || y % t === 0) k *= 0.55; else if (x % t === 1 || y % t === 1) k *= 1.2; }
    px[y * W + x] = rgb(r * k, g * k, b * k);
  }
  return texObj(W, H, px);
}
let SKY = null;
function getSkyProc() {
  if (SKY) return SKY;
  const W = 256, H = 128, px = new Uint32Array(W * H), R = mulberry(77);
  const mh = []; let hgt = 60; for (let x = 0; x < W; x++) { hgt += (R() - 0.5) * 6; hgt = clamp(hgt, 40, 95); mh.push(hgt); }
  for (let x = 0; x < W; x++) { const a = mh[(x + W - 1) % W], b = mh[x], c = mh[(x + 1) % W]; mh[x] = (a + b + c) / 3; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / H; let r = 120 + 110 * t, g = 20 + 60 * t, b = 20 + 10 * t;
    if (R() < 0.002 && y < 50) { r = g = b = 230; }
    if (y > mh[x]) { const k = 0.25 + (y - mh[x]) / 200; r = 70 * k; g = 30 * k; b = 25 * k; }
    px[y * W + x] = rgb(r, g, b);
  }
  return SKY = texObj(W, H, px);
}

/* ---------- sprites (drawn with canvas, original designs) ---------- */
const SPR = {};
function mkSprite(key, w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  draw(g, w, h);
  const d = g.getImageData(0, 0, w, h).data, px = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3]; px[i] = a > 100 ? rgb(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) : 0; }
  const o = texObj(w, h, px); o.canvas = c; SPR[key] = o; return o;
}
function initSprites() {
  const body = (g, w, h, skin, suit, head, gun) => {
    g.fillStyle = suit; g.fillRect(w * .28, h * .3, w * .44, h * .38); // torso
    g.fillRect(w * .3, h * .66, w * .16, h * .34); g.fillRect(w * .54, h * .66, w * .16, h * .34); // legs
    g.fillStyle = head; g.beginPath(); g.arc(w / 2, h * .18, w * .16, 0, 7); g.fill();
    g.fillStyle = skin; g.fillRect(w * .14, h * .32, w * .14, h * .3); g.fillRect(w * .72, h * .32, w * .14, h * .3);
    g.fillStyle = '#300'; g.fillRect(w * .4, h * .15, w * .07, h * .04); g.fillRect(w * .53, h * .15, w * .07, h * .04);
    if (gun) { g.fillStyle = gun; g.fillRect(w * .35, h * .42, w * .5, h * .08); }
  };
  mkSprite('zombie', 40, 56, (g, w, h) => body(g, w, h, '#7a8a6a', '#4d5a3c', '#b8a48a', '#333'));
  mkSprite('sergeant', 40, 56, (g, w, h) => body(g, w, h, '#555', '#2a2a26', '#9c8a74', '#222'));
  mkSprite('chaingunner', 44, 58, (g, w, h) => body(g, w, h, '#7a3a2a', '#6a2a22', '#b09080', '#111'));
  mkSprite('imp', 44, 58, (g, w, h) => {
    body(g, w, h, '#7a5030', '#6b4428', '#7a5030');
    g.fillStyle = '#e8d8b0'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w * .3 + i * w * .1, h * .32); g.lineTo(w * .34 + i * w * .1, h * .24); g.lineTo(w * .38 + i * w * .1, h * .32); g.fill(); }
    g.fillStyle = '#ff3000'; g.fillRect(w * .39, h * .14, w * .08, h * .05); g.fillRect(w * .53, h * .14, w * .08, h * .05);
  });
  mkSprite('demon', 60, 56, (g, w, h) => {
    g.fillStyle = '#c86478'; g.beginPath(); g.ellipse(w / 2, h * .5, w * .42, h * .3, 0, 0, 7); g.fill();
    g.fillRect(w * .2, h * .7, w * .14, h * .3); g.fillRect(w * .66, h * .7, w * .14, h * .3);
    g.fillStyle = '#300'; g.fillRect(w * .25, h * .45, w * .5, h * .14); g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(w * .27 + i * w * .08, h * .45, w * .03, h * .05);
    g.fillStyle = '#ff0'; g.fillRect(w * .32, h * .32, w * .08, h * .05); g.fillRect(w * .6, h * .32, w * .08, h * .05);
  });
  mkSprite('lostsoul', 36, 40, (g, w, h) => {
    g.fillStyle = '#ff8a00'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(w * (.2 + i * .1), h * .3, w * .1, 0, 7); g.fill(); }
    g.fillStyle = '#ddd'; g.beginPath(); g.arc(w / 2, h * .55, w * .3, 0, 7); g.fill(); g.fillStyle = '#000'; g.fillRect(w * .32, h * .5, w * .12, h * .1); g.fillRect(w * .56, h * .5, w * .12, h * .1); g.fillRect(w * .4, h * .72, w * .2, h * .06);
  });
  mkSprite('caco', 64, 64, (g, w, h) => {
    g.fillStyle = '#c0282a'; g.beginPath(); g.arc(w / 2, h / 2, w * .44, 0, 7); g.fill();
    g.fillStyle = '#8a1a1a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * (.2 + i * .12), h * .1, w * .05, 0, 7); g.fill(); }
    g.fillStyle = '#2aa0ff'; g.beginPath(); g.arc(w / 2, h * .38, w * .12, 0, 7); g.fill(); g.fillStyle = '#062'; g.beginPath(); g.arc(w / 2, h * .38, w * .05, 0, 7); g.fill();
    g.fillStyle = '#300'; g.beginPath(); g.ellipse(w / 2, h * .7, w * .25, h * .1, 0, 0, 7); g.fill();
  });
  mkSprite('baron', 48, 72, (g, w, h) => { body(g, w, h, '#d9b28c', '#b8875e', '#d9b28c'); g.fillStyle = '#ddd'; g.fillRect(w * .32, h * .02, w * .06, h * .1); g.fillRect(w * .62, h * .02, w * .06, h * .1); g.fillStyle = '#7a3'; g.fillRect(w * .4, h * .15, w * .06, h * .03); g.fillRect(w * .54, h * .15, w * .06, h * .03); });
  mkSprite('knight', 48, 72, (g, w, h) => { body(g, w, h, '#9a7b5a', '#7a5a3a', '#9a7b5a'); g.fillStyle = '#ccc'; g.fillRect(w * .32, h * .02, w * .06, h * .1); g.fillRect(w * .62, h * .02, w * .06, h * .1); });
  mkSprite('arach', 128, 64, (g, w, h) => { g.strokeStyle = '#555'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w / 2, h * .5); g.lineTo(w * (.05 + i * .3), h * .98); g.stroke(); } g.fillStyle = '#bba'; g.beginPath(); g.ellipse(w / 2, h * .4, w * .2, h * .3, 0, 0, 7); g.fill(); g.fillStyle = '#c55'; g.fillRect(w * .44, h * .55, w * .12, h * .1); });
  mkSprite('spider', 200, 110, (g, w, h) => { g.strokeStyle = '#666'; g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w / 2, h * .55); g.lineTo(w * (.05 + i * .3), h); g.stroke(); } g.fillStyle = '#d9a3a3'; g.beginPath(); g.ellipse(w / 2, h * .38, w * .2, h * .3, 0, 0, 7); g.fill(); g.fillStyle = '#333'; g.fillRect(w * .4, h * .62, w * .2, h * .1); });
  mkSprite('cyber', 80, 112, (g, w, h) => { body(g, w, h, '#8a5a3a', '#6a4a30', '#8a5a3a', '#777'); g.fillStyle = '#ddd'; g.fillRect(w * .3, 0, w * .08, h * .12); g.fillRect(w * .62, 0, w * .08, h * .12); });
  const item = (k, w, h, fn) => mkSprite(k, w, h, fn);
  item('clip', 12, 10, (g) => { g.fillStyle = '#c9a43a'; g.fillRect(2, 2, 8, 8); g.fillStyle = '#665'; g.fillRect(2, 0, 8, 3); });
  item('bbox', 26, 14, (g) => { g.fillStyle = '#6a5a2a'; g.fillRect(0, 2, 26, 12); g.fillStyle = '#d4b44a'; for (let i = 0; i < 6; i++) g.fillRect(2 + i * 4, 0, 3, 4); });
  item('shells', 16, 8, (g) => { g.fillStyle = '#c22'; for (let i = 0; i < 4; i++) g.fillRect(i * 4, 0, 3, 7); g.fillStyle = '#da5'; for (let i = 0; i < 4; i++) g.fillRect(i * 4, 5, 3, 3); });
  item('sbox', 30, 14, (g) => { g.fillStyle = '#8a2a1a'; g.fillRect(0, 2, 30, 12); g.fillStyle = '#eee'; g.fillRect(4, 5, 22, 4); });
  item('rocket', 10, 26, (g) => { g.fillStyle = '#7a8a5a'; g.fillRect(2, 4, 6, 20); g.fillStyle = '#c33'; g.beginPath(); g.moveTo(1, 5); g.lineTo(5, 0); g.lineTo(9, 5); g.fill(); });
  item('rbox', 30, 18, (g) => { g.fillStyle = '#5a4a2a'; g.fillRect(0, 4, 30, 14); g.fillStyle = '#7a8a5a'; for (let i = 0; i < 5; i++) g.fillRect(2 + i * 6, 0, 4, 8); });
  item('cell', 16, 12, (g) => { g.fillStyle = '#3a3a5a'; g.fillRect(0, 0, 16, 12); g.fillStyle = '#4af'; g.fillRect(3, 3, 10, 6); });
  item('cpack', 26, 20, (g) => { g.fillStyle = '#3a3a5a'; g.fillRect(0, 0, 26, 20); g.fillStyle = '#4af'; g.fillRect(3, 3, 20, 14); });
  item('backpack', 22, 22, (g) => { g.fillStyle = '#6a5030'; g.fillRect(2, 4, 18, 18); g.fillStyle = '#4a3820'; g.fillRect(0, 10, 22, 4); });
  item('stim', 14, 12, (g) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, 14, 12); g.fillStyle = '#d00'; g.fillRect(5, 2, 4, 8); g.fillRect(3, 4, 8, 4); });
  item('medkit', 28, 18, (g) => { g.fillStyle = '#eee'; g.fillRect(0, 0, 28, 18); g.fillStyle = '#d00'; g.fillRect(11, 3, 6, 12); g.fillRect(7, 6, 14, 6); });
  item('hbonus', 12, 16, (g) => { g.fillStyle = '#39f'; g.fillRect(3, 4, 6, 12); g.fillStyle = '#aef'; g.fillRect(4, 0, 4, 5); });
  item('abonus', 14, 14, (g) => { g.fillStyle = '#4c4'; g.beginPath(); g.arc(7, 7, 6, 0, 7); g.fill(); g.fillStyle = '#ff0'; g.fillRect(5, 5, 4, 4); });
  item('garmor', 30, 18, (g) => { g.fillStyle = '#2b2'; g.fillRect(2, 0, 26, 18); g.fillStyle = '#060'; g.fillRect(12, 2, 6, 14); });
  item('barmor', 30, 18, (g) => { g.fillStyle = '#26f'; g.fillRect(2, 0, 26, 18); g.fillStyle = '#028'; g.fillRect(12, 2, 6, 14); });
  item('soul', 22, 26, (g) => { const r = g.createRadialGradient(11, 11, 2, 11, 11, 11); r.addColorStop(0, '#9cf'); r.addColorStop(1, '#03c'); g.fillStyle = r; g.beginPath(); g.arc(11, 11, 11, 0, 7); g.fill(); });
  item('mega', 22, 26, (g) => { const r = g.createRadialGradient(11, 11, 2, 11, 11, 11); r.addColorStop(0, '#fff'); r.addColorStop(1, '#999'); g.fillStyle = r; g.beginPath(); g.arc(11, 11, 11, 0, 7); g.fill(); });
  const gunS = (k, w, col, l2) => item(k, w, 12, (g) => { g.fillStyle = col; g.fillRect(0, 3, w, 5); g.fillStyle = '#5a3a1a'; g.fillRect(w - 12, 4, 12, 8); if (l2) { g.fillStyle = col; g.fillRect(0, 0, w * .7, 3); } });
  gunS('shotgun', 56, '#555'); gunS('ssg', 50, '#444', 1); gunS('chaingun', 52, '#666', 1); gunS('rl', 56, '#5a6a4a', 1); gunS('plasma', 52, '#4a5a7a', 1); gunS('bfg', 60, '#3a6a3a', 1); gunS('saw', 50, '#a33');
  const card = (k, c) => item(k, 12, 16, (g) => { g.fillStyle = c; g.fillRect(1, 0, 10, 16); g.fillStyle = '#fff'; g.fillRect(3, 3, 6, 4); });
  card('bcard', '#25f'); card('ycard', '#fd2'); card('rcard', '#e22');
  const skull = (k, c) => item(k, 16, 18, (g) => { g.fillStyle = '#eee'; g.beginPath(); g.arc(8, 8, 7, 0, 7); g.fill(); g.fillStyle = c; g.fillRect(3, 6, 4, 4); g.fillRect(9, 6, 4, 4); g.fillRect(5, 13, 6, 5); });
  skull('bskull', '#25f'); skull('yskull', '#fd2'); skull('rskull', '#e22');
  item('barrel', 22, 32, (g) => { g.fillStyle = '#3a6a3a'; g.fillRect(1, 0, 20, 32); g.fillStyle = '#2a4a2a'; g.fillRect(1, 6, 20, 3); g.fillRect(1, 24, 20, 3); g.fillStyle = '#7f4'; g.fillRect(4, 0, 14, 3); });
  item('lamp', 22, 52, (g) => { g.fillStyle = '#555'; g.fillRect(9, 12, 4, 40); g.fillRect(3, 48, 16, 4); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(11, 9, 9, 0, 7); g.fill(); });
  item('column', 26, 128, (g) => { g.fillStyle = '#556'; g.fillRect(3, 0, 20, 128); g.fillStyle = '#9ab'; for (let y = 6; y < 128; y += 16) g.fillRect(6, y, 14, 4); });
  item('gpillar', 30, 52, (g) => { g.fillStyle = '#3a7a3a'; g.fillRect(4, 0, 22, 52); g.fillStyle = '#2a5a2a'; g.fillRect(0, 0, 30, 6); g.fillRect(0, 46, 30, 6); });
  const torch = (k, c) => item(k, 18, 68, (g) => { g.fillStyle = '#654'; g.fillRect(7, 20, 4, 48); g.fillStyle = c; g.beginPath(); g.ellipse(9, 12, 7, 12, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(9, 15, 3, 6, 0, 0, 7); g.fill(); });
  torch('rtorch', '#f40'); torch('btorch', '#28f');
  item('candle', 8, 14, (g) => { g.fillStyle = '#eed'; g.fillRect(2, 5, 4, 9); g.fillStyle = '#fc3'; g.beginPath(); g.ellipse(4, 3, 2, 3, 0, 0, 7); g.fill(); });
  item('candelabra', 28, 60, (g) => { g.fillStyle = '#a83'; g.fillRect(12, 14, 4, 46); g.fillRect(2, 14, 24, 3); g.fillRect(6, 56, 16, 4); g.fillStyle = '#fc3'; [3, 13, 23].forEach(x => { g.beginPath(); g.ellipse(x + 1, 8, 3, 6, 0, 0, 7); g.fill(); }); });
  item('gore', 40, 10, (g) => { g.fillStyle = '#801010'; g.beginPath(); g.ellipse(20, 6, 19, 4, 0, 0, 7); g.fill(); g.fillStyle = '#c03030'; g.fillRect(12, 3, 10, 4); });
  item('corpse', 44, 12, (g) => { g.fillStyle = '#701010'; g.beginPath(); g.ellipse(22, 8, 21, 4, 0, 0, 7); g.fill(); g.fillStyle = '#a02020'; g.fillRect(10, 3, 22, 6); });
  const ball = (k, s, c1, c2) => item(k, s, s, (g) => { const r = g.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2); r.addColorStop(0, c1); r.addColorStop(1, c2); g.fillStyle = r; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, 7); g.fill(); });
  ball('p_fire', 14, '#fff6a0', '#ff4000'); ball('p_caco', 16, '#ffd0ff', '#a020c0'); ball('p_baron', 16, '#e0ffe0', '#20c040'); ball('p_plasmam', 12, '#e0f8ff', '#20a0ff'); ball('p_plasma', 12, '#e0f8ff', '#3070ff'); ball('p_rocket', 12, '#fff', '#f80'); ball('p_rocketm', 14, '#fff', '#f60'); ball('p_bfg', 30, '#efe', '#2c2');
  ball('explode', 48, '#fff8c0', '#ff3000'); ball('puff', 8, '#fff', '#888'); ball('blood', 8, '#f44', '#600');
}
