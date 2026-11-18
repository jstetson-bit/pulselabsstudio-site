/* ================= TEST MAP, MANUAL, TUTORIAL, BOOT ================= */
function buildSampleMap() {
  M = emptyMap(); M.name = 'MAP01';
  const R_ = (x0, y0, x1, y1) => drawShape(rectPts(x0, y0, x1, y1), true);
  const A = R_(0, 0, 512, 512); Object.assign(M.sec[A], { fh: 0, ch: 160, li: 176 });
  const Lt = R_(192, 192, 320, 320); Object.assign(M.sec[Lt], { ct: 'TLITE6_4', li: 224 });
  const Al = R_(-96, 192, 0, 320); Object.assign(M.sec[Al], { fh: 0, ch: 112, li: 112, sp: 9, ft: 'FLOOR7_1' });
  const D = R_(224, 512, 288, 528);
  const C = R_(192, 528, 320, 896); Object.assign(M.sec[C], { fh: 0, ch: 128, li: 144, ft: 'FLOOR5_1', ct: 'CEIL5_1' });
  const Y = R_(0, 896, 768, 1536); Object.assign(M.sec[Y], { fh: 0, ch: 320, li: 208, ft: 'RROCK01', ct: 'F_SKY1' });
  const P = R_(96, 1088, 352, 1280); Object.assign(M.sec[P], { fh: -16, ft: 'NUKAGE1', sp: 5, li: 224 });
  const s1 = R_(512, 1152, 704, 1184), s2 = R_(512, 1184, 704, 1216), s3 = R_(512, 1216, 704, 1248);
  [s1, s2, s3].forEach((s, i) => Object.assign(M.sec[s], { fh: 16 * (i + 1), ft: 'FLAT5_4' }));
  const Pl = drawShape([{ x: 512, y: 1248 }, { x: 512, y: 1536 }, { x: 576, y: 1536 }, { x: 640, y: 1536 }, { x: 704, y: 1536 }, { x: 704, y: 1248 }], true); Object.assign(M.sec[Pl], { fh: 64, ft: 'FLOOR0_1' });
  const Le = R_(0, 1344, 256, 1536); Object.assign(M.sec[Le], { fh: 96, ft: 'MFLR8_1' });
  const Li = R_(256, 1408, 320, 1472); Object.assign(M.sec[Li], { fh: 96, ft: 'STEP1' });
  makeDoor(D); makeLift(Li);
  const wallFor = { [Y]: 'STONE2', [Le]: 'STONE2', [Pl]: 'STONE2', [Li]: 'STONE2', [C]: 'BROWN1', [Al]: 'STARGR1' };
  M.l.forEach(L => {
    if (L.s1 >= 0 && L.s2 < 0) { const d = M.sd[L.s1]; if (wallFor[d.sec] && d.mid !== 'DOORTRAK') d.mid = wallFor[d.sec]; }
    if (L.s1 >= 0 && L.s2 >= 0) for (const s of [L.s1, L.s2]) { const d = M.sd[s]; if (d.lo === S.defWall && wallFor[d.sec]) d.lo = d.sec === Pl || [s1, s2, s3].includes(d.sec) ? 'BROWN96' : wallFor[d.sec]; if ([s1, s2, s3, Pl, P].includes(d.sec)) d.lo = 'BROWN96'; }
  });
  const v = (x, y) => findVertex(x, y);
  const ex = findLine(v(576, 1536), v(640, 1536)); if (ex >= 0) { M.l[ex].sp = 11; M.sd[M.l[ex].s1].mid = 'SW1EXIT'; }
  const T = (type, x, y, a = 90) => M.t.push({ x, y, a, type, f: 7 });
  T(1, 256, 96, 90);
  T(2001, 256, 400); T(2007, 96, 96); T(2007, 416, 96); T(2028, 32, 32); T(2028, 480, 32); T(2028, 32, 480); T(2028, 480, 480);
  T(2018, -48, 256); T(2012, -48, 220); T(2014, -48, 290);
  T(3004, 224, 700, 270); T(3004, 288, 790, 270); T(2011, 256, 860);
  T(3001, 400, 1400, 270); T(3001, 150, 980, 0); T(3002, 620, 1000, 180); T(9, 608, 1420, 270); T(3001, 700, 1100, 180);
  T(2035, 390, 1090); T(2035, 390, 1140); T(2049, 640, 940); T(2011, 40, 940); T(2014, 224, 1184); T(8, 224, 1184);
  T(2003, 96, 1440); T(2046, 160, 1488); T(48, 448, 1500); T(46, 512, 1100); T(46, 704, 1100);
  compact();
}

