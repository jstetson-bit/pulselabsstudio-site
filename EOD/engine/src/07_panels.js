/* ================= PANELS & DIALOGS ================= */
/* ---- Pulse Labs standard Move/Resize control: yellow word, hold to drag, tap to switch ---- */
function makeMovable(word, target, opts = {}) {
  let state = 'Move', down = null, holdT = 0, active = false;
  word.textContent = state;
  word.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); word.setPointerCapture(e.pointerId);
    const r = target.getBoundingClientRect();
    down = { x: e.clientX, y: e.clientY, r, moved: false };
    holdT = setTimeout(() => { active = true; word.style.background = 'var(--yellow)'; word.style.color = '#000'; }, 180);
  });
  word.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 6) { down.moved = true; if (!active) { clearTimeout(holdT); active = true; } }
    if (!active) return;
    if (opts.onDrag) { opts.onDrag(state, dx, dy, down); return; }
    if (state === 'Move') { target.style.left = clamp(down.r.left + dx, -down.r.width + 60, innerWidth - 60) + 'px'; target.style.top = clamp(down.r.top + dy, 0, innerHeight - 40) + 'px'; target.style.right = 'auto'; target.style.bottom = 'auto'; }
    else { target.style.width = clamp(down.r.width + dx, 220, innerWidth) + 'px'; target.style.height = clamp(down.r.height + dy, 120, innerHeight) + 'px'; }
  });
  const up = () => {
    clearTimeout(holdT); if (!down) return;
    if (!down.moved && !active) { state = state === 'Move' ? 'Resize' : 'Move'; word.textContent = state; }
    else if (opts.onEnd) opts.onEnd(state);
    active = false; down = null; word.style.background = ''; word.style.color = '';
  };
  word.addEventListener('pointerup', up); word.addEventListener('pointercancel', up);
}

