/* ================= EOD CLASSIC: the compatibility editor =================
   Same drawing tools as EOD, none of EOD's own tricks. Every map has a target format; the format decides which
   line actions, sector types, flags and things are offered, the map check flags everything the target can't load,
   and the export writes exactly that format (binary Doom map with real nodes, or UDMF text).
   Turned on by window.EOD_CLASSIC (classic.html). In plain EOD this file only defines things and does nothing. */
const CLASSIC = !!window.EOD_CLASSIC, CLASSIC_VERSION = '0.1.0', CLASSIC_VC = 1;
const FORMATS = {
  vanilla: { name: 'Vanilla Doom II', lv: ['vanilla'], bin: true, ports: 'Original Doom II (DOS), Chocolate Doom, and every port after them.' },
  boom: { name: 'Boom', lv: ['vanilla', 'boom'], bin: true, ports: 'PrBoom+, DSDA-Doom (complevel 9), Woof, Nugget, Eternity, GZDoom.' },
  mbf21: { name: 'MBF21', lv: ['vanilla', 'boom', 'mbf', 'mbf21'], bin: true, ports: 'DSDA-Doom (complevel 21), Woof, Nugget, GZDoom, Doom + Doom II (2024).' },
  id24: { name: 'ID24', lv: ['vanilla', 'boom', 'mbf', 'mbf21', 'id24'], bin: true, ports: 'Doom + Doom II (2024 release), Woof, Helion. ID24 is still a 0.99 draft.' },
  udmf: { name: 'UDMF (Doom namespace)', lv: ['vanilla', 'boom'], bin: false, ports: 'GZDoom, Eternity, EDGE-Classic, Helion. Text map; the port builds its own nodes.' }
};
/* every thing Doom II itself knows (DoomEdNums); the ones EOD's own engine doesn't draw yet are added for placing only */
const VANILLA_THINGS = { 64: ['Arch-Vile', 'monster'], 66: ['Revenant', 'monster'], 67: ['Mancubus', 'monster'], 71: ['Pain Elemental', 'monster'], 72: ['Commander Keen', 'monster'], 84: ['Wolfenstein SS', 'monster'],
  88: ['Boss Brain (Icon of Sin)', 'monster'], 89: ['Boss Shooter (spawns monsters)', 'decor'], 87: ['Spawn Spot (Icon of Sin target)', 'decor'],
  2022: ['Invulnerability', 'health'], 2023: ['Berserk', 'health'], 2024: ['Partial Invisibility', 'health'], 2025: ['Radiation Suit', 'health'], 2026: ['Computer Map', 'health'], 2045: ['Light Amplification Visor', 'health'],
  12: ['Bloody mess 2', 'decor'], 15: ['Dead player', 'decor'], 18: ['Dead zombieman', 'decor'], 19: ['Dead shotgun guy', 'decor'], 20: ['Dead imp', 'decor'], 21: ['Dead demon', 'decor'], 22: ['Dead cacodemon', 'decor'], 23: ['Dead lost soul (invisible)', 'decor'],
  24: ['Pool of blood and flesh', 'decor'], 25: ['Impaled human', 'decor'], 26: ['Twitching impaled human', 'decor'], 27: ['Skull on a pole', 'decor'], 28: ['Five skulls on a pole', 'decor'], 29: ['Pile of skulls and candles', 'decor'],
  31: ['Short green pillar', 'decor'], 32: ['Tall red pillar', 'decor'], 33: ['Short red pillar', 'decor'], 36: ['Short green pillar with heart', 'decor'], 37: ['Short red pillar with skull', 'decor'], 41: ['Evil eye', 'decor'], 42: ['Floating skull rock', 'decor'], 43: ['Burnt tree', 'decor'], 45: ['Tall green firestick', 'decor'], 47: ['Brown stump', 'decor'],
  49: ['Hanging victim, twitching', 'decor'], 50: ['Hanging victim, arms out', 'decor'], 51: ['Hanging victim, one-legged', 'decor'], 52: ['Hanging pair of legs', 'decor'], 53: ['Hanging leg', 'decor'], 54: ['Large brown tree', 'decor'], 55: ['Short blue firestick', 'decor'], 56: ['Short green firestick', 'decor'], 57: ['Short red firestick', 'decor'],
  59: ['Hanging victim, arms out (walk-through)', 'decor'], 60: ['Hanging pair of legs (walk-through)', 'decor'], 61: ['Hanging victim, one-legged (walk-through)', 'decor'], 62: ['Hanging leg (walk-through)', 'decor'], 63: ['Hanging victim, twitching (walk-through)', 'decor'],
  70: ['Burning barrel', 'decor'], 73: ['Hanging victim, guts removed', 'decor'], 74: ['Hanging victim, guts and brain removed', 'decor'], 75: ['Hanging torso, looking down', 'decor'], 76: ['Hanging torso, open skull', 'decor'], 77: ['Hanging torso, looking up', 'decor'], 78: ['Hanging torso, brain removed', 'decor'],
  79: ['Pool of blood', 'decor'], 80: ['Pool of blood 2', 'decor'], 81: ['Pool of brains', 'decor'], 85: ['Tall techno floor lamp', 'decor'], 86: ['Short techno floor lamp', 'decor'] };
