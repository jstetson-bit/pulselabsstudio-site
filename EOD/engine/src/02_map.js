/* ================= MAP MODEL & GEOMETRY ================= */
// Doom-format model. Linedef flags: 1 impassable, 2 block monsters, 4 two-sided, 8 upper unpegged,
// 16 lower unpegged, 32 secret, 64 block sound, 128 not on map, 256 already on map.
function emptyMap() { return { name: S.mapName || 'MAP01', v: [], l: [], sd: [], sec: [], t: [] }; }
let M = emptyMap();
let MAPVER = 0; // bumps on every change (render caches)
function newSec(base) {
  const s = { fh: 0, ch: 128, ft: S.defFloor, ct: S.defCeil, li: 160, sp: 0, tag: 0 };
  if (base) { s.fh = base.fh; s.ch = base.ch; s.ft = base.ft; s.ct = base.ct; s.li = base.li; }
  M.sec.push(s); return M.sec.length - 1;
}
function newSide(sec) { M.sd.push({ xo: 0, yo: 0, up: '-', lo: '-', mid: '-', sec }); return M.sd.length - 1; }

/* ---------- undo ---------- */
let UNDO = [], REDO = [];
function pushUndo() { UNDO.push(JSON.stringify(M)); if (UNDO.length > 150) UNDO.shift(); REDO.length = 0; }
function doUndo() { if (!UNDO.length) return toast('Nothing to undo'); REDO.push(JSON.stringify(M)); M = JSON.parse(UNDO.pop()); clearSel(); mapChanged(); toast('Undo'); }
function doRedo() { if (!REDO.length) return toast('Nothing to redo'); UNDO.push(JSON.stringify(M)); M = JSON.parse(REDO.pop()); clearSel(); mapChanged(); toast('Redo'); }
let saveT = 0;
function mapChanged() {
  MAPVER++;
  clearTimeout(saveT); saveT = setTimeout(() => LS.set('autosave', M), 400);
  if (window.edRedraw) edRedraw();
  if (window.refreshProps) refreshProps();
}

/* ---------- geometry helpers ---------- */
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx - px, cy = ay + t * dy - py; return Math.sqrt(cx * cx + cy * cy);
}
function segT(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; return l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; }
function lineSide(L, x, y) { const a = M.v[L.v1], b = M.v[L.v2]; return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x); } // <0 = right = front
function sideSec(si) { return si >= 0 && M.sd[si] ? M.sd[si].sec : -1; }
function lineLen(L) { const a = M.v[L.v1], b = M.v[L.v2]; return Math.hypot(b.x - a.x, b.y - a.y); }
function sectorAt(x, y) {
  let best = Infinity, res = -1;
  const V = M.v;
  for (let i = 0; i < M.l.length; i++) {
    const L = M.l[i], a = V[L.v1], b = V[L.v2];
    if ((a.y > y) === (b.y > y)) continue;
    const ix = a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y);
    if (ix < x) continue;
    const d = ix - x;
    if (d < best) { best = d; res = ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)) < 0 ? sideSec(L.s1) : sideSec(L.s2); }
  }
  return res;
}
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q.x * r.y - r.x * q.y; } return a / 2; }
function pip(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
function segInter(ax, ay, bx, by, cx, cy, dx, dy) {
  const r1 = bx - ax, r2 = by - ay, s1 = dx - cx, s2 = dy - cy, den = r1 * s2 - r2 * s1;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * s2 - (cy - ay) * s1) / den, u = ((cx - ax) * r2 - (cy - ay) * r1) / den;
  return { t, u, x: ax + t * r1, y: ay + t * r2 };
}