/* ---------- manual (ghost "i") ---------- */
function openManual() {
  modal('EOD Editor · Manual', `
<p><b>Version ${VERSION}.</b> A Doom map editor laid out like Ultimate Doom Builder, built for phone, PC and controller. Make a map, press <b>▶ DEMO</b> to play it, and export a real Doom WAD.</p>
<div class="row"><button id="manTut" class="demo">Start guided tutorial</button><button id="manSample">Load the test map</button></div>
<h3>Getting around</h3>
<ul><li><b>Pan:</b> drag empty space with one finger. <b>Zoom:</b> pinch (mouse wheel on PC). <b>Fit</b> shows the whole map.</li>
<li><b>Grid − / Grid +</b> change the snap size. <b>Snap</b> turns grid snapping on and off. Points always stick to a nearby vertex.</li>
<li>The <b>Move</b> word on the properties panel is yellow: hold and drag it to move the panel. Tap it to switch to <b>Resize</b>.</li></ul>
<h3>Modes (same as Ultimate Doom Builder)</h3>
<ul><li><b>Vertices / Linedefs / Sectors / Things:</b> tap to select, drag to move. <b>Multi-select</b> adds to the selection, and dragging empty space draws a selection box. Edit the selection in the panel; changes apply to everything selected.</li>
<li><b>Draw Lines:</b> tap points. Tap the first point (or the green check) to close a sector. Tap the last point again to finish open lines. Open lines drawn across a room split it into two sectors.</li>
<li><b>Rectangle / Ellipse:</b> drag to draw a room. Drawing inside a room makes a sub-sector (raise or lower it for steps, pits or pillars).</li>
<li><b>Make Sector:</b> tap inside any closed loop of lines to make (or remake) a sector there.</li>
<li><b>3D Visual:</b> walk the map in 3D. Aim the crosshair and change heights, light and textures, or press <b>Play from here</b>.</li></ul>
<h3>Recipes</h3>
<ul><li><b>Door:</b> draw a thin sector (16 deep) between two rooms, select it, and press <b>Make Door</b>. Press USE in the Demo.</li>
<li><b>Lift:</b> make a sector as high as the ledge, select it, and press <b>Make Lift</b>. Walk onto it to send it down.</li>
<li><b>Stairs:</b> draw step sectors, select them in order with Multi-select, and press <b>Stairs</b>.</li>
<li><b>Exit:</b> select a wall in Linedefs mode and press <b>Make exit switch</b>.</li>
<li><b>Outdoors:</b> select a sector and press <b>Make ceiling sky</b>.</li>
<li><b>Tagged actions:</b> give a line an action and a tag (<b>New tag</b>), then give the target sector the same tag. The <b>Tags</b> explorer shows every pair.</li>
<li><b>Secret:</b> set a sector's Effect to <i>Secret area</i>.</li></ul>
<h3>Demo controls</h3>
<ul><li>Left stick moves and strafes. Drag anywhere else (or drag across FIRE) to turn. <b>USE</b> opens doors and hits switches, <b>WPN</b> cycles weapons, <b>MAP</b> shows the automap.</li>
<li>Layouts for portrait 9:16, landscape 16:9 and Z Fold unfolded are picked automatically. Change them in Settings. <b>Arrange</b> lets you move and resize every button with the yellow words, saved separately for each layout.</li>
<li>PC: WASD moves, arrow keys turn, Ctrl or F fires, Space or E uses, Tab shows the map, 1-8 picks a weapon, Esc exits.</li></ul>
<h3>Export</h3>
<ul><li><b>Export Doom WAD:</b> a real Doom-format PWAD. Play it in <b>GZDoom</b> (PC) or <b>Delta Touch</b> (Android) with Doom II or the free <b>Freedoom</b> IWAD. GZDoom builds the nodes itself.</li>
<li><b>Export playable game:</b> one .html file with your map baked in. It opens straight into the game on any phone or PC browser. It's your shareable "executable".</li>
<li><b>Open:</b> loads Doom, Hexen and UDMF WADs (other people's maps), or a saved EOD project.</li></ul>
<h3>Playing other people's maps</h3>
<ul><li><b>File → Open any map</b> takes a .wad, a .zip straight from the /idgames archive, or a ZDoom .pk3. EOD reads its maps, its own textures, flats, sprites and sounds, and lets you pick ✎ Edit or ▶ Play for each map.</li>
<li>Most maps borrow art from the original Doom files. EOD fills that in with <b>Freedoom</b> (free, same names) or, if you own Doom/Doom II, open your own doom2.wad once and its art is used on your device only. It is never uploaded.</li>
<li>Classic (vanilla/limit-removing) maps play as made. Boom/ZDoom extras (scripts, slopes, 3D floors, DEHACKED monsters) are ignored for now.</li></ul>
<h3>Credits</h3><p>Engine, editor and in-house art: Pulse Labs Studio. Optional "Freedoom" art pack © 2001-2024 contributors to the Freedoom project, BSD license (<a href="res/FREEDOOM-COPYING.txt" target="_blank">license</a>, <a href="res/FREEDOOM-CREDITS.txt" target="_blank">credits</a>). DOOM is a trademark of id Software; EOD is an unofficial fan project.</p>
<h3>Safety nets</h3>
<ul><li>Autosave after every change, 150 levels of Undo, <b>Map Analysis</b> before export, and a crash log in Settings → Support.</li></ul>
<h3>Keyboard (PC)</h3>
<p>V L S T modes · D draw · R rectangle · E ellipse · M make sector · W 3D · Ctrl+Z / Ctrl+Y · Ctrl+C / Ctrl+V · Del · Insert places a thing · F4 analysis · F9 demo · [ ] grid · Home fit</p>
<p class="hint">Art in the editor and Demo is EOD's own stand-in art keyed to Doom texture names. No id Software assets are included.</p>`, [{ cancel: 1 }], b => {
    b.querySelector('#manTut').onclick = () => { closeModal(); startTutorial(); };
    b.querySelector('#manSample').onclick = () => { closeModal(); pushUndo(); buildSampleMap(); clearSel(); mapChanged(); zoomFit(); toast('Test map loaded. Press ▶ DEMO.'); };
  });
}

