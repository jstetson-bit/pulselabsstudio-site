/* ================= GAME SCREEN, HUD, TOUCH CONTROLS ================= */
const CTL_DEF = {
  landscape: { stick: { x: 13, y: 58, s: 1 }, look: { x: 73, y: 57, s: 0.8 }, fire: { x: 90, y: 50, s: 0.95 }, use: { x: 90, y: 75, s: 0.72 }, wpn: { x: 92, y: 25, s: 0.75 }, map: { x: 79, y: 25, s: 0.7 }, uturn: { x: 59, y: 76, s: 0.7 } },
  portrait: { stick: { x: 22, y: 80, s: 1 }, look: { x: 63, y: 81, s: 0.85 }, fire: { x: 87, y: 73, s: 0.9 }, use: { x: 87, y: 91, s: 0.75 }, wpn: { x: 44, y: 93, s: 0.7 }, map: { x: 44, y: 66, s: 0.7 }, uturn: { x: 66, y: 65, s: 0.7 } },
  fold: { stick: { x: 14, y: 72, s: 1.1 }, look: { x: 73, y: 72, s: 0.95 }, fire: { x: 90, y: 62, s: 1 }, use: { x: 90, y: 85, s: 0.85 }, wpn: { x: 90, y: 40, s: 0.8 }, map: { x: 76, y: 46, s: 0.75 }, uturn: { x: 58, y: 87, s: 0.75 } }
};
const GL = { key: 'landscape', vw: 0, vh: 0, vx: 0, vy: 0, arrange: false, arrBackup: null };
function layoutKey() { if (S.layout !== 'auto') return S.layout; const W = innerWidth, H = innerHeight; return H / W > 1.25 ? 'portrait' : W / H > 1.35 ? 'landscape' : 'fold'; }
function ctlPos() { const all = LS.get('ctlpos', {}); return Object.assign({}, CTL_DEF[GL.key], all[GL.key] || {}); }
/* Auto detail: time each frame and step the picture up or down so it stays smooth */
const RES_STEPS = [320, 480, 640, 800, 960, 1280, 1600, 1920, 2560, 3200, 3840];
function autoRes(ms) {
  if (S.res !== 'auto') return; const A = GL.auto || (GL.auto = { ema: ms, n: 0 });
  A.ema = A.ema * 0.92 + ms * 0.08; if (++A.n < 60) return; A.n = 0;
  const cur = GL.autoRes || S.autoRes || 960, i = RES_STEPS.findIndex(r => r >= cur), dev = Math.round(GL.vw * (devicePixelRatio || 1));
  let next = cur; if (A.ema > 14 && i > 0) next = RES_STEPS[i - 1]; else if (A.ema < 6.5 && i < RES_STEPS.length - 1 && RES_STEPS[i + 1] <= dev) next = RES_STEPS[i + 1];
  if (next !== cur) { GL.autoRes = S.autoRes = next; A.ema = A.ema * (next > cur ? 1.6 : 0.6); layoutGame(); try { saveSettings(); } catch (e) { } }
}
function openDetail() {
  const opts = [['auto', 'Auto (sharpest that stays smooth)'], [320, 'Classic 320 (original Doom look)'], [640, '640'], [960, '960'], [1280, '1280 (720p)'], [1920, '1920 (1080p)'], [2560, '2560 (1440p)'], ['native', 'Native (every screen pixel, 4K on a 4K screen)']];
  const now = () => `Drawing ${R.W} × ${R.H}` + (S.res === 'auto' ? ' (Auto)' : '') + (MT.ws.length ? ` on ${MT.ws.length} cores` : ' on 1 core');
  modal('Picture detail', `<p class="hint">Look:</p>
  <div class="row"><button data-look="classic" class="${S.hudStyle === 'classic' ? 'on' : ''}">Classic (1993 pixels)</button><button data-look="modern" class="${S.hudStyle !== 'classic' ? 'on' : ''}">Modern (sharp)</button></div>
  <p class="hint">Classic: the original chunky 320 picture and the pixel status bar. Modern: as sharp as your machine runs smoothly, a crisp status bar drawn at full screen resolution, and cleaned-up edges on the gun and the face.</p>
  <p class="hint">EOD draws every pixel itself, like the original Doom. More pixels = sharper and less grainy, but slower on weaker machines. Auto starts at 960 and steps up while your machine keeps up.</p>
  <div style="display:grid;gap:6px;margin:8px 0">${opts.map(([k, n]) => `<button data-rs="${k}" class="${String(S.res) === String(k) ? 'on' : ''}">${n}</button>`).join('')}</div>
  <label class="chk"><input type="checkbox" id="rsSm" ${S.smooth ? 'checked' : ''}>Smooth the pixels when stretching (softer, less blocky)</label>
  <p class="hint">Use all CPU cores (draws the view on ${mtThreads()} cores at once, for high detail and 4K):</p>
  <div class="row">${[['auto', 'Auto'], ['on', 'Always'], ['off', 'Off (one core)']].map(([k, n]) => `<button data-th="${k}" class="${(S.threads || 'auto') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <p class="hint" id="rsNow">${now()}</p>`, [{ cancel: 1, title: 'Close' }]);
  setTimeout(() => {
    document.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { const v = b.dataset.rs; S.res = v === 'auto' || v === 'native' ? v : +v; GL.auto = null; saveSettings(); layoutGame(); document.querySelectorAll('[data-rs]').forEach(x => x.classList.toggle('on', x === b)); $('#rsNow').textContent = now(); });
    document.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { const m = b.dataset.look; S.hudStyle = m; S.res = m === 'classic' ? 320 : 'auto'; S.smooth = false; GL.auto = null; saveSettings(); layoutGame(); document.querySelectorAll('[data-look]').forEach(x => x.classList.toggle('on', x === b)); document.querySelectorAll('[data-rs]').forEach(x => x.classList.toggle('on', x.dataset.rs === String(S.res))); $('#rsSm').checked = false; $('#rsNow').textContent = now(); });
    document.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { S.threads = b.dataset.th; MT.failed = false; saveSettings(); document.querySelectorAll('[data-th]').forEach(x => x.classList.toggle('on', x === b)); $('#rsNow').textContent = now(); });
    $('#rsSm').onchange = e => { S.smooth = e.target.checked; saveSettings(); layoutGame(); };
  }, 0);
}
function layoutGame() {
  const W = innerWidth, H = innerHeight; GL.key = layoutKey();
  let vw = W, vh = H;
  if (GL.key === 'portrait') vh = Math.round(Math.min(H * 0.58, W * 1.3));
  GL.vw = vw; GL.vh = vh;
  const cv = $('#gv'); cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  // picture detail: a fixed width, or Auto (as sharp as this machine draws smoothly); never more pixels than the screen really has
  const dev = Math.round(vw * (devicePixelRatio || 1)), want = S.res === 'auto' ? (GL.autoRes || S.autoRes || 960) : S.res === 'native' ? dev : +S.res || 320;
  const rw = Math.max(160, Math.min(want, dev)), rh = Math.max(100, Math.round(rw * vh / vw));
  cv.style.imageRendering = S.smooth ? 'auto' : 'pixelated';
  // the screen canvas is always full sharpness: the 3D view is scaled up onto it, and the status bar, gun and text are drawn at full resolution on top
  const dpr = devicePixelRatio || 1; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); rSetup(rw, rh);
  const pos = ctlPos();
  document.querySelectorAll('#ctls .ctl').forEach(el => {
    const p = pos[el.dataset.c]; el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.transform = `translate(-50%,-50%) scale(${p.s})`;
    el.style.opacity = GL.arrange ? 1 : S.ctlOpacity; const c = el.dataset.c; el.style.display = (G && G.mode === 'visual' && c !== 'stick' && c !== 'look') || (c === 'look' && !BINDS.touchLookStick) || (c === 'uturn' && !BINDS.touchUturn) ? 'none' : '';
  });
  if (G && G.mode === 'visual') { const st = $('#c-stick'); st.style.top = Math.min(pos.stick.y, 62) + '%'; }
  $('#game').style.background = GL.key === 'portrait' ? '#0b0b0e' : '#000';
}
function showGame() {
  $('#game').hidden = false; $('#props').style.display = 'none';
  $('#gTitle').textContent = (G.mode === 'visual' ? '3D VISUAL · ' : 'DEMO · ') + M.name;
  $('#vbar').hidden = G.mode !== 'visual'; $('#gover').hidden = true; $('#gArrange').hidden = G.mode === 'visual';
  if (G.mode === 'visual') buildVbar();
  layoutGame();
}
function exitGame() {
  if (typeof mtStop === "function") mtStop();
  if (window.__firstRunLater) { window.__firstRunLater = 0; setTimeout(firstRun, 300); }
  LIM.on = false;
  if (EODP.playOnly) { eodLeavePlay(); return; }
  if (GL.arrange) exitArrange(false);
  const wasVisual = G && G.mode === 'visual';
  if (G && wasVisual) { E.view.x = G.p.x; E.view.y = G.p.y; }
  G = null; $('#game').hidden = true; $('#props').style.display = ''; IN.keys.clear(); IN.fire = false; IN.fwd = IN.str = 0;
  if (wasVisual) { mapChanged(); }
  edResize();
}
function openSound(back) {
  const V = S.vol || (S.vol = { master: 80, weap: 100, mon: 100, you: 100, world: 100 });
  const rows = [['master', 'Master volume', 'everything', 'weapon'], ['weap', 'Your guns', 'shots and reloads', 'shotgun'], ['mon', 'Monsters', 'their shots, pain and deaths', 'die'], ['you', 'You', 'getting hurt, pickups', 'pickup'], ['world', 'World', 'doors, switches, explosions, glass', 'door']];
  modal('Sound', `<label class="chk"><input type="checkbox" id="sdOn" ${S.sound ? 'checked' : ''}>Sound on</label>
  ${rows.map(([k, n, h]) => `<div class="f"><label>${n} <b id="sv_${k}">${V[k]}%</b> <span class="hint">(${h})</span></label><input type="range" min="0" max="100" step="5" value="${V[k]}" data-vk="${k}"></div>`).join('')}
  <p class="hint">Each slider plays a sample when you let go so you can hear the level. Master scales everything else.</p>`, [{ cancel: 1, title: 'Back', fn: () => { if (back) setTimeout(back, 0); } }]);
  setTimeout(() => {
    $('#sdOn').onchange = e => { S.sound = e.target.checked; saveSettings(); if (S.sound) sfx('switch'); };
    document.querySelectorAll('[data-vk]').forEach(r => { const k = r.dataset.vk, row = rows.find(x => x[0] === k);
      r.oninput = () => { V[k] = +r.value; $('#sv_' + k).textContent = V[k] + '%'; };
      r.onchange = () => { saveSettings(); sfx(row[3], 1, k === 'master' ? 'you' : k); }; });
  }, 0);
}
function openGameMenu() {
  if (!G) return; if (document.pointerLockElement) document.exitPointerLock();
  const items = [['resume', '▶ Resume'], ['restart', '↻ Restart level'], ['sound', '🔊 Sound'], ['detail', '🖥 Picture detail (Classic / Modern)'], ['controls', '🎮 Controls'], ['arrange', '✥ Move the on-screen buttons'], ['manual', 'ⓘ Manual'], ['quit', '⏏ Quit to the editor']];
  modal('Menu', `<div style="display:grid;gap:8px;margin:4px 0">${items.map(([k, n]) => `<button data-gm="${k}" style="text-align:left;padding:12px 14px;font-size:1.05em">${n}</button>`).join('')}</div><p class="hint">The game is paused while this menu is open. Esc opens it.</p>`, [{ cancel: 1, title: 'Resume' }]);
  setTimeout(() => document.querySelectorAll('[data-gm]').forEach(b => b.onclick = () => {
    const k = b.dataset.gm; closeModal();
    if (k === 'restart') modal('Restart level?', '<p>Start this level over from the beginning?</p>', [{ ok: 1, title: 'Restart', fn: () => restartLevel() }, { cancel: 1, fn: () => { setTimeout(openGameMenu, 0); } }]);
    else if (k === 'sound') openSound(openGameMenu);
    else if (k === 'detail') openDetail();
    else if (k === 'controls') openControls();
    else if (k === 'arrange') enterArrange();
    else if (k === 'manual') openManual();
    else if (k === 'quit') $('#gExit').click();
  }), 0);
}
function restartLevel() { if (!G) return; const mode = G.mode, p1 = realStart(); $('#gover').hidden = true; initGame(mode, { x: p1.x, y: p1.y, a: p1.a }); }
function showOver() {
  if (document.pointerLockElement) document.exitPointerLock(); // give the mouse back so the buttons can be clicked
  IN.keys.clear(); IN.fire = false;
  const o = $('#gover'); o.hidden = false; const g = G.over;
  const pct = (a, b) => b ? Math.round(a * 100 / b) + '%' : '—';
  if (g.k === 'dead') o.innerHTML = `<div class="box"><h1>YOU DIED</h1><p>Click the green check (or press Enter) to try again.<br>Red arrow (or Esc) goes back to the editor.</p><div class="row"><button class="okbtn" id="ovOk"></button><button class="cancelbtn" id="ovX"></button></div></div>`;
  else o.innerHTML = `<div class="box"><h1>${g.secret ? 'SECRET EXIT!' : 'LEVEL COMPLETE'}</h1><div>${esc(M.name)}</div><div class="stats">KILLS&nbsp;&nbsp; ${pct(G.kills, G.totK)}<br>ITEMS&nbsp;&nbsp; ${pct(G.items, G.totI)}<br>SECRET&nbsp; ${pct(G.secrets, G.totS)}<br>TIME&nbsp;&nbsp;&nbsp; ${Math.floor(g.time / 60)}:${String(Math.floor(g.time % 60)).padStart(2, '0')}</div><div class="row"><button class="okbtn" id="ovOk" title="Play again"></button><button class="cancelbtn" id="ovX" title="Back to editor"></button></div></div>`;
  $('#ovOk').onclick = () => restartLevel();
  $('#ovX').onclick = () => exitGame();
}