/* ---- properties panel ---- */
function fieldNum(id, label, val) { return `<div class="f"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="numeric" value="${val}"></div>`; }
function fieldSel(id, label, val, opts) { return `<div class="f"><label for="${id}">${label}</label><select id="${id}">${opts.map(o => `<option value="${o[0]}" ${+o[0] === +val ? 'selected' : ''}>${o[0]} · ${esc(o[1])}</option>`).join('')}${opts.some(o => +o[0] === +val) ? '' : `<option value="${val}" selected>${val} · (other)</option>`}</select></div>`; }
function fieldTex(id, label, val, flat) { return `<div class="f"><label>${label}</label><div class="texf"><canvas data-tex="${id}" data-flat="${flat ? 1 : 0}" width="32" height="32"></canvas><input id="${id}" value="${esc(val)}" list="${flat ? 'dlFlats' : 'dlWalls'}" autocapitalize="characters"><button data-browse="${id}" data-flat="${flat ? 1 : 0}">…</button></div></div>`; }
function texThumb(cv, name, flat) {
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  if (!name || name === '-') { g.fillStyle = '#333'; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = '#f33'; g.beginPath(); g.moveTo(0, 0); g.lineTo(cv.width, cv.height); g.stroke(); return; }
  const t = name === 'F_SKY1' ? getSky() : getTex(name, flat);
  const id = new ImageData(t.w, t.h); new Uint32Array(id.data.buffer).set(t.px);
  const tmp = document.createElement('canvas'); tmp.width = t.w; tmp.height = t.h; tmp.getContext('2d').putImageData(id, 0, 0);
  g.imageSmoothingEnabled = false; const s = Math.min(cv.width / t.w, cv.height / t.h) * (flat ? 1 : 1.6); g.drawImage(tmp, 0, 0, t.w * s, t.h * s);
}
function refreshProps() {
  const body = $('#propsBody'); if (!body) return;
  const tt = $('#propsTitle'); let h = '';
  const ss = [...E.sel.s], ls = [...E.sel.l], ts = [...E.sel.t], vs = [...E.sel.v];
  if (E.mode === 'things' && !ts.length) {
    tt.textContent = 'Things';
    h = `<p class="hint">Double-tap empty space to place. Tap to select, drag to move.</p><div class="f"><label>Placing</label><button id="pkType">${E.thingType} · ${esc(thingName(E.thingType))}</button></div>`;
  } else if (ts.length) {
    const t = M.t[ts[0]]; tt.textContent = ts.length > 1 ? ts.length + ' things' : 'Thing ' + ts[0];
    h = `<div class="f"><label>Type</label><button id="pkType">${t.type} · ${esc(thingName(t.type))}</button></div>${fieldNum('tA', 'Angle', t.a)}<div class="row" id="angRow">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<button data-a="${a}" class="${t.a === a ? 'on' : ''}">${a}°</button>`).join('')}</div>${fieldNum('tX', 'X', t.x)}${fieldNum('tY', 'Y', t.y)}<div class="h">Appears on</div>${[[1, 'Easy (skill 1-2)'], [2, 'Medium (skill 3)'], [4, 'Hard (skill 4-5)'], [8, 'Ambush (deaf)'], [16, 'Multiplayer only']].map(([b, n]) => `<label class="chk"><input type="checkbox" data-tf="${b}" ${t.f & b ? 'checked' : ''}>${n}</label>`).join('')}`;
  } else if (ss.length) {
    const s = M.sec[ss[0]]; tt.textContent = ss.length > 1 ? ss.length + ' sectors' : 'Sector ' + ss[0];
    h = `${fieldNum('sF', 'Floor height', s.fh)}${fieldNum('sC', 'Ceiling height', s.ch)}<div class="row"><button data-q="fh,8">Floor +8</button><button data-q="fh,-8">Floor −8</button><button data-q="ch,8">Ceil +8</button><button data-q="ch,-8">Ceil −8</button></div>${fieldNum('sL', 'Brightness (0-255)', s.li)}<div class="row"><button data-q="li,16">Light +16</button><button data-q="li,-16">Light −16</button></div>${fieldTex('sFT', 'Floor flat', s.ft, 1)}${fieldTex('sCT', 'Ceiling flat', s.ct, 1)}<div class="row"><button id="skyBtn">Make ceiling sky</button></div>${fieldSel('sS', 'Effect', s.sp, SECTOR_SPECIALS)}<div class="f"><label>Tag</label><div class="texf"><input id="sT" type="number" value="${s.tag}"><button id="sTn">New tag</button></div></div><div class="row"><button id="mkDoor">Make Door</button><button id="mkLift">Make Lift</button></div><p class="hint">Height ${s.ch - s.fh}. Doors open up from the floor; lifts lower to the lowest neighbor floor.</p>`;
  } else if (ls.length) {
    const L = M.l[ls[0]]; tt.textContent = ls.length > 1 ? ls.length + ' linedefs' : 'Linedef ' + ls[0];
    const fr = L.s1 >= 0 ? M.sd[L.s1] : null, bk = L.s2 >= 0 ? M.sd[L.s2] : null;
    h = `${fieldSel('lS', 'Action', L.sp, LINE_SPECIALS)}<div class="f"><label>Tag</label><div class="texf"><input id="lT" type="number" value="${L.tag}"><button id="lTn">New tag</button></div></div><div class="row"><button id="mkExit">Make exit switch</button></div><div class="h">Flags</div>${[[1, 'Impassable'], [2, 'Block monsters'], [4, 'Two-sided'], [8, 'Upper unpegged'], [16, 'Lower unpegged'], [32, 'Secret (shows as wall on map)'], [64, 'Block sound'], [128, 'Hidden on map'], [256, 'Already on map']].map(([b, n]) => `<label class="chk"><input type="checkbox" data-lf="${b}" ${L.f & b ? 'checked' : ''}>${n}</label>`).join('')}`;
    for (const [k, d] of [['F', fr], ['B', bk]]) {
      if (!d) { h += `<div class="h">${k === 'F' ? 'Front' : 'Back'} side</div><p class="hint">None${k === 'F' ? ' (use Make Sector)' : ' (one-sided wall)'}</p>`; continue; }
      h += `<div class="h">${k === 'F' ? 'Front' : 'Back'} side · sector ${d.sec}</div>${fieldTex('d' + k + 'u', 'Upper', d.up, 0)}${fieldTex('d' + k + 'm', 'Middle', d.mid, 0)}${fieldTex('d' + k + 'l', 'Lower', d.lo, 0)}${fieldNum('d' + k + 'x', 'Offset X', d.xo)}${fieldNum('d' + k + 'y', 'Offset Y', d.yo)}`;
    }
    h += `<p class="hint">Length ${Math.round(lineLen(L))}. The little tick on the line points at the front side.</p>`;
  } else if (vs.length) {
    const v = M.v[vs[0]]; tt.textContent = vs.length > 1 ? vs.length + ' vertices' : 'Vertex ' + vs[0];
    h = fieldNum('vX', 'X', v.x) + fieldNum('vY', 'Y', v.y);
  } else {
    tt.textContent = 'Map';
    const names = []; for (let i = 1; i <= 32; i++) names.push('MAP' + String(i).padStart(2, '0')); for (let e = 1; e <= 4; e++) for (let m = 1; m <= 9; m++) names.push('E' + e + 'M' + m);
    h = `<div class="f"><label>Map slot</label><select id="mName">${names.map(n => `<option ${n === M.name ? 'selected' : ''}>${n}</option>`).join('')}</select></div><p class="hint">MAPxx = Doom II / Freedoom Phase 2. ExMx = Doom 1 / Freedoom Phase 1.</p><p class="hint"><b>Quick start:</b> pick <b>Rectangle</b>, drag a room, go to <b>Things</b>, double-tap to place a Player 1 Start, then press <b>▶ DEMO</b>.</p><p class="hint">${M.sec.length} sectors · ${M.l.length} linedefs · ${M.sd.length} sidedefs · ${M.v.length} vertices · ${M.t.length} things</p>`;
  }
  body.innerHTML = h;
  bindProps(body, ss, ls, ts, vs);
}
function bindProps(body, ss, ls, ts, vs) {
  const on = (id, fn) => { const e = body.querySelector('#' + id); if (e) e.onchange = () => { pushUndo(); fn(e); mapChanged(); }; };
  body.querySelectorAll('canvas[data-tex]').forEach(c => { const inp = body.querySelector('#' + c.dataset.tex); texThumb(c, inp.value.toUpperCase(), c.dataset.flat === '1'); });
  body.querySelectorAll('button[data-browse]').forEach(b => b.onclick = () => openTexBrowser(b.dataset.flat === '1', body.querySelector('#' + b.dataset.browse).value, name => { const inp = body.querySelector('#' + b.dataset.browse); inp.value = name; inp.onchange(); }));
  const pk = body.querySelector('#pkType'); if (pk) pk.onclick = () => openThingBrowser(type => { if (ts.length) { pushUndo(); ts.forEach(i => M.t[i].type = type); mapChanged(); } E.thingType = type; refreshProps(); });
  // things
  on('tA', e => ts.forEach(i => M.t[i].a = (+e.value % 360 + 360) % 360)); on('tX', e => ts.forEach(i => M.t[i].x = +e.value)); on('tY', e => ts.forEach(i => M.t[i].y = +e.value));
  body.querySelectorAll('#angRow button').forEach(b => b.onclick = () => { pushUndo(); ts.forEach(i => M.t[i].a = +b.dataset.a); mapChanged(); });
  body.querySelectorAll('input[data-tf]').forEach(c => c.onchange = () => { pushUndo(); const b = +c.dataset.tf; ts.forEach(i => { M.t[i].f = c.checked ? M.t[i].f | b : M.t[i].f & ~b; }); mapChanged(); });
  // sectors
  on('sF', e => ss.forEach(i => M.sec[i].fh = +e.value)); on('sC', e => ss.forEach(i => M.sec[i].ch = +e.value)); on('sL', e => ss.forEach(i => M.sec[i].li = clamp(+e.value, 0, 255)));
  on('sFT', e => ss.forEach(i => M.sec[i].ft = e.value.toUpperCase().slice(0, 8))); on('sCT', e => ss.forEach(i => M.sec[i].ct = e.value.toUpperCase().slice(0, 8)));
  on('sS', e => ss.forEach(i => M.sec[i].sp = +e.value)); on('sT', e => ss.forEach(i => M.sec[i].tag = +e.value));
  body.querySelectorAll('button[data-q]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.q.split(','); pushUndo(); ss.forEach(i => { M.sec[i][k] += +d; if (k === 'li') M.sec[i].li = clamp(M.sec[i].li, 0, 255); }); mapChanged(); });
  const sky = body.querySelector('#skyBtn'); if (sky) sky.onclick = () => { pushUndo(); ss.forEach(i => M.sec[i].ct = 'F_SKY1'); mapChanged(); };
  const st = body.querySelector('#sTn'); if (st) st.onclick = () => { pushUndo(); const t = nextTag(); ss.forEach(i => M.sec[i].tag = t); mapChanged(); };
  const md = body.querySelector('#mkDoor'); if (md) md.onclick = () => sectorRecipe('door');
  const ml = body.querySelector('#mkLift'); if (ml) ml.onclick = () => sectorRecipe('lift');
  // lines
  on('lS', e => ls.forEach(i => M.l[i].sp = +e.value)); on('lT', e => ls.forEach(i => M.l[i].tag = +e.value));
  const lt = body.querySelector('#lTn'); if (lt) lt.onclick = () => { pushUndo(); const t = nextTag(); ls.forEach(i => M.l[i].tag = t); mapChanged(); toast('Tag ' + t + ': now give the target sector the same tag'); };
  const mx = body.querySelector('#mkExit'); if (mx) mx.onclick = () => { pushUndo(); ls.forEach(i => { const L = M.l[i]; L.sp = 11; if (L.s1 >= 0) { if (L.s2 < 0) M.sd[L.s1].mid = 'SW1EXIT'; else M.sd[L.s1].lo = 'SW1EXIT'; } }); mapChanged(); toast('Exit switch: press USE on its front side'); };
  body.querySelectorAll('input[data-lf]').forEach(c => c.onchange = () => { pushUndo(); const b = +c.dataset.lf; ls.forEach(i => { M.l[i].f = c.checked ? M.l[i].f | b : M.l[i].f & ~b; }); mapChanged(); });
  for (const k of ['F', 'B']) {
    const sd = i => { const L = M.l[i]; const s = k === 'F' ? L.s1 : L.s2; return s >= 0 ? M.sd[s] : null; };
    const tx = (id, key) => on(id, e => ls.forEach(i => { const d = sd(i); if (d) d[key] = e.value.toUpperCase().slice(0, 8) || '-'; }));
    tx('d' + k + 'u', 'up'); tx('d' + k + 'm', 'mid'); tx('d' + k + 'l', 'lo');
    on('d' + k + 'x', e => ls.forEach(i => { const d = sd(i); if (d) d.xo = +e.value; })); on('d' + k + 'y', e => ls.forEach(i => { const d = sd(i); if (d) d.yo = +e.value; }));
  }
  on('vX', e => vs.forEach(i => M.v[i].x = +e.value)); on('vY', e => vs.forEach(i => M.v[i].y = +e.value));
  const mn = body.querySelector('#mName'); if (mn) mn.onchange = () => { M.name = mn.value; S.mapName = mn.value; saveSettings(); mapChanged(); };
}

/* ---- browsers ---- */
function openTexBrowser(flat, current, cb) {
  const used = new Set(flat ? FLAT_TEX : WALL_TEX);
  RES.packs.forEach(p => { (flat ? [p.flats, p.imgFlat] : [p.tex, p.imgTex]).forEach(m => { for (const n of m.keys()) used.add(n); }); });
  if (flat) M.sec.forEach(s => { used.add(s.ft); used.add(s.ct); }); else M.sd.forEach(d => [d.up, d.mid, d.lo].forEach(n => n !== '-' && used.add(n)));
  const names = [...used].filter(Boolean).sort();
  const b = modal(flat ? 'Flats (floors & ceilings)' : 'Wall textures', `<div class="row"><input id="txq" placeholder="Search…" style="flex:1" autocapitalize="characters"><button id="txAdd" class="demo">＋ Add my own</button></div><div style="height:8px"></div><div class="grid" id="txg"></div><p class="hint">Art comes from the loaded packs (the map's own art, your IWAD if you opened it, Freedoom) and EOD's in-house stand-ins for anything missing.</p>`, [{ label: 'Use typed name', fn: bd => { const v = bd.querySelector('#txq').value.trim().toUpperCase(); if (v) cb(v.slice(0, 8)); } }, { cancel: 1 }]);
  const grid = b.querySelector('#txg');
  const render = q => {
    grid.innerHTML = '';
    for (const n of names) {
      if (q && !n.includes(q)) continue;
      const t = document.createElement('div'); t.className = 'tile' + (n === current ? ' sel' : ''); const c = document.createElement('canvas'); c.width = 64; c.height = 64; texThumb(c, n, flat);
      t.append(c, document.createTextNode(n)); t.onclick = () => { closeModal(); cb(n); }; grid.appendChild(t);
    }
  };
  b.querySelector('#txAdd').onclick = () => { closeModal(); addMyTexture(flat ? 'flat' : 'wall', name => cb(name)); };
  render(''); b.querySelector('#txq').oninput = e => render(e.target.value.toUpperCase());
}
function openThingBrowser(cb) {
  const cats = {}; Object.values(THINGS).forEach(t => (cats[t.cat] = cats[t.cat] || []).push(t));
  let h = ''; for (const c in cats) { h += `<div class="h">${CAT_NAME[c]}</div><div class="list">` + cats[c].map(t => `<button data-t="${t.type}"><span class="dot" style="background:${CAT_COLOR[c]}"></span>${t.type} · ${esc(t.name)}</button>`).join('') + '</div>'; }
  modal('Thing browser', h, [{ cancel: 1 }], b => b.querySelectorAll('button[data-t]').forEach(x => x.onclick = () => { closeModal(); cb(+x.dataset.t); }));
}
function openAnalysis() {
  const iss = analyzeMap();
  const h = iss.length ? '<div class="list">' + iss.map((i, k) => `<button data-k="${k}"><span class="dot" style="background:${i.sev === 'error' ? '#e33' : '#fb0'}"></span>${esc(i.msg)}</button>`).join('') + '</div>' : '<p>No problems found. Map is good to go.</p>';
  modal('Map Analysis · ' + iss.length + ' issue(s)', h + '<p class="hint">Tap an issue to jump to it.</p>', [...(S.limits ? [{ label: 'Scan for vanilla limits', fn: () => { setTimeout(scanVanillaLimits, 50); } }] : []), { cancel: 1 }], b => b.querySelectorAll('button[data-k]').forEach(x => x.onclick = () => {
    const i = iss[+x.dataset.k]; closeModal(); if (!i.kind) return;
    const mode = { l: 'linedefs', s: 'sectors', t: 'things' }[i.kind]; setMode(mode); clearSel(); E.sel[i.kind].add(i.i);
    let p; if (i.kind === 't') p = M.t[i.i]; else if (i.kind === 'l') { const L = M.l[i.i]; p = { x: (M.v[L.v1].x + M.v[L.v2].x) / 2, y: (M.v[L.v1].y + M.v[L.v2].y) / 2 }; } else { const li = sectorLines(i.i)[0]; p = li >= 0 ? M.v[M.l[li].v1] : null; }
    if (p) { E.view.x = p.x; E.view.y = p.y; E.view.z = Math.max(E.view.z, 0.8); } refreshProps(); edRedraw();
  }));
}
function openFindReplace() {
  modal('Find & Replace', `<div class="h">Textures / flats</div>${'<div class="f"><label>Find</label><input id="frA" autocapitalize="characters" list="dlWalls"></div><div class="f"><label>Replace with</label><input id="frB" autocapitalize="characters" list="dlWalls"></div>'}<div class="h">Thing type</div><div class="f"><label>Find type #</label><input id="frT1" type="number"></div><div class="f"><label>Replace with #</label><input id="frT2" type="number"></div><p class="hint">Leave a section empty to skip it. Selection-only: tick below.</p><label class="chk"><input type="checkbox" id="frSel">Only inside the current selection</label>`,
    [{ ok: 1, fn: bd => {
      const a = bd.querySelector('#frA').value.trim().toUpperCase(), b = bd.querySelector('#frB').value.trim().toUpperCase(), t1 = +bd.querySelector('#frT1').value, t2 = +bd.querySelector('#frT2').value, only = bd.querySelector('#frSel').checked;
      pushUndo(); let n = 0;
      if (a && b) {
        M.sec.forEach((s, i) => { if (only && !E.sel.s.has(i)) return; if (s.ft === a) { s.ft = b; n++; } if (s.ct === a) { s.ct = b; n++; } });
        M.l.forEach((L, i) => { if (only && !E.sel.l.has(i)) return; [L.s1, L.s2].forEach(si => { if (si < 0) return; const d = M.sd[si]; ['up', 'mid', 'lo'].forEach(k => { if (d[k] === a) { d[k] = b; n++; } }); }); });
      }
      if (t1 && t2) M.t.forEach((t, i) => { if (only && !E.sel.t.has(i)) return; if (t.type === t1) { t.type = t2; n++; } });
      mapChanged(); toast('Replaced ' + n);
    } }, { cancel: 1 }]);
}
function openTags() {
  const tags = new Map(); M.sec.forEach((s, i) => { if (s.tag) { const t = tags.get(s.tag) || { s: [], l: [] }; t.s.push(i); tags.set(s.tag, t); } });
  M.l.forEach((L, i) => { if (L.tag) { const t = tags.get(L.tag) || { s: [], l: [] }; t.l.push(i); tags.set(L.tag, t); } });
  const h = tags.size ? '<div class="list">' + [...tags].sort((a, b) => a[0] - b[0]).map(([t, o]) => `<button data-t="${t}">Tag ${t}: ${o.s.length} sector(s), ${o.l.length} line(s)${o.l.length ? ' · ' + esc(SPECIAL_NAME[M.l[o.l[0]].sp] || 'action ' + M.l[o.l[0]].sp) : ''}${!o.s.length || !o.l.length ? ' ⚠' : ''}</button>`).join('') + '</div>' : '<p>No tags used yet.</p>';
  modal('Tag explorer', h + '<p class="hint">Tap a tag to select everything that uses it. ⚠ = only one half of the pair exists.</p>', [{ cancel: 1 }], b => b.querySelectorAll('button[data-t]').forEach(x => x.onclick = () => { const o = tags.get(+x.dataset.t); closeModal(); clearSel(); o.s.forEach(i => E.sel.s.add(i)); o.l.forEach(i => E.sel.l.add(i)); setMode(o.s.length ? 'sectors' : 'linedefs'); }));
}
function openPrefabs() {
  const P = LS.get('prefabs', []);
  const h = `<div class="row"><input id="pfN" placeholder="Prefab name" style="flex:1"><button id="pfSave">Save selection</button></div><div class="list">${P.map((p, i) => `<div class="row"><button data-i="${i}" style="flex:1">${esc(p.name)} (${p.clip.l.length} lines, ${p.clip.t.length} things)</button><button data-del="${i}">Delete</button></div>`).join('') || '<p class="hint">No prefabs yet. Select sectors and save them here to reuse rooms, doors and traps.</p>'}</div>`;
  modal('Prefabs', h, [{ cancel: 1 }], b => {
    b.querySelector('#pfSave').onclick = () => { if (!anySel()) return toast('Select something first'); const n = b.querySelector('#pfN').value.trim() || 'Prefab ' + (P.length + 1); P.push({ name: n, clip: copySelection(E.sel) }); LS.set('prefabs', P); closeModal(); toast('Prefab saved'); };
    b.querySelectorAll('button[data-i]').forEach(x => x.onclick = () => { closeModal(); pasteClip(P[+x.dataset.i].clip, E.view.x, E.view.y); });
    b.querySelectorAll('button[data-del]').forEach(x => x.onclick = () => { const i = +x.dataset.del; modal('Delete prefab "' + P[i].name + '"?', '<p>This cannot be undone.</p>', [{ ok: 1, fn: () => { P.splice(i, 1); LS.set('prefabs', P); toast('Deleted'); } }, { cancel: 1 }]); });
  });
}