/* ---------- vertices / lines ---------- */
function findVertex(x, y, eps = 0.5) { for (let i = 0; i < M.v.length; i++) { const v = M.v[i]; if (Math.abs(v.x - x) < eps && Math.abs(v.y - y) < eps) return i; } return -1; }
function findLine(a, b) { for (let i = 0; i < M.l.length; i++) { const L = M.l[i]; if ((L.v1 === a && L.v2 === b) || (L.v1 === b && L.v2 === a)) return i; } return -1; }
function dupSide(s) { if (s < 0) return -1; M.sd.push(Object.assign({}, M.sd[s])); return M.sd.length - 1; }
function splitLineAt(li, vi) {
  const L = M.l[li];
  const nl = Object.assign({}, L, { v1: vi, v2: L.v2, s1: dupSide(L.s1), s2: dupSide(L.s2) });
  L.v2 = vi; M.l.push(nl);
  // keep texture continuity
  const len = lineLen(L);
  if (nl.s1 >= 0) M.sd[nl.s1].xo = (M.sd[nl.s1].xo + Math.round(len)) | 0;
  return M.l.length - 1;
}
function addVertex(x, y) {
  x = Math.round(x); y = Math.round(y);
  let i = findVertex(x, y); if (i >= 0) return i;
  M.v.push({ x, y }); i = M.v.length - 1;
  for (let li = 0; li < M.l.length; li++) {
    const L = M.l[li]; if (L.v1 === i || L.v2 === i) continue;
    const a = M.v[L.v1], b = M.v[L.v2];
    if (distSeg(x, y, a.x, a.y, b.x, b.y) < 1.0) { const t = segT(x, y, a.x, a.y, b.x, b.y); if (t > 0.0001 && t < 0.9999) { splitLineAt(li, i); break; } }
  }
  return i;
}
// add the edge a->b, splitting at crossings and existing vertices; returns [{li,fwd,isNew}]
function addEdge(a, b) {
  const A = M.v[a], B = M.v[b];
  const cross = [];
  for (let li = 0; li < M.l.length; li++) {
    const L = M.l[li]; if (L.v1 === a || L.v2 === a || L.v1 === b || L.v2 === b) continue;
    const p = M.v[L.v1], q = M.v[L.v2];
    const r = segInter(A.x, A.y, B.x, B.y, p.x, p.y, q.x, q.y);
    if (r && r.t > 0.001 && r.t < 0.999 && r.u > 0.001 && r.u < 0.999) cross.push(r);
  }
  for (const c of cross) addVertex(c.x, c.y);
  const A2 = M.v[a], B2 = M.v[b], on = [];
  for (let i = 0; i < M.v.length; i++) {
    if (i === a || i === b) continue; const v = M.v[i];
    if (distSeg(v.x, v.y, A2.x, A2.y, B2.x, B2.y) < 1.0) { const t = segT(v.x, v.y, A2.x, A2.y, B2.x, B2.y); if (t > 0.0001 && t < 0.9999) on.push({ t, i }); }
  }
  on.sort((p, q) => p.t - q.t);
  const chain = [a, ...on.map(o => o.i), b], out = [];
  for (let k = 0; k < chain.length - 1; k++) {
    const p = chain[k], q = chain[k + 1]; if (p === q) continue;
    let li = findLine(p, q);
    if (li >= 0) out.push({ li, fwd: M.l[li].v1 === p, isNew: false });
    else { M.l.push({ v1: p, v2: q, f: 0, sp: 0, tag: 0, s1: -1, s2: -1 }); out.push({ li: M.l.length - 1, fwd: true, isNew: true }); }
  }
  return out;
}