/* ---------- drawing ---------- */
const frameOf = (seq, t, sp) => seq[Math.floor(t / sp) % seq.length];
function gameSprites() {
  const out = [], cam = G.p, useRes = RES.packs.length > 0 && !!resPal();
  dollSprites(out);
  const lightAt = e => G.secs[Math.max(0, e.sec)] ? G.secs[Math.max(0, e.sec)].li : 160;
  for (const e of G.ents) {
    if (e.d.cw) { if (e.alive) out.push({ x: e.x, y: e.y, z: e.z, img: weaponPickupImg(e.type, e.d.cw), light: lightAt(e), id: e.ti }); continue; }
    const cm = e.d.custom ? monFrames(e.type, e.d.custom, e.d.custom.look && e.d.custom.look.art && (artMon(e.d.custom.look.art) || {}).rots ? spriteRot(e.a, e.x, e.y, cam.x, cam.y) : 0) : null;
    const ds = useRes ? DSPR[e.type] : null;
    if (cm) {
      let fr;
      if (!e.alive) { const k = Math.min(4, Math.floor((G.tic - (e.diedAt || 0)) / 5)); fr = 'HIJKL'[k]; }
      else if (e.pain > 0) fr = 'G'; else if (e.atk > 0 || e.flash > 0) fr = (e.flash > 0 || e.atk <= 3) ? 'F' : 'E'; else fr = e.state === 'idle' ? 'A' : 'ABCD'[Math.floor(e.anim / 6) % 4];
      out.push({ x: e.x, y: e.y, z: e.z, img: cm[fr], flip: e.alive && e.flip && fr < 'E', bright: e.flash > 0, fuzz: e.d.fuzz, light: lightAt(e), id: e.ti }); if (e.flash > 0) e.flash--;
      continue;
    }
    if (e.alive) {
      let spr = null;
      if (ds) {
        if (e.d.cat === 'monster') {
          let fr;
          if (e.pain > 0 && ds[3]) fr = ds[3][0];
          else if (e.atk > 0 || e.flash > 0) fr = e.flash > 0 ? ds[2][ds[2].length - 1] : ds[2][Math.min(ds[2].length - 1, Math.floor((10 - e.atk) / 4))];
          else fr = e.state === 'idle' ? ds[1][0] : frameOf(ds[1], e.anim, 6);
          const f = getSpriteFrame(ds[0], fr, spriteRot(e.a, e.x, e.y, cam.x, cam.y)); if (f) spr = f;
        } else { const f = getSpriteFrame(ds[0], frameOf(ds[1], G.tic, 6), 0); if (f) spr = f; }
      }
      if (!spr) { const img = e.d.spr ? SPR[e.d.spr] : null; if (!img) continue; spr = { img, flip: e.flip }; }
      out.push({ x: e.x, y: e.y, z: e.z, img: spr.img, flip: spr.flip, bright: e.d.bright || e.flash > 0, fuzz: e.d.fuzz, light: lightAt(e), id: e.ti }); if (e.flash > 0) e.flash--;
    } else if (e.d.cat === 'monster') {
      let img = SPR.corpse, flip = false;
      if (ds) { if (!ds[4]) continue; const f = getSpriteFrame(ds[0], ds[4], 0); if (f) { img = f.img; flip = f.flip; } }
      out.push({ x: e.x, y: e.y, z: e.z, img, flip, light: lightAt(e), id: e.ti });
    }
  }
  for (const p of G.projs) {
    const ps = useRes ? PSPR[p.kind] : null, f = ps ? getSpriteFrame(ps[0], frameOf(ps[1], p.t, 4), 0) : null;
    if (f) out.push({ x: p.x, y: p.y, z: p.z - 8, img: f.img, flip: f.flip, bright: 1 }); else out.push({ x: p.x, y: p.y, z: p.z - p.img.h / 2, img: p.img, bright: 1 });
  }
  for (const fx of G.fx) {
    const fs = useRes ? FXSPR[fx.k] : null;
    const f = fs ? getSpriteFrame(fs[0], fs[1][Math.min(fs[1].length - 1, Math.floor((fx.t0 - fx.t) / (fx.t0 / fs[1].length)))], 0) : null;
    if (f) out.push({ x: fx.x, y: fx.y, z: fx.z, img: f.img, flip: f.flip, bright: 1 }); else out.push({ x: fx.x, y: fx.y, z: fx.z, img: fx.img, bright: fx.bright, scale: fx.scale, light: fx.k === 'shard' ? 200 : undefined });
  }
  return out;
}
function drawGame() {
  const p = G.p, sec = G.secs[p.sec];
  const cam = { x: p.x, y: p.y, z: p.viewz, a: p.a, sec: p.sec, pitch: (p.look || 0) * R.H * 0.42 - (G.kick || 0) };
  const mt = mtDraw(cam, gameSprites());
  if (!mt) { render3D(cam, G.sc, gameSprites()); R.ctx.putImageData(R.img, 0, 0); }
  const cv = $('#gv'), g = cv.getContext('2d'), W = cv.width, H = cv.height; void sec;
  g.imageSmoothingEnabled = !!S.smooth; if (S.smooth) g.imageSmoothingQuality = 'high';
  g.drawImage(R.cv, 0, 0, W, H); g.imageSmoothingEnabled = false;
  // tints
  if (p.hurt > 0) { g.fillStyle = `rgba(255,0,0,${Math.min(0.5, p.hurt / 40)})`; g.fillRect(0, 0, W, H); }
  if (G.bonus > 0) { g.fillStyle = 'rgba(255,220,80,0.18)'; g.fillRect(0, 0, W, H); }
  if (G.flash > 0) { g.fillStyle = 'rgba(120,255,120,0.25)'; g.fillRect(0, 0, W, H); }
  const u = Math.max(1, Math.round(W / 320));
  if (G.mode === 'play') {
    drawWeapon(g, W, H, u);
    drawHud(g, W, H, u);
  } else {
    g.strokeStyle = '#ffd400'; g.lineWidth = u; g.beginPath(); g.moveTo(W / 2 - 6 * u, H / 2); g.lineTo(W / 2 + 6 * u, H / 2); g.moveTo(W / 2, H / 2 - 6 * u); g.lineTo(W / 2, H / 2 + 6 * u); g.stroke();
    const t = visualTarget(); g.font = `bold ${7 * u}px monospace`; g.fillStyle = '#ffd400'; g.textAlign = 'center';
    g.fillText(t ? t.label : 'aim at a wall, floor or ceiling', W / 2, H / 2 + 16 * u);
  }
  if (G.mode === 'play') { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2 - 3 * u, H / 2); g.lineTo(W / 2 + 3 * u, H / 2); g.moveTo(W / 2, H / 2 - 3 * u); g.lineTo(W / 2, H / 2 + 3 * u); g.stroke(); }
  g.textAlign = 'left'; g.font = `${7 * u}px monospace`; g.fillStyle = '#fff';
  if (hudModern()) g.font = `800 ${Math.round(6.5 * u)}px "Segoe UI", Arial, sans-serif`;
  G.msgs.forEach((m, i) => { g.fillStyle = '#000'; g.fillText(m.t, 5 * u, (40 + i * 9) * u + u); g.fillStyle = hudModern() ? '#fff' : '#ff3'; g.fillText(m.t, 4 * u, (40 + i * 9) * u); });
  if (G.automap) drawAutomap(g, W, H);
  drawLimitsHud(g, W, H, u);
  return mt;
}
function drawWeaponRes(g, W, H, u, bx, by) {
  const p = G.p, ws = WSPR[p.w]; if (!ws || !RES.packs.length || !resPal()) return false;
  const firing = p.fireT > 0, fr = firing ? ws[2][Math.min(ws[2].length - 1, Math.floor((6 - p.fireT) / 2))] : ws[1][Math.floor(G.tic / 4) % ws[1].length];
  const main = getSpriteFrame(ws[0], fr, 0); if (!main) return false;
  const hh = hudHeight(W, H), s = Math.min(W / 320, (H - hh) / 168), viewBottom = H - hh;
  const modern = hudModern(); if (modern) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; }
  const put = f => { if (!f) return; const img = f.img; g.drawImage(modern ? hqCanvas(img) : spriteCanvas(img), W / 2 + (1 - (img.ox || 0) - 160) * s + bx, viewBottom - (136 + (img.oy || 0)) * s + by, img.w * s, img.h * s); };
  put(main); if (firing && p.fireT > 2 && ws[3]) put(getSpriteFrame(ws[3], ws[4][Math.min(ws[4].length - 1, Math.floor((6 - p.fireT) / 2))], 0));
  g.imageSmoothingEnabled = false;
  return true;
}
function drawWeapon(g, W, H, u) {
  const p = G.p, bx = Math.sin(p.bob * 0.5) * 6 * u * Math.min(1, Math.hypot(p.vx, p.vy) / 4); let by = Math.abs(Math.cos(p.bob * 0.5)) * 4 * u * Math.min(1, Math.hypot(p.vx, p.vy) / 4);
  if (p.reloadT > 0 && !p.reloadDelay && p.reload0 && p.reloadW === p.w) { const k = 1 - p.reloadT / p.reload0; by += Math.sin(Math.PI * k) * 70 * u; }
  if (WEAPONS[p.w] && WEAPONS[p.w].custom) { drawCustomWeapon(g, W, H, u, bx, by); return; }
  if (drawWeaponRes(g, W, H, u, bx, by)) return;
  const cx = W / 2 + bx, base = H - 34 * u + by + (p.fireT > 3 ? 4 * u : 0), w = p.w;
  if (p.fireT > 2 && w !== 1) { g.fillStyle = w >= 7 ? '#8cf' : '#ffd060'; g.beginPath(); g.arc(cx, base - 34 * u, 10 * u, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, base - 34 * u, 5 * u, 0, 7); g.fill(); }
  const col = { 1: '#a33', 2: '#666', 3: '#555', 4: '#444', 5: '#777', 6: '#5a6a4a', 7: '#4a5a7a', 8: '#3a6a3a' }[w];
  g.fillStyle = '#c99a7a'; g.fillRect(cx - 10 * u, base - 4 * u, 20 * u, 40 * u); // hand
  g.fillStyle = col;
  if (w === 2) g.fillRect(cx - 4 * u, base - 30 * u, 8 * u, 30 * u);
  else if (w === 3 || w === 4) { g.fillRect(cx - (w === 4 ? 7 : 4) * u, base - 36 * u, 8 * u, 36 * u); if (w === 4) g.fillRect(cx + 1 * u, base - 36 * u, 6 * u, 36 * u); g.fillStyle = '#6a4a2a'; g.fillRect(cx - 8 * u, base - 8 * u, 16 * u, 14 * u); }
  else if (w === 5) { for (let i = -1; i <= 1; i++) g.fillRect(cx + i * 5 * u - 2 * u, base - 38 * u, 4 * u, 38 * u); }
  else if (w === 1) { g.fillRect(cx - 6 * u, base - 40 * u, 12 * u, 40 * u); g.fillStyle = '#ccc'; g.fillRect(cx - 3 * u, base - 52 * u, 6 * u, 16 * u); }
  else { g.fillRect(cx - 9 * u, base - 34 * u, 18 * u, 34 * u); g.fillStyle = '#222'; g.fillRect(cx - 4 * u, base - 34 * u, 8 * u, 6 * u); }
}
function drawHud(g, W, H, u) {
  if (drawStatusBar(g, W, H)) return;
  const p = G.p, h = 20 * u, y = H - h;
  g.fillStyle = 'rgba(40,36,32,.92)'; g.fillRect(0, y, W, h); g.fillStyle = '#5a5248'; g.fillRect(0, y, W, u);
  const num = (txt, x, lab) => { g.font = `bold ${12 * u}px "Courier New",monospace`; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(txt, x + u, y + 13 * u + u); g.fillStyle = '#d02020'; g.fillText(txt, x, y + 13 * u); g.font = `${5 * u}px monospace`; g.fillStyle = '#ddd'; g.fillText(lab, x, y + 18.5 * u); };
  const wd = WEAPONS[p.w];
  num(wd.ammo ? String(p.ammo[wd.ammo]) : '--', W * 0.1, 'AMMO');
  num(p.hp + '%', W * 0.28, 'HEALTH');
  // face
  const fp = sbReady() ? sbPic(faceName()) : null;
  if (fp) { const fh = (H - y) * 0.94, fw = fh * fp.c.width / fp.c.height; g.imageSmoothingEnabled = false; g.drawImage(fp.c, W * 0.5 - fw / 2, H - fh, fw, fh); } else {
  const fx = W * 0.5, fy = y + 10 * u; g.fillStyle = p.hp > 60 ? '#c8916a' : p.hp > 25 ? '#b8705a' : '#9a4a3a'; g.beginPath(); g.arc(fx, fy, 8 * u, 0, 7); g.fill();
  g.fillStyle = '#000'; g.fillRect(fx - 4 * u, fy - 2 * u, 2 * u, 2 * u); g.fillRect(fx + 2 * u, fy - 2 * u, 2 * u, 2 * u);
  g.fillStyle = p.hurt > 0 ? '#600' : '#000'; g.fillRect(fx - 3 * u, fy + 3 * u, 6 * u, (p.fireT > 0 ? 2 : 1) * u);
  if (p.hp < 50) { g.fillStyle = '#a00'; g.fillRect(fx - 6 * u, fy - 6 * u, 2 * u, 4 * u); }
  }
  num(p.armor + '%', W * 0.72, 'ARMOR');
  const keys = ['b', 'y', 'r']; keys.forEach((k, i) => { g.fillStyle = p.keys.has(k) ? { b: '#25f', y: '#fd2', r: '#e22' }[k] : '#222'; g.fillRect(W * 0.86, y + (2 + i * 6) * u, 6 * u, 5 * u); });
  g.font = `${5 * u}px monospace`; g.fillStyle = '#ddd'; g.textAlign = 'left'; g.fillText(wd.name.toUpperCase(), W * 0.9, y + 6 * u);
  g.fillText('K ' + G.kills + '/' + G.totK, W * 0.9, y + 12 * u); g.fillText('I ' + G.items + '/' + G.totI, W * 0.9, y + 18 * u);
}
function drawAutomap(g, W, H) {
  const p = G.p, z = Math.min(W, H) / 900;
  g.fillStyle = 'rgba(0,0,0,.82)'; g.fillRect(0, 0, W, H - hudHeight(W, H));
  const tx = (x, y) => [W / 2 + (x - p.x) * z, H / 2 - (y - p.y) * z];
  g.lineWidth = 1;
  for (const l of G.sc.lines) {
    if (l.f & 128) continue;
    const [x1, y1] = tx(l.ax, l.ay), [x2, y2] = tx(l.bx, l.by);
    let c = '#ff3030'; if (l.s2 && !(l.f & 32)) { const a = G.secs[l.s1.sec], b = G.secs[l.s2.sec]; c = a.fh !== b.fh ? '#b07040' : a.ch !== b.ch ? '#e0d040' : '#444'; if (c === '#444') continue; }
    if (DOOR_SPECIALS.has(l.sp)) c = '#ff30ff';
    g.strokeStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  const [px, py] = tx(p.x, p.y); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + Math.cos(p.a) * 12, py - Math.sin(p.a) * 12); g.lineTo(px + Math.cos(p.a + 2.5) * 8, py - Math.sin(p.a + 2.5) * 8); g.lineTo(px + Math.cos(p.a - 2.5) * 8, py - Math.sin(p.a - 2.5) * 8); g.closePath(); g.stroke();
}

