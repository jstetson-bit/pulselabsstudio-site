"""Cut a returned marine face sheet (EOD-Marine-Face-Sheet V001) into res/art/faces/<key>.png.
usage: python3 cut_faces.py page1.png 1      (page 1: straight/left/right/ouch/grin for L0-L2)
       python3 cut_faces.py page2.png 2      (page 2: L3, L4, then rampage_0 rampage_4 god dead)
The sheet is a 5x3 grid of portraits on flat magenta (#FF00FF). Cells are found from the magenta
gaps (falls back to an even 5x3 split), the magenta is keyed out to transparency, and each face
is saved at 256 px tall. faces.json lists what exists; the game picks them up on the next load."""
import json, os, sys
from PIL import Image
import numpy as np

COLS = ['straight', 'left', 'right', 'ouch', 'grin']
PAGES = {1: [[f'{c}_{l}' for c in COLS] for l in (0, 1, 2)],
         2: [[f'{c}_{l}' for c in COLS] for l in (3, 4)] + [['rampage_0', 'rampage_4', 'god', 'dead', None]]}
OUT = os.path.join(os.path.dirname(__file__), '..', 'res', 'art', 'faces')

def magenta(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 180) & (b > 180) & (g < 110) & (abs(r - b) < 90)

def bands(mask_line, n):
    """split a 1-D 'is background' profile into n content runs; None if it doesn't find n"""
    runs, on, s = [], False, 0
    for i, v in enumerate(mask_line):
        if not v and not on: on, s = True, i
        if v and on: on = False; runs.append((s, i))
    if on: runs.append((s, len(mask_line)))
    runs = [r for r in runs if r[1] - r[0] > len(mask_line) * 0.04]
    return runs if len(runs) == n else None

def main(path, page):
    im = Image.open(path).convert('RGB'); a = np.asarray(im); m = magenta(a); H, W = m.shape
    cols = bands(m.mean(0) > 0.985, 5) or [(W * i // 5, W * (i + 1) // 5) for i in range(5)]
    rows = bands(m.mean(1) > 0.985, 3) or [(H * i // 3, H * (i + 1) // 3) for i in range(3)]
    os.makedirs(OUT, exist_ok=True); made = []
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            key = PAGES[page][r][c]
            if not key: continue
            cell = a[y0:y1, x0:x1]; mk = magenta(cell)
            ys, xs = np.where(~mk)
            if len(xs) < 50: print('empty cell', key); continue
            pad = 6; cy0, cy1, cx0, cx1 = max(0, ys.min() - pad), ys.max() + pad, max(0, xs.min() - pad), xs.max() + pad
            rgba = np.dstack([cell, np.where(mk, 0, 255).astype(np.uint8)])[cy0:cy1, cx0:cx1]
            # pull magenta fringe out of the edge pixels
            edge = rgba[..., 3] > 0; rr = rgba[..., 0].astype(int); bb = rgba[..., 2].astype(int); gg = rgba[..., 1].astype(int)
            fringe = edge & (rr > gg + 60) & (bb > gg + 60)
            rgba[fringe, 0] = gg[fringe] + 20; rgba[fringe, 2] = gg[fringe] + 20
            out = Image.fromarray(rgba, 'RGBA'); h = 256; out = out.resize((max(1, round(out.width * h / out.height)), h), Image.LANCZOS)
            out.save(os.path.join(OUT, key + '.png')); made.append(key)
    jp = os.path.join(OUT, 'faces.json'); have = set(json.load(open(jp))['faces']) if os.path.exists(jp) else set()
    have |= set(made); json.dump({'faces': sorted(have), 'sheet': 'V001'}, open(jp, 'w'), indent=1)
    print('cut', len(made), 'faces:', ', '.join(made))

if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]))
