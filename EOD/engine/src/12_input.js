/* ================= INPUT: keyboard, mouse (pointer lock), controller (Gamepad API), remapping ================= */
const ACTIONS = [['fwd', 'Move forward'], ['back', 'Move back'], ['left', 'Strafe left'], ['right', 'Strafe right'], ['tl', 'Turn left'], ['tr', 'Turn right'], ['fire', 'Fire'], ['use', 'Use / open doors'], ['wnext', 'Next weapon'], ['wprev', 'Previous weapon'], ['map', 'Automap'], ['menu', 'Release mouse / back to editor']];
const DEF_BINDS = {
  key: { fwd: ['w', 'arrowup'], back: ['s', 'arrowdown'], left: ['a'], right: ['d'], tl: ['arrowleft'], tr: ['arrowright'], fire: ['mouse0', 'control'], use: ['e', 'space'], wnext: ['q', 'wheeldown'], wprev: ['wheelup'], map: ['tab'], menu: ['escape'] },
  pad: { fwd: [12], back: [13], tl: [14], tr: [15], fire: [7], use: [0], wnext: [5, 3], wprev: [4], map: [8], menu: [9] },
  mouseSens: 1, padDead: 0.2, padTurn: 1, padInvertTurn: false
};
const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'Left stick click', 'Right stick click', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Xbox button'];
function loadBinds() { const s = LS.get('binds', null); const b = JSON.parse(JSON.stringify(DEF_BINDS)); if (s) { Object.assign(b.key, s.key || {}); Object.assign(b.pad, s.pad || {}); ['mouseSens', 'padDead', 'padTurn', 'padInvertTurn'].forEach(k => { if (s[k] !== undefined) b[k] = s[k]; }); } return b; }
let BINDS = loadBinds();
let bindSaveT = 0;
function saveBinds() {
  LS.set('binds', BINDS);
  clearTimeout(bindSaveT);
  bindSaveT = setTimeout(async () => { try { if (window.EODB && await EODB.user()) await EODB.updateProfile({ bindings: BINDS }); } catch (e) { } }, 800);
}
async function pullAccountBinds() { try { if (!window.EODB) return; const u = await EODB.user(); if (u && u.bindings && !LS.get('binds', null)) { LS.set('binds', u.bindings); BINDS = loadBinds(); } } catch (e) { } }
function keyName(e) { const k = (e.key || '').toLowerCase(); return k === ' ' ? 'space' : k; }
function prettyKey(k) {
  const M_ = { mouse0: 'Left click', mouse1: 'Middle click', mouse2: 'Right click', mouse3: 'Mouse back', mouse4: 'Mouse forward', wheelup: 'Wheel up', wheeldown: 'Wheel down', space: 'Space', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', control: 'Ctrl', escape: 'Esc', shift: 'Shift', alt: 'Alt', tab: 'Tab', enter: 'Enter' };
  return M_[k] || (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
}
IN.tapped = new Set(); IN.prev = {}; IN.mode = 'touch';
function readPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of pads) if (g && g.connected) return g;
  return null;
}
const padPressed = (g, i) => { const b = g && g.buttons[i]; return !!b && (b.pressed || b.value > 0.4); };
function actOn(name, pad) {
  for (const k of BINDS.key[name] || []) if (IN.keys.has(k) || IN.tapped.has(k)) return true;
  if (pad) for (const i of BINDS.pad[name] || []) if (padPressed(pad, i)) return true;
  return false;
}
function setInputMode(m) {
  if (IN.mode === m) return; IN.mode = m;
  const c = $('#ctls'); if (c) c.style.display = m === 'touch' ? '' : 'none';
  if (G && m === 'pad') msg('Controller: left stick moves, right stick turns, RT fires, A uses');
  if (G && m === 'kbm') msg('Click the game to lock the mouse. WASD moves, mouse turns, click fires, E uses');
}
// called once per game tic; returns analog/digital movement and fires edge actions
function pollInput() {
  const pad = readPad();
  if (pad && (pad.buttons.some(b => b.pressed) || pad.axes.some(a => Math.abs(a) > 0.5))) setInputMode('pad');
  const A = n => actOn(n, pad);
  let fwd = IN.fwd, str = IN.str, turn = 0;
  if (A('fwd')) fwd = 1; if (A('back')) fwd = -1; if (A('left')) str = -1; if (A('right')) str = 1;
  if (A('tl')) turn += 0.065; if (A('tr')) turn -= 0.065;
  if (pad) {
    const dz = BINDS.padDead, lx = pad.axes[0] || 0, ly = pad.axes[1] || 0, rx = pad.axes[2] || 0;
    const sh = v => Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz);
    if (sh(ly)) fwd = clamp(-sh(ly) * 1.15, -1, 1); if (sh(lx)) str = clamp(sh(lx) * 1.15, -1, 1);
    const t = sh(rx); if (t) turn -= t * Math.abs(t) * 0.12 * BINDS.padTurn * (BINDS.padInvertTurn ? -1 : 1);
  }
  IN.firePad = A('fire');
  for (const n of ['use', 'wnext', 'wprev', 'map', 'menu']) { const on = A(n); if (on && !IN.prev[n]) inputEdge(n); IN.prev[n] = on; }
  IN.tapped.clear();
  return { fwd, str, turn };
}
function inputEdge(n) {
  if (!G) return;
  if (G.over) { if (n === 'use' || n === 'menu') { const b = n === 'use' ? $('#ovOk') : $('#ovX'); if (b) setTimeout(() => b.click(), 0); } return; }
  if (n === 'use') IN.use = true;
  else if (n === 'wnext') cycleWeapon(1);
  else if (n === 'wprev') cycleWeapon(-1);
  else if (n === 'map') G.automap = !G.automap;
  else if (n === 'menu') { if (document.pointerLockElement) document.exitPointerLock(); else setTimeout(() => $('#gExit').click(), 0); }
}
function rumble(strength, ms) { const g = readPad(); try { if (g && g.vibrationActuator) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }); } catch (e) { } }
addEventListener('gamepadconnected', e => { toast('Controller connected: ' + (e.gamepad.id || 'gamepad').replace(/\(.*\)/, '').trim().slice(0, 40)); if (G) setInputMode('pad'); });
addEventListener('gamepaddisconnected', () => toast('Controller disconnected'));

