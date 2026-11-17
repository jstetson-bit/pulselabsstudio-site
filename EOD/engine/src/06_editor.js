/* ================= 2D EDITOR (UDB-style classic modes) ================= */
const E = {
  mode: 'sectors', sel: { v: new Set(), l: new Set(), s: new Set(), t: new Set() },
  view: { x: 256, y: 512, z: 0.5 }, hover: null, draw: [], drawPreview: null, rect: null,
  multi: false, thingType: 3001, viewMode: 'normal', clip: null, mouse: null
};
const MODES = [
  ['vertices', 'Vertices', 'V'], ['linedefs', 'Linedefs', 'L'], ['sectors', 'Sectors', 'S'], ['things', 'Things', 'T'], null,
  ['drawlines', 'Draw Lines', 'D'], ['drawrect', 'Rectangle', 'R'], ['drawellipse', 'Ellipse', 'E'], ['makesector', 'Make Sector', 'M'], null,
  ['visual', '3D Visual', 'W']
];
const SELKEY = { vertices: 'v', linedefs: 'l', sectors: 's', things: 't' };
function clearSel() { for (const k in E.sel) E.sel[k].clear(); }
function curSel() { return E.sel[SELKEY[E.mode]]; }

const ed = { cv: null, g: null, W: 0, H: 0, dpr: 1, pend: false, pathCache: null, pathVer: -1 };
function w2s(x, y) { return [(x - E.view.x) * E.view.z + ed.W / 2, ed.H / 2 - (y - E.view.y) * E.view.z]; }
function s2w(sx, sy) { return [(sx - ed.W / 2) / E.view.z + E.view.x, (ed.H / 2 - sy) / E.view.z + E.view.y]; }
function snapW(x, y, allowVert = true) {
  if (allowVert) { const r = 10 / E.view.z; let best = -1, bd = r; M.v.forEach((v, i) => { const d = Math.hypot(v.x - x, v.y - y); if (d < bd) { bd = d; best = i; } }); if (best >= 0) return { x: M.v[best].x, y: M.v[best].y }; }
  if (!S.snap) return { x: Math.round(x), y: Math.round(y) };
  const g = S.grid; return { x: Math.round(x / g) * g, y: Math.round(y / g) * g };
}
function edResize() {
  const r = ed.cv.getBoundingClientRect(); ed.dpr = Math.min(2, window.devicePixelRatio || 1);
  ed.W = r.width; ed.H = r.height; ed.cv.width = Math.round(r.width * ed.dpr); ed.cv.height = Math.round(r.height * ed.dpr);
  edRedraw();
}
function edRedraw() { if (ed.pend || !ed.g) return; ed.pend = true; requestAnimationFrame(() => { ed.pend = false; try { edDraw(); } catch (e) { logCrash('edDraw: ' + e.stack); } }); }
function zoomFit() {
  if (!M.v.length && !M.t.length) { E.view = { x: 256, y: 256, z: 0.6 }; edRedraw(); return; }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const inc = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  M.v.forEach(v => inc(v.x, v.y)); M.t.forEach(t => inc(t.x, t.y));
  E.view.x = (x0 + x1) / 2; E.view.y = (y0 + y1) / 2; E.view.z = clamp(Math.min(ed.W / (x1 - x0 + 128), ed.H / (y1 - y0 + 128)), 0.02, 8); edRedraw();
}
function sectorPaths() {
  if (ed.pathVer === MAPVER && ed.pathCache) return ed.pathCache;
  const edges = M.sec.map(() => []);
  M.l.forEach(L => { const a = sideSec(L.s1), b = sideSec(L.s2); if (a >= 0) edges[a].push([L.v1, L.v2]); if (b >= 0) edges[b].push([L.v2, L.v1]); });
  ed.pathCache = edges.map(list => {
    const p = new Path2D(), from = new Map();
    list.forEach((e, i) => { if (!from.has(e[0])) from.set(e[0], []); from.get(e[0]).push(i); });
    const used = new Uint8Array(list.length);
    for (let i = 0; i < list.length; i++) {
      if (used[i]) continue; used[i] = 1; const st = list[i][0]; let cur = list[i][1];
      p.moveTo(M.v[st].x, M.v[st].y); p.lineTo(M.v[cur].x, M.v[cur].y);
      for (let n = 0; n < list.length && cur !== st; n++) { const c = (from.get(cur) || []).find(j => !used[j]); if (c === undefined) break; used[c] = 1; cur = list[c][1]; p.lineTo(M.v[cur].x, M.v[cur].y); }
      p.closePath();
    }
    return p;
  });
  ed.pathVer = MAPVER; return ed.pathCache;
}
function edDraw() {
  const g = ed.g, W = ed.W, H = ed.H, z = E.view.z, dark = isDark();
  g.setTransform(ed.dpr, 0, 0, ed.dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  g.fillStyle = cs.getPropertyValue('--edbg'); g.fillRect(0, 0, W, H);
  // grid
  const gs = S.grid; let step = gs; while (step * z < 7) step *= 2;
  const [wx0, wy1] = s2w(0, 0), [wx1, wy0] = s2w(W, H);
  g.lineWidth = 1;
  const gl = (major) => { g.strokeStyle = cs.getPropertyValue(major ? '--grid2' : '--grid'); g.beginPath(); const st = major ? Math.max(step, 64) * (Math.max(step, 64) * z < 24 ? 4 : 1) : step; for (let x = Math.floor(wx0 / st) * st; x <= wx1; x += st) { const sx = Math.round(w2s(x, 0)[0]) + .5; g.moveTo(sx, 0); g.lineTo(sx, H); } for (let y = Math.floor(wy0 / st) * st; y <= wy1; y += st) { const sy = Math.round(w2s(0, y)[1]) + .5; g.moveTo(0, sy); g.lineTo(W, sy); } g.stroke(); };
  gl(false); gl(true);
  const [ox, oy] = w2s(0, 0); g.strokeStyle = dark ? '#3a3a55' : '#b0b0c8'; g.beginPath(); g.moveTo(ox, 0); g.lineTo(ox, H); g.moveTo(0, oy); g.lineTo(W, oy); g.stroke();
  // sectors
  const paths = sectorPaths();
  g.save(); g.setTransform(ed.dpr * z, 0, 0, -ed.dpr * z, ed.dpr * (W / 2 - E.view.x * z), ed.dpr * (H / 2 + E.view.y * z));
  const tagHi = new Set();
  E.sel.l.forEach(li => { const L = M.l[li]; if (L && L.tag) M.sec.forEach((s, i) => { if (s.tag === L.tag) tagHi.add(i); }); });
  M.sec.forEach((s, i) => {
    let fill = null;
    if (E.viewMode === 'brightness') { const v = s.li | 0; fill = `rgba(${v},${v},${v * 0.9 | 0},0.55)`; }
    else if (E.viewMode === 'floors') { const t = clamp((s.fh + 128) / 512, 0, 1); fill = `rgba(${40 + t * 200 | 0},${80 + t * 60 | 0},${200 - t * 160 | 0},0.35)`; }
    else if (E.mode === 'sectors' || E.mode === 'makesector') fill = dark ? 'rgba(120,120,160,0.10)' : 'rgba(80,80,140,0.10)';
    if (E.sel.s.has(i)) fill = 'rgba(212,32,44,0.40)';
    else if (tagHi.has(i)) fill = 'rgba(255,212,0,0.30)';
    else if (E.hover && E.hover.k === 's' && E.hover.i === i) fill = 'rgba(255,212,0,0.22)';
    if (fill && paths[i]) { g.fillStyle = fill; g.fill(paths[i], 'evenodd'); }
  });
  g.restore();
  // lines
  const showVerts = E.mode === 'vertices' || E.mode === 'linedefs' || E.mode.startsWith('draw');
  const selTagSec = new Set(); E.sel.s.forEach(si => { const t = M.sec[si] && M.sec[si].tag; if (t) selTagSec.add(t); });
  for (let i = 0; i < M.l.length; i++) {
    const L = M.l[i], a = M.v[L.v1], b = M.v[L.v2]; if (!a || !b) continue;
    const [x1, y1] = w2s(a.x, a.y), [x2, y2] = w2s(b.x, b.y);
    if (Math.max(x1, x2) < -5 || Math.min(x1, x2) > W + 5 || Math.max(y1, y2) < -5 || Math.min(y1, y2) > H + 5) continue;
    let col, w = 1.4;
    if (L.s1 < 0 && L.s2 < 0) col = '#ff8a00';
    else if (L.sp) col = '#45d36a';
    else if (L.s2 >= 0) col = dark ? '#8a8a96' : '#8a8a96';
    else col = dark ? '#ffffff' : '#111';
    if (L.tag && selTagSec.has(L.tag)) { col = '#ffd400'; w = 2.5; }
    if (E.sel.l.has(i)) { col = '#ff3040'; w = 3; }
    else if (E.hover && E.hover.k === 'l' && E.hover.i === i) { col = '#ffd400'; w = 3; }
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    if ((E.mode === 'linedefs' || E.sel.l.has(i)) && z > 0.08) { // front-side tick
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, k = Math.min(8, len / 4);
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - dy / len * k, my + dx / len * k); g.stroke();
    }
  }
  if (showVerts && z > 0.05) {
    M.v.forEach((v, i) => {
      const [x, y] = w2s(v.x, v.y); if (x < -5 || y < -5 || x > W + 5 || y > H + 5) return;
      const sel = E.sel.v.has(i), hov = E.hover && E.hover.k === 'v' && E.hover.i === i;
      g.fillStyle = sel ? '#ff3040' : hov ? '#ffd400' : (dark ? '#9ad' : '#357'); const r = sel || hov ? 4 : 2.5; g.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
  // things
  M.t.forEach((t, i) => {
    const d = THINGS[t.type] || { cat: 'decor', r: 16 }; const [x, y] = w2s(t.x, t.y);
    const r = Math.max(4, d.r * z); if (x < -r || y < -r || x > W + r || y > H + r) return;
    const sel = E.sel.t.has(i), hov = E.hover && E.hover.k === 't' && E.hover.i === i;
    g.globalAlpha = E.mode === 'things' ? 1 : 0.65;
    g.fillStyle = CAT_COLOR[d.cat] || '#aaa'; g.strokeStyle = sel ? '#ff3040' : hov ? '#ffd400' : '#000'; g.lineWidth = sel || hov ? 3 : 1.2;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    const a = t.a * Math.PI / 180; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y - Math.sin(a) * r); g.stroke();
    if (r > 10) { g.fillStyle = '#000'; g.font = 'bold ' + Math.min(14, r * 0.8) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d.cat === 'player' ? (t.type === 1 ? 'P1' : t.type === 14 ? 'TP' : 'P') : (d.name || '?')[0], x, y); }
    g.globalAlpha = 1;
  });
  // draw previews
  if (E.mode === 'drawlines' && E.draw.length) {
    g.strokeStyle = '#ffd400'; g.lineWidth = 2; g.beginPath(); E.draw.forEach((p, i) => { const [x, y] = w2s(p.x, p.y); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    if (E.drawPreview) { const [x, y] = w2s(E.drawPreview.x, E.drawPreview.y); g.lineTo(x, y); } g.stroke();
    E.draw.forEach((p, i) => { const [x, y] = w2s(p.x, p.y); g.fillStyle = i === 0 ? '#45d36a' : '#ffd400'; g.fillRect(x - 5, y - 5, 10, 10); });
    if (E.drawPreview && E.draw.length) { const l = E.draw[E.draw.length - 1], p = E.drawPreview; const [x, y] = w2s((l.x + p.x) / 2, (l.y + p.y) / 2); g.fillStyle = '#ffd400'; g.font = '12px sans-serif'; g.fillText(Math.round(Math.hypot(p.x - l.x, p.y - l.y)), x + 8, y - 8); }
  }
  if ((E.mode === 'drawrect' || E.mode === 'drawellipse') && E.rect) {
    const r = E.rect; const pts = E.mode === 'drawrect' ? rectPts(r.x0, r.y0, r.x1, r.y1) : ellipsePts(r.x0, r.y0, r.x1, r.y1, S.ellipseSides);
    g.strokeStyle = '#ffd400'; g.lineWidth = 2; g.beginPath(); pts.forEach((p, i) => { const [x, y] = w2s(p.x, p.y); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke();
    const [tx, ty] = w2s(Math.max(r.x0, r.x1), Math.max(r.y0, r.y1)); g.fillStyle = '#ffd400'; g.font = '12px sans-serif'; g.fillText(Math.abs(r.x1 - r.x0) + ' x ' + Math.abs(r.y1 - r.y0), tx + 6, ty - 6);
  }
  if (E.mouse && (E.mode.startsWith('draw'))) { const p = snapW(E.mouse.x, E.mouse.y); const [x, y] = w2s(p.x, p.y); g.strokeStyle = '#ffd400'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); g.stroke(); }
  // status
  const sel = Object.values(E.sel).reduce((a, s) => a + s.size, 0);
  const mp = E.mouse ? ' · ' + Math.round(E.mouse.x) + ', ' + Math.round(E.mouse.y) : '';
  $('#status').textContent = (MODES.find(m => m && m[0] === E.mode) || ['', E.mode])[1] + ' · grid ' + S.grid + (S.snap ? '' : ' (snap off)') + ' · zoom ' + Math.round(z * 100) + '%' + mp + ' · ' + M.sec.length + ' sectors, ' + M.l.length + ' lines, ' + M.t.length + ' things' + (sel ? ' · ' + sel + ' selected' : '') + (E.multi ? ' · MULTI' : '');
  $('#drawbar').hidden = !(E.mode === 'drawlines' && E.draw.length);
}

/* ---------- picking ---------- */
function pick(wx, wy, kind) {
  const r = 12 / E.view.z;
  if (kind === 't') { let b = -1, bd = Infinity; M.t.forEach((t, i) => { const d = Math.hypot(t.x - wx, t.y - wy); const rr = Math.max((THINGS[t.type] || { r: 16 }).r, r); if (d < rr && d < bd) { bd = d; b = i; } }); return b; }
  if (kind === 'v') { let b = -1, bd = r; M.v.forEach((v, i) => { const d = Math.hypot(v.x - wx, v.y - wy); if (d < bd) { bd = d; b = i; } }); return b; }
  if (kind === 'l') { let b = -1, bd = r; M.l.forEach((L, i) => { const a = M.v[L.v1], c = M.v[L.v2]; const d = distSeg(wx, wy, a.x, a.y, c.x, c.y); if (d < bd) { bd = d; b = i; } }); return b; }
  if (kind === 's') return sectorAt(wx, wy);
  return -1;
}
function hoverAt(wx, wy) {
  const k = SELKEY[E.mode] || (E.mode === 'makesector' ? 's' : null); if (!k) return null;
  const i = pick(wx, wy, k); return i >= 0 ? { k, i } : null;
}

/* ---------- input ---------- */
const PT = new Map(); let gest = null, lastTap = { t: 0, x: 0, y: 0 };
function edPointerDown(e) {
  ed.cv.setPointerCapture(e.pointerId);
  PT.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (PT.size === 2) { const [a, b] = [...PT.values()]; gest = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: E.view.z, c0: s2w((a.x + b.x) / 2, (a.y + b.y) / 2), m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; E.rect = null; return; }
  if (PT.size > 2) return;
  const [wx, wy] = s2w(e.offsetX, e.offsetY);
  gest = { kind: 'tap', sx: e.offsetX, sy: e.offsetY, wx, wy, moved: false, btn: e.button, t: performance.now() };
  if (E.mode === 'drawrect' || E.mode === 'drawellipse') { const p = snapW(wx, wy); gest.kind = 'rect'; E.rect = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; return; }
  const k = SELKEY[E.mode];
  if (k && e.button !== 1 && e.button !== 2) {
    const hit = pick(wx, wy, k);
    if (hit >= 0) { gest.hit = { k, i: hit }; }
  }
}
function edPointerMove(e) {
  const p = PT.get(e.pointerId);
  const [wx, wy] = s2w(e.offsetX, e.offsetY); E.mouse = { x: wx, y: wy };
  if (!p) { // hover (mouse)
    const h = hoverAt(wx, wy); if (JSON.stringify(h) !== JSON.stringify(E.hover)) E.hover = h;
    if (E.mode === 'drawlines' && E.draw.length) E.drawPreview = snapW(wx, wy);
    edRedraw(); return;
  }
  p.x = e.offsetX; p.y = e.offsetY;
  if (!gest) return;
  if (gest.kind === 'pinch' && PT.size >= 2) {
    const [a, b] = [...PT.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    E.view.z = clamp(gest.z0 * d / gest.d0, 0.02, 12);
    E.view.x = gest.c0[0] - (m.x - ed.W / 2) / E.view.z; E.view.y = gest.c0[1] + (m.y - ed.H / 2) / E.view.z; edRedraw(); return;
  }
  const dx = e.offsetX - gest.sx, dy = e.offsetY - gest.sy;
  if (!gest.moved && Math.hypot(dx, dy) > 7) {
    gest.moved = true;
    if (gest.kind === 'tap') {
      if (gest.hit && gest.btn !== 1) {
        const set = E.sel[gest.hit.k]; if (!set.has(gest.hit.i)) { if (!E.multi) clearSel(); set.add(gest.hit.i); }
        gest.kind = 'drag'; pushUndo(); gest.start = dragStart();
      } else if (E.multi && gest.btn === 0 && SELKEY[E.mode]) { gest.kind = 'box'; }
      else gest.kind = 'pan';
      gest.vx = E.view.x; gest.vy = E.view.y;
    }
  }
  if (gest.kind === 'pan') { E.view.x = gest.vx - dx / E.view.z; E.view.y = gest.vy + dy / E.view.z; edRedraw(); }
  else if (gest.kind === 'drag') { dragApply(wx - gest.wx, wy - gest.wy); }
  else if (gest.kind === 'box') { gest.bx = wx; gest.by = wy; edRedraw(); drawBox(); }
  else if (gest.kind === 'rect') { const q = snapW(wx, wy); E.rect.x1 = q.x; E.rect.y1 = q.y; edRedraw(); }
  if (E.mode === 'drawlines' && E.draw.length) { E.drawPreview = snapW(wx, wy); edRedraw(); }
}
function drawBox() { requestAnimationFrame(() => { if (!gest || gest.kind !== 'box') return; const [x1, y1] = w2s(gest.wx, gest.wy), [x2, y2] = w2s(gest.bx, gest.by); ed.g.strokeStyle = '#ffd400'; ed.g.setLineDash([5, 4]); ed.g.strokeRect(x1, y1, x2 - x1, y2 - y1); ed.g.setLineDash([]); }); }
function edPointerUp(e) {
  PT.delete(e.pointerId);
  if (!gest) return;
  if (gest.kind === 'pinch') { if (PT.size === 0) gest = null; return; }
  const g0 = gest; gest = null;
  if (g0.kind === 'drag') { dragEnd(); return; }
  if (g0.kind === 'box') {
    const k = SELKEY[E.mode], x0 = Math.min(g0.wx, g0.bx), x1 = Math.max(g0.wx, g0.bx), y0 = Math.min(g0.wy, g0.by), y1 = Math.max(g0.wy, g0.by);
    const inb = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    if (k === 'v') M.v.forEach((v, i) => { if (inb(v.x, v.y)) E.sel.v.add(i); });
    if (k === 'l') M.l.forEach((L, i) => { if (inb(M.v[L.v1].x, M.v[L.v1].y) && inb(M.v[L.v2].x, M.v[L.v2].y)) E.sel.l.add(i); });
    if (k === 't') M.t.forEach((t, i) => { if (inb(t.x, t.y)) E.sel.t.add(i); });
    if (k === 's') { const full = new Map(); M.l.forEach(L => { const ok = inb(M.v[L.v1].x, M.v[L.v1].y) && inb(M.v[L.v2].x, M.v[L.v2].y); [sideSec(L.s1), sideSec(L.s2)].forEach(s => { if (s >= 0) full.set(s, (full.get(s) ?? true) && ok); }); }); full.forEach((ok, s) => { if (ok) E.sel.s.add(s); }); }
    edRedraw(); refreshProps(); return;
  }
  if (g0.kind === 'rect') {
    const r = E.rect; E.rect = null;
    if (r && Math.abs(r.x1 - r.x0) >= 8 && Math.abs(r.y1 - r.y0) >= 8) {
      const x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1), y0 = Math.min(r.y0, r.y1), y1 = Math.max(r.y0, r.y1);
      const si = drawShape(E.mode === 'drawrect' ? rectPts(x0, y0, x1, y1) : ellipsePts(x0, y0, x1, y1, S.ellipseSides), true);
      if (si >= 0) { clearSel(); E.sel.s.add(si); refreshProps(); }
    } else toast('Drag to draw the shape');
    edRedraw(); return;
  }
  if (g0.kind === 'pan' || g0.moved) return;
  // ---- tap ----
  const now = performance.now(), dbl = now - lastTap.t < 350 && Math.hypot(g0.sx - lastTap.x, g0.sy - lastTap.y) < 20;
  lastTap = { t: now, x: g0.sx, y: g0.sy };
  if (E.mode === 'drawlines') { drawLinesTap(g0.wx, g0.wy); return; }
  if (E.mode === 'makesector') { pushUndo(); const s = makeSectorAt(g0.wx + 0.013, g0.wy + 0.017); if (s < 0) { UNDO.pop(); toast('No closed shape here. Draw lines that close a loop first.'); } else { compact(); clearSel(); mapChanged(); toast('Sector made'); } return; }
  const k = SELKEY[E.mode]; if (!k) return;
  if (g0.hit) {
    const set = E.sel[k];
    if (E.multi || e.shiftKey || e.ctrlKey) { set.has(g0.hit.i) ? set.delete(g0.hit.i) : set.add(g0.hit.i); }
    else { const only = set.size === 1 && set.has(g0.hit.i); clearSel(); if (!only || !dbl) set.add(g0.hit.i); if (dbl && only) set.add(g0.hit.i); }
  } else {
    if (E.mode === 'things' && dbl) { insertThing(snapW(g0.wx, g0.wy, false)); return; }
    if (!E.multi) clearSel();
    if (E.mode === 'things') toast('Double-tap empty space to place a ' + thingName(E.thingType), 1600);
  }
  edRedraw(); refreshProps();
}
function insertThing(p) { pushUndo(); M.t.push({ x: Math.round(p.x), y: Math.round(p.y), a: 90, type: E.thingType, f: 7 }); clearSel(); E.sel.t.add(M.t.length - 1); mapChanged(); }
function drawLinesTap(wx, wy) {
  const p = snapW(wx, wy);
  if (E.draw.length >= 3 && p.x === E.draw[0].x && p.y === E.draw[0].y) { finishDraw(true); return; }
  const l = E.draw[E.draw.length - 1];
  if (l && l.x === p.x && l.y === p.y) { finishDraw(false); return; }
  E.draw.push(p); edRedraw();
}
function finishDraw(closed) {
  const pts = E.draw.slice(); E.draw = []; E.drawPreview = null;
  if (pts.length < 2) { edRedraw(); return; }
  if (closed && pts.length < 3) closed = false;
  const si = drawShape(pts, closed);
  if (si >= 0) { clearSel(); E.sel.s.add(si); }
  toast(closed ? 'Sector drawn' : 'Lines drawn'); refreshProps(); edRedraw();
}
function dragStart() {
  const vs = collectVerts(E.sel), ts = new Set(E.sel.t);
  if (E.sel.s.size) M.t.forEach((t, i) => { if (E.sel.s.has(sectorAt(t.x, t.y))) ts.add(i); });
  return { vs: [...vs].map(i => [i, M.v[i].x, M.v[i].y]), ts: [...ts].map(i => [i, M.t[i].x, M.t[i].y]) };
}
function dragApply(dx, dy) {
  const g = S.snap ? S.grid : 1; let sx, sy;
  const st = gest && gest.start || ed.lastStart; if (!st) return; ed.lastStart = st;
  const ref = st.vs[0] || st.ts[0]; if (!ref) return;
  sx = Math.round((ref[1] + dx) / g) * g - ref[1]; sy = Math.round((ref[2] + dy) / g) * g - ref[2];
  st.vs.forEach(([i, x, y]) => { M.v[i].x = x + sx; M.v[i].y = y + sy; });
  st.ts.forEach(([i, x, y]) => { M.t[i].x = Math.round(x + sx); M.t[i].y = Math.round(y + sy); });
  MAPVER++; edRedraw();
}
function dragEnd() {
  ed.lastStart = null;
  // merge vertices dropped on top of others
  const moved = collectVerts(E.sel); let merged = 0;
  moved.forEach(i => {
    const v = M.v[i]; const j = M.v.findIndex((w, k) => k !== i && !moved.has(k) && w.x === v.x && w.y === v.y);
    if (j >= 0) { M.l.forEach(L => { if (L.v1 === i) L.v1 = j; if (L.v2 === i) L.v2 = j; }); merged++; }
  });
  if (merged) { // remove duplicate lines created by merges
    const seen = new Map(); const kill = new Set();
    M.l.forEach((L, i) => { const k = Math.min(L.v1, L.v2) + ',' + Math.max(L.v1, L.v2); if (seen.has(k)) { const o = M.l[seen.get(k)]; if (o.s2 < 0 && L.s1 >= 0) { if (o.v1 === L.v1) o.s2 = L.s2 >= 0 ? L.s2 : -1; else o.s2 = L.s1; } kill.add(i); } else seen.set(k, i); });
    M.l = M.l.filter((L, i) => !kill.has(i)); clearSel(); compact(); toast('Merged ' + merged + ' vertex' + (merged > 1 ? 'es' : ''));
  }
  mapChanged();
}
function edWheel(e) {
  e.preventDefault(); const [wx, wy] = s2w(e.offsetX, e.offsetY);
  E.view.z = clamp(E.view.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.02, 12);
  E.view.x = wx - (e.offsetX - ed.W / 2) / E.view.z; E.view.y = wy + (e.offsetY - ed.H / 2) / E.view.z; edRedraw();
}

/* ---------- mode + tool bars ---------- */
function setMode(m) {
  if (m === 'visual') { startVisual(); return; }
  E.mode = m; E.draw = []; E.drawPreview = null; E.rect = null; E.hover = null;
  S.lastMode = m; LS.set('settings', S);
  buildBars(); refreshProps(); edRedraw();
}
function buildBars() {
  const mb = $('#modes'); mb.innerHTML = '';
  for (const m of MODES) {
    if (!m) { const s = document.createElement('span'); s.className = 'sep'; mb.appendChild(s); continue; }
    const b = document.createElement('button'); b.textContent = m[1]; b.id = 'm-' + m[0]; b.title = m[1] + ' (' + m[2] + ')';
    if (E.mode === m[0]) b.classList.add('on'); b.onclick = () => setMode(m[0]); mb.appendChild(b);
  }
  const d = document.createElement('button'); d.className = 'demo'; d.id = 'btnDemo'; d.textContent = '▶ DEMO'; d.onclick = () => startDemo(); mb.appendChild(d);
  const tb = $('#tools'); tb.innerHTML = '';
  const T = (label, fn, title, on, id) => { const b = document.createElement('button'); b.textContent = label; b.title = title || label; if (on) b.classList.add('on'); if (id) b.id = id; b.onclick = fn; tb.appendChild(b); return b; };
  const sep = () => { const s = document.createElement('span'); s.className = 'sep'; tb.appendChild(s); };
  T('↶ Undo', doUndo, 'Undo (Ctrl+Z)'); T('↷ Redo', doRedo, 'Redo (Ctrl+Y)');
  T('Multi-select', () => { E.multi = !E.multi; buildBars(); edRedraw(); }, 'Taps add to the selection; drag on empty space draws a selection box', E.multi, 't-multi');
  T('Delete', deleteSelected, 'Delete (Del)'); sep();
  T('Copy', () => { if (!anySel()) return toast('Select sectors, lines or things first'); E.clip = copySelection(E.sel); toast('Copied'); }, 'Copy (Ctrl+C)');
  T('Paste', () => pasteClip(E.clip, E.view.x, E.view.y), 'Paste at screen center (Ctrl+V)');
  T('Prefabs', openPrefabs); sep();
  if (E.mode === 'linedefs') { T('Flip', () => { if (!E.sel.l.size) return toast('Select linedefs'); pushUndo(); E.sel.l.forEach(i => { const L = M.l[i]; if (L.s2 >= 0) flipLine(L); }); mapChanged(); }, 'Flip linedefs (F)'); T('Split', splitSelectedLines, 'Split linedefs in half'); T('Align X', alignTextures, 'Auto-align texture X offsets along the selected walls'); }
  if (E.mode === 'sectors') { T('Join', () => sectorOp('join'), 'Join sectors (keep lines)'); T('Merge', () => sectorOp('merge'), 'Merge sectors (remove lines between)'); T('Stairs', stairsTool, 'Build stairs from selected sectors, in selection order'); T('Gradient', gradientTool, 'Gradient brightness / floors / ceilings across selected sectors'); T('Make Door', () => sectorRecipe('door'), 'Turn the selected sector into a door'); T('Make Lift', () => sectorRecipe('lift'), 'Turn the selected sector into a lift'); }
  T('Rotate 90°', () => transformSel(E.sel, 'rot')); T('Mirror ↔', () => transformSel(E.sel, 'mirx')); T('Mirror ↕', () => transformSel(E.sel, 'miry')); sep();
  T('Grid −', () => { const g = [1, 2, 4, 8, 16, 32, 64, 128, 256]; S.grid = g[Math.max(0, g.indexOf(S.grid) - 1)] || 32; saveSettings(); }, 'Smaller grid ([)');
  T('Grid +', () => { const g = [1, 2, 4, 8, 16, 32, 64, 128, 256]; S.grid = g[Math.min(g.length - 1, g.indexOf(S.grid) + 1)] || 32; saveSettings(); }, 'Bigger grid (])');
  T('Snap', () => { S.snap = !S.snap; saveSettings(); buildBars(); }, 'Snap to grid', S.snap);
  T('Fit', zoomFit, 'Zoom to fit map'); sep();
  T('View: ' + { normal: 'Normal', brightness: 'Brightness', floors: 'Heights' }[E.viewMode], () => { E.viewMode = { normal: 'brightness', brightness: 'floors', floors: 'normal' }[E.viewMode]; buildBars(); edRedraw(); }, 'Cycle Normal / Brightness / Heights view');
  T('Map Analysis', openAnalysis, 'Find map errors (F4)'); T('Find & Replace', openFindReplace, 'Find and replace textures or thing types'); T('Tags', openTags, 'Tag explorer');
}
function anySel() { return Object.values(E.sel).some(s => s.size); }
function deleteSelected() {
  if (!anySel()) return toast('Nothing selected');
  pushUndo();
  if (E.sel.t.size) M.t = M.t.filter((t, i) => !E.sel.t.has(i));
  if (E.sel.s.size) deleteSectors([...E.sel.s]);
  else if (E.sel.l.size) deleteLines([...E.sel.l]);
  else if (E.sel.v.size) deleteVertices([...E.sel.v]);
  clearSel(); compact(); mapChanged(); toast('Deleted');
}
function splitSelectedLines() { if (!E.sel.l.size) return toast('Select linedefs'); pushUndo(); [...E.sel.l].forEach(i => { const L = M.l[i], a = M.v[L.v1], b = M.v[L.v2]; M.v.push({ x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) }); splitLineAt(i, M.v.length - 1); }); clearSel(); mapChanged(); }
function alignTextures() { if (E.sel.l.size < 1) return toast('Select walls in order'); pushUndo(); let x = 0; [...E.sel.l].forEach(i => { const L = M.l[i]; if (L.s1 >= 0) M.sd[L.s1].xo = x % 128; x += Math.round(lineLen(L)); }); mapChanged(); toast('Aligned'); }
function sectorOp(k) { const l = [...E.sel.s]; if (l.length < 2) return toast('Select 2 or more sectors'); pushUndo(); k === 'join' ? joinSectors(l) : mergeSectors(l); clearSel(); compact(); mapChanged(); toast(k === 'join' ? 'Joined' : 'Merged'); }
function sectorRecipe(k) {
  const l = [...E.sel.s]; if (l.length !== 1) return toast('Select exactly one sector');
  pushUndo(); if (k === 'door') { makeDoor(l[0]); toast('Door made: walk up and press USE'); } else { const t = makeLift(l[0]); toast('Lift made (tag ' + t + '): press USE on its side from below, or walk onto it from above'); }
  mapChanged();
}
function stairsTool() {
  const l = [...E.sel.s]; if (l.length < 2) return toast('Select 2+ sectors in the order the steps go');
  const b = modal('Stairs builder', '<div class="f"><label>Step height</label><input id="stH" type="number" value="16"></div><div class="f"><label>Raise ceilings too</label><input id="stC" type="checkbox"></div><p class="hint">First selected sector keeps its floor; each next one goes up one step.</p>', [{ ok: 1, fn: (bd) => { const h = +bd.querySelector('#stH').value || 16, c = bd.querySelector('#stC').checked; pushUndo(); const f0 = M.sec[l[0]].fh; l.forEach((si, i) => { const s = M.sec[si]; const d = f0 + h * i - s.fh; s.fh += d; if (c) s.ch += d; }); mapChanged(); toast('Stairs built'); } }, { cancel: 1 }]);
  void b;
}
function gradientTool() {
  const l = [...E.sel.s]; if (l.length < 3) return toast('Select 3+ sectors in order');
  modal('Gradient', '<div class="f"><label>Apply to</label><select id="grK"><option value="li">Brightness</option><option value="fh">Floor height</option><option value="ch">Ceiling height</option></select></div><p class="hint">Blends evenly from the first selected sector to the last.</p>', [{ ok: 1, fn: (bd) => { const k = bd.querySelector('#grK').value; pushUndo(); const a = M.sec[l[0]][k], z = M.sec[l[l.length - 1]][k]; l.forEach((si, i) => M.sec[si][k] = Math.round(a + (z - a) * i / (l.length - 1))); mapChanged(); } }, { cancel: 1 }]);
}
function edKey(e) {
  if (!$('#game').hidden || !$('#modal').hidden) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); doRedo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'c') { E.clip = copySelection(E.sel); toast('Copied'); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'v') { pasteClip(E.clip, E.mouse ? E.mouse.x : E.view.x, E.mouse ? E.mouse.y : E.view.y); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const m = MODES.find(x => x && x[2].toLowerCase() === k); if (m) { setMode(m[0]); return; }
  if (k === 'delete' || k === 'backspace') { deleteSelected(); return; }
  if (k === 'escape') { E.draw = []; E.drawPreview = null; clearSel(); edRedraw(); refreshProps(); return; }
  if (k === 'enter' && E.mode === 'drawlines' && E.draw.length) { finishDraw(false); return; }
  if (k === '[') { $('#tools').querySelectorAll('button').forEach(b => { if (b.textContent === 'Grid −') b.click(); }); }
  if (k === ']') { $('#tools').querySelectorAll('button').forEach(b => { if (b.textContent === 'Grid +') b.click(); }); }
  if (k === 'f9') startDemo();
  if (k === 'f4') openAnalysis();
  if (k === 'insert' && E.mouse) insertThing(snapW(E.mouse.x, E.mouse.y, false));
  if (k === 'home') zoomFit();
}