/* ---- File menu ---- */
function openFileMenu() {
  modal('File', `<div class="list">
  <button id="fAbout">About EOD · version ${VERSION}</button>
  <button id="fUpd">Check for updates</button>
  <button id="fPub" class="demo">Publish to EOD (share it)</button>
  <button id="fTex">My textures (add your own walls and floors)</button>
  <button id="fLib">Open from the EOD library</button>
  <button id="fNew">New blank map</button>
  <button id="fSample">Load the test map (Hangar of Shit)</button>
  <button id="fOpen">Open any map… (.wad, .zip from /idgames, .pk3, or EOD project)</button>
  <button id="fSave">Save project (.json)</button>
  <button id="fWad">Export Doom WAD (for GZDoom / Delta Touch)</button>
  <button id="fPlay">Export playable game (.html, runs on any phone or PC)</button>
  </div><p class="hint">Your work also autosaves on this device after every change.</p>`, [{ cancel: 1 }], b => {
    b.querySelector('#fAbout').onclick = () => { closeModal(); openAbout(); };
    b.querySelector('#fUpd').onclick = () => { closeModal(); checkUpdates(); };
    b.querySelector('#fTex').onclick = () => { closeModal(); openMyTextures(); };
    b.querySelector('#fPub').onclick = () => { closeModal(); eodPublish(); };
    b.querySelector('#fLib').onclick = () => { closeModal(); eodLibrary(); };
    b.querySelector('#fNew').onclick = () => { closeModal(); modal('Start a new blank map?', '<p>Your current map stays in Undo, so one Undo brings it back.</p>', [{ ok: 1, fn: () => { pushUndo(); M = emptyMap(); clearSel(); mapChanged(); zoomFit(); } }, { cancel: 1 }]); };
    b.querySelector('#fSample').onclick = () => { closeModal(); pushUndo(); buildSampleMap(); clearSel(); mapChanged(); zoomFit(); toast('Test map loaded. Press ▶ DEMO to play it.'); };
    b.querySelector('#fOpen').onclick = () => { closeModal(); openFile(); };
    b.querySelector('#fSave').onclick = () => { closeModal(); saveProject(); };
    b.querySelector('#fWad').onclick = () => { closeModal(); exportWad(); };
    b.querySelector('#fPlay').onclick = () => { closeModal(); exportPlayable(); };
  });
}