/* ---------- loop tracing (Make Sector) ---------- */
function buildAdj() { const adj = M.v.map(() => []); M.l.forEach((L, i) => { if (L.v1 !== L.v2) { adj[L.v1].push(i); adj[L.v2].push(i); } }); return adj; }
function walkLoop(li, fwd, adj) {
  const start = { li, fwd }; const loop = []; let cur = start;
  for (let n = 0; n < 20000; n++) {
    const L = M.l[cur.li]; const from = cur.fwd ? L.v1 : L.v2, to = cur.fwd ? L.v2 : L.v1;
    loop.push({ li: cur.li, fwd: cur.fwd, from, to });
    const A = M.v[from], B = M.v[to], ix = B.x - A.x, iy = B.y - A.y;
    let best = null, bestAng = Infinity;
    for (const li2 of adj[to]) {
      const L2 = M.l[li2]; const other = L2.v1 === to ? L2.v2 : L2.v1; const C = M.v[other];
      const ox = C.x - B.x, oy = C.y - B.y;
      let ang = Math.atan2(ix * oy - iy * ox, ix * ox + iy * oy);
      if (li2 === cur.li) ang = Math.PI + 1; // reversal = last resort
      if (ang < bestAng) { bestAng = ang; best = { li: li2, fwd: L2.v1 === to }; }
    }
    if (!best) return null;
    if (best.li === start.li && best.fwd === start.fwd) return loop;
    cur = best;
  }
  return null;
}
function traceLoop(x, y) {
  const cr = [];
  for (let i = 0; i < M.l.length; i++) {
    const L = M.l[i], a = M.v[L.v1], b = M.v[L.v2];
    if ((a.y > y) === (b.y > y)) continue;
    const ix = a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y);
    if (ix >= x) cr.push({ d: ix - x, i });
  }
  cr.sort((p, q) => p.d - q.d);
  const adj = buildAdj(), islands = [], seen = new Set();
  for (const c of cr.slice(0, 60)) {
    const L = M.l[c.i]; const fwd = lineSide(L, x, y) < 0;
    const key = c.i + (fwd ? 'f' : 'b'); if (seen.has(key)) continue;
    const loop = walkLoop(c.i, fwd, adj); if (!loop) continue;
    loop.forEach(e => seen.add(e.li + (e.fwd ? 'f' : 'b')));
    const poly = loop.map(e => M.v[e.from]); const ar = polyArea(poly);
    if (ar < 0 && pip(x, y, poly)) {
      return { loop, poly, islands: islands.filter(isl => pip(M.v[isl[0].from].x, M.v[isl[0].from].y, poly)) };
    }
    if (ar >= 0) islands.push(loop);
  }
  return null;
}
function applySides(edges, sec, onlyMissing) {
  for (const e of edges) {
    const L = M.l[e.li];
    if (e.fwd) { if (L.s1 >= 0) { if (!onlyMissing) M.sd[L.s1].sec = sec; } else L.s1 = newSide(sec); }
    else { if (L.s2 >= 0) { if (!onlyMissing) M.sd[L.s2].sec = sec; } else L.s2 = newSide(sec); }
  }
}
function makeSectorAt(x, y, sec = -1, copyFrom = -1) {
  const r = traceLoop(x, y); if (!r) return -1;
  if (sec < 0) { const base = copyFrom >= 0 ? M.sec[copyFrom] : (() => { const s = sectorAt(x, y); return s >= 0 ? M.sec[s] : null; })(); sec = newSec(base); }
  const all = r.loop.slice(); r.islands.forEach(i => all.push(...i));
  applySides(all, sec, false);
  return sec;
}
function fillLoopAt(x, y) {
  const r = traceLoop(x, y); if (!r) return -1;
  const all = r.loop.slice(); r.islands.forEach(i => all.push(...i));
  const cnt = {};
  for (const e of all) { const L = M.l[e.li]; const s = sideSec(e.fwd ? L.s1 : L.s2); if (s >= 0) cnt[s] = (cnt[s] || 0) + 1; }
  let best = -1, bc = 0; for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; best = +k; }
  if (best < 0) return -1;
  applySides(all, best, true); return best;
}

/* ---------- line fix-up ---------- */
function flipLine(L) { const t = L.v1; L.v1 = L.v2; L.v2 = t; const s = L.s1; L.s1 = L.s2; L.s2 = s; }
function fixLine(L) {
  if (L.s1 < 0 && L.s2 >= 0) flipLine(L);
  const two = L.s1 >= 0 && L.s2 >= 0;
  if (two) {
    if (!(L.f & 4)) { L.f = (L.f | 4) & ~1; for (const s of [L.s1, L.s2]) { const d = M.sd[s]; if (d.mid !== '-') { if (d.up === '-') d.up = d.mid; if (d.lo === '-') d.lo = d.mid; d.mid = '-'; } } }
    for (const s of [L.s1, L.s2]) { const d = M.sd[s]; if (d.up === '-') d.up = S.defWall; if (d.lo === '-') d.lo = S.defWall; }
  } else if (L.s1 >= 0) {
    if (L.f & 4) L.f &= ~4;
    L.f |= 1;
    const d = M.sd[L.s1]; if (d.mid === '-') d.mid = d.up !== '-' ? d.up : d.lo !== '-' ? d.lo : S.defWall;
  }
}
function compact() {
  M.l = M.l.filter(L => L.v1 !== L.v2 && M.v[L.v1] && M.v[L.v2]);
  M.l.forEach(fixLine);
  const usedSd = new Set(); M.l.forEach(L => { if (L.s1 >= 0) usedSd.add(L.s1); if (L.s2 >= 0) usedSd.add(L.s2); });
  const usedSec = new Set(); usedSd.forEach(s => usedSec.add(M.sd[s].sec));
  const secMap = [], ns = []; M.sec.forEach((s, i) => { if (usedSec.has(i)) { secMap[i] = ns.length; ns.push(s); } else secMap[i] = -1; });
  const sdMap = [], nsd = []; M.sd.forEach((s, i) => { if (usedSd.has(i)) { sdMap[i] = nsd.length; s.sec = secMap[s.sec]; nsd.push(s); } else sdMap[i] = -1; });
  M.l.forEach(L => { L.s1 = L.s1 >= 0 ? sdMap[L.s1] : -1; L.s2 = L.s2 >= 0 ? sdMap[L.s2] : -1; });
  const usedV = new Set(); M.l.forEach(L => { usedV.add(L.v1); usedV.add(L.v2); });
  const vMap = [], nv = []; M.v.forEach((v, i) => { if (usedV.has(i)) { vMap[i] = nv.length; nv.push(v); } else vMap[i] = -1; });
  M.l.forEach(L => { L.v1 = vMap[L.v1]; L.v2 = vMap[L.v2]; });
  M.v = nv; M.sd = nsd; M.sec = ns;
  return secMap;
}

