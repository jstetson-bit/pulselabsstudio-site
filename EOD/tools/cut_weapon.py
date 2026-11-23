#!/usr/bin/env python3
"""Cut a painted first-person weapon frame out of a flat background and size it for the game.

Three ways in:
  * frames that are already transparent PNGs (full-screen size): their own alpha is used as-is.
  * --plate corridor.png: the frames are painted over a scene, and the plate is the same scene with
    nothing in it. Every pixel that differs from the plate is the gun/hands. Exact cut, keeps the art.
  * no plate: the gun and hands sit on one flat color (magenta #FF00FF is best, white works).
This tool:
  1. finds the background color from the image corners,
  2. makes every pixel close to it transparent (soft edge, magenta spill removed),
  3. drops the Doom status bar area if the painting has one (bottom 16% of a 16:9 frame),
  4. crops to the gun and scales it to the game's 320-wide screen (or 640 with --hd),
  5. records where it sat in the painting (offset from the screen's bottom center),
     so the game draws it in the same spot the artist put it.

Usage:
  python3 EOD/tools/cut_weapon.py <id> <frame.png> [<frame2.png> ...] [--hd] [--bar] [--out EOD/res/art]
Writes w_<id>_1.png, w_<id>_2.png ... and prints the manifest entry to paste (or use --manifest to add it).
"""
import sys, json, argparse
from pathlib import Path
import numpy as np
from PIL import Image


def key_out(im, tol=60, soft=40):
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    h, w, _ = a.shape
    corners = np.array([a[2, 2], a[2, w - 3], a[h // 3, 2], a[h // 3, w - 3]])
    bg = np.median(corners, axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(2))
    alpha = np.clip((d - tol) / soft, 0, 1)
    # remove background spill on soft edges
    rgb = a.astype(np.float32)
    k = (1 - alpha)[..., None]
    rgb = np.clip((rgb - bg * k) / np.maximum(alpha[..., None], 1e-3), 0, 255)
    rgb = np.where(alpha[..., None] > 0, rgb, 0)
    return np.dstack([rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])


def plate_out(im, plate, tol=28, soft=30, keep_floating=False):
    from scipy import ndimage as nd
    a = np.asarray(im.convert('RGB')).astype(np.int32); b = np.asarray(plate.convert('RGB').resize(im.size)).astype(np.int32)
    d = np.abs(a - b).max(2)
    m = d > tol
    m = nd.binary_opening(nd.binary_fill_holes(nd.binary_closing(m, iterations=2)), iterations=1)
    m = nd.binary_opening(m, iterations=2)
    # the gun and arms come up from the bottom of the screen: keep only what touches the bottom edge
    # (drops background flicker, stray grate bits and loose flying shells, which the game animates itself)
    lab, n = nd.label(m)
    if keep_floating: sz = nd.sum(m, lab, range(1, n + 1)); m = np.isin(lab, 1 + np.where(sz > 800)[0])
    else: bottom = set(np.unique(lab[-3:])) - {0}; m = np.isin(lab, list(bottom))
    m = nd.binary_fill_holes(m)
    alpha = np.where(m, np.clip((d - tol) / soft + 0.6, 0, 1), 0)
    alpha = np.where(nd.binary_erosion(m, iterations=1), 1.0, alpha)
    return np.dstack([a.astype(np.uint8), (alpha * 255).astype(np.uint8)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('id'); ap.add_argument('frames', nargs='+')
    ap.add_argument('--hd', action='store_true', help='640-wide basis instead of 320')
    ap.add_argument('--bar', action='store_true', help='painting includes a status bar at the bottom: cut it off')
    ap.add_argument('--out', default=str(Path(__file__).resolve().parents[1] / 'res' / 'art'))
    ap.add_argument('--name', default=None)
    ap.add_argument('--floating', action='store_true', help='plate mode: keep loose parts too (flying shells)')
    ap.add_argument('--cls', default='repeater', help='weapon class for the editor (shotgun, repeater, launcher...)')
    ap.add_argument('--plate', default=None, help='the same scene with no gun or hands in it')
    ap.add_argument('--tol', type=int, default=28, help='plate mode: how different a pixel must be to count as gun (lower keeps dark-on-dark parts, higher drops shadows)')
    ap.add_argument('--manifest', action='store_true', help='add/replace the entry in manifest.json')
    o = ap.parse_args()
    basis = 640 if o.hd else 320
    out = Path(o.out); files = []; meta = []
    for i, f in enumerate(o.frames, 1):
        im = Image.open(f)
        W, H = im.size
        plate = Image.open(o.plate) if o.plate else None
        if o.bar:
            im = im.crop((0, 0, W, int(H * 0.84))); H = im.size[1]
            if plate: plate = plate.resize((W, round(plate.size[1] * W / plate.size[0]))).crop((0, 0, W, H))
        if im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 10:  # already cut out: use its own transparency
            rgba = np.asarray(im).copy()
        else:
            rgba = plate_out(im, plate, tol=o.tol, keep_floating=o.floating) if plate else key_out(im)
        ys, xs = np.where(rgba[..., 3] > 16)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        s = basis / W
        crop = Image.fromarray(rgba).crop((x0, y0, x1, y1))
        crop = crop.resize((max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))), Image.LANCZOS)
        name = f'w_{o.id}_{i}.png'; crop.save(out / name); files.append(name)
        # offset of the sprite's bottom-center from the screen's bottom-center, in basis pixels
        meta.append({'dx': round(((x0 + x1) / 2 - W / 2) * s), 'dy': round((H - y1) * s), 'w': crop.width, 'h': crop.height})
        print(f, '->', name, crop.size, meta[-1])
    entry = {'id': o.id, 'name': o.name or o.id, 'cls': o.cls, 'painted': True, 'frames': files, 'fire': [1] if len(files) > 1 else [],
             'pick': files[0], 'basis': basis, 'place': meta}
    if o.manifest:
        mp = out / 'manifest.json'; m = json.loads(mp.read_text())
        m['weapons'] = [w for w in m['weapons'] if w['id'] != o.id] + [entry]
        mp.write_text(json.dumps(m, indent=1))
        print('manifest updated')
    else:
        print(json.dumps(entry))


if __name__ == '__main__':
    main()
