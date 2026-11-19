/* EOD shared site chrome: header, footer, settings, manual, auth, modals, map cards */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k, d) { try { const v = localStorage.getItem('eod.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('eod.' + k, JSON.stringify(v)); } catch (e) { } } };
  // crash log (shared with the editor)
  function logCrash(m) { const a = LS.get('crash', []); a.push({ t: new Date().toISOString(), v: (window.EOD_CONFIG || {}).VERSION, m: String(m).slice(0, 3000), page: location.pathname }); while (a.length > 60) a.shift(); LS.set('crash', a); }
  if (!window.__eodCrashHooked) { window.__eodCrashHooked = 1; addEventListener('error', e => logCrash((e.message || 'error') + ' @' + (e.filename || '') + ':' + (e.lineno || ''))); addEventListener('unhandledrejection', e => logCrash('promise: ' + (e.reason && e.reason.stack || e.reason))); }

  // settings shared with the editor (same storage key)
  const S = () => Object.assign({ theme: null, font: 'clean', fs: 15, inverted: false }, LS.get('settings', {}));
  function saveS(p) { LS.set('settings', Object.assign(S(), p)); apply(); }
  function apply() { const s = S(), r = document.documentElement; const dark = s.theme === 'dark' || (s.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); r.classList.toggle('light', !dark); r.classList.toggle('inverted', !!s.inverted); r.classList.toggle('font-mono', s.font === 'mono'); r.style.setProperty('--fs', (s.fs + 1) + 'px'); }
  apply();

  let tT = 0;
  function toast(m, ms = 2600) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = m; t.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), ms); }
  // modal: buttons [{label,cls,fn}|{ok:1,fn}|{cancel:1}] — cancel always last
  function modal(title, html, buttons, onOpen) {
    const w = document.createElement('div'); w.className = 'eod-modal';
    w.innerHTML = '<div class="eod-box"><div class="mh"></div><div class="mb"></div><div class="mf"></div></div>';
    w.querySelector('.mh').textContent = title; w.querySelector('.mb').innerHTML = html;
    const close = () => w.remove();
    (buttons || [{ cancel: 1 }]).slice().sort((a, b) => (a.cancel ? 1 : 0) - (b.cancel ? 1 : 0)).forEach(b => {
      const e = document.createElement('button');
      if (b.ok) { e.className = 'okbtn'; e.title = b.title || 'Confirm'; } else if (b.cancel) { e.className = 'cancelbtn'; e.title = b.title || 'Close'; } else { e.textContent = b.label; if (b.cls) e.className = b.cls; }
      e.onclick = async () => { try { const r = b.fn ? await b.fn(w.querySelector('.mb'), close) : undefined; if (r !== false) close(); } catch (err) { const er = w.querySelector('.err') || Object.assign(document.createElement('div'), { className: 'err' }); er.textContent = err.message || String(err); w.querySelector('.mb').appendChild(er); } };
      w.querySelector('.mf').appendChild(e);
    });
    w.addEventListener('pointerdown', e => { if (e.target === w) close(); });
    document.body.appendChild(w); if (onOpen) onOpen(w.querySelector('.mb'), close); return w;
  }
  const GHOST = '<svg viewBox="0 0 32 36" width="28" height="32"><path d="M16 2C8.8 2 4 7.6 4 14.5V33l4-3 4 3 4-3 4 3 4-3 4 3V14.5C28 7.6 23.2 2 16 2z" fill="#fff" stroke="#000" stroke-width="1.5"/><circle cx="16" cy="11" r="2.2" fill="#000"/><rect x="14.2" y="15" width="3.6" height="11" rx="1.5" fill="#000"/></svg>';
  const INV = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor"/></svg>';
  const COG = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>';

  function chrome(active) {
    const h = document.createElement('header'); h.className = 'eod-top';
    h.innerHTML = `<a class="logo" href="community.html">E<span class="doom">O</span>D <small>EDITOR OF DOOM</small></a>
      <nav class="eod-nav"><a href="editor.html" data-p="editor">Editor</a><a href="maps.html" data-p="maps">Maps</a><a href="forums.html" data-p="forums">Forums</a><a href="account.html" data-p="account">Account</a></nav>
      <div class="grow"></div><span class="userchip" id="eodUser"></span>
      <button class="icon ghost" id="eodInfo" title="Manual">${GHOST}</button><button class="icon" id="eodInv" title="Invert colors">${INV}</button><button class="icon" id="eodSet" title="Settings">${COG}</button>`;
    document.body.prepend(h);
    h.querySelectorAll('[data-p]').forEach(a => a.classList.toggle('active', a.dataset.p === active));
    if (window.EODB && EODB.mode === 'local') { const m = document.createElement('div'); m.className = 'modebar'; m.textContent = 'LOCAL TEST MODE — accounts, maps and posts are saved on this device only until the live server is connected.'; h.after(m); }
    const f = document.createElement('footer'); f.className = 'eod-foot';
    f.innerHTML = `EOD · Editor of Doom v${esc((window.EOD_CONFIG || {}).VERSION || '')} · a <a href="../">Pulse Labs Studio</a> project<br>Unofficial fan project. Not affiliated with or endorsed by id Software, Bethesda or ZeniMax. DOOM is a trademark of id Software LLC. EOD uses its own art and is compatible with Freedoom.`;
    document.body.appendChild(f);
    $('#eodInfo').onclick = manual; $('#eodInv').onclick = () => saveS({ inverted: !S().inverted }); $('#eodSet').onclick = settings;
    refreshUser(); if (window.EODB) EODB.onAuth(refreshUser);
    if (S().theme == null) firstRun();
  }
  async function refreshUser() {
    const el = $('#eodUser'); if (!el || !window.EODB) return;
    const u = await EODB.user().catch(() => null);
    el.innerHTML = u ? `<a href="account.html">${esc(u.username)}</a>${u.role === 'admin' ? ' <span class="badge">ADMIN</span>' : ''}` : '<button class="primary" id="eodSign">Sign in</button>';
    const b = $('#eodSign'); if (b) b.onclick = () => auth();
  }
  function firstRun() {
    modal('Welcome to EOD', '<p>Pick your look. You can change it any time in Settings (the cog).</p><div class="big3"><button data-t="light">☀ Light</button><button data-t="dark">☾ Dark</button><button data-t="device">⚙ Follow device</button></div>', [], (b, close) => b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { saveS({ theme: x.dataset.t }); close(); }));
  }
  function settings() {
    const s = S(), crash = LS.get('crash', []);
    modal('Settings', `<label>Look</label><div class="row">${[['light', 'Light'], ['dark', 'Dark'], ['device', 'Follow device']].map(([k, n]) => `<button data-t="${k}" class="${(s.theme || 'device') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <label>Font</label><select id="sF"><option value="clean" ${s.font === 'clean' ? 'selected' : ''}>Clean</option><option value="mono" ${s.font === 'mono' ? 'selected' : ''}>Old-school mono</option></select>
      <label>Font size: <b id="fsv">${s.fs}</b></label><input type="range" id="sFs" min="12" max="22" value="${s.fs}">
      <label class="row"><input type="checkbox" id="sInv" ${s.inverted ? 'checked' : ''} style="width:auto"> Invert colors</label>
      <label>Support &amp; crash log</label><p class="muted">${crash.length} entr${crash.length === 1 ? 'y' : 'ies'} on this device.</p>
      <div class="row"><button id="cView">View log</button><button id="cCopy">Copy log</button><button id="cClear">Clear log</button></div>
      <p class="muted">Game controls (keyboard, mouse, controller) are set inside the game: press ▶ Play, then Controls.</p>`, [{ cancel: 1 }], b => {
      b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { saveS({ theme: x.dataset.t }); b.querySelectorAll('[data-t]').forEach(y => y.classList.toggle('on', y === x)); });
      b.querySelector('#sF').onchange = e => saveS({ font: e.target.value });
      b.querySelector('#sFs').oninput = e => { saveS({ fs: +e.target.value }); b.querySelector('#fsv').textContent = e.target.value; };
      b.querySelector('#sInv').onchange = e => saveS({ inverted: e.target.checked });
      const txt = () => 'EOD crash log\n' + navigator.userAgent + '\n\n' + LS.get('crash', []).map(x => x.t + ' v' + x.v + ' ' + (x.page || '') + '\n' + x.m).join('\n\n');
      b.querySelector('#cView').onclick = () => modal('Crash log', '<pre style="white-space:pre-wrap;font-size:12px">' + esc(txt()) + '</pre>');
      b.querySelector('#cCopy').onclick = () => navigator.clipboard.writeText(txt()).then(() => toast('Log copied'), () => toast('Copy not allowed here'));
      b.querySelector('#cClear').onclick = () => modal('Clear the crash log?', '<p>This cannot be undone.</p>', [{ ok: 1, fn: () => { LS.set('crash', []); toast('Cleared'); } }, { cancel: 1 }]);
    });
  }
  function manual() {
    modal('EOD Manual', `<p><b>EOD · Editor of Doom</b> is a free website for building Doom maps, playing them, and sharing them.</p>
    <h3>Get started</h3><ol><li><b>Sign up</b> (top right). It's free: email, password and a username.</li><li>Open the <b>Editor</b>. It's laid out like Ultimate Doom Builder: Vertices, Linedefs, Sectors and Things modes, plus drawing tools and a 3D view. The ghost "i" inside the editor has the full editing manual and a guided tutorial.</li><li>Press <b>▶ DEMO</b> to test your map, then <b>File → Publish to EOD</b> to share it.</li></ol>
    <h3>Maps</h3><p>Browse <b>Maps</b>, tap <b>▶ Play</b> to jump straight in, vote 👍/👎, and <b>Remix</b> a map to open your own copy in the editor (the original author stays credited). Your own maps keep their last 20 versions in <b>Account → My maps</b>.</p>
    <h3>Controls</h3><p><b>Phone:</b> on-screen stick and buttons (Arrange moves and resizes them). <b>Keyboard + mouse:</b> click the game to lock the mouse, WASD moves, mouse turns, left click fires, E or Space uses, Esc releases the mouse. <b>Controller:</b> plug in or pair any standard controller. Left stick moves, right stick turns, right trigger fires, A uses. Every key, mouse button and controller button can be remapped in the game's <b>Controls</b> screen and is saved to your account.</p>
    <h3>Forums</h3><p>Post in a category, reply, and use <b>Report</b> on anything that breaks the rules. Admins can pin, lock and remove posts.</p>
    <h3>Rules</h3><p>Only upload maps you made (or remixed here). No hate, no harassment, no stolen content.</p>`);
  }
  function auth(onDone, startTab = 'in') {
    modal('Sign in to EOD', `<div class="tabs"><button data-tab="in">Sign in</button><button data-tab="up">Create account</button></div>
      <div id="aUp" hidden><label>Username</label><input id="aUser" autocomplete="username" maxlength="24"></div>
      <label>Email</label><input id="aEmail" type="email" autocomplete="email">
      <label>Password</label><input id="aPass" type="password" autocomplete="current-password">
      <p class="muted" id="aNote"></p><p><a href="#" id="aForgot">Forgot password?</a></p>`,
      [{ ok: 1, fn: async (b) => {
        const up = !b.querySelector('#aUp').hidden, email = b.querySelector('#aEmail').value, pw = b.querySelector('#aPass').value;
        const u = up ? await EODB.signUp(email, pw, b.querySelector('#aUser').value) : await EODB.signIn(email, pw);
        if (u && u.pending) { toast('Check your email to confirm your account, then sign in.', 6000); return; }
        toast('Welcome, ' + (u && u.username || 'member')); refreshUser(); if (onDone) onDone(u);
      } }, { cancel: 1 }], b => {
        const tab = t => { b.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === t)); b.querySelector('#aUp').hidden = t !== 'up'; b.querySelector('#aNote').textContent = t === 'up' ? 'Free forever. Password: 8+ characters.' : ''; };
        b.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => tab(x.dataset.tab)); tab(startTab);
        b.querySelector('#aForgot').onclick = async e => { e.preventDefault(); try { await EODB.resetPassword(b.querySelector('#aEmail').value); toast('Password reset email sent'); } catch (er) { toast(er.message, 5000); } };
      });
  }
  // map preview drawing
  function drawPreview(cv, segs) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr);
    const g = cv.getContext('2d'); g.fillStyle = '#08080a'; g.fillRect(0, 0, cv.width, cv.height);
    if (!segs || !segs.length) { g.fillStyle = '#555'; g.font = 14 * dpr + 'px sans-serif'; g.textAlign = 'center'; g.fillText('empty map', cv.width / 2, cv.height / 2); return; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; segs.forEach(s => { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]); });
    const pad = 10 * dpr, z = Math.min((cv.width - pad * 2) / (x1 - x0 || 1), (cv.height - pad * 2) / (y1 - y0 || 1));
    const ox = (cv.width - (x1 - x0) * z) / 2, oy = (cv.height - (y1 - y0) * z) / 2;
    g.lineWidth = Math.max(1, dpr);
    for (const pass of [1, 0]) { g.strokeStyle = pass ? '#5a3030' : '#ff4a3a'; g.beginPath(); segs.forEach(s => { if (s[4] !== pass) return; g.moveTo(ox + (s[0] - x0) * z, cv.height - oy - (s[1] - y0) * z); g.lineTo(ox + (s[2] - x0) * z, cv.height - oy - (s[3] - y0) * z); }); g.stroke(); }
  }
  const ago = t => { const s = (Date.now() - Date.parse(t)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 2592000) return Math.floor(s / 86400) + 'd ago'; return new Date(t).toLocaleDateString(); };
  function mapCard(m, me, opts = {}) {
    const c = document.createElement('div'); c.className = 'mapcard';
    const mine = me && m.owner === me.id;
    c.innerHTML = `<canvas title="Play"></canvas><div class="body"><div class="title">${esc(m.title)} ${m.published ? '' : '<span class="badge draft">DRAFT</span>'}</div>
      <div class="meta">by <b>${esc(m.author)}</b> · made ${new Date(m.created_at).toLocaleDateString()} · updated ${ago(m.updated_at)} · ▶ ${m.plays || 0}${m.remix_of ? ` · remix of <i>${esc(m.remix_title || 'a map')}</i>${m.remix_author ? ' by ' + esc(m.remix_author) : ''}` : ''}</div>
      <div class="meta">${m.allow_remix !== false ? '♻ remix allowed' : '🔒 no remixing'} · ${m.allow_download !== false ? '⬇ WAD download allowed' : 'no WAD download'}</div>
      ${m.description ? `<div class="muted">${esc(m.description).slice(0, 180)}</div>` : ''}
      <div class="acts"><a class="btn primary" href="editor.html?play=${encodeURIComponent(m.id)}">▶ Play</a>
      <button class="vote ${m.my_vote > 0 ? 'on' : ''}" data-v="1">👍</button><b class="score">${m.score || 0}</b><button class="vote ${m.my_vote < 0 ? 'on' : ''}" data-v="-1">👎</button>
      ${mine ? `<a class="btn" href="editor.html?map=${encodeURIComponent(m.id)}">Edit</a>` : m.allow_remix !== false ? `<a class="btn" href="editor.html?remix=${encodeURIComponent(m.id)}" title="Open your own copy to build on">Remix</a>` : ''}
      ${mine || m.allow_download !== false ? `<a class="btn" href="editor.html?wad=${encodeURIComponent(m.id)}" title="Download as a Doom WAD for GZDoom">WAD</a>` : ''}
      ${mine || !me ? '' : '<button data-rep>Report</button>'}${opts.extra || ''}</div></div>`;
    c.querySelector('canvas').onclick = () => location.href = 'editor.html?play=' + encodeURIComponent(m.id);
    requestAnimationFrame(() => drawPreview(c.querySelector('canvas'), m.preview));
    c.querySelectorAll('.vote').forEach(b => b.onclick = async () => { try { const v = +b.dataset.v; const n = await EODB.vote(m.id, m.my_vote === v ? 0 : v); m.my_vote = n.my_vote; m.score = n.score; c.querySelector('.score').textContent = n.score; c.querySelectorAll('.vote').forEach(x => x.classList.toggle('on', +x.dataset.v === n.my_vote)); } catch (e) { if (/Sign in/.test(e.message)) auth(); else toast(e.message); } });
    const rep = c.querySelector('[data-rep]'); if (rep) rep.onclick = () => report('map', m.id);
    return c;
  }
  function report(kind, id) {
    modal('Report', '<label>What is wrong?</label><textarea id="rr" placeholder="Stolen map, offensive content, spam…"></textarea>', [{ ok: 1, fn: async b => { await EODB.report(kind, id, b.querySelector('#rr').value); toast('Thanks — an admin will look at it'); } }, { cancel: 1 }]);
  }
  window.EOD = { $, esc, LS, toast, modal, auth, chrome, mapCard, drawPreview, report, ago, refreshUser, logCrash };
})();