/* ---------- Visual (3D) editing ---------- */
function visualTarget() {
  const vc = viewCenter(), k = vc.pk, idx = vc.pi;
  if (k === 4 || k === 5) return { kind: k === 4 ? 'floor' : 'ceil', sec: idx, label: (k === 4 ? 'Floor' : 'Ceiling') + ' · sector ' + idx + ' · ' + (k === 4 ? M.sec[idx].fh + ' ' + M.sec[idx].ft : M.sec[idx].ch + ' ' + M.sec[idx].ct) };
  if (k >= 1 && k <= 3) {
    const L = M.l[idx]; if (!L) return null; const p = G.p; const front = lineSide(L, p.x, p.y) < 0; const sd = front ? L.s1 : L.s2;
    const part = { 1: 'up', 2: 'mid', 3: 'lo' }[k]; const d = M.sd[sd >= 0 ? sd : L.s1];
    return { kind: 'wall', line: idx, sd: sd >= 0 ? sd : L.s1, part, sec: d ? d.sec : -1, label: { up: 'Upper', mid: 'Wall', lo: 'Lower' }[part] + ' · line ' + idx + ' · ' + (d ? d[part] : '') };
  }
  if (k === 6 && idx >= 0) return { kind: 'thing', ti: idx, label: 'Thing · ' + thingName(M.t[idx].type) };
  return null;
}
function buildVbar() {
  const b = $('#vbar'); b.innerHTML = '';
  const B = (label, fn) => { const e = document.createElement('button'); e.textContent = label; e.onclick = fn; b.appendChild(e); };
  const edit = (fn) => { const t = visualTarget(); if (!t) return toast('Aim the crosshair at something first'); pushUndo(); fn(t); MAPVER++; LS.set('autosave', M); const keep = G.p; const sc = buildScene(G.secs); G.sc = sc; G.p = keep; };
  const secEdit = (k, d) => edit(t => { if (t.sec < 0) return; const key = (t.kind === 'ceil' || (t.kind === 'wall' && t.part === 'up')) && k === 'h' ? 'ch' : k === 'h' ? 'fh' : k; M.sec[t.sec][key] = key === 'li' ? clamp(M.sec[t.sec].li + d, 0, 255) : M.sec[t.sec][key] + d; G.secs[t.sec][key] = M.sec[t.sec][key]; if (key === 'li') G.secs[t.sec].base = M.sec[t.sec].li; });
  B('▲ Height +8', () => secEdit('h', 8)); B('▼ Height −8', () => secEdit('h', -8));
  B('☀ Light +16', () => secEdit('li', 16)); B('☾ Light −16', () => secEdit('li', -16));
  B('Texture…', () => { const t = visualTarget(); if (!t || t.kind === 'thing') return toast('Aim at a wall, floor or ceiling'); const flat = t.kind !== 'wall'; const cur = flat ? (t.kind === 'floor' ? M.sec[t.sec].ft : M.sec[t.sec].ct) : M.sd[t.sd][t.part]; openTexBrowser(flat, cur, name => { pushUndo(); if (flat) { const k = t.kind === 'floor' ? 'ft' : 'ct'; M.sec[t.sec][k] = name; G.secs[t.sec][k] = name; } else M.sd[t.sd][t.part] = name; MAPVER++; LS.set('autosave', M); G.sc = buildScene(G.secs); }); });
  B('Copy tex', () => { const t = visualTarget(); if (!t) return; E.texClip = t.kind === 'wall' ? M.sd[t.sd][t.part] : t.kind === 'floor' ? M.sec[t.sec].ft : t.kind === 'ceil' ? M.sec[t.sec].ct : null; toast('Copied ' + E.texClip); });
  B('Paste tex', () => { if (!E.texClip) return toast('Copy a texture first'); edit(t => { if (t.kind === 'wall') M.sd[t.sd][t.part] = E.texClip; else if (t.kind === 'floor') { M.sec[t.sec].ft = E.texClip; G.secs[t.sec].ft = E.texClip; } else if (t.kind === 'ceil') { M.sec[t.sec].ct = E.texClip; G.secs[t.sec].ct = E.texClip; } }); });
  B('X offset +8', () => edit(t => { if (t.kind === 'wall') M.sd[t.sd].xo += 8; }));
  B('Y offset +8', () => edit(t => { if (t.kind === 'wall') M.sd[t.sd].yo += 8; }));
  B('Select in 2D', () => { const t = visualTarget(); exitGame(); if (!t) return; clearSel(); if (t.kind === 'wall') { setMode('linedefs'); E.sel.l.add(t.line); } else if (t.kind === 'thing') { setMode('things'); E.sel.t.add(t.ti); } else { setMode('sectors'); E.sel.s.add(t.sec); } refreshProps(); edRedraw(); });
  B('▶ Play from here', () => { const p = G.p; initGame('play', { x: p.x, y: p.y, a: p.a * 180 / Math.PI }); });
}