/* ---------- guided tutorial (teach by doing) ---------- */
let TUT = null;
const TUT_STEPS = [
  { t: 'Step 1/7 · Tap <b>Rectangle</b> in the top bar.', el: '#m-drawrect', ok: () => E.mode === 'drawrect' },
  { t: 'Step 2/7 · Drag a big box on the grid. That box is your first room (a <b>sector</b>).', el: '#stage', ok: () => M.sec.length >= 1 },
  { t: 'Step 3/7 · Drag a smaller box <b>inside</b> the room. That makes a platform you can raise.', el: '#stage', ok: () => M.sec.length >= 2 },
  { t: 'Step 4/7 · In the panel, tap <b>Floor +8</b> three times to raise the platform to 24 (any higher and you can\'t step up).', el: '#propsBody', ok: () => M.sec.some(s => s.fh >= 24) },
  { t: 'Step 5/7 · Tap <b>Things</b>, then tap <b>Placing</b> in the panel and choose <b>Player 1 Start</b>.', el: '#m-things', ok: () => E.mode === 'things' && E.thingType === 1 },
  { t: 'Step 6/7 · Double-tap inside your room (not on the platform) to place the player.', el: '#stage', ok: () => M.t.some(t => t.type === 1) },
  { t: 'Step 7/7 · Press <b>▶ DEMO</b> and walk around your room. The red arrow at the top left brings you back.', el: '#btnDemo', ok: () => !!G }
];
function startTutorial() {
  LS.set('backup', M); pushUndo(); M = emptyMap(); clearSel(); mapChanged(); setMode('sectors'); E.view = { x: 256, y: 256, z: 0.7 }; edRedraw();
  TUT = { i: 0 }; $('#tut').hidden = false; $('#tutSkip').hidden = false; tutShow();
  TUT.timer = setInterval(() => { if (!TUT) return; const s = TUT_STEPS[TUT.i]; if (s && s.ok()) { TUT.i++; tutShow(); } }, 400);
  toast('Your previous map is saved. One Undo brings it back.');
}
function tutShow() {
  document.querySelectorAll('.tut-glow').forEach(e => e.classList.remove('tut-glow'));
  const s = TUT_STEPS[TUT.i];
  if (!s) { $('#tut').style.top = '70px'; $('#tut').style.bottom = 'auto'; $('#tutSkip').hidden = true; $('#tutText').innerHTML = '<b>That\'s it. You built and played a Doom map.</b> Next, try <b>Make Door</b>, monsters from the Thing browser, and <b>File → Export Doom WAD</b>.'; setTimeout(endTutorial, 6000); return; }
  const needPanel = TUT.i === 3 || TUT.i === 4;
  if (needPanel && $('#props').classList.contains('collapsed')) $('#propsToggle').click();
  if (!needPanel && TUT.i >= 5 && !$('#props').classList.contains('collapsed')) $('#propsToggle').click();
  if (needPanel) { $('#tut').style.top = Math.round($('#tools').getBoundingClientRect().bottom + 6) + 'px'; $('#tut').style.bottom = 'auto'; }
  else { $('#tut').style.top = 'auto'; $('#tut').style.bottom = '64px'; }
  $('#tutText').innerHTML = s.t; const el = $(s.el); if (el) el.classList.add('tut-glow');
}
function endTutorial() { if (!TUT) return; clearInterval(TUT.timer); TUT = null; $('#tut').hidden = true; document.querySelectorAll('.tut-glow').forEach(e => e.classList.remove('tut-glow')); }

