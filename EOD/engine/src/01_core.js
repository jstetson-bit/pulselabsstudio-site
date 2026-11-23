'use strict';
/* EOD · Editor of Doom (engine from No Shit Doom Editor) — Pulse Labs Studio */
const VERSION = '0.8.19', VC = 39;
const ORIGINAL_HTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

const LS = {
  get(k, d) { try { const v = localStorage.getItem('eod.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('eod.' + k, JSON.stringify(v)); } catch (e) { } }
};

/* ---------- crash / support log ---------- */
function logCrash(msg) {
  const arr = LS.get('crash', []);
  arr.push({ t: new Date().toISOString(), v: VERSION, m: String(msg).slice(0, 3000) });
  while (arr.length > 60) arr.shift();
  LS.set('crash', arr);
}
window.addEventListener('error', e => logCrash((e.message || 'error') + ' @' + (e.filename || '') + ':' + (e.lineno || '') + (e.error && e.error.stack ? '\n' + e.error.stack : '')));
window.addEventListener('unhandledrejection', e => logCrash('promise: ' + (e.reason && e.reason.stack || e.reason)));

let toastT = 0;
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- settings ---------- */
const DEF_SET = { theme: null, font: 'clean', fs: 15, grid: 32, snap: true, res: 'auto', smooth: false, vol: { master: 80, weap: 100, mon: 100, you: 100, world: 100 }, hudStyle: 'modern', threads: 'auto', layout: 'auto', ctlOpacity: 0.6, skill: 2, sens: 1, sound: true, inverted: false, ellipseSides: 16, defWall: 'STARTAN3', defFloor: 'FLOOR4_8', defCeil: 'CEIL3_5', mapName: 'MAP01' };
let S = Object.assign({}, DEF_SET, LS.get('settings', {}));
if (!S.resV2) { if ([200, 320, 480].includes(S.res)) S.res = 'auto'; S.resV2 = 1; } // 0.7.2: old fixed detail levels move to Auto
function saveSettings() { LS.set('settings', S); applySettings(); }
function isDark() { return S.theme === 'dark' || (S.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); }
function applySettings() {
  const r = document.documentElement;
  r.classList.toggle('light', !isDark());
  r.classList.toggle('inverted', !!S.inverted);
  r.classList.toggle('font-mono', S.font === 'mono');
  r.style.setProperty('--fs', S.fs + 'px');
  if (window.edRedraw) edRedraw();
}
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySettings); } catch (e) { }
function toggleInvert() { S.inverted = !S.inverted; saveSettings(); }

/* ---------- modal helper ---------- */
// buttons: [{label|ok|cancel, fn}] — confirm is a green check, cancel is a red undo arrow and is ALWAYS last.
function modal(title, bodyHTML, buttons, onOpen) {
  const box = $('#modalBox');
  box.innerHTML = '';
  const h = document.createElement('div'); h.className = 'mhead'; h.innerHTML = '<span></span>'; h.firstChild.textContent = title;
  const b = document.createElement('div'); b.className = 'mbody';
  if (typeof bodyHTML === 'string') b.innerHTML = bodyHTML; else b.appendChild(bodyHTML);
  const f = document.createElement('div'); f.className = 'mfoot';
  buttons = (buttons || [{ cancel: 1 }]).slice();
  buttons.sort((a, b2) => (a.cancel ? 1 : 0) - (b2.cancel ? 1 : 0));
  for (const bt of buttons) {
    const e = document.createElement('button');
    if (bt.ok) { e.className = 'okbtn'; e.title = bt.title || 'Confirm'; }
    else if (bt.cancel) { e.className = 'cancelbtn'; e.title = bt.title || 'Close'; }
    else { e.textContent = bt.label; if (bt.cls) e.className = bt.cls; }
    e.onclick = () => { const r = bt.fn ? bt.fn(b) : undefined; if (r !== false) closeModal(); };
    f.appendChild(e);
  }
  box.append(h, b, f);
  $('#modal').hidden = false;
  if (onOpen) onOpen(b);
  return b;
}
function closeModal() { if (window.__modalClose) { const f = window.__modalClose; window.__modalClose = null; try { f(); } catch (e) { } } $('#modal').hidden = true; $('#modalBox').innerHTML = ''; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function download(name, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  const go = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  };
  let canShare = false;
  try { canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([blob], name)] })); } catch (e) { }
  const viaHostSave = async () => {
    let fn = name, data = blob;
    if (!/\.(json|html|zip|txt)$/i.test(name)) { data = makeZip(name, new Uint8Array(await blob.arrayBuffer())); fn = name + '.zip'; }
    DL.save({ filename: fn, data }).then(() => toast('Saved ' + fn), e => toast(e && e.code === 'declined' ? 'Save cancelled' : 'Save failed: ' + (e && e.code || e)));
  };
  const btns = [{ label: 'Download', cls: 'demo', fn: () => { if (DL) { viaHostSave(); return; } go(); toast('Saved ' + name); } }];
  if (canShare) btns.push({ label: 'Share / Send to app', fn: () => { navigator.share({ files: [new File([blob], name, { type: blob.type })], title: name }).catch(() => { }); } });
  btns.push({ cancel: 1 });
  modal('Export: ' + name, '<p>File is ready (' + Math.ceil(blob.size / 1024) + ' KB).</p><p class="hint">If Download does nothing inside this app, use Share, or open EOD in Chrome.</p>', btns);
}