/* ---------- drawing shapes ---------- */
function sampleSide(L, right, dist = 2) {
  const a = M.v[L.v1], b = M.v[L.v2]; const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (b.y - a.y) / len, ny = -(b.x - a.x) / len; // right normal (y-up)
  const k = right ? dist : -dist;
  return { x: (a.x + b.x) / 2 + nx * k + 0.013, y: (a.y + b.y) / 2 + ny * k + 0.017 };
}
function drawShape(pts, closed) {
  pushUndo();
  if (closed && polyArea(pts) > 0) pts = pts.slice().reverse();
  let preBase = -1;
  if (closed) { const a = pts[0], b = pts[1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1; preBase = sectorAt((a.x + b.x) / 2 + (b.y - a.y) / len * 2 + 0.013, (a.y + b.y) / 2 - (b.x - a.x) / len * 2 + 0.017); }
  const preSec = [];
  if (!closed) for (let i = 0; i < pts.length - 1; i++) preSec.push(sectorAt((pts[i].x + pts[i + 1].x) / 2 + 0.013, (pts[i].y + pts[i + 1].y) / 2 + 0.017));
  const ids = pts.map(p => addVertex(p.x, p.y)).filter((v, i, a) => i === 0 || v !== a[i - 1]);
  if (closed && ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
  if (ids.length < 2) { UNDO.pop(); return -1; }
  const edges = [];
  const n = closed ? ids.length : ids.length - 1;
  for (let i = 0; i < n; i++) edges.push(...addEdge(ids[i], ids[(i + 1) % ids.length]));
  let result = -1;
  if (closed) {
    const inner = () => { // first edge: inside is to its right (CW)
      const e = edges[0]; const L = M.l[e.li]; return sampleSide(L, e.fwd);
    };
    const p0 = inner();
    result = makeSectorAt(p0.x, p0.y, -1, preBase);
    if (result >= 0 && preBase < 0) { const s0 = M.sec[result]; s0.fh = 0; s0.ch = 128; s0.ft = S.defFloor; s0.ct = S.defCeil; s0.li = 160; }
    if (result >= 0) for (const e of edges) {
      const L = M.l[e.li]; const sd = e.fwd ? L.s1 : L.s2;
      if (sideSec(sd) !== result) { const p = sampleSide(L, e.fwd); makeSectorAt(p.x, p.y, result); }
    }
    for (const e of edges) { const L = M.l[e.li]; if (e.isNew) { const missingBack = e.fwd ? L.s2 < 0 : L.s1 < 0; if (missingBack) { const p = sampleSide(L, !e.fwd); fillLoopAt(p.x, p.y); } } }
  } else {
    // open path: split any sector it crosses
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i], L = M.l[e.li]; if (!e.isNew) continue;
      const pr = sampleSide(L, true); const old = sectorAt(pr.x, pr.y);
      const pl = sampleSide(L, false);
      const base = preSec.find(s => s >= 0);
      if (base === undefined || base < 0) continue;
      if (L.s1 < 0) makeSectorAt(pr.x, pr.y, -1, base);
      if (L.s2 < 0) makeSectorAt(pl.x, pl.y, base);
      void old;
    }
  }
  const sm = compact(); if (result >= 0) result = sm[result] ?? -1; mapChanged();
  return result;
}
function rectPts(x0, y0, x1, y1) { return [{ x: x0, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 }, { x: x1, y: y0 }]; }
function ellipsePts(x0, y0, x1, y1, n) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2, out = [];
  for (let i = 0; i < n; i++) { const a = -i / n * Math.PI * 2; out.push({ x: Math.round(cx + Math.cos(a) * rx), y: Math.round(cy + Math.sin(a) * ry) }); }
  return out;
}

