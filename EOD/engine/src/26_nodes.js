/* ================= NODE BUILDER (vanilla-loadable SEGS / SSECTORS / NODES / BLOCKMAP / REJECT) =================
   Original Doom, Chocolate Doom, Boom and MBF ports read the map's BSP tree from the WAD instead of building it,
   so a map without nodes won't load there. This is a classic recursive builder:
     - every linedef side becomes a seg facing into its sector,
     - pick a partition from the segs (fewest splits, best balance, axis-aligned preferred),
     - split the segs that cross it (new vertices rounded to whole units, as vanilla needs),
     - stop when a set is convex (every seg sees all the others in front of it): that set is a subsector.
   Input: plain arrays { v:[{x,y}], l:[{v1,v2,s1,s2,...}], sd:[{sec}], sec:[...] }. Output: Uint8Array lumps plus the
   new vertex list (originals first). nodesSelfCheck() walks the tree like the game does and confirms that sample
   points inside each sector land in a subsector of that sector. */
function buildNodes(map) {
  const V = map.v.map(p => ({ x: p.x, y: p.y })), nOrig = V.length;
  const vkey = new Map(); V.forEach((p, i) => vkey.set(p.x + ',' + p.y, i));
  const addV = (x, y) => { x = Math.round(x); y = Math.round(y); const k = x + ',' + y; let i = vkey.get(k); if (i == null) { i = V.length; V.push({ x, y }); vkey.set(k, i); } return i; };
  // segs: {a, b (vertex idx), line, side, ox/oy/dx/dy of the source line for partition math, off}
  const segs = [];
  map.l.forEach((L, li) => {
    const A = V[L.v1], B = V[L.v2]; if (!A || !B || (A.x === B.x && A.y === B.y)) return;
    if (L.s1 >= 0) segs.push({ a: L.v1, b: L.v2, line: li, side: 0, off: 0 });
    if (L.s2 >= 0) segs.push({ a: L.v2, b: L.v1, line: li, side: 1, off: 0 });
  });
  const P = s => [V[s.a], V[s.b]];
  // which side of partition (px,py,dx,dy) a point is on: <0 front (right), >0 back (left), 0 on the line
  // points within half a unit of the line count as on it (split points are rounded to whole units)
  const side = (px, py, dx, dy, x, y) => { const c = (dx * (y - py) - dy * (x - px)) / Math.hypot(dx, dy); return c < -0.5 ? -1 : c > 0.5 ? 1 : 0; };
  const OUT = { segs: [], ss: [], nodes: [] };
  const bbox = list => { let t = -1e9, b = 1e9, l = 1e9, r = -1e9; list.forEach(s => { for (const p of P(s)) { t = Math.max(t, p.y); b = Math.min(b, p.y); l = Math.min(l, p.x); r = Math.max(r, p.x); } }); return [t, b, l, r]; };
  const convex = list => {
    for (const s of list) { const [A, B] = P(s), dx = B.x - A.x, dy = B.y - A.y;
      for (const o of list) { if (o === s) continue; const [C, D] = P(o); if (side(A.x, A.y, dx, dy, C.x, C.y) > 0 || side(A.x, A.y, dx, dy, D.x, D.y) > 0) return false; } }
    return true;
  };
  const choose = list => {
    // try every seg's line as a partition when the set is small, a spread sample when it's big
    let cands = list; if (list.length > 64) { cands = []; const step = list.length / 64; for (let i = 0; i < 64; i++) cands.push(list[Math.floor(i * step)]); }
    let best = null, bestScore = Infinity;
    for (const c of cands) {
      const [A, B] = P(c), dx = B.x - A.x, dy = B.y - A.y; let f = 0, bk = 0, sp = 0;
      for (const s of list) { const [C, D] = P(s), s1 = side(A.x, A.y, dx, dy, C.x, C.y), s2 = side(A.x, A.y, dx, dy, D.x, D.y);
        if (s1 <= 0 && s2 <= 0) { if (s1 === 0 && s2 === 0) { const same = (D.x - C.x) * dx + (D.y - C.y) * dy > 0; same ? f++ : bk++; } else f++; }
        else if (s1 >= 0 && s2 >= 0) bk++; else sp++; }
      if (!f || !bk) { if (!sp) continue; }
      const score = sp * 8 + Math.abs(f - bk) + (dx && dy ? 2 : 0);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  };
  const split = (s, px, py, dx, dy) => { // returns [frontPart, backPart]
    const [A, B] = P(s), ex = B.x - A.x, ey = B.y - A.y, den = dx * ey - dy * ex; const t = (dy * (A.x - px) - dx * (A.y - py)) / den;
    const m = addV(A.x + ex * t, A.y + ey * t); const L = map.l[s.line], S0 = V[s.side ? L.v2 : L.v1], M = V[m];
    const p1 = { a: s.a, b: m, line: s.line, side: s.side, off: s.off }, p2 = { a: m, b: s.b, line: s.line, side: s.side, off: Math.round(Math.hypot(M.x - S0.x, M.y - S0.y)) };
    const sa = side(px, py, dx, dy, A.x, A.y); return sa < 0 ? [p1, p2] : [p2, p1];
  };
  const build = list => { // returns child index (with 0x8000 for subsector)
    if (list.length && convex(list)) { const first = OUT.segs.length; OUT.segs.push(...list.filter(s => s.a !== s.b)); OUT.ss.push([OUT.segs.length - first, first]); return 0x8000 | (OUT.ss.length - 1); }
    let c = choose(list), tries = 0;
    const tried = new Set();
    for (;;) { // a partition must put segs on both sides, or the set never shrinks
      if (!c) break; const [A, B] = P(c), dx = B.x - A.x, dy = B.y - A.y; let f = 0, k = 0;
      for (const s of list) { const [C, D] = P(s), s1 = side(A.x, A.y, dx, dy, C.x, C.y), s2 = side(A.x, A.y, dx, dy, D.x, D.y);
        if (s1 === 0 && s2 === 0) { ((D.x - C.x) * dx + (D.y - C.y) * dy > 0) ? f++ : k++; } else if (s1 <= 0 && s2 <= 0) f++; else if (s1 >= 0 && s2 >= 0) k++; else { f++; k++; } }
      if (f && k) break; tried.add(c); c = list.find(s => !tried.has(s)) || null; if (++tries > list.length) { c = null; break; } }
    if (!c) { const first = OUT.segs.length; OUT.segs.push(...list); OUT.ss.push([list.length, first]); return 0x8000 | (OUT.ss.length - 1); }
    const [A, B] = P(c), px = A.x, py = A.y, dx = B.x - A.x, dy = B.y - A.y, F = [], K = [];
    for (const s of list) { const [C, D] = P(s), s1 = side(px, py, dx, dy, C.x, C.y), s2 = side(px, py, dx, dy, D.x, D.y);
      if (s1 === 0 && s2 === 0) { ((D.x - C.x) * dx + (D.y - C.y) * dy > 0 ? F : K).push(s); }
      else if (s1 <= 0 && s2 <= 0) F.push(s); else if (s1 >= 0 && s2 >= 0) K.push(s);
      else { const [f, b] = split(s, px, py, dx, dy); if (f.a !== f.b) F.push(f); if (b.a !== b.b) K.push(b); } }
    const bbF = bbox(F), bbK = bbox(K), ni = OUT.nodes.length; OUT.nodes.push(null);
    const rf = build(F), rk = build(K);
    OUT.nodes[ni] = { x: px, y: py, dx, dy, bbR: bbF, bbL: bbK, R: rf, L: rk };
    return ni;
  };
  if (segs.length) build(segs);
  // ---- lumps ----
  const mk = (n, sz) => { const b = new ArrayBuffer(n * sz); return { dv: new DataView(b), u8: new Uint8Array(b) }; };
  const SG = mk(OUT.segs.length, 12);
  OUT.segs.forEach((s, i) => { const [A, B] = P(s), o = i * 12; SG.dv.setUint16(o, s.a, true); SG.dv.setUint16(o + 2, s.b, true);
    SG.dv.setInt16(o + 4, Math.round(Math.atan2(B.y - A.y, B.x - A.x) / Math.PI * 32768) | 0, true); SG.dv.setUint16(o + 6, s.line, true); SG.dv.setInt16(o + 8, s.side, true); SG.dv.setInt16(o + 10, s.off, true); });
  const SS = mk(OUT.ss.length, 4); OUT.ss.forEach(([n, f], i) => { SS.dv.setUint16(i * 4, n, true); SS.dv.setUint16(i * 4 + 2, f, true); });
  // the root must be the LAST node in the lump: renumber in post-order
  const order = [], seen = new Set(), walk = i => { if (i & 0x8000 || seen.has(i)) return; seen.add(i); const n = OUT.nodes[i]; walk(n.R); walk(n.L); order.push(i); };
  if (OUT.nodes.length) walk(0);
  const ren = new Map(order.map((oi, ni) => [oi, ni])), fix = c => c & 0x8000 ? c : ren.get(c);
  const ND = mk(order.length, 28);
  order.forEach((oi, i) => { const n = OUT.nodes[oi], o = i * 28, w = (k, v) => ND.dv.setInt16(o + k, Math.round(v), true);
    w(0, n.x); w(2, n.y); w(4, n.dx); w(6, n.dy); n.bbR.forEach((v, j) => w(8 + j * 2, v)); n.bbL.forEach((v, j) => w(16 + j * 2, v));
    ND.dv.setUint16(o + 24, fix(n.R), true); ND.dv.setUint16(o + 26, fix(n.L), true); });
  const VX = mk(V.length, 4); V.forEach((p, i) => { VX.dv.setInt16(i * 4, p.x, true); VX.dv.setInt16(i * 4 + 2, p.y, true); });
  return { vertexes: VX.u8, segs: SG.u8, ssectors: SS.u8, nodes: ND.u8, V, nOrig, counts: { segs: OUT.segs.length, ssectors: OUT.ss.length, nodes: order.length, vertexes: V.length } };
}
/* BLOCKMAP: 128x128 cells, each listing the linedefs that touch it (list starts with 0, ends with -1) */
function buildBlockmap(map, V) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; map.l.forEach(L => { for (const p of [V[L.v1], V[L.v2]]) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } });
  if (x0 > x1) { x0 = y0 = 0; x1 = y1 = 1; }
  const ox = Math.floor(x0) - 8, oy = Math.floor(y0) - 8, cols = Math.floor((x1 - ox) / 128) + 1, rows = Math.floor((y1 - oy) / 128) + 1;
  const cells = Array.from({ length: cols * rows }, () => []);
  const hits = (ax, ay, bx, by, cx0, cy0, cx1, cy1) => { // segment vs box (Liang-Barsky)
    let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
    for (const [p, q] of [[-dx, ax - cx0], [dx, cx1 - ax], [-dy, ay - cy0], [dy, cy1 - ay]]) { if (p === 0) { if (q < 0) return false; } else { const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } } }
    return true; };
  map.l.forEach((L, li) => { const A = V[L.v1], B = V[L.v2];
    const c0 = Math.max(0, Math.floor((Math.min(A.x, B.x) - ox) / 128)), c1 = Math.min(cols - 1, Math.floor((Math.max(A.x, B.x) - ox) / 128));
    const r0 = Math.max(0, Math.floor((Math.min(A.y, B.y) - oy) / 128)), r1 = Math.min(rows - 1, Math.floor((Math.max(A.y, B.y) - oy) / 128));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const bx = ox + c * 128, by = oy + r * 128; if (hits(A.x, A.y, B.x, B.y, bx, by, bx + 128, by + 128)) cells[r * cols + c].push(li); } });
  const head = 4 + cols * rows; let words = head; cells.forEach(c => words += c.length + 2);
  const out = new Uint8Array(words * 2), dv = new DataView(out.buffer); dv.setInt16(0, ox, true); dv.setInt16(2, oy, true); dv.setUint16(4, cols, true); dv.setUint16(6, rows, true);
  let w = head; cells.forEach((c, i) => { dv.setUint16((4 + i) * 2, w, true); dv.setUint16(w * 2, 0, true); w++; c.forEach(li => { dv.setUint16(w * 2, li, true); w++; }); dv.setUint16(w * 2, 0xFFFF, true); w++; });
  return { lump: out, words, cols, rows };
}
function buildReject(nSec) { return new Uint8Array(Math.ceil(nSec * nSec / 8)); }
/* Walk the tree like R_PointInSubsector and check that points inside each sector land in that sector's subsectors. */
function nodesSelfCheck(map, built, samplesPerSector = 12) {
  const nd = new DataView(built.nodes.buffer), sg = new DataView(built.segs.buffer), ss = new DataView(built.ssectors.buffer), nN = built.nodes.length / 28;
  const ssSector = i => { const first = ss.getUint16(i * 4 + 2, true), li = sg.getUint16(first * 12 + 6, true), sd = sg.getInt16(first * 12 + 8, true); const L = map.l[li]; return map.sd[sd ? L.s2 : L.s1].sec; };
  const find = (x, y) => { if (!nN) return 0; let n = nN - 1; for (;;) { const o = n * 28, px = nd.getInt16(o, true), py = nd.getInt16(o + 2, true), dx = nd.getInt16(o + 4, true), dy = nd.getInt16(o + 6, true);
      const back = ((y - py) * dx) < (dy * (x - px)) ? 0 : 1; // R_PointOnSide: front (0) when right < left
      const ch = nd.getUint16(o + 24 + back * 2, true); if (ch & 0x8000) return ch & 0x7fff; n = ch; } };
  let bad = 0, tried = 0; const fails = [];
  map.sec.forEach((s, si) => { const pts = typeof sampleSector === 'function' ? sampleSector(si, samplesPerSector) : []; for (const p of pts) { tried++; const got = ssSector(find(p.x, p.y)); if (got !== si) { bad++; if (fails.length < 8) fails.push({ sector: si, x: Math.round(p.x), y: Math.round(p.y), got }); } } });
  return { tried, bad, fails };
}
/* random points that really are inside sector si (for the self-check) */
function sampleSector(si, n) {
  const ls = sectorLines(si); if (!ls.length) return [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ls.forEach(li => { const L = M.l[li]; for (const v of [M.v[L.v1], M.v[L.v2]]) { x0 = Math.min(x0, v.x); y0 = Math.min(y0, v.y); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); } });
  const out = []; let tries = 0; while (out.length < n && tries++ < n * 30) { const x = x0 + 1 + Math.random() * (x1 - x0 - 2), y = y0 + 1 + Math.random() * (y1 - y0 - 2); if (sectorAt(x, y) === si) out.push({ x, y }); }
  return out;
}