/* ---------- tiny zip (for formats a browser won't save directly, e.g. .wad) ---------- */
let DL = null;
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(name, data) {
  const nm = new TextEncoder().encode(name), crc = crc32(data), n = data.length;
  const out = new Uint8Array(30 + nm.length + n + 46 + nm.length + 22), dv = new DataView(out.buffer);
  let o = 0; const w32 = v => { dv.setUint32(o, v, true); o += 4; }, w16 = v => { dv.setUint16(o, v, true); o += 2; };
  w32(0x04034b50); w16(20); w16(0); w16(0); w16(0); w16(0x21); w32(crc); w32(n); w32(n); w16(nm.length); w16(0); out.set(nm, o); o += nm.length; out.set(data, o); o += n;
  const cd = o; w32(0x02014b50); w16(20); w16(20); w16(0); w16(0); w16(0); w16(0x21); w32(crc); w32(n); w32(n); w16(nm.length); w16(0); w16(0); w16(0); w16(0); w32(0); w32(0); out.set(nm, o); o += nm.length;
  const cdl = o - cd; w32(0x06054b50); w16(0); w16(0); w16(1); w16(1); w32(cdl); w32(cd); w16(0);
  return out;
}

/* ---------- sound (synthesized, no assets) ---------- */
let AC = null;
function audio() { if (!S.sound) return null; try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
const SND_GROUP = { pistol: 'weap', shotgun: 'weap', chain: 'weap', rocket: 'weap', plasma: 'weap', dshtgn: 'weap', dbopn: 'weap', dbload: 'weap', dbcls: 'weap', pain: 'you', oof: 'you', pickup: 'you', weapon: 'you', die: 'mon', fire: 'mon', door: 'world', switch: 'world', tele: 'world', telept: 'world', secret: 'world', explode: 'world', glass: 'world', glasshit: 'world' };
function sndLevel(group) { const v = S.vol || {}, m = (v.master != null ? v.master : 80) / 100, g = (v[group] != null ? v[group] : 100) / 100; return m * g; }
function sfx(kind, vol = 1, group) {
  const ac = audio(); if (!ac) return;
  vol *= sndLevel(group || SND_GROUP[kind] || 'world'); if (vol <= 0.001) return;
  if (typeof resSound === 'function') { const rb = resSound(kind); if (rb) { const src = ac.createBufferSource(), gn = ac.createGain(); src.buffer = rb; gn.gain.value = Math.min(1.5, vol); src.connect(gn); gn.connect(ac.destination); src.start(); return; } }
  const t = ac.currentTime, g0 = ac.createGain(); g0.gain.value = Math.min(1.5, vol); g0.connect(ac.destination); const g = ac.createGain(); g.connect(g0);
  const noise = (dur, f0, f1, v) => {
    const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(); s.buffer = buf;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(fl); fl.connect(g); g.gain.setValueAtTime(v * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.start(t);
  };
  const tone = (type, f0, f1, dur, v) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    o.connect(g); g.gain.setValueAtTime(v * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.start(t); o.stop(t + dur);
  };
  switch (kind) {
    case 'pistol': noise(0.18, 4000, 300, 0.5); break;
    case 'shotgun': noise(0.45, 3000, 120, 0.8); break;
    case 'chain': noise(0.12, 4500, 400, 0.45); break;
    case 'rocket': noise(0.5, 900, 80, 0.6); break;
    case 'plasma': tone('sawtooth', 900, 300, 0.15, 0.25); break;
    case 'explode': noise(0.9, 1500, 40, 0.9); break;
    case 'door': tone('square', 70, 50, 0.6, 0.12); break;
    case 'switch': tone('square', 600, 400, 0.06, 0.2); break;
    case 'pickup': tone('square', 700, 1100, 0.12, 0.18); break;
    case 'weapon': tone('square', 400, 900, 0.25, 0.2); break;
    case 'oof': tone('sine', 140, 70, 0.2, 0.4); break;
    case 'pain': tone('sawtooth', 300, 120, 0.25, 0.2); break;
    case 'die': noise(0.6, 800, 60, 0.5); break;
    case 'fire': noise(0.3, 1200, 200, 0.3); break;
    case 'tele': tone('sine', 200, 1200, 0.5, 0.3); break;
    case 'glass': noise(0.7, 12000, 1500, 0.7); tone('triangle', 3100, 2300, 0.35, 0.12); tone('sine', 4200, 3600, 0.5, 0.08); tone('triangle', 2600, 2000, 0.6, 0.07); break;
    case 'glasshit': tone('sine', 3400, 2800, 0.12, 0.16); noise(0.08, 9000, 3000, 0.25); break;
    case 'secret': tone('triangle', 500, 1500, 0.6, 0.3); break;
  }
}
