/* ================= CONVEYORS + VOODOO DOLLS =================
   Conveyors (Boom line actions, work in GZDoom too):
     251 scroll the tagged floors' texture, 252 carry things on the tagged floors, 253 both.
     Direction and speed come from the line itself: its length / 32 = units per tic.
   Voodoo dolls (classic Doom trick): a map with more than one Player 1 Start spawns you at the LAST one;
   every other Player 1 Start becomes a doll. Anything that happens to a doll happens to you: walk-over lines
   it crosses fire as if you crossed them, items it touches are yours, damage it takes is yours, and if it is
   crushed you die. Mappers ride dolls on conveyors to run scripted events with no scripting language. */
function playerStarts(map) { return (map || M).t.filter(t => t.type === 1); }
function realStart(map) { const s = playerStarts(map); return s.length ? s[s.length - 1] : null; }
function voodooInit() {
  G.dolls = [];
  // conveyors
  for (const l of G.sc.lines) {
    if (![251, 252, 253].includes(l.sp) || !l.tag) continue;
    const vx = l.ex / 32, vy = l.ey / 32;
    G.secs.forEach((s, i) => { if (s.tag !== l.tag) return; if (l.sp !== 251) { s.cvx = (s.cvx || 0) + vx; s.cvy = (s.cvy || 0) + vy; } if (l.sp !== 252) { s.sdx = (s.sdx || 0) + vx; s.sdy = (s.sdy || 0) + vy; } });
  }
  G.secs.forEach(s => { s.sx = 0; s.sy = 0; if (s.flow) { s.sdx = s.flow[0]; s.sdy = s.flow[1]; } });
  if (G.mode !== 'play') return;
  const starts = playerStarts(G.map || M), real = G.start;
  for (const t of starts) {
    if (real && t.x === real.x && t.y === real.y) continue;
    const sec = gSectorAt(t.x, t.y); if (sec < 0) continue;
    G.dolls.push({ x: t.x, y: t.y, z: G.secs[sec].fh, a: t.a * Math.PI / 180, r: 16, h: 56, sec, vx: 0, vy: 0, alive: true });
  }
  if (G.dolls.length && S.dollMsg !== false) msg(G.dolls.length + ' voodoo doll' + (G.dolls.length > 1 ? 's' : '') + ' in this map');
}
function onConveyor(ent) { const s = ent.sec >= 0 ? G.secs[ent.sec] : null; return s && (s.cvx || s.cvy) && ent.z <= s.fh + 1 ? s : null; }
function tickConveyors() {
  for (const s of G.secs) if (s.sdx || s.sdy) { s.sx += s.sdx; s.sy += s.sdy; }
  for (const e of G.ents) { if (!e.alive || e.d.float) continue; const s = onConveyor(e); if (s) { tryMove(e, s.cvx, s.cvy, false); const ns = gSectorAt(e.x, e.y); if (ns >= 0) e.sec = ns; } }
}
function tickDolls() {
  if (!G.dolls || !G.dolls.length) return;
  for (const d of G.dolls) {
    if (!d.alive) continue;
    const ox = d.x, oy = d.y, s0 = G.secs[d.sec];
    // conveyors push; the push carries on (with friction) across short gaps such as door tracks
    if (s0 && (s0.cvx || s0.cvy) && d.z <= s0.fh + 1) { d.vx = s0.cvx; d.vy = s0.cvy; } else { d.vx *= 0.92; d.vy *= 0.92; if (Math.abs(d.vx) < 0.05 && Math.abs(d.vy) < 0.05) d.vx = d.vy = 0; }
    if (d.vx || d.vy) { if (!tryMove(d, d.vx, d.vy, true)) { d.vx = d.vy = 0; } }
    const ns = gSectorAt(d.x, d.y); if (ns < 0) { d.x = ox; d.y = oy; } else d.sec = ns;
    const S0 = G.secs[d.sec];
    // walk-over lines fire as if the player crossed them
    if (ox !== d.x || oy !== d.y) {
      const crossed = []; gridEach(ox, oy, d.x, d.y, l => { if (l.sp && lineCross(ox, oy, d.x, d.y, l)) crossed.push(l); });
      crossed.forEach(l => { G.actor = d; const did = activate(l, 'walk', lineSide2(l, ox, oy) < 0); G.actor = null; if (did && S.dollMsg !== false) msg('Voodoo doll crossed: ' + specialName(l.sp)); });
    }
    // gravity
    if (d.z > S0.fh) { d.z = Math.max(S0.fh, d.z - 8); } else d.z = S0.fh;
    // items it touches are yours
    tickPickups(d);
    // floor damage and crushing hurt you
    if (d.z <= S0.fh + 1) { const dmg = { 5: 10, 7: 5, 16: 20, 4: 20, 11: 20 }[S0.sp]; if (dmg && G.tic % 32 === 0) { damagePlayer(dmg); if (S.dollMsg !== false) msg('Your voodoo doll is being hurt'); } }
    if (S0.ch - S0.fh < d.h - 2 && G.tic % 4 === 0) { damagePlayer(10); if (G.p.hp <= 0 && S.dollMsg !== false) msg('Your voodoo doll was crushed'); }
  }
}
function specialName(sp) { const e = LINE_SPECIALS.find(x => x[0] === sp); return e ? e[1] : 'action ' + sp; }
function dollSprites(out) {
  if (!G.dolls) return;
  for (const d of G.dolls) {
    if (!d.alive) continue;
    let img = null, flip = false;
    if (RES.packs.length && resPal()) { const r = getSpriteFrame('PLAY', 'A', spriteRot(d.a, d.x, d.y, G.p.x, G.p.y)); if (r) { img = r.img; flip = r.flip; } }
    if (!img) img = SPR.doll || (SPR.doll = mkSprite('doll', 28, 56, (c, w, h) => { c.fillStyle = '#2e7d32'; c.fillRect(8, 14, 12, 24); c.fillStyle = '#c99a7a'; c.fillRect(10, 4, 8, 10); c.fillStyle = '#1b5e20'; c.fillRect(8, 38, 5, 18); c.fillRect(15, 38, 5, 18); c.fillStyle = '#2e7d32'; c.fillRect(3, 16, 5, 16); c.fillRect(20, 16, 5, 16); c.fillStyle = '#c4141c'; c.fillRect(6, 0, 16, 3); }));
    out.push({ x: d.x, y: d.y, z: d.z, img, flip, light: G.secs[d.sec] ? G.secs[d.sec].li : 160 });
  }
}