/* ---------- touch input ---------- */
const TP = new Map();
function gameDown(e) {
  if (!G || GL.arrange) return;
  const c = e.target.closest('.ctl'); const id = e.pointerId;
  if (e.target.closest('#gtop') || e.target.closest('#vbar') || e.target.closest('#gover') || e.target.closest('#arrbar')) return;
  e.preventDefault(); audio();
  if (!c && gameMouseDown(e)) return;
  if (e.pointerType !== 'mouse') setInputMode('touch');
  try { $('#game').setPointerCapture(id); } catch (er) { }
  if (c) {
    const k = c.dataset.c;
    if (k === 'stick' || k === 'look') { const r = c.getBoundingClientRect(); TP.set(id, { k, cx: r.left + r.width / 2, cy: r.top + r.height / 2, rad: r.width / 2 }); stickMove(e); return; }
    if (k === 'fire') { IN.fire = true; TP.set(id, { k, lx: e.clientX, ly: e.clientY }); return; }
    if (k === 'uturn') { IN.uturn = true; TP.set(id, { k }); return; }
    if (k === 'use') { IN.use = true; TP.set(id, { k }); return; }
    if (k === 'wpn') { cycleWeapon(); TP.set(id, { k }); return; }
    if (k === 'map') { G.automap = !G.automap; TP.set(id, { k }); return; }
  }
  if (!c && armsTap(e)) { TP.set(id, { k: 'tap' }); return; }
  TP.set(id, { k: 'turn', lx: e.clientX, ly: e.clientY });
}
/* tap a number on the status bar's ARMS panel to pick that gun (2 = chainsaw, tap again for the pistol) */
/* which number on the ARMS panel a weapon lives under (2-7); painted/custom guns go by their class */
function panelOf(id) { const w = WEAPONS[id]; if (!w) return 0; if (!w.custom) return id === 1 ? 2 : id === 8 ? 7 : id; return { sidearm: 2, melee: 2, shotgun: 3, repeater: 5, explosive: 6, thrown: 6, energy: 7, railgun: 7, super: 7 }[w.custom.cls] || 5; }
function panelGuns(n) { return [...G.p.has].filter(id => panelOf(id) === n).sort((a, b) => a - b); }
function armsTap(e) {
  const a = G && G.armsRect; if (!a) return false; const cv = $('#gv'), r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
  if (x < a.x || y < a.y || x > a.x + a.w || y > a.y + a.h) return false;
  const col = clamp(Math.floor((x - a.x) / (a.w / 3)), 0, 2), row = clamp(Math.floor((y - a.y) / (a.h / 2)), 0, 1), slot = 2 + row * 3 + col, p = G.p;
  // tap a number again to cycle through the guns that share it (e.g. 3: Shotgun > Sawed-Off)
  const list = panelGuns(slot); if (!list.length) return true; const i = list.indexOf(p.w), w = list[(i + 1) % list.length];
  if (w !== p.w) { p.w = w; msg(WEAPONS[w].name); sfx('switch'); }
  return true;
}
function stickMove(e) { const t = TP.get(e.pointerId); let dx = e.clientX - t.cx, dy = e.clientY - t.cy; const m = Math.hypot(dx, dy), max = t.rad * 0.7; if (m > max) { dx *= max / m; dy *= max / m; }
  if (t.k === 'look') { IN.lookX = clamp(dx / max, -1, 1); IN.lookY = clamp(dy / max, -1, 1); if (Math.abs(IN.lookX) < 0.12) IN.lookX = 0; if (Math.abs(IN.lookY) < 0.2) IN.lookY = 0; $('#c-look .knob').style.transform = `translate(${dx}px,${dy}px)`; return; }
  const sx = clamp(dx / max, -1, 1); if (BINDS.touchStickX === 'turn') { IN.str = 0; IN.stickTurn = Math.abs(sx) < 0.15 ? 0 : sx; } else { IN.str = sx; IN.stickTurn = 0; } IN.fwd = clamp(-dy / max, -1, 1); if (Math.abs(IN.str) < 0.15) IN.str = 0; if (Math.abs(IN.fwd) < 0.12) IN.fwd = 0; $('#c-stick .knob').style.transform = `translate(${dx}px,${dy}px)`; }