/* ---------- delete / join / merge ---------- */
function deleteSectors(list) {
  const set = new Set(list);
  M.l.forEach(L => { if (L.s1 >= 0 && set.has(M.sd[L.s1].sec)) L.s1 = -1; if (L.s2 >= 0 && set.has(M.sd[L.s2].sec)) L.s2 = -1; });
  M.l = M.l.filter(L => L.s1 >= 0 || L.s2 >= 0);
}
function deleteLines(list) {
  const set = new Set(list);
  for (const li of list) { const L = M.l[li]; const a = sideSec(L.s1), b = sideSec(L.s2); if (a >= 0 && b >= 0 && a !== b) joinSectors([a, b]); }
  M.l = M.l.filter((L, i) => !set.has(i));
}
function deleteVertices(list) {
  const set = new Set(list), kill = new Set();
  for (const vi of list) {
    const ls = []; M.l.forEach((L, i) => { if (L.v1 === vi || L.v2 === vi) ls.push(i); });
    if (ls.length === 2) {
      const A = M.l[ls[0]], B = M.l[ls[1]];
      if (A.v2 === vi && B.v1 === vi) { A.v2 = B.v2; kill.add(ls[1]); continue; }
      if (B.v2 === vi && A.v1 === vi) { B.v2 = A.v2; kill.add(ls[0]); continue; }
    }
    ls.forEach(i => kill.add(i));
  }
  M.l = M.l.filter((L, i) => !kill.has(i)); void set;
}
function joinSectors(list) { const t = list[0]; M.sd.forEach(d => { if (list.includes(d.sec)) d.sec = t; }); }
function mergeSectors(list) {
  joinSectors(list); const t = list[0];
  M.l = M.l.filter(L => !(L.s1 >= 0 && L.s2 >= 0 && M.sd[L.s1].sec === t && M.sd[L.s2].sec === t));
}
function sectorLines(si) { const out = []; M.l.forEach((L, i) => { if (sideSec(L.s1) === si || sideSec(L.s2) === si) out.push(i); }); return out; }
function neighbors(si) { const n = new Set(); M.l.forEach(L => { const a = sideSec(L.s1), b = sideSec(L.s2); if (a === si && b >= 0 && b !== si) n.add(b); if (b === si && a >= 0 && a !== si) n.add(a); }); return [...n]; }
function nextTag() { let m = 0; M.sec.forEach(s => m = Math.max(m, s.tag)); M.l.forEach(L => m = Math.max(m, L.tag)); return m + 1; }

/* ---------- prefab recipes ---------- */
function makeDoor(si) {
  const s = M.sec[si]; s.ch = s.fh; if (s.ct === 'F_SKY1') s.ct = 'FLAT20';
  for (const li of sectorLines(si)) {
    const L = M.l[li];
    if (L.s1 >= 0 && L.s2 >= 0) {
      if (M.sd[L.s1].sec === si) flipLine(L);
      L.sp = 1; L.tag = 0;
      M.sd[L.s1].up = 'BIGDOOR2';
      L.f &= ~8;
    } else { M.sd[L.s1].mid = 'DOORTRAK'; L.f |= 16; }
  }
}
function makeLift(si) {
  const tag = nextTag(); M.sec[si].tag = tag;
  for (const li of sectorLines(si)) {
    const L = M.l[li];
    if (L.s1 >= 0 && L.s2 >= 0) {
      if (M.sd[L.s1].sec === si) flipLine(L);
      const other = M.sec[M.sd[L.s1].sec];
      L.sp = other.fh < M.sec[si].fh ? 62 : 88; L.tag = tag; M.sd[L.s1].lo = 'PLAT1';
    }
  }
  return tag;
}

