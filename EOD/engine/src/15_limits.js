/* ================= VANILLA LIMITS CHECK (switchable) =================
   Original Doom / Chocolate Doom crash past fixed limits: 128 visplanes, 256 drawsegs, 128 sprites in view.
   EOD's own engine has none of these limits; this is only for people taking an exported WAD to vanilla.
   Counts are estimates (EOD renders differently), tuned to err on the side of warning. */
const VLIM = { visplanes: 128, drawsegs: 256, sprites: 128 };
let limWarnT = 0;
function limitsOn() { return !!S.limits; }
function drawLimitsHud(g, W, H, u) {
  if (!limitsOn() || S.limHud === false) return;
  const over = LIM.visplanes > VLIM.visplanes || LIM.segs > VLIM.drawsegs || LIM.sprites > VLIM.sprites;
  const txt = `VISPLANES ~${LIM.visplanes}/${VLIM.visplanes}  DRAWSEGS ${LIM.segs}/${VLIM.drawsegs}  SPRITES ${LIM.sprites}/${VLIM.sprites}`;
  g.font = `bold ${6 * u}px monospace`; g.textAlign = 'right';
  g.fillStyle = '#000'; g.fillText(txt, W - 3 * u, 30 * u + u);
  g.fillStyle = over ? '#ff3030' : '#7fff7f'; g.fillText(txt, W - 4 * u, 30 * u);
  g.textAlign = 'left';
  if (over && S.limWarn !== false && performance.now() - limWarnT > 4000) {
    limWarnT = performance.now();
    const what = LIM.visplanes > VLIM.visplanes ? 'visplane overflow' : LIM.segs > VLIM.drawsegs ? 'too many drawsegs' : 'too many sprites';
    toast('Original Doom would crash here: ' + what + '. EOD and GZDoom are fine.', 3500);
  }
}
async function scanVanillaLimits() {
  if (!M.sec.length) return toast('Nothing to scan yet');
  const secs = M.sec.map(s => Object.assign({}, s, { base: s.li })), sc = buildScene(secs);
  const pts = [];
  M.sec.forEach((s, si) => { const li = sectorLines(si)[0]; if (li === undefined) return; const L = M.l[li]; const p = sampleSide(L, sideSec(L.s1) === si, 32); if (sectorAt(p.x, p.y) === si) pts.push({ x: p.x, y: p.y, sec: si }); });
  M.t.forEach(t => { const si = sectorAt(t.x, t.y); if (si >= 0 && THINGS[t.type] && ['player', 'monster'].includes(THINGS[t.type].cat)) pts.push({ x: t.x, y: t.y, sec: si }); });
  while (pts.length > 500) pts.splice(Math.floor(Math.random() * pts.length), 1);
  const keepW = R.W, keepH = R.H, results = []; rSetup(320, 200); LIM.on = true;
  const sprites = M.t.filter(t => THINGS[t.type] && THINGS[t.type].cat !== 'player').map(t => ({ x: t.x, y: t.y, z: 0, img: SPR.barrel }));
  toast('Scanning ' + pts.length + ' spots × 8 directions…', 3000);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], s = secs[p.sec];
    for (let a = 0; a < 8; a++) {
      const cam = { x: p.x, y: p.y, z: s.fh + 41, a: a * Math.PI / 4, sec: p.sec };
      render3D(cam, sc, sprites);
      results.push({ x: p.x, y: p.y, a: a * 45, vp: LIM.visplanes, ds: LIM.segs, sp: LIM.sprites });
    }
    if (i % 20 === 19) await new Promise(r => setTimeout(r, 0));
  }
  LIM.on = false; if (keepW) rSetup(keepW, keepH);
  results.sort((a, b) => (b.vp / VLIM.visplanes + b.ds / VLIM.drawsegs) - (a.vp / VLIM.visplanes + a.ds / VLIM.drawsegs));
  const worst = results.slice(0, 12), bad = results.filter(r => r.vp > VLIM.visplanes || r.ds > VLIM.drawsegs || r.sp > VLIM.sprites).length;
  modal('Vanilla limits scan', `<p>${bad ? `<b style="color:#ff5050">${bad} view(s) would likely crash original Doom.</b>` : '<b style="color:#4f4">No views over the vanilla limits found.</b>'} Checked ${results.length} views.</p>
    <p class="hint">Estimates. EOD, GZDoom, PrBoom+ and other "limit-removing" ports have none of these limits. Tap a spot to stand there in 3D Visual mode with the counters on.</p>
    <div class="list">${worst.map((r, i) => `<button data-i="${i}"><span class="dot" style="background:${r.vp > VLIM.visplanes || r.ds > VLIM.drawsegs ? '#e33' : r.vp > VLIM.visplanes * 0.75 ? '#fb0' : '#3c3'}"></span>Visplanes ~${r.vp} · drawsegs ${r.ds} · sprites ${r.sp} · at ${Math.round(r.x)}, ${Math.round(r.y)} facing ${r.a}°</button>`).join('')}</div>`,
    [{ cancel: 1 }], b => b.querySelectorAll('[data-i]').forEach(x => x.onclick = () => { const r = worst[+x.dataset.i]; closeModal(); initGame('visual', { x: r.x, y: r.y, a: r.a }); }));
}
