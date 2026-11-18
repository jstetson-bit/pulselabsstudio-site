/* ================= WAD IMPORT / EXPORT ================= */
function rdName(dv, off) { let s = ''; for (let i = 0; i < 8; i++) { const c = dv.getUint8(off + i); if (!c) break; s += String.fromCharCode(c); } return s.toUpperCase(); }
function parseWad(buf) {
  const dv = new DataView(buf);
  const id = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (id !== 'IWAD' && id !== 'PWAD') throw new Error('Not a WAD file');
  const n = dv.getInt32(4, true), dir = dv.getInt32(8, true), lumps = [];
  for (let i = 0; i < n; i++) { const o = dir + i * 16; lumps.push({ pos: dv.getInt32(o, true), size: dv.getInt32(o + 4, true), name: rdName(dv, o + 8) }); }
  return { dv, lumps, buf };
}
const MAP_LUMPS = new Set(['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP', 'BEHAVIOR', 'SCRIPTS', 'TEXTMAP', 'ZNODES', 'DIALOGUE', 'ENDMAP', 'GL_VERT', 'GL_SEGS', 'GL_SSECT', 'GL_NODES', 'GL_PVS']);
function wadMaps(w) {
  const out = [];
  for (let i = 0; i < w.lumps.length - 1; i++) { const nx = w.lumps[i + 1].name; if (nx === 'THINGS' || nx === 'TEXTMAP') out.push({ name: w.lumps[i].name, idx: i, udmf: nx === 'TEXTMAP' }); }
  return out;
}
function loadWadMap(w, m) {
  const L = {}; for (let i = m.idx + 1; i < w.lumps.length && MAP_LUMPS.has(w.lumps[i].name); i++) { if (L[w.lumps[i].name]) break; L[w.lumps[i].name] = w.lumps[i]; }
  const dv = w.dv, out = { name: m.name, v: [], l: [], sd: [], sec: [], t: [] };
  let note = '';
  if (m.udmf) {
    const t = L.TEXTMAP; const txt = new TextDecoder('latin1').decode(new Uint8Array(w.buf, t.pos, t.size));
    note = udmfInto(txt, out);
  } else {
    const hexen = !!L.BEHAVIOR;
    const rd = (lump, size, fn) => { if (!lump) return; for (let o = lump.pos; o + size <= lump.pos + lump.size; o += size) fn(o); };
    rd(L.VERTEXES, 4, o => out.v.push({ x: dv.getInt16(o, true), y: dv.getInt16(o + 2, true) }));
    rd(L.SECTORS, 26, o => out.sec.push({ fh: dv.getInt16(o, true), ch: dv.getInt16(o + 2, true), ft: rdName(dv, o + 4), ct: rdName(dv, o + 12), li: dv.getInt16(o + 20, true), sp: dv.getInt16(o + 22, true), tag: dv.getInt16(o + 24, true) }));
    rd(L.SIDEDEFS, 30, o => out.sd.push({ xo: dv.getInt16(o, true), yo: dv.getInt16(o + 2, true), up: rdName(dv, o + 4) || '-', lo: rdName(dv, o + 12) || '-', mid: rdName(dv, o + 20) || '-', sec: dv.getUint16(o + 28, true) }));
    const nn = v => v === 0xFFFF ? -1 : v;
    if (hexen) {
      rd(L.LINEDEFS, 16, o => out.l.push({ v1: dv.getUint16(o, true), v2: dv.getUint16(o + 2, true), f: dv.getUint16(o + 4, true) & 511, sp: 0, tag: 0, s1: nn(dv.getUint16(o + 12, true)), s2: nn(dv.getUint16(o + 14, true)) }));
      rd(L.THINGS, 20, o => out.t.push({ x: dv.getInt16(o + 2, true), y: dv.getInt16(o + 4, true), a: dv.getInt16(o + 8, true), type: dv.getInt16(o + 10, true), f: dv.getInt16(o + 12, true) & 15 }));
      note = 'Hexen-format map: line actions were cleared (EOD edits Doom-format actions).';
    } else {
      rd(L.LINEDEFS, 14, o => out.l.push({ v1: dv.getUint16(o, true), v2: dv.getUint16(o + 2, true), f: dv.getUint16(o + 4, true), sp: dv.getInt16(o + 6, true), tag: dv.getInt16(o + 8, true), s1: nn(dv.getUint16(o + 10, true)), s2: nn(dv.getUint16(o + 12, true)) }));
      rd(L.THINGS, 10, o => out.t.push({ x: dv.getInt16(o, true), y: dv.getInt16(o + 2, true), a: dv.getInt16(o + 4, true), type: dv.getInt16(o + 6, true), f: dv.getInt16(o + 8, true) }));
    }
  }
  // sanitize
  out.sd.forEach(d => { if (d.sec >= out.sec.length) d.sec = 0; });
  out.l = out.l.filter(l => l.v1 < out.v.length && l.v2 < out.v.length);
  out.l.forEach(l => { if (l.s1 >= out.sd.length) l.s1 = -1; if (l.s2 >= out.sd.length) l.s2 = -1; });
  // un-share sidedefs (compressed WADs share them; NSDE edits per line)
  const used = new Set();
  out.l.forEach(l => { for (const k of ['s1', 's2']) { if (l[k] < 0) continue; if (used.has(l[k])) { out.sd.push(Object.assign({}, out.sd[l[k]])); l[k] = out.sd.length - 1; } used.add(l[k]); } });
  return { map: out, note };
}
function udmfInto(txt, out) {
  txt = txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const re = /\s*(?:([A-Za-z_][A-Za-z0-9_]*)|"((?:[^"\\]|\\.)*)"|([+-]?(?:0x[0-9a-fA-F]+|[0-9]*\.?[0-9]+(?:[eE][+-]?\d+)?))|([{}=;]))/y;
  const toks = []; let m; re.lastIndex = 0;
  while (re.lastIndex < txt.length && (m = re.exec(txt))) { if (m[1] !== undefined) toks.push({ t: 'id', v: m[1].toLowerCase() }); else if (m[2] !== undefined) toks.push({ t: 's', v: m[2] }); else if (m[3] !== undefined) toks.push({ t: 'n', v: Number(m[3]) }); else if (m[4]) toks.push({ t: 'p', v: m[4] }); }
  let p = 0, ns = '';
  const blocks = [];
  while (p < toks.length) {
    const a = toks[p];
    if (a.t === 'id' && toks[p + 1] && toks[p + 1].v === '=') { if (a.v === 'namespace') ns = String(toks[p + 2].v).toLowerCase(); p += 4; continue; }
    if (a.t === 'id' && toks[p + 1] && toks[p + 1].v === '{') {
      const o = { _k: a.v }; p += 2;
      while (p < toks.length && toks[p].v !== '}') { const k = toks[p].v, val = toks[p + 2]; let v = val.t === 'id' ? (val.v === 'true' ? true : val.v === 'false' ? false : val.v) : val.v; o[k] = v; p += 4; }
      p++; blocks.push(o); continue;
    }
    p++;
  }
  const doomNS = ns === 'doom' || ns === 'heretic' || ns === 'strife';
  for (const b of blocks) {
    if (b._k === 'vertex') out.v.push({ x: Math.round(b.x || 0), y: Math.round(b.y || 0) });
    else if (b._k === 'sector') out.sec.push({ fh: b.heightfloor || 0, ch: b.heightceiling || 0, ft: (b.texturefloor || '-').toUpperCase().slice(0, 8), ct: (b.textureceiling || '-').toUpperCase().slice(0, 8), li: b.lightlevel == null ? 160 : b.lightlevel, sp: doomNS ? (b.special || 0) : 0, tag: b.id || 0 });
    else if (b._k === 'sidedef') out.sd.push({ xo: b.offsetx || 0, yo: b.offsety || 0, up: (b.texturetop || '-').toUpperCase().slice(0, 8), lo: (b.texturebottom || '-').toUpperCase().slice(0, 8), mid: (b.texturemiddle || '-').toUpperCase().slice(0, 8), sec: b.sector || 0 });
    else if (b._k === 'linedef') out.l.push({ v1: b.v1, v2: b.v2, s1: b.sidefront == null ? -1 : b.sidefront, s2: b.sideback == null ? -1 : b.sideback, f: (b.blocking ? 1 : 0) | (b.blockmonsters ? 2 : 0) | (b.twosided ? 4 : 0) | (b.dontpegtop ? 8 : 0) | (b.dontpegbottom ? 16 : 0) | (b.secret ? 32 : 0) | (b.blocksound ? 64 : 0) | (b.dontdraw ? 128 : 0) | (b.mapped ? 256 : 0), sp: doomNS ? (b.special || 0) : 0, tag: doomNS ? (b.arg0 || b.id || 0) : 0 });
    else if (b._k === 'thing') { let f = (b.skill1 || b.skill2 ? 1 : 0) | (b.skill3 ? 2 : 0) | (b.skill4 || b.skill5 ? 4 : 0) | (b.ambush ? 8 : 0) | (b.single === false ? 16 : 0); if (!(f & 7)) f |= 7; out.t.push({ x: Math.round(b.x || 0), y: Math.round(b.y || 0), a: b.angle || 0, type: b.type || 0, f }); }
  }
  return doomNS ? '' : 'UDMF (' + (ns || '?') + ') map: line actions were cleared (EOD edits Doom-format actions).';
}
function wrName(u8, off, s) { s = (s || '').toUpperCase(); for (let i = 0; i < 8; i++) u8[off + i] = i < s.length ? s.charCodeAt(i) : 0; }
function buildWad() {
  compact();
  const lines = M.l.filter(L => L.s1 >= 0), GX_ = glassExportPlan(lines);
  const mk = (n, sz) => { const b = new ArrayBuffer(n * sz); return { dv: new DataView(b), u8: new Uint8Array(b) }; };
  const T = mk(M.t.length, 10); M.t.forEach((t, i) => { const o = i * 10; T.dv.setInt16(o, t.x, true); T.dv.setInt16(o + 2, t.y, true); T.dv.setInt16(o + 4, t.a, true); T.dv.setInt16(o + 6, t.type, true); T.dv.setInt16(o + 8, t.f, true); });
  const Ld = mk(lines.length, 14); lines.forEach((L, i) => { const o = i * 14; Ld.dv.setUint16(o, L.v1, true); Ld.dv.setUint16(o + 2, L.v2, true); const gm = GX_.lineMod.get(L); Ld.dv.setUint16(o + 4, gm ? gm.f : L.f, true); Ld.dv.setInt16(o + 6, gm ? gm.sp : L.sp, true); Ld.dv.setInt16(o + 8, L.tag, true); Ld.dv.setUint16(o + 10, L.s1 < 0 ? 0xFFFF : L.s1, true); Ld.dv.setUint16(o + 12, L.s2 < 0 ? 0xFFFF : L.s2, true); });
  const Sd = mk(M.sd.length, 30); M.sd.forEach((d, i) => { const o = i * 30; Sd.dv.setInt16(o, d.xo, true); Sd.dv.setInt16(o + 2, d.yo, true); wrName(Sd.u8, o + 4, d.up); wrName(Sd.u8, o + 12, d.lo); wrName(Sd.u8, o + 20, GX_.sideMid.get(i) || d.mid); Sd.dv.setUint16(o + 28, d.sec, true); });
  const V = mk(M.v.length, 4); M.v.forEach((v, i) => { V.dv.setInt16(i * 4, v.x, true); V.dv.setInt16(i * 4 + 2, v.y, true); });
  const Se = mk(M.sec.length, 26); M.sec.forEach((s, i) => { const o = i * 26; Se.dv.setInt16(o, s.fh, true); Se.dv.setInt16(o + 2, s.ch, true); wrName(Se.u8, o + 4, s.ft); wrName(Se.u8, o + 12, s.ct); Se.dv.setInt16(o + 20, s.li, true); Se.dv.setInt16(o + 22, s.sp, true); Se.dv.setInt16(o + 24, s.tag, true); });
  const E = new Uint8Array(0);
  const lumps = [[M.name || 'MAP01', E], ['THINGS', T.u8], ['LINEDEFS', Ld.u8], ['SIDEDEFS', Sd.u8], ['VERTEXES', V.u8], ['SEGS', E], ['SSECTORS', E], ['NODES', E], ['SECTORS', Se.u8], ['REJECT', E], ['BLOCKMAP', E]];
  if (M.res) { const tx = []; const dec = src => { const b64 = src.split(',')[1] || '', bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
    Object.entries(M.res.tex || {}).forEach(([n, v]) => tx.push([n, dec(v.src)])); const fl = Object.entries(M.res.flat || {}).filter(([n]) => !(M.res.tex || {})[n]).map(([n, v]) => [n, dec(v.src)]);
    tx.push(...GX_.lumps);
    if (tx.length) lumps.push(['TX_START', E], ...tx, ['TX_END', E]);
    if (fl.length) lumps.push(['FF_START', E], ...fl, ['FF_END', E]); }
  if (!M.res && GX_.lumps.length) lumps.push(['TX_START', E], ...GX_.lumps, ['TX_END', E]);
  const hasMon = M.mon && Object.keys(M.mon).length, hasWep = M.wep && Object.keys(M.wep).length;
  if (hasMon || hasWep) { const mx = hasMon ? monsterExportLumps() : { decorate: '', sprites: [] }, wx = hasWep ? weaponExportLumps() : { decorate: '', sprites: [] }; lumps.push(['DECORATE', new TextEncoder().encode(mx.decorate + wx.decorate)], ['S_START', E], ...mx.sprites, ...wx.sprites, ['S_END', E]); }
  let size = 12; lumps.forEach(l => size += l[1].length);
  const total = size + lumps.length * 16, out = new Uint8Array(total), dv = new DataView(out.buffer);
  out.set([80, 87, 65, 68], 0); dv.setInt32(4, lumps.length, true); dv.setInt32(8, size, true);
  let pos = 12; const dir = [];
  for (const [n, d] of lumps) { out.set(d, pos); dir.push([pos, d.length, n]); pos += d.length; }
  dir.forEach(([p, l, n], i) => { const o = size + i * 16; dv.setInt32(o, p, true); dv.setInt32(o + 4, l, true); wrName(out, o + 8, n); });
  return out;
}
function exportWad() {
  const issues = analyzeMap().filter(i => i.sev === 'error');
  const go = () => { const w = buildWad(); mapChanged(); download(fileBase() + '.wad', w, 'application/octet-stream'); };
  if (issues.length) modal('Map Analysis found ' + issues.length + ' problem(s)', '<ul>' + issues.slice(0, 12).map(i => '<li>' + esc(i.msg) + '</li>').join('') + '</ul><p>Export anyway?</p>', [{ label: 'Export anyway', fn: () => { setTimeout(go, 50); } }, { label: 'Open Map Analysis', fn: () => { setTimeout(openAnalysis, 50); } }, { cancel: 1 }]);
  else go();
}
function fileBase() { return 'EOD-' + (M.name || 'MAP01') + '-' + new Date().toISOString().slice(0, 10); }
function exportPlayable() {
  const issues = analyzeMap().filter(i => i.sev === 'error' && /Player 1/.test(i.msg));
  if (issues.length) return toast(issues[0].msg, 3500);
  const json = JSON.stringify({ map: M, title: M.name }).replace(/</g, '\\u003c');
  const tag = '<script id="nsde-' + 'main">', etag = '<script id="nsde-' + 'embed">', close = '</' + 'script>';
  let html = ORIGINAL_HTML.replace(new RegExp(etag.replace(/[-]/g, '\\-') + '[\\s\\S]*?' + close + '\\n?'), '');
  const i2 = html.indexOf(tag);
  html = html.slice(0, i2) + etag + 'window.NSDE_EMBED=' + json + ';' + close + '\n' + html.slice(i2);
  download(fileBase() + '-PLAYABLE.html', html, 'text/html');
}
function saveProject() { download(fileBase() + '.eod.json', JSON.stringify({ app: 'EOD', version: VERSION, map: M }), 'application/json'); }
function openFile() { const fi = $('#fileIn'); fi.value = ''; fi.click(); }
function handleFile(file) {
  const rd = new FileReader();
  rd.onload = () => importBuffer(rd.result, file.name).catch(e => { logCrash('open file: ' + (e.stack || e)); toast('Could not open: ' + e.message, 5000); });
  rd.readAsArrayBuffer(file);
}
// Recognize anything people ship: IWAD/PWAD, idgames .zip, ZDoom .pk3, or an EOD project.
async function importBuffer(buf, fname) {
  const head = String.fromCharCode(...new Uint8Array(buf, 0, Math.min(4, buf.byteLength)));
  if (head === 'IWAD' || head === 'PWAD') return importWads([{ name: fname, w: parseWad(buf) }], fname);
  if (head.startsWith('PK')) {
    toast('Unpacking ' + fname + '…');
    const entries = await readZip(buf), wads = [], pack = { name: fname, kind: 'map', pal: null, tex: new Map(), patches: new Map(), flats: new Map(), sprites: new Map(), sounds: new Map(), imgTex: new Map(), imgFlat: new Map(), imgSpr: new Map() };
    const notes = [];
    for (const e of entries) {
      const low = e.name.toLowerCase(), base = e.name.split('/').pop(), stem = base.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 8);
      if (/\.(wad|iwad|pwad)$/.test(low)) { try { wads.push({ name: base, w: parseWad(await e.get()), mapName: /^maps\//.test(low) ? stem : null }); } catch (er) { notes.push('skipped ' + base); } }
      else if (/\.(png|jpe?g|webp)$/.test(low)) {
        try {
          const t = await imageToTex(await e.get());
          if (/(^|\/)flats\//.test(low)) pack.imgFlat.set(stem, t); else if (/(^|\/)sprites\//.test(low)) pack.imgSpr.set(stem, t); else if (/(^|\/)(textures|patches|graphics|hires)\//.test(low)) pack.imgTex.set(stem, t);
        } catch (er) { }
      } else if (/\.(deh|bex)$/.test(low) || /dehacked/.test(low)) notes.push('DEHACKED patch not applied');
    }
    if (!wads.length) throw new Error('No maps found inside ' + fname);
    return importWads(wads, fname, pack, notes);
  }
  const j = JSON.parse(new TextDecoder().decode(buf));
  if (!j.map || !j.map.l) throw new Error('Not a map file EOD recognizes');
  pushUndo(); M = j.map; clearSel(); mapChanged(); zoomFit(); toast('Project loaded');
}
function importWads(list, fname, extraPack, notes = []) {
  // resources: the user's own IWAD sits under the map art; PWAD/PK3 art goes on top
  let mapPack = extraPack || null, iwad = null;
  for (const it of list) {
    const p = packFromWad(it.w, it.name, 'map');
    const id = String.fromCharCode(...new Uint8Array(it.w.buf, 0, 4));
    if (id === 'IWAD') { p.kind = 'iwad'; p.name = it.name + ' (your copy, stays on this device)'; iwad = p; continue; }
    if (!mapPack) mapPack = p; else mergePack(mapPack, p);
  }
  const has = p => p && (p.tex.size || p.patches.size || p.flats.size || p.sprites.size || p.imgTex.size || p.imgFlat.size || p.imgSpr.size || p.pal);
  if (iwad) setPack('iwad', iwad);
  setPack('map', has(mapPack) ? mapPack : null);
  const maps = [];
  for (const it of list) for (const m of wadMaps(it.w)) maps.push({ it, m, label: (it.mapName && m.name === 'MAP01' ? it.mapName : m.name) });
  if (!maps.length) { toast(iwad ? 'Your IWAD art is loaded for this session (nothing is uploaded). Open a map next.' : 'Art loaded from ' + fname + ', but it has no maps.', 5000); return; }
  const open = (k, play) => {
    const { it, m, label } = maps[k]; const r = loadWadMap(it.w, m);
    pushUndo(); M = r.map; M.name = /^(MAP\d\d|E\dM\d)$/.test(label) ? label : M.name; S.mapName = M.name; saveSettings(); compact(); clearSel(); mapChanged(); zoomFit();
    if ((S.artPack || 'freedoom') === 'freedoom') loadFreedoom(true);
    const kept = keepImportedArt(false);
    const rep = recognizeReport(r.note, notes, mapPack, iwad) + (kept ? `<p class="hint">Kept ${kept} of this map's own textures inside the map so they survive saving (File → My textures).</p>` : '');
    if (play) { const p1 = M.t.find(t => t.type === 1); if (!p1) return toast('That map has no Player 1 Start', 4000); setTimeout(() => startDemo(), 50); }
    else modal('Imported ' + label + ' from ' + fname, rep, [{ label: '▶ Play it', cls: 'demo', fn: () => setTimeout(() => startDemo(), 50) }, { cancel: 1 }]);
  };
  if (maps.length === 1) { open(0, false); return; }
  modal(fname + ' · ' + maps.length + ' maps', '<p class="hint">Pick a map. ✎ opens it in the editor (to build off it), ▶ plays it right away.</p><div class="list">' + maps.map((x, i) => `<div class="row"><b style="flex:1">${esc(x.label)}${x.m.udmf ? ' (UDMF)' : ''}</b><button data-e="${i}">✎ Edit</button><button data-p="${i}" class="demo">▶ Play</button></div>`).join('') + '</div>', [{ cancel: 1 }], b => {
    b.querySelectorAll('[data-e]').forEach(x => x.onclick = () => { closeModal(); open(+x.dataset.e, false); });
    b.querySelectorAll('[data-p]').forEach(x => x.onclick = () => { closeModal(); open(+x.dataset.p, true); });
  });
}
function mergePack(a, b) { for (const k of ['tex', 'patches', 'flats', 'sprites', 'sounds', 'imgTex', 'imgFlat', 'imgSpr']) for (const [n, v] of b[k]) if (!a[k].has(n)) a[k].set(n, v); if (!a.pal && b.pal) a.pal = b.pal; }
function recognizeReport(note, notes, mapPack, iwad) {
  const walls = new Set(), flats = new Set();
  M.sd.forEach(d => [d.up, d.mid, d.lo].forEach(n => { if (n && n !== '-') walls.add(n); })); M.sec.forEach(s => { if (s.ft !== 'F_SKY1') flats.add(s.ft); if (s.ct !== 'F_SKY1') flats.add(s.ct); });
  const inPacks = (n, flat) => RES.packs.some(p => flat ? (p.flats.has(n) || p.imgFlat.has(n)) : (p.tex.has(n) || p.imgTex.has(n)));
  const fdOn = (S.artPack || 'freedoom') === 'freedoom';
  const missW = [...walls].filter(n => !inPacks(n, false)), missF = [...flats].filter(n => !inPacks(n, true));
  const custom = mapPack ? (mapPack.tex.size + mapPack.imgTex.size) + ' textures, ' + (mapPack.flats.size + mapPack.imgFlat.size) + ' flats, ' + (mapPack.sprites.size + mapPack.imgSpr.size) + ' sprites' : 'none';
  const things = M.t.length, known = M.t.filter(t => THINGS[t.type]).length;
  return `<ul><li><b>${M.l.length}</b> lines, <b>${M.sec.length}</b> sectors, <b>${things}</b> things (${known} EOD understands).</li>
    <li>Art in this file: ${esc(custom)}.</li>
    <li>Art stack: ${RES.packs.map(p => esc(p.name)).join(' → ') || '—'}${fdOn && !RES.packs.some(p => p.kind === 'freedoom') ? ' (Freedoom is still loading)' : ''} → EOD in-house art.</li>
    ${missW.length + missF.length ? `<li>${missW.length + missF.length} texture name(s) not found yet${fdOn ? '' : ' (turn on the Freedoom art pack in Settings)'}; EOD draws stand-ins: ${esc([...missW, ...missF].slice(0, 12).join(', '))}${missW.length + missF.length > 12 ? '…' : ''}</li>` : '<li>Every texture name has art. ✓</li>'}
    ${note ? '<li>' + esc(note) + '</li>' : ''}${notes.map(n => '<li>' + esc(n) + '</li>').join('')}
    ${iwad ? '<li>Your IWAD art is in use on this device only. It is never uploaded or published.</li>' : ''}</ul>
    <p class="hint">Boom/ZDoom-only features (scripts, slopes, 3D floors, custom monsters) are ignored. Classic Doom maps play as made.</p>`;
}