/* ---------- copy / paste / transforms ---------- */
function collectVerts(sel) {
  const vs = new Set(sel.v);
  sel.l.forEach(li => { const L = M.l[li]; if (L) { vs.add(L.v1); vs.add(L.v2); } });
  sel.s.forEach(si => sectorLines(si).forEach(li => { vs.add(M.l[li].v1); vs.add(M.l[li].v2); }));
  return vs;
}
function copySelection(sel) {
  const secs = new Set(sel.s); const lines = [];
  M.l.forEach((L, i) => { if (secs.has(sideSec(L.s1)) || secs.has(sideSec(L.s2)) || sel.l.has(i)) lines.push(i); });
  const vmap = new Map(), smap = new Map(), out = { v: [], l: [], sd: [], sec: [], t: [] };
  const vid = i => { if (!vmap.has(i)) { vmap.set(i, out.v.length); out.v.push(Object.assign({}, M.v[i])); } return vmap.get(i); };
  const sid = i => { if (!smap.has(i)) { smap.set(i, out.sec.length); out.sec.push(Object.assign({}, M.sec[i])); } return smap.get(i); };
  for (const li of lines) {
    const L = M.l[li]; const nl = Object.assign({}, L, { v1: vid(L.v1), v2: vid(L.v2), s1: -1, s2: -1 });
    const cp = s => { if (s < 0) return -1; const d = M.sd[s]; if (secs.size && !secs.has(d.sec)) return -1; out.sd.push(Object.assign({}, d, { sec: sid(d.sec) })); return out.sd.length - 1; };
    nl.s1 = cp(L.s1); nl.s2 = cp(L.s2); if (nl.s1 < 0 && nl.s2 < 0) continue;
    if (nl.s1 < 0) { const t = nl.v1; nl.v1 = nl.v2; nl.v2 = t; nl.s1 = nl.s2; nl.s2 = -1; }
    if (nl.s2 < 0) nl.f = (nl.f | 4) ^ 4;
    out.l.push(nl);
  }
  const tset = new Set(sel.t);
  if (sel.s.size) M.t.forEach((t, i) => { if (secs.has(sectorAt(t.x, t.y))) tset.add(i); });
  tset.forEach(ti => out.t.push(Object.assign({}, M.t[ti])));
  return out;
}
function pasteClip(clip, cx, cy) {
  if (!clip || (!clip.l.length && !clip.t.length)) return toast('Clipboard is empty');
  pushUndo();
  let mx = 0, my = 0, n = 0; clip.v.forEach(v => { mx += v.x; my += v.y; n++; }); clip.t.forEach(t => { mx += t.x; my += t.y; n++; });
  mx = n ? mx / n : 0; my = n ? my / n : 0;
  const g = S.grid, dx = Math.round((cx - mx) / g) * g, dy = Math.round((cy - my) / g) * g;
  const v0 = M.v.length, s0 = M.sec.length, d0 = M.sd.length;
  clip.v.forEach(v => M.v.push({ x: v.x + dx, y: v.y + dy }));
  clip.sec.forEach(s => M.sec.push(Object.assign({}, s)));
  clip.sd.forEach(d => M.sd.push(Object.assign({}, d, { sec: d.sec + s0 })));
  const newL = [];
  clip.l.forEach(L => { M.l.push(Object.assign({}, L, { v1: L.v1 + v0, v2: L.v2 + v0, s1: L.s1 >= 0 ? L.s1 + d0 : -1, s2: L.s2 >= 0 ? L.s2 + d0 : -1 })); newL.push(M.l.length - 1); });
  clip.t.forEach(t => M.t.push(Object.assign({}, t, { x: t.x + dx, y: t.y + dy })));
  compact(); mapChanged(); toast('Pasted');
}
function transformSel(sel, kind) {
  const vs = collectVerts(sel), ts = new Set(sel.t);
  if (sel.s.size) M.t.forEach((t, i) => { if (sel.s.has(sectorAt(t.x, t.y))) ts.add(i); });
  if (!vs.size && !ts.size) return toast('Select something first');
  pushUndo();
  let cx = 0, cy = 0, n = 0; vs.forEach(i => { cx += M.v[i].x; cy += M.v[i].y; n++; }); ts.forEach(i => { cx += M.t[i].x; cy += M.t[i].y; n++; });
  cx = Math.round(cx / n / S.grid) * S.grid; cy = Math.round(cy / n / S.grid) * S.grid;
  const f = (p) => {
    const x = p.x - cx, y = p.y - cy;
    if (kind === 'rot') { p.x = cx + y; p.y = cy - x; }
    else if (kind === 'mirx') { p.x = cx - x; }
    else if (kind === 'miry') { p.y = cy - y; }
  };
  vs.forEach(i => f(M.v[i]));
  ts.forEach(i => { const t = M.t[i]; f(t); if (kind === 'rot') t.a = (t.a + 270) % 360; else if (kind === 'mirx') t.a = (540 - t.a) % 360; else if (kind === 'miry') t.a = (360 - t.a) % 360; });
  if (kind !== 'rot') M.l.forEach(L => { if (vs.has(L.v1) && vs.has(L.v2)) { const t = L.v1; L.v1 = L.v2; L.v2 = t; } });
  const partial = M.l.some(L => vs.has(L.v1) !== vs.has(L.v2)) || (kind !== 'rot' && M.l.some(L => vs.has(L.v1) && vs.has(L.v2) && [L.s1, L.s2].some(s => s >= 0 && !sel.s.has(M.sd[s].sec)) && sel.s.size));
  mapChanged();
  if (partial) toast('Heads up: the selection shares walls with unselected sectors, so those neighbors may now be broken. Run Map Analysis or Undo.', 5000);
}

