/* ================= MY TEXTURES: members add their own wall / floor art (saved with the map) =================
   M.res = { tex: { NAME: {src:dataURL, w, h} }, flat: { NAME: {src, w:64, h:64} } } — stored in the map,
   loaded as the top "custom" pack, exported into WADs as PNG lumps (GZDoom TX_START), and only published
   to the library when the author ticks the permission box. */
const CTEX = { sig: '', cache: new Map(), busy: null };
function customCount() { const r = M.res; return r ? Object.keys(r.tex || {}).length + Object.keys(r.flat || {}).length : 0; }
function resSig() { const r = M.res; if (!r) return ''; return ['tex', 'flat'].map(k => Object.entries(r[k] || {}).map(([n, v]) => n + ':' + v.w + 'x' + v.h + ':' + v.src.length).join(',')).join('|'); }
async function decodeSrc(src) {
  if (CTEX.cache.has(src)) return CTEX.cache.get(src);
  const blob = await (await fetch(src)).blob(); const t = await imageToTex(await blob.arrayBuffer()); CTEX.cache.set(src, t); return t;
}
function syncCustomTex(force) {
  const sig = resSig(); if (!force && sig === CTEX.sig) return; CTEX.sig = sig;
  if (!sig) { if (RES.packs.some(p => p.kind === 'custom')) setPack('custom', null); return; }
  const r = M.res;
  CTEX.busy = (async () => {
    const p = { name: 'My textures', kind: 'custom', pal: null, tex: new Map(), patches: new Map(), flats: new Map(), sprites: new Map(), sounds: new Map(), imgTex: new Map(), imgFlat: new Map(), imgSpr: new Map() };
    for (const [n, v] of Object.entries(r.tex || {})) { try { p.imgTex.set(n, await decodeSrc(v.src)); } catch (e) { logCrash('custom tex ' + n + ': ' + e); } }
    for (const [n, v] of Object.entries(r.flat || {})) { try { p.imgFlat.set(n, await decodeSrc(v.src)); } catch (e) { logCrash('custom flat ' + n + ': ' + e); } }
    if (resSig() === sig) setPack('custom', p);
    if (window.edRedraw) edRedraw();
  })();
}
function resBytes() { const r = M.res; if (!r) return 0; let n = 0; ['tex', 'flat'].forEach(k => Object.values(r[k] || {}).forEach(v => n += v.src.length)); return n; }
function uniqueTexName(base, kind) {
  base = (base || 'MYTEX').toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 8) || 'MYTEX';
  const taken = n => (M.res && ((M.res.tex || {})[n] || (M.res.flat || {})[n]));
  if (!taken(base)) return base;
  for (let i = 1; i < 999; i++) { const s = String(i), n = base.slice(0, 8 - s.length) + s; if (!taken(n)) return n; }
  return base;
}
// resample an image to w×h; sharp = nearest-neighbor (pixel art), else smooth
function resampleToDataURL(img, w, h, sharp) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.imageSmoothingEnabled = !sharp; if (!sharp) g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png');
}
function addMyTexture(kind, onDone, replaceName) {
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/png,image/jpeg,image/webp,image/gif';
  fi.onchange = async () => {
    const f = fi.files[0]; if (!f) return;
    let bmp; try { bmp = await createImageBitmap(f); } catch (e) { return toast('That picture could not be read'); }
    const stem = f.name.replace(/\.[^.]+$/, '');
    const pow = [32, 64, 128, 256, 512];
    const near = v => pow.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, 64);
    const st = { name: replaceName || uniqueTexName(stem, kind), use: kind || 'wall', w: Math.min(1024, near(bmp.width)), h: Math.min(1024, bmp.height <= 1024 ? Math.round(bmp.height * near(bmp.width) / bmp.width) : 1024), lock: true, sharp: bmp.width <= 256 };
    const prev = () => {
      const w = st.use === 'flat' ? 64 : st.w, h = st.use === 'flat' ? 64 : st.h;
      const c = $('#mtPrev'); if (!c) return; const g = c.getContext('2d'); c.width = 192; c.height = 192; g.fillStyle = '#111'; g.fillRect(0, 0, 192, 192);
      const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = !st.sharp; tg.drawImage(bmp, 0, 0, w, h);
      g.imageSmoothingEnabled = false; const s = Math.min(192 / w, 192 / h, 4); for (let yy = 0; yy * h * s < 192; yy++) for (let xx = 0; xx * w * s < 192; xx++) g.drawImage(tmp, xx * w * s, yy * h * s, w * s, h * s);
      $('#mtInfo').textContent = `${w} × ${h} pixels${st.use === 'flat' ? ' (floors and ceilings are always 64 × 64)' : ''} · shown tiled, the way it repeats on a wall`;
    };
    modal(replaceName ? 'Replace texture ' + replaceName : 'Add my own texture', `
      <canvas id="mtPrev" width="192" height="192" style="width:192px;height:192px;image-rendering:pixelated;border:1px solid var(--line);border-radius:8px;display:block;margin:0 auto"></canvas>
      <p class="hint" id="mtInfo" style="text-align:center"></p>
      <div class="f"><label>Name (8 letters/numbers)</label><input id="mtName" maxlength="8" value="${esc(st.name)}" ${replaceName ? 'disabled' : ''} autocapitalize="characters"></div>
      <div class="f"><label>Use it for</label><select id="mtUse"><option value="wall" ${st.use === 'wall' ? 'selected' : ''}>Walls</option><option value="flat" ${st.use === 'flat' ? 'selected' : ''}>Floors & ceilings</option><option value="both">Both</option></select></div>
      <div class="f"><label>Width (pixels = map units)</label><input id="mtW" type="number" min="8" max="1024" value="${st.w}"></div>
      <div class="f"><label>Height</label><input id="mtH" type="number" min="8" max="1024" value="${st.h}"></div>
      <div class="row">${[32, 64, 128, 256].map(v => `<button data-w="${v}">${v} wide</button>`).join('')}</div>
      <label class="chk"><input type="checkbox" id="mtLock" checked>Keep the picture's shape when changing width or height</label>
      <label class="chk"><input type="checkbox" id="mtSharp" ${st.sharp ? 'checked' : ''}>Sharp pixels (old-school look) instead of smooth</label>
      <p class="hint">Original picture: ${bmp.width} × ${bmp.height}. Doom walls are usually 64 or 128 wide; 1 pixel = 1 map unit, so a 128-tall texture fills a 128-tall wall once.</p>`,
      [{ ok: 1, fn: () => {
        const name = replaceName || uniqueTexName($('#mtName').value, st.use);
        M.res = M.res || { tex: {}, flat: {} }; M.res.tex = M.res.tex || {}; M.res.flat = M.res.flat || {};
        const before = resBytes();
        pushUndo();
        if (st.use === 'wall' || st.use === 'both') { const w = clamp(st.w | 0, 8, 1024), h = clamp(st.h | 0, 8, 1024); M.res.tex[name] = { src: resampleToDataURL(bmp, w, h, st.sharp), w, h }; } else if (replaceName) delete M.res.tex[name];
        if (st.use === 'flat' || st.use === 'both') M.res.flat[name] = { src: resampleToDataURL(bmp, 64, 64, st.sharp), w: 64, h: 64 }; else if (replaceName) delete M.res.flat[name];
        const kb = Math.round(resBytes() / 1024);
        mapChanged(); toast('Added ' + name + ' (' + kb + ' KB of custom art in this map)');
        if (resBytes() > 2.5e6 && before <= 2.5e6) toast('Heads up: over 2.5 MB of custom art. Big art slows saving; smaller sizes (64-128) work best.', 6000);
        if (onDone) setTimeout(() => onDone(name), 50);
      } }, { cancel: 1 }], b => {
        const W = b.querySelector('#mtW'), H = b.querySelector('#mtH'), ratio = bmp.height / bmp.width;
        W.oninput = () => { st.w = +W.value; if (st.lock) { st.h = Math.max(8, Math.round(st.w * ratio)); H.value = st.h; } prev(); };
        H.oninput = () => { st.h = +H.value; if (st.lock) { st.w = Math.max(8, Math.round(st.h / ratio)); W.value = st.w; } prev(); };
        b.querySelector('#mtLock').onchange = e => st.lock = e.target.checked;
        b.querySelector('#mtSharp').onchange = e => { st.sharp = e.target.checked; prev(); };
        b.querySelector('#mtUse').onchange = e => { st.use = e.target.value; prev(); };
        b.querySelectorAll('[data-w]').forEach(x => x.onclick = () => { W.value = x.dataset.w; W.oninput(); });
        prev();
      });
  };
  fi.click();
}
function openMyTextures() {
  const r = M.res || {}, list = [...Object.entries(r.tex || {}).map(([n, v]) => [n, v, 'wall']), ...Object.entries(r.flat || {}).filter(([n]) => !(r.tex || {})[n]).map(([n, v]) => [n, v, 'flat'])];
  const used = n => M.sd.some(d => d.up === n || d.mid === n || d.lo === n) || M.sec.some(s => s.ft === n || s.ct === n);
  modal('My textures · ' + customCount(), `<div class="row"><button id="mtAdd" class="demo">＋ Add my own texture</button><button id="mtGrab">Keep this map's imported art</button></div>
    <p class="hint">Your textures are saved inside this map (${Math.round(resBytes() / 1024)} KB). They go into exported WADs, and into the library only if you tick the permission box when publishing.</p>
    <div class="grid">${list.map(([n, v, k]) => `<div class="tile"><img src="${v.src}" style="width:64px;height:64px;image-rendering:pixelated;object-fit:contain">${esc(n)}<br>${v.w}×${v.h} ${(r.tex || {})[n] && (r.flat || {})[n] ? 'wall+floor' : k}${used(n) ? ' · in use' : ''}<div class="row" style="justify-content:center"><button data-rep="${n}">Replace</button><button data-ren="${n}">Rename</button><button data-del="${n}">Delete</button></div></div>`).join('') || '<p class="hint">None yet.</p>'}</div>`, [{ cancel: 1 }], b => {
    b.querySelector('#mtAdd').onclick = () => { closeModal(); addMyTexture('wall', () => openMyTextures()); };
    b.querySelector('#mtGrab').onclick = () => { closeModal(); keepImportedArt(true); };
    b.querySelectorAll('[data-rep]').forEach(x => x.onclick = () => { closeModal(); addMyTexture((r.tex || {})[x.dataset.rep] ? 'wall' : 'flat', () => openMyTextures(), x.dataset.rep); });
    b.querySelectorAll('[data-ren]').forEach(x => x.onclick = () => { const old = x.dataset.ren; modal('Rename ' + old, `<div class="f"><label>New name</label><input id="rnN" maxlength="8" value="${esc(old)}" autocapitalize="characters"></div><label class="chk"><input type="checkbox" id="rnAll" checked>Also update every wall and floor that uses it</label>`, [{ ok: 1, fn: bd => { const nn = uniqueTexName(bd.querySelector('#rnN').value); if (nn === old) return; pushUndo(); for (const k of ['tex', 'flat']) if (M.res[k] && M.res[k][old]) { M.res[k][nn] = M.res[k][old]; delete M.res[k][old]; } if (bd.querySelector('#rnAll').checked) { M.sd.forEach(d => ['up', 'mid', 'lo'].forEach(q => { if (d[q] === old) d[q] = nn; })); M.sec.forEach(s => { if (s.ft === old) s.ft = nn; if (s.ct === old) s.ct = nn; }); } mapChanged(); setTimeout(openMyTextures, 50); } }, { cancel: 1 }]); });
    b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { const n = x.dataset.del; modal('Delete texture ' + n + '?', `<p>${used(n) ? 'It is used in this map; those surfaces fall back to stand-in art. ' : ''}One Undo brings it back.</p>`, [{ ok: 1, fn: () => { pushUndo(); for (const k of ['tex', 'flat']) if (M.res[k]) delete M.res[k][n]; mapChanged(); setTimeout(openMyTextures, 50); } }, { cancel: 1 }]); });
  });
}
// copy the imported map's own art (that this map actually uses) into M.res so it survives saving
function keepImportedArt(loud) {
  const mp = RES.packs.find(p => p.kind === 'map'); if (!mp) { if (loud) toast('No imported art to keep. Open a map that brings its own textures first.', 4000); return 0; }
  const walls = new Set(), flats = new Set();
  M.sd.forEach(d => [d.up, d.mid, d.lo].forEach(n => n && n !== '-' && walls.add(n))); M.sec.forEach(s => { flats.add(s.ft); flats.add(s.ct); });
  M.res = M.res || { tex: {}, flat: {} }; M.res.tex = M.res.tex || {}; M.res.flat = M.res.flat || {};
  let n = 0;
  const grab = (name, flat) => { const t = getTex(name, flat); if (!t) return; const c = document.createElement('canvas'); c.width = t.w; c.height = t.h; const id = new ImageData(t.w, t.h); new Uint32Array(id.data.buffer).set(t.px); c.getContext('2d').putImageData(id, 0, 0); (flat ? M.res.flat : M.res.tex)[name] = { src: c.toDataURL('image/png'), w: t.w, h: t.h }; n++; };
  const pal = !!resPal();
  walls.forEach(w => { if ((mp.imgTex.has(w) || (pal && mp.tex.has(w))) && !M.res.tex[w]) grab(w, false); });
  flats.forEach(f => { if ((mp.imgFlat.has(f) || (pal && mp.flats.has(f))) && !M.res.flat[f]) grab(f, true); });
  if (!pal && (mp.tex.size || mp.flats.size) && loud) toast('Some art needs the Freedoom palette; turn on the Freedoom art pack, then try again.', 5000);
  if (n) { mapChanged(); } if (loud) toast(n ? 'Kept ' + n + ' imported texture(s) inside this map (' + Math.round(resBytes() / 1024) + ' KB)' : 'This map uses no art from its own file', 4000);
  return n;
}
/* ---------- About + Check for updates ---------- */
function openAbout() {
  modal('About EOD · Editor of Doom', `<p><b>Version ${VERSION}</b> (vc${VC})</p><p>A Pulse Labs Studio project. Editor, engine, site and in-house art written from scratch.</p><p>Optional Freedoom art pack © contributors to the Freedoom project, BSD license (<a href="res/FREEDOOM-COPYING.txt" target="_blank">license</a>, <a href="res/FREEDOOM-CREDITS.txt" target="_blank">credits</a>).</p><p class="hint">Unofficial fan project. Not affiliated with id Software, Bethesda or ZeniMax. DOOM is a trademark of id Software LLC.</p>`, [{ label: 'Check for updates', fn: () => { setTimeout(checkUpdates, 50); } }, { cancel: 1 }]);
}
async function checkUpdates() {
  try {
    const t = await (await fetch(location.pathname + '?v=' + Date.now(), { cache: 'no-store' })).text();
    const m = t.match(/const VERSION = '([^']+)'/); if (!m) throw new Error('version not found');
    const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
    if (cmp(m[1], VERSION) > 0) modal('Update available', `<p>EOD ${esc(m[1])} is out (you have ${VERSION}). Your map is autosaved, so reloading is safe.</p>`, [{ label: 'Update now', cls: 'demo', fn: () => location.reload() }, { cancel: 1 }]);
    else toast('You have the newest EOD (' + VERSION + ')');
  } catch (e) { toast('Could not check for updates right now'); }
}