function gameMove(e) {
  if (gameMouseMove(e)) return;
  const t = TP.get(e.pointerId); if (!t) return; e.preventDefault();
  if (t.k === 'stick' || t.k === 'look') stickMove(e);
  else if (t.k === 'turn' || t.k === 'fire') { const dx = e.clientX - t.lx, dy = e.clientY - (t.ly == null ? e.clientY : t.ly); t.lx = e.clientX; t.ly = e.clientY; IN.turn -= dx * 0.0065 * S.sens; if (BINDS.touchDragLook) IN.look -= dy * 0.006 * BINDS.lookSpeed * (BINDS.lookInvert ? -1 : 1); }
}
function gameUp(e) {
  gameMouseUp(e);
  const t = TP.get(e.pointerId); if (!t) return; TP.delete(e.pointerId);
  if (t.k === 'stick') { IN.fwd = IN.str = IN.stickTurn = 0; $('#c-stick .knob').style.transform = ''; }
  if (t.k === 'look') { IN.lookX = IN.lookY = 0; $('#c-look .knob').style.transform = ''; }
  if (t.k === 'fire') IN.fire = false;
}
function cycleWeapon(dir = 1) { const p = G.p; const list = [...p.has].sort((a, b) => a - b); const i = list.indexOf(p.w); p.w = list[(i + dir + list.length) % list.length]; msg(WEAPONS[p.w].name); sfx('switch'); }
function gameKey(e, down) {
  if (!G || $('#game').hidden || !$('#modal').hidden) return;
  if (down && !$('#gover').hidden) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#ovOk') && $('#ovOk').click(); } else if (e.key === 'Escape') { e.preventDefault(); $('#ovX') && $('#ovX').click(); } return; }
  const k = keyName(e);
  if (down) {
    setInputMode('kbm');
    if (k === 'tab' || k === 'space' || k.startsWith('arrow')) e.preventDefault();
    if (/^[1-8]$/.test(k) && G.p.has.has(+k)) G.p.w = +k;
    if (!e.repeat) IN.tapped.add(k);
    IN.keys.add(k);
  } else IN.keys.delete(k);
}