/* ---------- map analysis (UDB "Map Analysis") ---------- */
function analyzeMap() {
  const out = [];
  if (!M.t.some(t => t.type === 1)) out.push({ sev: 'error', msg: 'No Player 1 Start. Place one in Things mode.' });
  M.l.forEach((L, i) => {
    if (L.s1 < 0 && L.s2 < 0) out.push({ sev: 'error', msg: 'Linedef ' + i + ' has no sector on either side (use Make Sector).', kind: 'l', i });
    if (L.v1 === L.v2) out.push({ sev: 'error', msg: 'Linedef ' + i + ' has zero length.', kind: 'l', i });
    if (L.s1 >= 0 && L.s2 < 0 && M.sd[L.s1].mid === '-') out.push({ sev: 'warn', msg: 'One-sided linedef ' + i + ' is missing its middle texture.', kind: 'l', i });
    if (L.sp && DOOR_SPECIALS.has(L.sp) && L.s2 < 0) out.push({ sev: 'error', msg: 'Door action on linedef ' + i + ' but there is no sector behind it.', kind: 'l', i });
    if (L.sp && TAG_SPECIALS.has(L.sp) && (!L.tag || !M.sec.some(s => s.tag === L.tag))) out.push({ sev: 'error', msg: 'Linedef ' + i + ' action ' + L.sp + ' needs a tag that matches a sector.', kind: 'l', i });
  });
  M.sec.forEach((s, i) => {
    if (s.ch < s.fh) out.push({ sev: 'error', msg: 'Sector ' + i + ' ceiling is below its floor.', kind: 's', i });
    // closure: each vertex used by the sector's edges should balance in/out
    const deg = new Map();
    M.l.forEach(L => { if (sideSec(L.s1) === i) { deg.set(L.v1, (deg.get(L.v1) || 0) + 1); deg.set(L.v2, (deg.get(L.v2) || 0) - 1); } if (sideSec(L.s2) === i) { deg.set(L.v2, (deg.get(L.v2) || 0) + 1); deg.set(L.v1, (deg.get(L.v1) || 0) - 1); } });
    for (const [, d] of deg) if (d !== 0) { out.push({ sev: 'error', msg: 'Sector ' + i + ' is not closed (unclosed sector).', kind: 's', i }); break; }
  });
  M.t.forEach((t, i) => {
    if (THINGS[t.type] && THINGS[t.type].cat !== 'player' && sectorAt(t.x, t.y) < 0) out.push({ sev: 'warn', msg: 'Thing ' + i + ' (' + thingName(t.type) + ') is outside the map.', kind: 't', i });
    if (!THINGS[t.type]) out.push({ sev: 'warn', msg: 'Thing ' + i + ' has unknown type ' + t.type + ' (kept, but the Demo will not show it).', kind: 't', i });
  });
  const p1 = M.t.find(t => t.type === 1); if (p1 && sectorAt(p1.x, p1.y) < 0) out.push({ sev: 'error', msg: 'Player 1 Start is outside the map.', kind: 't', i: M.t.indexOf(p1) });
  return out;
}
