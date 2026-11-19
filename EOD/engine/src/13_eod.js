/* ================= EOD SITE LINK: library, publish, remix, play-from-library ================= */
const EODP = { cloudId: null, remixOf: null, title: '', description: '', published: true, allowRemix: true, allowDownload: true, playOnly: null };
function eodOnline() { return !!(window.EODB && window.EOD); }
async function eodBoot() {
  const q = new URLSearchParams(location.search);
  // hub links: work with or without accounts
  if (q.get('fd')) { loadFreedoomMap(q.get('fd').toUpperCase(), q.get('go') === 'play'); history.replaceState(null, '', 'editor.html'); return; }
  if (q.get('demo')) { loadDemo(q.get('demo'), q.get('go') === 'play'); history.replaceState(null, '', 'editor.html'); return; }
  if (q.get('gen') === 'monster') { setTimeout(() => openMonsterGen(), 300); history.replaceState(null, '', 'editor.html'); return; }
  if (q.get('gen') === 'weapon') { setTimeout(() => openWeaponGen(), 300); history.replaceState(null, '', 'editor.html'); return; }
  if (q.get('new')) { pushUndo(); M = emptyMap(); M.mon = {}; M.wep = {}; clearSel(); mapChanged(); zoomFit(); history.replaceState(null, '', 'editor.html'); toast('Blank map. Start drawing with Draw.'); return; }
  if (q.get('maps')) { setTimeout(openDemoMaps, 300); history.replaceState(null, '', 'editor.html'); return; }
  if (!eodOnline()) return;
  const p = q;
  const play = p.get('play'), edit = p.get('map'), remix = p.get('remix'), wad = p.get('wad'), id = play || edit || remix || wad;
  if (!id) return;
  let m; try { m = await EODB.getMap(id); } catch (e) { toast('Could not load that map: ' + e.message, 5000); return; }
  const me = await EODB.user().catch(() => null), mine = me && me.id === m.owner;
  if (play) {
    EODP.playOnly = { id, title: m.title, author: m.author };
    const keep = M; M = m.data; compact(); syncCustomTex(true); syncMonsters(); syncWeapons();
    const p1 = realStart();
    if (!p1) { M = keep; return toast('That map has no Player 1 Start', 4000); }
    initGame('play', { x: p1.x, y: p1.y, a: p1.a });
    $('#gTitle').textContent = '▶ ' + m.title + ' · by ' + m.author;
    EODP.saved = keep; EODB.addPlay(id);
    return;
  }
  if (wad) {
    if (!mine && m.allow_download === false) return toast('The author turned off WAD downloads for this map', 4000);
    const keep = M; M = m.data; download(m.title.replace(/[^\w-]+/g, '_') + '.wad', buildWad(), 'application/octet-stream'); M = keep; history.replaceState(null, '', 'editor.html'); return;
  }
  if (!mine && remix && m.allow_remix === false) { toast('The author turned off remixing for this map. Playing it instead.', 4000); location.replace('editor.html?play=' + encodeURIComponent(id)); return; }
  pushUndo(); M = m.data; compact(); clearSel(); mapChanged(); zoomFit();
  if (edit && mine) { Object.assign(EODP, { cloudId: id, remixOf: m.remix_of, title: m.title, description: m.description, published: m.published, allowRemix: m.allow_remix !== false, allowDownload: m.allow_download !== false }); toast('Editing "' + m.title + '". File → Publish saves a new version.', 4000); }
  else { Object.assign(EODP, { cloudId: null, remixOf: id, title: m.title + ' (remix)', description: 'Remix of "' + m.title + '" by ' + m.author + '.', published: true, allowRemix: true, allowDownload: true }); toast('Remixing "' + m.title + '" by ' + m.author + '. Your previous map is one Undo away.', 5000); }
  history.replaceState(null, '', 'editor.html');
}
function eodLeavePlay() { // exit from a library play session
  const back = document.referrer && /maps\.html|index\.html|account\.html/.test(document.referrer) ? document.referrer : 'maps.html';
  location.href = back;
}
async function eodPublish() {
  if (!eodOnline()) return toast('Publishing needs the EOD website');
  const me = await EODB.user().catch(() => null);
  if (!me) { EOD.auth(() => eodPublish()); return; }
  const errs = analyzeMap().filter(i => i.sev === 'error');
  modal(EODP.cloudId ? 'Publish a new version' : 'Publish to EOD', `
    ${errs.length ? `<p class="hint" style="color:var(--yellow)">Map Analysis found ${errs.length} problem(s), e.g. "${esc(errs[0].msg)}". You can still publish.</p>` : ''}
    <div class="f"><label>Title</label><input id="pbT" maxlength="80" value="${esc(EODP.title || M.name)}"></div>
    <div class="f"><label>Description</label><textarea id="pbD" maxlength="2000" rows="4">${esc(EODP.description)}</textarea></div>
    <div class="h">Permissions</div>
    <label class="chk"><input type="checkbox" id="pbP" ${EODP.published ? 'checked' : ''}>Show it in the map library (off = private draft)</label>
    <label class="chk"><input type="checkbox" id="pbR" ${EODP.allowRemix ? 'checked' : ''}>Let people remix it (you stay credited)</label>
    <label class="chk"><input type="checkbox" id="pbW" ${EODP.allowDownload ? 'checked' : ''}>Let people download it as a Doom WAD</label>
    ${customCount() ? `<div class="h">Custom art</div><label class="chk"><input type="checkbox" id="pbArt">This map has ${customCount()} custom texture(s). I made them or have permission to share them.</label><p class="hint">Leave it unticked and the map is published without your custom art (players see stand-ins).</p>` : ''}
    <p class="hint">Signed in as <b>${esc(me.username)}</b>.${EODP.remixOf ? ' This is a remix; the original author is credited automatically.' : ''}</p>`,
    [{ ok: 1, fn: b => {
      const v = id => b.querySelector(id);
      const data = JSON.parse(JSON.stringify(M));
      const art = b.querySelector('#pbArt'); if (data.res && !(art && art.checked)) delete data.res;
      const rec = { id: EODP.cloudId, title: v('#pbT').value, description: v('#pbD').value, published: v('#pbP').checked, allow_remix: v('#pbR').checked, allow_download: v('#pbW').checked, data, remix_of: EODP.remixOf };
      EODB.saveMap(rec).then(r => { Object.assign(EODP, { cloudId: r.id, title: rec.title, description: rec.description, published: rec.published, allowRemix: rec.allow_remix, allowDownload: rec.allow_download }); toast(rec.published ? 'Published! It is in the map library now.' : 'Saved as a private draft.', 4000); }, e => toast('Publish failed: ' + e.message, 5000));
    } }, { cancel: 1 }]);
}
async function eodLibrary() {
  if (!eodOnline()) return toast('The library needs the EOD website');
  const me = await EODB.user().catch(() => null);
  const mine = me ? await EODB.listMaps({ owner: me.id, limit: 100 }).catch(() => []) : [];
  const box = modal('Open from the EOD library', `${me ? '' : '<p class="hint">Sign in to see your own maps here.</p>'}
    <div class="h">My maps</div><div class="list">${mine.map((m, i) => `<button data-i="${i}">${esc(m.title)}${m.published ? '' : ' (draft)'} · ${new Date(m.updated_at).toLocaleDateString()}</button>`).join('') || '<p class="hint">None yet.</p>'}</div>
    <div class="row"><a href="maps.html"><button>Browse every map →</button></a>${me ? '' : '<button id="libIn">Sign in</button>'}</div>`, [{ cancel: 1 }], b => {
    b.querySelectorAll('[data-i]').forEach(x => x.onclick = () => { closeModal(); location.href = 'editor.html?map=' + encodeURIComponent(mine[+x.dataset.i].id); });
    const si = b.querySelector('#libIn'); if (si) si.onclick = () => { closeModal(); EOD.auth(() => eodLibrary()); };
  });
  void box;
}