/* ---- Settings ---- */
function openSettings() {
  const crash = LS.get('crash', []);
  modal('Settings', `
  <div class="h">Look</div>
  <div class="row" id="thRow">${[['light', 'Light'], ['dark', 'Dark'], ['device', 'Follow device']].map(([k, n]) => `<button data-th="${k}" class="${(S.theme || 'device') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="f"><label>Font</label><select id="stF"><option value="clean" ${S.font === 'clean' ? 'selected' : ''}>Clean</option><option value="mono" ${S.font === 'mono' ? 'selected' : ''}>Old-school mono</option></select></div>
  <div class="f"><label>Font size <b id="fsV">${S.fs}</b></label><input id="stFs" type="range" min="12" max="22" value="${S.fs}"></div>
  <label class="chk"><input type="checkbox" id="stInv" ${S.inverted ? 'checked' : ''}>Invert colors</label>
  <div class="h">Editor</div>
  <div class="f"><label>Default wall texture</label><input id="stDW" value="${S.defWall}" list="dlWalls"></div>
  <div class="f"><label>Default floor</label><input id="stDF" value="${S.defFloor}" list="dlFlats"></div>
  <div class="f"><label>Default ceiling</label><input id="stDC" value="${S.defCeil}" list="dlFlats"></div>
  <div class="f"><label>Ellipse sides</label><input id="stES" type="number" min="3" max="64" value="${S.ellipseSides}"></div>
  <div class="h">Demo / game</div>
  <div class="f"><label>Screen layout</label><select id="stL">${[['auto', 'Auto (detect)'], ['portrait', 'Portrait 9:16'], ['landscape', 'Landscape 16:9'], ['fold', 'Z Fold unfolded']].map(([k, n]) => `<option value="${k}" ${S.layout === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="f"><label>Art pack</label><select id="stArt"><option value="freedoom" ${(S.artPack || 'freedoom') === 'freedoom' ? 'selected' : ''}>Freedoom (looks like Doom · free · ~7 MB once)</option><option value="inhouse" ${S.artPack === 'inhouse' ? 'selected' : ''}>EOD in-house (lightest, no download)</option></select></div>
  <p class="hint">Maps that bring their own art always use it. Freedoom is free art made by the Freedoom project (BSD license); see Credits in the manual.</p>
  <div class="f"><label>Picture detail</label><select id="stR">${[[200, 'Chunky (fastest)'], [320, 'Classic 320'], [480, 'Sharp 480']].map(([k, n]) => `<option value="${k}" ${S.res == k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="f"><label>Skill</label><select id="stSk">${[[1, "I'm too young to die"], [2, 'Hurt me plenty'], [3, 'Ultra-violence']].map(([k, n]) => `<option value="${k}" ${S.skill == k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="f"><label>Turn speed <b id="snV">${S.sens}</b></label><input id="stSn" type="range" min="0.3" max="3" step="0.1" value="${S.sens}"></div>
  <div class="f"><label>Control opacity <b id="coV">${S.ctlOpacity}</b></label><input id="stCo" type="range" min="0.15" max="1" step="0.05" value="${S.ctlOpacity}"></div>
  <label class="chk"><input type="checkbox" id="stSnd" ${S.sound ? 'checked' : ''}>Sound effects</label>
  <div class="row"><button id="stArr">Arrange on-screen controls</button><button id="stArrReset">Reset control layout</button></div>
  <div class="h">Vanilla limits check</div>
  <p class="hint">Original Doom (and Chocolate Doom) crash on busy views: "visplane overflow", too many drawsegs or sprites. EOD and GZDoom have no such limits. Turn this on if your map is meant for vanilla.</p>
  <div class="row">${[[false, 'Off'], [true, 'On']].map(([k, n]) => `<button data-lim="${k}" class="${!!S.limits === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <label class="chk"><input type="checkbox" id="stLimHud" ${S.limHud !== false ? 'checked' : ''}>Show the counters while playing (top right)</label>
  <label class="chk"><input type="checkbox" id="stLimWarn" ${S.limWarn !== false ? 'checked' : ''}>Pop up a warning when a view goes over</label>
  <div class="row"><button id="stLimScan">Scan this whole map now</button></div>
  <div class="h">Support & crash log</div>
  <p class="hint">${crash.length} entr${crash.length === 1 ? 'y' : 'ies'} logged. Version ${VERSION} (vc${VC}).</p>
  <div class="row"><button id="stCl">View log</button><button id="stCc">Copy log</button><button id="stCx">Clear log</button></div>
  <div class="row"><button id="stTut">Start guided tutorial</button></div>`, [{ cancel: 1, title: 'Close' }], b => {
    b.querySelectorAll('[data-th]').forEach(x => x.onclick = () => { S.theme = x.dataset.th === 'device' ? 'device' : x.dataset.th; saveSettings(); b.querySelectorAll('[data-th]').forEach(y => y.classList.toggle('on', y === x)); });
    const ch = (id, fn) => { const e = b.querySelector(id); e.oninput = e.onchange = () => { fn(e); saveSettings(); }; };
    ch('#stF', e => S.font = e.value); ch('#stFs', e => { S.fs = +e.value; b.querySelector('#fsV').textContent = S.fs; }); ch('#stInv', e => S.inverted = e.checked);
    ch('#stDW', e => S.defWall = e.value.toUpperCase().slice(0, 8)); ch('#stDF', e => S.defFloor = e.value.toUpperCase().slice(0, 8)); ch('#stDC', e => S.defCeil = e.value.toUpperCase().slice(0, 8)); ch('#stES', e => S.ellipseSides = clamp(+e.value || 16, 3, 64));
    ch('#stArt', e => { S.artPack = e.value; setTimeout(applyArtSetting, 0); });
    ch('#stL', e => S.layout = e.value); ch('#stR', e => S.res = +e.value); ch('#stSk', e => S.skill = +e.value);
    ch('#stSn', e => { S.sens = +e.value; b.querySelector('#snV').textContent = S.sens; }); ch('#stCo', e => { S.ctlOpacity = +e.value; b.querySelector('#coV').textContent = S.ctlOpacity; }); ch('#stSnd', e => S.sound = e.checked);
    b.querySelectorAll('[data-lim]').forEach(x => x.onclick = () => { S.limits = x.dataset.lim === 'true'; saveSettings(); b.querySelectorAll('[data-lim]').forEach(y => y.classList.toggle('on', y === x)); toast('Vanilla limits check ' + (S.limits ? 'on' : 'off')); });
    ch('#stLimHud', e => S.limHud = e.checked); ch('#stLimWarn', e => S.limWarn = e.checked);
    b.querySelector('#stLimScan').onclick = () => { closeModal(); scanVanillaLimits(); };
    b.querySelector('#stArr').onclick = () => { closeModal(); startDemo({ arrange: true }); };
    b.querySelector('#stArrReset').onclick = () => { LS.set('ctlpos', {}); toast('Control layout reset'); };
    b.querySelector('#stCl').onclick = () => { const c = LS.get('crash', []); modal('Crash log', '<pre style="white-space:pre-wrap;font-size:12px">' + esc(c.map(x => x.t + ' v' + x.v + '\n' + x.m).join('\n\n') || 'Empty. Nothing has crashed.') + '</pre>', [{ cancel: 1 }]); };
    b.querySelector('#stCc').onclick = () => { const txt = 'EOD Editor ' + VERSION + ' crash log\n' + navigator.userAgent + '\n\n' + LS.get('crash', []).map(x => x.t + ' v' + x.v + '\n' + x.m).join('\n\n'); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Log copied'), () => toast('Copy not allowed here')); };
    b.querySelector('#stCx').onclick = () => { modal('Clear the crash log?', '<p>This cannot be undone.</p>', [{ ok: 1, fn: () => { LS.set('crash', []); toast('Cleared'); } }, { cancel: 1 }]); };
    b.querySelector('#stTut').onclick = () => { closeModal(); startTutorial(); };
  });
}
function firstRun() {
  modal('Welcome to EOD · Editor of Doom', `<p>Pick your look. You can change it any time in Settings.</p><div class="big3"><button data-th="light">☀ Light</button><button data-th="dark">☾ Dark</button><button data-th="device">⚙ Follow device</button></div>`, [], b => b.querySelectorAll('[data-th]').forEach(x => x.onclick = () => {
    S.theme = x.dataset.th; saveSettings(); closeModal();
    modal('Ready to rip and tear', '<p>A test map is loaded. Press <b>▶ DEMO</b> to jump in and play it right now, or take the 2-minute guided tutorial and build your own room.</p>', [{ label: 'Guided tutorial', fn: () => setTimeout(startTutorial, 50) }, { label: '▶ Play the test map', cls: 'demo', fn: () => setTimeout(() => startDemo(), 50) }, { cancel: 1 }]);
  }));
}
