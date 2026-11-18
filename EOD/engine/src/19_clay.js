/* ================= DOOM PALETTE CRUSH =================
   Turns any picture (library art, recolors) into a sprite in the Doom palette (Freedoom PLAYPAL, BSD),
   with light ordered dithering, so painted art sits in the game like it was always there. */
const CLAY_PAL_B64 = 'AAAAHxcLFw8HS0tL////GxsbExMTCwsLBwcHLzcfIysPFx8HDxcATzsrRzMjPysb/7e396ur86Oj65eX54+P34eH23t703Nzy2trx2Njv1tbu1dXs09Pr0dHpz8/ozs7mzMzly8vjysriyMjgx8ffxsbdxcXcxMTaw8PZwsLXwcHWwcHUwcHTwAARwAAQwAA/+vf/+PT/9vH/9O7/8+z/8en/7+b/7uT/7OD96t776Nz55tr35Nj14tbz4NTy39Pv3tLs3NHq29Do2s/m2M7j183h1czf1Mvd08ra0cnX0MjUz8fSzcbPy8XMysTKyMP7+/v5+fn39/f29vb09PTy8vLx8fHv7+/t7e3s7Ozq6urp6enn5+fl5eXk5OTi4uLg4ODf39/d3d3b29va2trY2NjW1tbV1dXT09PR0dHQ0NDOzs7Nzc3Ly8vJycnIyMjd/9vb+9nZ99fX89XW79PU69HS58/Q5M3P4MvN3MrL2MjJ1MbH0MXFzMPEyMLCxcHv6ePt5+Hr5d/p493n4dvm39rk3tji3Nbg2tXe2NPd19Lb1dDZ1M/X0s3V0MzUz8vn4Njj3dTg2tLd18/Z1MzW0crTzsjQzMbe39jb3NXZ2tPW2NHU1c7R08zP0crNz8n//9z69tX17tDw5svr3sfm1sTh0MHcysA/////9vb/7u7/5ub/3t7/19f/z8//x8f/wAA7wAA4wAA1wAAywAAvwAAswAApwAAmwAAiwAAfwAAcwAAZwAAWwAATwAAQwAA5+f/x8f/q6v/j4//c3P/U1P/Nzf/Gxv/AAD/AADjAADLAACzAACbAACDAABrAABT/////+vb/9e7/8eb/7N7/6Nb/487/38b83MX628P32cP118Ly1cHw08At0cAr0MA///////X//+z//+P//9r//9H//8j//8Apz8AnzcAky8AhyMATzsnQy8bNyMTLxsLAABTAABHAAA7AAAvAAAjAAAXAAALAAAA/59D/+dL/3v//wD/zwDPnwCbbwBrp2tr';
function clayPal() {
  if (clayPal.p) return clayPal.p;
  const b = atob(CLAY_PAL_B64), pal = []; for (let i = 0; i < 256; i++) pal.push([b.charCodeAt(i * 3), b.charCodeAt(i * 3 + 1), b.charCodeAt(i * 3 + 2)]);
  const lut = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let bl = 0; bl < 32; bl++) {
    const R = r * 8 + 4, G_ = g * 8 + 4, B = bl * 8 + 4; let best = 0, bd = 1e9;
    for (let i = 0; i < 256; i++) { if (i === 247) continue; const p = pal[i], dr = R - p[0], dg = G_ - p[1], db = B - p[2], dd = dr * dr * 3 + dg * dg * 4 + db * db * 2; if (dd < bd) { bd = dd; best = i; } }
    lut[(r << 10) | (g << 5) | bl] = best;
  }
  clayPal.p = { pal, lut }; return clayPal.p;
}
function hexF(h) { const [r, g, b] = hexRGB(h); return [r / 255, g / 255, b / 255]; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// crush into the Doom palette with light ordered dither; returns a sprite (texObj)
function clayToSprite(img, ox, oy, opt = {}) {
  const { pal, lut } = clayPal(), w = img.w, h = img.h, px = new Uint32Array(w * h), d = img.rgba, dith = opt.dither != null ? opt.dither : 10, con = opt.contrast || 1.12;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!d[i + 3]) continue;
    const t = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * dith;
    const f = v => Math.max(0, Math.min(255, (v - 128) * con + 128 + t));
    const r = f(d[i]), g = f(d[i + 1]), b = f(d[i + 2]); const p = pal[lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)]];
    px[y * w + x] = rgb(p[0], p[1], p[2]);
  }
  // one-pixel dark rim where sprite meets nothing (Doom's photos had a dark edge from the backdrop)
  if (opt.rim !== false) { const src = px.slice(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (!src[k]) continue; const e = (x === 0 || !src[k - 1]) || (x === w - 1 || !src[k + 1]) || (y === 0 || !src[k - w]) || (y === h - 1 || !src[k + w]); if (e) { const c = src[k]; px[k] = (255 << 24) | ((((c >> 16) & 255) * .6) << 16) | ((((c >> 8) & 255) * .6) << 8) | ((c & 255) * .6); } } }
  const o = texObj(w, h, px); o.ox = ox; o.oy = oy; return o;
}
function cropSprite(img) { // trim empty rows/cols, keep origin
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1; const d = img.rgba;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (d[(y * img.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { img, x0: 0, y0: 0 };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) out.set(d.subarray(((y + y0) * img.w + x0) * 4, ((y + y0) * img.w + x0 + w) * 4), y * w * 4);
  return { img: { w, h, rgba: out }, x0, y0 };
}