Object.entries(VANILLA_THINGS).forEach(([ed, [name, cat]]) => { ed = +ed; if (!THINGS[ed]) defT(ed, name, cat, cat === 'monster' ? 20 : 16, 56, null, { noplay: true }); });
const CLASSIC_BASE_THINGS = new Set(Object.keys(THINGS).map(Number)); // Doom II's own things (before any EOD extras)
const BASE_LINE_SPECIALS = LINE_SPECIALS.slice();
function mapFormat() { return (M && FORMATS[M.format]) ? M.format : 'vanilla'; }
function fmtLevels(f) { return FORMATS[f || mapFormat()].lv; }
function fmtHas(level, f) { return fmtLevels(f).includes(level); }
function lineAllowed(n, f) { if (!n) return true; const lv = fmtLevels(f); if (lv.some(k => FMT_CAT[k].lines[n])) return true; return lv.includes('boom') && n >= 0x2F80 && n < 0x8000; }
function lineFlagMask(f) { let m = 0x1FF; if (fmtHas('boom', f)) m |= 0x200; if (fmtHas('mbf21', f)) m |= 0x3000; return m; }
function thingFlagMask(f) { let m = 0x1F; if (fmtHas('boom', f)) m |= 0x60; if (fmtHas('mbf', f)) m |= 0x80; return m; }
function sectorAllowed(n, f) {
  if (!n) return true; const low = n & 31, vanillaOk = k => !k || FMT_CAT.vanilla.sectors[k];
  if (!fmtHas('boom', f)) return n < 32 && vanillaOk(n);
  let allowed = 0x3FF; if (fmtHas('mbf21', f)) allowed |= 0x3000;
  return vanillaOk(low) && !(n & ~allowed);
}
function thingAllowed(type, f) { if (CLASSIC_BASE_THINGS.has(type) && !(THINGS[type] && (THINGS[type].custom || THINGS[type].cw || THINGS[type].fmtOnly))) return true; return fmtLevels(f).some(k => FMT_CAT[k].things[type]); }
function texKnown(name, flat) { if (!name || name === '-') return true; name = name.toUpperCase(); return RES.packs.some(p => flat ? (p.flats.has(name) || p.imgFlat.has(name)) : (p.tex.has(name) || p.imgTex.has(name))); }
// the extra things the newer formats bring (so they can be placed)
if (CLASSIC) ['boom', 'mbf', 'id24'].forEach(k => Object.entries(FMT_CAT[k].things).forEach(([ed, name]) => { ed = +ed; if (!THINGS[ed]) defT(ed, name + ' (' + k.toUpperCase() + ')', ed === 888 ? 'monster' : 'decor', 20, 56, null, { fmtOnly: k }); }));
/* rebuild the Action list for the map's format: EOD's plain names where it has them, the spec's names for the rest */
function classicApplyFormat() {
  if (!CLASSIC) return;
  const f = mapFormat(), have = new Set(BASE_LINE_SPECIALS.map(o => o[0])), out = BASE_LINE_SPECIALS.filter(o => lineAllowed(o[0], f));
  fmtLevels(f).forEach(k => Object.entries(FMT_CAT[k].lines).forEach(([n, [trig, desc]]) => { n = +n; if (!have.has(n)) { have.add(n); out.push([n, (trig === 'Static' ? '' : trig + ' ') + desc + ' [' + k.toUpperCase() + ']']); } }));
  out.sort((a, b) => a[0] - b[0]); LINE_SPECIALS.length = 0; LINE_SPECIALS.push(...out);
  const b = $('#fmtBtn'); if (b) b.textContent = FORMATS[f].name;
  if (window.refreshProps) refreshProps();
}
/* ---- the map check for the chosen format ---- */
function classicCheck() {
  const f = mapFormat(), F = FORMATS[f], out = [], push = (sev, msg, kind, i) => out.push({ sev, msg, kind, i });
  const lm = lineFlagMask(f), tm = thingFlagMask(f), crashes = f === 'vanilla' ? ' Vanilla Doom crashes on this.' : '';
  // EOD-only content has no place in a classic map
  if (M.mon && Object.keys(M.mon).length) push('error', 'This map has EOD generated monsters. ' + F.name + ' has no way to define new monsters in a map.');
  if (M.wep && Object.keys(M.wep).length) push('error', 'This map has EOD custom weapons. ' + F.name + ' has no way to define new weapons in a map.');
  if (M.triggers && M.triggers.length) push('error', 'This map uses EOD triggers (boss events, waves, light changes). Build them with real line actions and tags instead.');
  if (M.start) push('warn', 'This map has an EOD starting loadout; ' + F.name + ' ignores it (players start with a pistol).');
  if (M.res && (Object.keys(M.res.tex || {}).length || Object.keys(M.res.flat || {}).length)) push('error', 'This map carries its own picture textures. Classic export can\'t pack those yet; use the game\'s textures.');
  M.l.forEach((L, i) => {
    if (L.glass) push('error', 'Linedef ' + i + ' is EOD glass. No classic format has breakable glass.', 'l', i);
    if (!lineAllowed(L.sp, f)) push('error', 'Linedef ' + i + ' action ' + L.sp + ' doesn\'t exist in ' + F.name + '.', 'l', i);
    if ((L.f || 0) & ~lm) push('warn', 'Linedef ' + i + ' has flags ' + F.name + ' doesn\'t know (0x' + ((L.f || 0) & ~lm).toString(16) + '); they\'ll be ignored.', 'l', i);
    if (f === 'vanilla' && (Math.abs(M.v[L.v1].x - M.v[L.v2].x) > 32767 || Math.abs(M.v[L.v1].y - M.v[L.v2].y) > 32767)) push('error', 'Linedef ' + i + ' is longer than 32767 units; vanilla math overflows on it.', 'l', i);
  });
  M.sec.forEach((s, i) => {
    if (!sectorAllowed(s.sp || 0, f)) push('error', 'Sector ' + i + ' type ' + s.sp + ' doesn\'t exist in ' + F.name + '.', 's', i);
    for (const [k, w] of [['ft', 'floor'], ['ct', 'ceiling']]) if (RES.packs.length && !texKnown(s[k], true)) push('error', 'Sector ' + i + ' ' + w + ' flat "' + s[k] + '" isn\'t in the game files.' + crashes, 's', i);
  });
  if (RES.packs.length) { const bad = new Map(); M.sd.forEach((d, i) => { for (const k of ['up', 'lo', 'mid']) if (!texKnown(d[k], false)) bad.set(d[k], (bad.get(d[k]) || 0) + 1); });
    bad.forEach((n, t) => push('error', 'Wall texture "' + t + '" (' + n + ' side' + (n > 1 ? 's' : '') + ') isn\'t in the game files.' + crashes)); }
  else push('warn', 'The game files are still loading, so texture names weren\'t checked. Run the check again in a moment.');
  M.t.forEach((t, i) => {
    if (!thingAllowed(t.type, f)) push('error', 'Thing ' + i + ' type ' + t.type + ' (' + thingName(t.type) + ') doesn\'t exist in ' + F.name + '.' + (f === 'vanilla' ? ' Vanilla stops with "P_SpawnMapThing: Unknown type".' : ''), 't', i);
    if ((t.f || 0) & ~tm) push('warn', 'Thing ' + i + ' has flags ' + F.name + ' doesn\'t know; they\'ll be ignored.', 't', i);
    if (t.wave) push('warn', 'Thing ' + i + ' is an EOD wave monster; in ' + F.name + ' it\'s simply there from the start.', 't', i);
  });
  M.v.forEach((v, i) => { if (Math.abs(v.x) > 32767 || Math.abs(v.y) > 32767) push('error', 'Vertex ' + i + ' is outside the ±32767 map limit.'); });
  if (F.bin) {
    if (!/^MAP(0[1-9]|[12]\d|3[0-2])$/.test(M.name || '')) push(f === 'vanilla' ? 'error' : 'warn', 'Map slot "' + M.name + '" isn\'t MAP01–MAP32 (Doom II). Pick a slot under Map properties.');
    try { const lines = M.l.filter(L => L.s1 >= 0), nb = buildNodes({ v: M.v, l: lines, sd: M.sd, sec: M.sec }), bm = buildBlockmap({ l: lines }, nb.V), c = nb.counts;
      const lim = f === 'vanilla' ? 32767 : 65535;
      if (c.segs > lim) push('error', c.segs + ' segs; the limit for ' + F.name + ' is ' + lim + '.');
      if (c.vertexes > lim) push('error', c.vertexes + ' vertices after node building; the limit is ' + lim + '.');
      if (M.sd.length > lim) push('error', M.sd.length + ' sidedefs; the limit is ' + lim + '.');
      if (bm.words > 65535) push('error', 'Blockmap too big (' + bm.words + ' entries, the limit is 65535). Make the map smaller or less spread out.');
      else if (f === 'vanilla' && bm.words > 32767) push('warn', 'Blockmap is past 32767 entries; some vanilla builds misread it.');
      out.nodeStats = c;
    } catch (e) { push('error', 'Node building failed: ' + e.message); }
  }
  return out;
}
/* ---- export ---- */
function classicExport() {
  const f = mapFormat(), F = FORMATS[f], errs = analyzeMap().filter(i => i.sev === 'error');
  const go = () => {
    if (!F.bin) { download('EODC-' + (M.name || 'MAP01') + '-UDMF.wad', buildUdmfWad(), 'application/octet-stream'); return toast('UDMF map exported.'); }
    const lines = M.l.filter(L => L.s1 >= 0), nb = buildNodes({ v: M.v, l: lines, sd: M.sd, sec: M.sec }), chk = nodesSelfCheck({ l: lines, sd: M.sd, sec: M.sec }, nb, 10);
    const w = buildWad(); download('EODC-' + (M.name || 'MAP01') + '-' + f + '.wad', w, 'application/octet-stream');
    toast(F.name + ' WAD exported: ' + nb.counts.segs + ' segs, ' + nb.counts.ssectors + ' subsectors, ' + nb.counts.nodes + ' nodes.' + (chk.bad ? ' Node check: ' + chk.bad + ' of ' + chk.tried + ' test points landed wrong, tell us.' : ' Node check passed.'), 6000);
  };
  if (errs.length) modal(errs.length + ' problem' + (errs.length > 1 ? 's' : '') + ' for ' + F.name, '<ul>' + errs.slice(0, 14).map(i => '<li>' + esc(i.msg) + '</li>').join('') + '</ul><p>' + F.name + ' ports may refuse or crash on this map. Fix them first (File → Check map), or export anyway.</p>', [{ label: 'Check map', fn: () => setTimeout(openAnalysis, 50) }, { label: 'Export anyway', fn: go }, { cancel: 1 }]);
  else go();
}
function buildUdmfWad() {
  compact();
  const q = s => '"' + String(s || '-').replace(/["\\]/g, '') + '"', b = (k, v) => v ? '  ' + k + ' = true;\n' : '';
  let t = '// Written by EOD Classic\nnamespace = "doom";\n\n';
  M.t.forEach(th => { const f = th.f || 7; t += 'thing\n{\n  x = ' + th.x + '.0;\n  y = ' + th.y + '.0;\n  angle = ' + (th.a || 0) + ';\n  type = ' + th.type + ';\n' + b('skill1', f & 1) + b('skill2', f & 1) + b('skill3', f & 2) + b('skill4', f & 4) + b('skill5', f & 4) + b('ambush', f & 8) + b('single', !(f & 16)) + b('dm', !(f & 32)) + b('coop', !(f & 64)) + b('friend', f & 128) + '}\n\n'; });
  M.v.forEach(v => { t += 'vertex\n{\n  x = ' + v.x + '.0;\n  y = ' + v.y + '.0;\n}\n\n'; });
  M.l.forEach(L => { if (L.s1 < 0) return; const f = L.f || 0;
    t += 'linedef\n{\n  v1 = ' + L.v1 + ';\n  v2 = ' + L.v2 + ';\n  sidefront = ' + L.s1 + ';\n' + (L.s2 >= 0 ? '  sideback = ' + L.s2 + ';\n' : '') + (L.sp ? '  special = ' + L.sp + ';\n' : '') + (L.tag ? '  id = ' + L.tag + ';\n  arg0 = ' + L.tag + ';\n' : '')
      + b('blocking', f & 1) + b('blockmonsters', f & 2) + b('twosided', f & 4) + b('dontpegtop', f & 8) + b('dontpegbottom', f & 16) + b('secret', f & 32) + b('blocksound', f & 64) + b('dontdraw', f & 128) + b('mapped', f & 256) + b('passuse', f & 512) + '}\n\n'; });
  M.sd.forEach(d => { t += 'sidedef\n{\n' + (d.xo ? '  offsetx = ' + d.xo + ';\n' : '') + (d.yo ? '  offsety = ' + d.yo + ';\n' : '') + '  texturetop = ' + q(d.up) + ';\n  texturebottom = ' + q(d.lo) + ';\n  texturemiddle = ' + q(d.mid) + ';\n  sector = ' + d.sec + ';\n}\n\n'; });
  M.sec.forEach(s => { t += 'sector\n{\n  heightfloor = ' + s.fh + ';\n  heightceiling = ' + s.ch + ';\n  texturefloor = ' + q(s.ft) + ';\n  textureceiling = ' + q(s.ct) + ';\n  lightlevel = ' + s.li + ';\n' + (s.sp ? '  special = ' + s.sp + ';\n' : '') + (s.tag ? '  id = ' + s.tag + ';\n' : '') + '}\n\n'; });
  const E = new Uint8Array(0), lumps = [[M.name || 'MAP01', E], ['TEXTMAP', new TextEncoder().encode(t)], ['ENDMAP', E]];
  let size = 12; lumps.forEach(l => size += l[1].length);
  const out = new Uint8Array(size + lumps.length * 16), dv = new DataView(out.buffer); out.set([80, 87, 65, 68], 0); dv.setInt32(4, lumps.length, true); dv.setInt32(8, size, true);
  let pos = 12; lumps.forEach(([n, d], i) => { out.set(d, pos); const o = size + i * 16; dv.setInt32(o, pos, true); dv.setInt32(o + 4, d.length, true); wrName(out, o + 8, n); pos += d.length; });
  return out;
}
/* ---- screens ---- */
function openFormatPicker() {
  const f = mapFormat();
  modal('Target format', `<p class="hint">What this map has to load in. The action list, the things you can place and the map check all follow it. You can change it any time; the check tells you what no longer fits.</p><div class="list">${Object.entries(FORMATS).map(([k, F]) => `<button data-f="${k}" class="${k === f ? 'on' : ''}"><b>${F.name}</b><br><span class="hint">${F.ports}</span></button>`).join('')}</div>`, [{ cancel: 1 }], b => {
    b.querySelectorAll('button[data-f]').forEach(x => x.onclick = () => { closeModal(); pushUndo(); M.format = x.dataset.f; mapChanged(); classicApplyFormat(); const n = classicCheck().filter(i => i.sev === 'error').length; toast('Target: ' + FORMATS[M.format].name + (n ? '. ' + n + ' thing' + (n > 1 ? 's' : '') + ' in the map don\'t fit; File → Check map.' : '. Everything in the map fits.'), 5000); });
  });
}
function classicFileMenu() {
  const F = FORMATS[mapFormat()];
  modal('File', `<div class="list">
  <button id="cAbout">About EOD Classic · version ${CLASSIC_VERSION}</button>
  <button id="cUpd">Check for updates</button>
  <button id="cFmt">Target format: <b>${F.name}</b></button>
  <button id="cChk">Check map for ${F.name}</button>
  <button id="cExp" class="demo">Export ${F.name} WAD</button>
  <button id="cNew">New blank map</button>
  <button id="cOpen">Open a map (.wad, .zip from /idgames, .pk3, or project)</button>
  <button id="cSave">Save project (.json)</button>
  <button id="cEod">Open the full EOD editor (with EOD's own extras)</button>
  </div><p class="hint">Your work autosaves on this device after every change (kept apart from the full EOD editor's maps).</p>`, [{ cancel: 1 }], b => {
    b.querySelector('#cAbout').onclick = () => { closeModal(); openAbout(); };
    b.querySelector('#cUpd').onclick = () => { closeModal(); checkUpdates(); };
    b.querySelector('#cFmt').onclick = () => { closeModal(); openFormatPicker(); };
    b.querySelector('#cChk').onclick = () => { closeModal(); openAnalysis(); };
    b.querySelector('#cExp').onclick = () => { closeModal(); classicExport(); };
    b.querySelector('#cNew').onclick = () => { closeModal(); modal('Start a new blank map?', '<p>Your current map stays in Undo, so one Undo brings it back.</p>', [{ ok: 1, fn: () => { pushUndo(); const fmt = mapFormat(); M = emptyMap(); M.format = fmt; clearSel(); mapChanged(); zoomFit(); } }, { cancel: 1 }]); };
    b.querySelector('#cOpen').onclick = () => { closeModal(); openFile(); };
    b.querySelector('#cSave').onclick = () => { closeModal(); saveProject(); };
    b.querySelector('#cEod').onclick = () => { location.href = 'editor.html'; };
  });
}
function classicThingBrowser(cb) {
  const f = mapFormat(), cats = {};
  Object.values(THINGS).forEach(t => { if (!thingAllowed(t.type, f)) return; (cats[t.cat] = cats[t.cat] || []).push(t); });
  const h = Object.entries(cats).map(([c, list]) => `<div class="h">${esc(CAT_NAME[c] || c)}</div><div class="list">${list.map(t => `<button data-t="${t.type}">${t.type} · ${esc(t.name)}</button>`).join('')}</div>`).join('');
  modal('Things for ' + FORMATS[f].name, h, [{ cancel: 1 }], b => b.querySelectorAll('button[data-t]').forEach(x => x.onclick = () => { closeModal(); cb(+x.dataset.t); }));
}
function classicBoot() {
  if (!CLASSIC) return;
  document.title = 'EOD Classic · the compatibility editor';
  document.body.classList.add('classic');
  const sub = $('#top .brand .sub'); if (sub) sub.textContent = 'CLASSIC';
  const ver = $('#ver'); if (ver) { ver.textContent = 'v' + CLASSIC_VERSION; new MutationObserver(() => { if (ver.textContent !== 'v' + CLASSIC_VERSION) ver.textContent = 'v' + CLASSIC_VERSION; }).observe(ver, { childList: true }); }
  const g = $('#top .grow'); if (g && !$('#fmtBtn')) g.insertAdjacentHTML('beforebegin', '<button id="fmtBtn" class="tb" title="Target format">Vanilla Doom II</button>');
  $('#fmtBtn').onclick = openFormatPicker;
  $('#btnFile').onclick = classicFileMenu;
  openThingBrowser = classicThingBrowser;
  const an = analyzeMap; analyzeMap = () => an().concat(classicCheck());
  openAbout = () => modal('About EOD Classic', `<p><b>Version ${CLASSIC_VERSION}</b> (vc${CLASSIC_VC})</p><p>The compatibility editor: maps that load in Vanilla Doom II, Boom, MBF21, ID24 and UDMF ports, with nothing EOD-only in them. Real node builder for the binary formats. A Pulse Labs Studio project, part of EOD.</p><p class="hint">Format tables from the Boom Standards feature-set specs; UDMF per the UDMF 1.1 spec.</p>`, [{ cancel: 1 }]);
  if (!M.format) M.format = 'vanilla';
  classicApplyFormat();
}