/* ---------- boot ---------- */
function boot() {
  $('#ver').textContent = 'v' + VERSION;
  applySettings();
  initSprites();
  // datalists for texture typing
  const dl = (id, list) => { const d = document.createElement('datalist'); d.id = id; d.innerHTML = list.map(n => `<option value="${n}">`).join(''); document.body.appendChild(d); };
  dl('dlWalls', WALL_TEX); dl('dlFlats', FLAT_TEX);
  ed.cv = $('#ed'); ed.g = ed.cv.getContext('2d');
  ed.cv.addEventListener('pointerdown', edPointerDown); ed.cv.addEventListener('pointermove', edPointerMove);
  ed.cv.addEventListener('pointerup', edPointerUp); ed.cv.addEventListener('pointercancel', edPointerUp);
  ed.cv.addEventListener('pointerleave', () => { E.mouse = null; E.hover = null; edRedraw(); });
  ed.cv.addEventListener('wheel', edWheel, { passive: false });
  ed.cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('resize', () => { edResize(); if (G) layoutGame(); });
  addEventListener('keydown', e => { if (G && !$('#game').hidden) gameKey(e, true); else edKey(e); });
  addEventListener('keyup', e => gameKey(e, false));
  $('#btnFile').onclick = openFileMenu; $('#btnInfo').onclick = openManual; $('#btnInvert').onclick = toggleInvert; $('#btnSettings').onclick = openSettings;
  $('#gInfo').innerHTML = $('#btnInfo').innerHTML; $('#gInvert').innerHTML = $('#btnInvert').innerHTML;
  $('#gInfo').onclick = openManual; $('#gInvert').onclick = toggleInvert; $('#gExit').onclick = () => { if (window.NSDE_EMBED) { const p1 = M.t.find(t => t.type === 1); initGame('play', { x: p1.x, y: p1.y, a: p1.a }); return; } exitGame(); };
  $('#gArrange').onclick = () => GL.arrange ? exitArrange(true) : enterArrange();
  $('#arrOk').onclick = () => exitArrange(true); $('#arrCancel').onclick = () => exitArrange(false);
  $('#drawOk').onclick = () => finishDraw(E.draw.length >= 3); $('#drawCancel').onclick = () => { E.draw = []; E.drawPreview = null; edRedraw(); toast('Drawing cancelled'); };
  $('#fileIn').onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };
  $('#tutSkip').onclick = () => { if (TUT) { TUT.i++; tutShow(); } }; $('#tutQuit').onclick = endTutorial;
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  $('#gControls').onclick = openControls;
  const gm = $('#game'); gm.addEventListener('wheel', e => { if (!G) return; e.preventDefault(); IN.tapped.add(e.deltaY < 0 ? 'wheelup' : 'wheeldown'); }, { passive: false });
  gm.addEventListener('contextmenu', e => e.preventDefault());
  gm.addEventListener('pointerdown', gameDown); gm.addEventListener('pointermove', gameMove); gm.addEventListener('pointerup', gameUp); gm.addEventListener('pointercancel', gameUp);
  makeMovable($('#propsMover'), $('#props'));
  $('#propsToggle').onclick = () => { $('#props').classList.toggle('collapsed'); $('#propsToggle').textContent = $('#props').classList.contains('collapsed') ? '▴' : '▾'; };
  if (innerWidth < 700) { $('#props').classList.add('collapsed'); $('#propsToggle').textContent = '▴'; }
  // map: embedded playable > autosave > test map
  if (window.NSDE_EMBED) {
    M = window.NSDE_EMBED.map; document.title = (M.name || 'Map') + ' · made with EOD · Editor of Doom';
    $('#app').style.display = 'none'; $('#props').style.display = 'none'; $('#gExit').title = 'Restart';
    E.mode = 'sectors'; buildBars(); edResize();
    const p1 = M.t.find(t => t.type === 1);
    if (S.theme == null) { S.theme = 'device'; LS.set('settings', S); }
    applyArtSetting(); syncCustomTex(true); syncMonsters(); initGame('play', { x: p1.x, y: p1.y, a: p1.a }); return;
  }
  const saved = LS.get('autosave', null);
  if (saved && saved.l && saved.l.length) M = saved; else buildSampleMap();
  E.mode = S.lastMode && SELKEY[S.lastMode] ? S.lastMode : 'sectors';
  buildBars(); edResize(); zoomFit(); refreshProps();
  if (S.theme == null) firstRun();
  pullAccountBinds(); applyArtSetting(); syncCustomTex(true); syncMonsters(); eodBoot();
}