/* ---------- mouse + keyboard hooks on the game screen ---------- */
function gameMouseDown(e) {
  if (e.pointerType !== 'mouse') return false;
  setInputMode('kbm');
  const gv = $('#gv');
  if (!document.pointerLockElement && gv.requestPointerLock) { try { const r = gv.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (er) { } return true; }
  IN.keys.add('mouse' + e.button); IN.tapped.add('mouse' + e.button); return true;
}
function gameMouseUp(e) { if (e.pointerType !== 'mouse') return false; IN.keys.delete('mouse' + e.button); return true; }
function gameMouseMove(e) { if (!document.pointerLockElement) return false; IN.turn -= (e.movementX || 0) * 0.0028 * BINDS.mouseSens; return true; }
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) { [0, 1, 2, 3, 4].forEach(b => IN.keys.delete('mouse' + b)); } });

/* ---------- Controls screen (remapping) ---------- */
function openControls() {
  const draft = JSON.parse(JSON.stringify(BINDS));
  let capture = null;
  const render = b => {
    b.querySelector('#ctlRows').innerHTML = ACTIONS.map(([k, n]) => {
      const keys = draft.key[k] || [], pads = draft.pad[k] || [];
      return `<div class="crow"><div class="cname">${n}</div><div class="cbtns">
        <button data-k="${k}" data-slot="0">${keys[0] ? prettyKey(keys[0]) : '—'}</button><button data-k="${k}" data-slot="1">${keys[1] ? prettyKey(keys[1]) : '—'}</button>
        <button data-p="${k}" class="padb">🎮 ${pads.length ? pads.map(i => PAD_NAMES[i] || 'Button ' + i).join(' / ') : '—'}</button></div></div>`;
    }).join('');
    b.querySelectorAll('[data-k]').forEach(x => x.onclick = () => startKey(b, x.dataset.k, +x.dataset.slot));
    b.querySelectorAll('[data-p]').forEach(x => x.onclick = () => startPad(b, x.dataset.p));
  };
  const stop = () => { if (!capture) return; capture.cleanup(); capture = null; };
  const startKey = (b, act, slot) => {
    stop(); const st = b.querySelector('#ctlStatus'); st.textContent = `Press a key, mouse button or wheel for "${ACTIONS.find(a => a[0] === act)[1]}". Press Backspace to clear it.`;
    const set = k => { const list = draft.key[act] = (draft.key[act] || []).slice(); if (k === null) list.splice(slot, 1); else { for (const a in draft.key) draft.key[a] = draft.key[a].filter(x => x !== k); list[slot] = k; draft.key[act] = list.filter(Boolean); } st.textContent = k ? prettyKey(k) + ' set.' : 'Cleared.'; stop(); render(b); };
    const kd = e => { e.preventDefault(); e.stopPropagation(); const k = keyName(e); set(k === 'backspace' ? null : k); };
    const md = e => { if (e.target.closest && e.target.closest('.mfoot')) return; e.preventDefault(); e.stopPropagation(); set('mouse' + e.button); };
    const wh = e => { e.preventDefault(); set(e.deltaY < 0 ? 'wheelup' : 'wheeldown'); };
    const cm = e => e.preventDefault();
    setTimeout(() => { addEventListener('keydown', kd, true); addEventListener('mousedown', md, true); addEventListener('wheel', wh, { capture: true, passive: false }); addEventListener('contextmenu', cm, true); }, 50);
    capture = { cleanup: () => { removeEventListener('keydown', kd, true); removeEventListener('mousedown', md, true); removeEventListener('wheel', wh, true); removeEventListener('contextmenu', cm, true); } };
  };
  const startPad = (b, act) => {
    stop(); const st = b.querySelector('#ctlStatus');
    if (!readPad()) { st.textContent = 'No controller found. Plug one in or pair it, press any button on it, then try again.'; return; }
    st.textContent = `Press a controller button for "${ACTIONS.find(a => a[0] === act)[1]}" (8 seconds). Press the same button twice in a row to add a second one.`;
    const base = readPad().buttons.map(x => x.pressed || x.value > 0.4); let raf = 0; const t0 = performance.now();
    const loop = () => {
      const g = readPad(); if (!g || performance.now() - t0 > 8000) { st.textContent = 'Timed out.'; stop(); return; }
      const i = g.buttons.findIndex((x, j) => (x.pressed || x.value > 0.4) && !base[j]);
      if (i >= 0) { for (const a in draft.pad) draft.pad[a] = draft.pad[a].filter(x => x !== i); draft.pad[act] = [i]; st.textContent = (PAD_NAMES[i] || 'Button ' + i) + ' set.'; stop(); render(b); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); capture = { cleanup: () => cancelAnimationFrame(raf) };
  };
  if (document.pointerLockElement) document.exitPointerLock();
  window.__modalClose = stop;
  const pad = readPad();
  modal('Controls', `<p class="hint">${pad ? '🎮 Controller found: ' + esc(pad.id.replace(/\(.*\)/, '').trim()) : 'No controller found yet. Plug one in (or pair an Xbox controller over Bluetooth) and press any button.'}</p>
    <p class="hint">Tap a slot, then press the key, mouse button, wheel or controller button you want. Sticks: left stick moves, right stick turns.</p>
    <div id="ctlStatus" class="hint" style="color:var(--yellow);min-height:1.4em"></div><div id="ctlRows"></div>
    <div class="f"><label>Mouse turn speed <b id="msV">${draft.mouseSens}</b></label><input type="range" id="ms" min="0.2" max="4" step="0.1" value="${draft.mouseSens}"></div>
    <div class="f"><label>Stick turn speed <b id="ptV">${draft.padTurn}</b></label><input type="range" id="pt" min="0.3" max="3" step="0.1" value="${draft.padTurn}"></div>
    <div class="f"><label>Stick dead zone <b id="pdV">${draft.padDead}</b></label><input type="range" id="pd" min="0.05" max="0.5" step="0.01" value="${draft.padDead}"></div>
    <label class="chk"><input type="checkbox" id="pi" ${draft.padInvertTurn ? 'checked' : ''}>Invert right-stick turning</label>
    <div class="row"><button id="ctlReset">Reset to defaults</button></div>
    <p class="hint">Saved on this device${window.EODB ? ', and to your EOD account when you are signed in' : ''}.</p>`,
    [{ ok: 1, fn: () => { stop(); BINDS = draft; saveBinds(); toast('Controls saved'); } }, { cancel: 1, fn: () => stop() }], b => {
      render(b);
      const sl = (id, key, lab) => { const e = b.querySelector('#' + id); e.oninput = () => { draft[key] = +e.value; b.querySelector('#' + lab).textContent = e.value; }; };
      sl('ms', 'mouseSens', 'msV'); sl('pt', 'padTurn', 'ptV'); sl('pd', 'padDead', 'pdV');
      b.querySelector('#pi').onchange = e => draft.padInvertTurn = e.target.checked;
      b.querySelector('#ctlReset').onclick = () => { const d = JSON.parse(JSON.stringify(DEF_BINDS)); Object.keys(draft).forEach(k => delete draft[k]); Object.assign(draft, d); render(b); b.querySelector('#ctlStatus').textContent = 'Defaults restored. Press the green check to keep them.'; };
    });
}
