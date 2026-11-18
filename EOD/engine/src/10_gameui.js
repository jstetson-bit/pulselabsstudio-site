/* ================= GAME SCREEN, HUD, TOUCH CONTROLS ================= */
const CTL_DEF = {
  landscape: { stick: { x: 13, y: 62, s: 1 }, fire: { x: 89, y: 58, s: 1 }, use: { x: 77, y: 76, s: 0.9 }, wpn: { x: 92, y: 32, s: 0.8 }, map: { x: 79, y: 42, s: 0.8 } },
  portrait: { stick: { x: 25, y: 79, s: 1 }, fire: { x: 78, y: 77, s: 1 }, use: { x: 58, y: 91, s: 0.9 }, wpn: { x: 88, y: 91, s: 0.85 }, map: { x: 60, y: 66, s: 0.8 } },
  fold: { stick: { x: 14, y: 72, s: 1.1 }, fire: { x: 87, y: 68, s: 1.1 }, use: { x: 74, y: 82, s: 1 }, wpn: { x: 90, y: 50, s: 0.9 }, map: { x: 76, y: 58, s: 0.9 } }
};
const GL = { key: 'landscape', vw: 0, vh: 0, vx: 0, vy: 0, arrange: false, arrBackup: null };
function layoutKey() { if (S.layout !== 'auto') return S.layout; const W = innerWidth, H = innerHeight; return H / W > 1.25 ? 'portrait' : W / H > 1.35 ? 'landscape' : 'fold'; }
function ctlPos() { const all = LS.get('ctlpos', {}); return Object.assign({}, CTL_DEF[GL.key], all[GL.key] || {}); }
function layoutGame() {
  const W = innerWidth, H = innerHeight; GL.key = layoutKey();
  let vw = W, vh = H;
  if (GL.key === 'portrait') vh = Math.round(Math.min(H * 0.58, W * 1.3));
  GL.vw = vw; GL.vh = vh;
  const cv = $('#gv'); cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  const rw = Math.min(S.res, Math.round(vw)), rh = Math.max(100, Math.round(rw * vh / vw));
  cv.width = rw; cv.height = rh; rSetup(rw, rh);
  const pos = ctlPos();
  document.querySelectorAll('#ctls .ctl').forEach(el => {
    const p = pos[el.dataset.c]; el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.transform = `translate(-50%,-50%) scale(${p.s})`;
    el.style.opacity = GL.arrange ? 1 : S.ctlOpacity; el.style.display = (G && G.mode === 'visual' && el.dataset.c !== 'stick') ? 'none' : '';
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
  LIM.on = false;
  if (EODP.playOnly) { eodLeavePlay(); return; }
  if (GL.arrange) exitArrange(false);
  const wasVisual = G && G.mode === 'visual';
  if (G && wasVisual) { E.view.x = G.p.x; E.view.y = G.p.y; }
  G = null; $('#game').hidden = true; $('#props').style.display = ''; IN.keys.clear(); IN.fire = false; IN.fwd = IN.str = 0;
  if (wasVisual) { mapChanged(); }
  edResize();
}
function showOver() {
  const o = $('#gover'); o.hidden = false; const g = G.over;
  const pct = (a, b) => b ? Math.round(a * 100 / b) + '%' : '—';
  if (g.k === 'dead') o.innerHTML = `<div class="box"><h1>YOU DIED</h1><p>Tap the green check to try again.</p><div class="row"><button class="okbtn" id="ovOk"></button><button class="cancelbtn" id="ovX"></button></div></div>`;
  else o.innerHTML = `<div class="box"><h1>${g.secret ? 'SECRET EXIT!' : 'LEVEL COMPLETE'}</h1><div>${esc(M.name)}</div><div class="stats">KILLS&nbsp;&nbsp; ${pct(G.kills, G.totK)}<br>ITEMS&nbsp;&nbsp; ${pct(G.items, G.totI)}<br>SECRET&nbsp; ${pct(G.secrets, G.totS)}<br>TIME&nbsp;&nbsp;&nbsp; ${Math.floor(g.time / 60)}:${String(Math.floor(g.time % 60)).padStart(2, '0')}</div><div class="row"><button class="okbtn" id="ovOk" title="Play again"></button><button class="cancelbtn" id="ovX" title="Back to editor"></button></div></div>`;
  $('#ovOk').onclick = () => { const p1 = M.t.find(t => t.type === 1); o.hidden = true; initGame('play', { x: p1.x, y: p1.y, a: p1.a }); };
  $('#ovX').onclick = () => exitGame();
}

/* ---------- drawing ---------- */
const frameOf = (seq, t, sp) => seq[Math.floor(t / sp) % seq.length];
function gameSprites() {
  const out = [], cam = G.p, useRes = RES.packs.length > 0 && !!resPal();
  const lightAt = e => G.secs[Math.max(0, e.sec)] ? G.secs[Math.max(0, e.sec)].li : 160;
  for (const e of G.ents) {
    if (e.d.cw) { if (e.alive) out.push({ x: e.x, y: e.y, z: e.z, img: weaponPickupImg(e.type, e.d.cw), light: lightAt(e), id: e.ti }); continue; }
    const cm = e.d.custom ? monFrames(e.type, e.d.custom) : null;
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
  render3D({ x: p.x, y: p.y, z: p.viewz, a: p.a, sec: p.sec, pitch: -(G.kick || 0) }, G.sc, gameSprites());
  R.ctx.putImageData(R.img, 0, 0);
  const cv = $('#gv'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(R.cv, 0, 0);
  const W = cv.width, H = cv.height; void sec;
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
  G.msgs.forEach((m, i) => { g.fillStyle = '#000'; g.fillText(m.t, 5 * u, (40 + i * 9) * u + u); g.fillStyle = '#ff3'; g.fillText(m.t, 4 * u, (40 + i * 9) * u); });
  if (G.automap) drawAutomap(g, W, H);
  drawLimitsHud(g, W, H, u);
}
function drawWeaponRes(g, W, H, u, bx, by) {
  const p = G.p, ws = WSPR[p.w]; if (!ws || !RES.packs.length || !resPal()) return false;
  const firing = p.fireT > 0, fr = firing ? ws[2][Math.min(ws[2].length - 1, Math.floor((6 - p.fireT) / 2))] : ws[1][Math.floor(G.tic / 4) % ws[1].length];
  const main = getSpriteFrame(ws[0], fr, 0); if (!main) return false;
  const s = Math.min(W / 320, (H - 20 * u) / 168), viewBottom = H - 20 * u;
  const put = f => { if (!f) return; const img = f.img; g.drawImage(spriteCanvas(img), W / 2 + (1 - (img.ox || 0) - 160) * s + bx, viewBottom - (136 + (img.oy || 0)) * s + by, img.w * s, img.h * s); };
  put(main); if (firing && p.fireT > 2 && ws[3]) put(getSpriteFrame(ws[3], ws[4][Math.min(ws[4].length - 1, Math.floor((6 - p.fireT) / 2))], 0));
  return true;
}
function drawWeapon(g, W, H, u) {
  const p = G.p, bx = Math.sin(p.bob * 0.5) * 6 * u * Math.min(1, Math.hypot(p.vx, p.vy) / 4), by = Math.abs(Math.cos(p.bob * 0.5)) * 4 * u * Math.min(1, Math.hypot(p.vx, p.vy) / 4);
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
  const p = G.p, h = 20 * u, y = H - h;
  g.fillStyle = 'rgba(40,36,32,.92)'; g.fillRect(0, y, W, h); g.fillStyle = '#5a5248'; g.fillRect(0, y, W, u);
  const num = (txt, x, lab) => { g.font = `bold ${12 * u}px "Courier New",monospace`; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(txt, x + u, y + 13 * u + u); g.fillStyle = '#d02020'; g.fillText(txt, x, y + 13 * u); g.font = `${5 * u}px monospace`; g.fillStyle = '#ddd'; g.fillText(lab, x, y + 18.5 * u); };
  const wd = WEAPONS[p.w];
  num(wd.ammo ? String(p.ammo[wd.ammo]) : '--', W * 0.1, 'AMMO');
  num(p.hp + '%', W * 0.28, 'HEALTH');
  // face
  const fx = W * 0.5, fy = y + 10 * u; g.fillStyle = p.hp > 60 ? '#c8916a' : p.hp > 25 ? '#b8705a' : '#9a4a3a'; g.beginPath(); g.arc(fx, fy, 8 * u, 0, 7); g.fill();
  g.fillStyle = '#000'; g.fillRect(fx - 4 * u, fy - 2 * u, 2 * u, 2 * u); g.fillRect(fx + 2 * u, fy - 2 * u, 2 * u, 2 * u);
  g.fillStyle = p.hurt > 0 ? '#600' : '#000'; g.fillRect(fx - 3 * u, fy + 3 * u, 6 * u, (p.fireT > 0 ? 2 : 1) * u);
  if (p.hp < 50) { g.fillStyle = '#a00'; g.fillRect(fx - 6 * u, fy - 6 * u, 2 * u, 4 * u); }
  num(p.armor + '%', W * 0.72, 'ARMOR');
  const keys = ['b', 'y', 'r']; keys.forEach((k, i) => { g.fillStyle = p.keys.has(k) ? { b: '#25f', y: '#fd2', r: '#e22' }[k] : '#222'; g.fillRect(W * 0.86, y + (2 + i * 6) * u, 6 * u, 5 * u); });
  g.font = `${5 * u}px monospace`; g.fillStyle = '#ddd'; g.textAlign = 'left'; g.fillText(wd.name.toUpperCase(), W * 0.9, y + 6 * u);
  g.fillText('K ' + G.kills + '/' + G.totK, W * 0.9, y + 12 * u); g.fillText('I ' + G.items + '/' + G.totI, W * 0.9, y + 18 * u);
}
function drawAutomap(g, W, H) {
  const p = G.p, z = Math.min(W, H) / 900;
  g.fillStyle = 'rgba(0,0,0,.82)'; g.fillRect(0, 0, W, H - 20 * Math.max(1, Math.round(W / 320)));
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
  const i = (R.H >> 1) * R.W + (R.W >> 1), k = R.pk[i], idx = R.pi[i];
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
    if (k === 'stick') { const r = c.getBoundingClientRect(); TP.set(id, { k, cx: r.left + r.width / 2, cy: r.top + r.height / 2, rad: r.width / 2 }); stickMove(e); return; }
    if (k === 'fire') { IN.fire = true; TP.set(id, { k, lx: e.clientX }); return; }
    if (k === 'use') { IN.use = true; TP.set(id, { k }); return; }
    if (k === 'wpn') { cycleWeapon(); TP.set(id, { k }); return; }
    if (k === 'map') { G.automap = !G.automap; TP.set(id, { k }); return; }
  }
  TP.set(id, { k: 'turn', lx: e.clientX, ly: e.clientY });
}
function stickMove(e) { const t = TP.get(e.pointerId); let dx = e.clientX - t.cx, dy = e.clientY - t.cy; const m = Math.hypot(dx, dy), max = t.rad * 0.7; if (m > max) { dx *= max / m; dy *= max / m; } IN.str = clamp(dx / max, -1, 1); IN.fwd = clamp(-dy / max, -1, 1); if (Math.abs(IN.str) < 0.15) IN.str = 0; if (Math.abs(IN.fwd) < 0.12) IN.fwd = 0; $('#c-stick .knob').style.transform = `translate(${dx}px,${dy}px)`; }
function gameMove(e) {
  if (gameMouseMove(e)) return;
  const t = TP.get(e.pointerId); if (!t) return; e.preventDefault();
  if (t.k === 'stick') stickMove(e);
  else if (t.k === 'turn' || t.k === 'fire') { const dx = e.clientX - t.lx; t.lx = e.clientX; IN.turn -= dx * 0.0065 * S.sens; }
}
function gameUp(e) {
  gameMouseUp(e);
  const t = TP.get(e.pointerId); if (!t) return; TP.delete(e.pointerId);
  if (t.k === 'stick') { IN.fwd = IN.str = 0; $('#c-stick .knob').style.transform = ''; }
  if (t.k === 'fire') IN.fire = false;
}
function cycleWeapon(dir = 1) { const p = G.p; const list = [...p.has].sort((a, b) => a - b); const i = list.indexOf(p.w); p.w = list[(i + dir + list.length) % list.length]; msg(WEAPONS[p.w].name); sfx('switch'); }
function gameKey(e, down) {
  if (!G || $('#game').hidden || !$('#modal').hidden) return;
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