/* ---------- arrange controls (Pulse Labs Move/Resize words) ---------- */
function enterArrange() {
  GL.arrange = true; GL.arrBackup = LS.get('ctlpos', {}); $('#arrbar').hidden = false;
  document.querySelectorAll('#ctls .ctl').forEach(el => {
    const w = document.createElement('span'); w.className = 'mover'; el.appendChild(w);
    let start = null;
    makeMovable(w, el, {
      onDrag: (state, dx, dy) => {
        const all = LS.get('ctlpos', {}); const pos = ctlPos(); const p = Object.assign({}, pos[el.dataset.c]);
        if (!start) start = Object.assign({}, p);
        if (state === 'Move') { p.x = clamp(start.x + dx / innerWidth * 100, 3, 97); p.y = clamp(start.y + dy / innerHeight * 100, 5, 97); }
        else p.s = clamp(start.s + (dx - dy) / 200, 0.5, 2.2);
        all[GL.key] = Object.assign({}, all[GL.key] || {}, { [el.dataset.c]: p }); LS.set('ctlpos', all); layoutGame();
      },
      onEnd: () => { start = null; }
    });
  });
  layoutGame(); toast('Arranging the ' + GL.key + ' layout');
}
function exitArrange(save) {
  GL.arrange = false; $('#arrbar').hidden = true;
  document.querySelectorAll('#ctls .mover').forEach(m => m.remove());
  if (!save) LS.set('ctlpos', GL.arrBackup || {}); else toast('Control layout saved');
  layoutGame();
}
