#!/usr/bin/env python3
"""Builds ../editor.html (the EOD editor + game) and ../classic.html (EOD Classic) from src/. Run: python3 engine/build.py"""
import glob, os, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
shell = open(os.path.join(src, 'shell.html'), encoding='utf-8').read()
css = open(os.path.join(src, 'style.css'), encoding='utf-8').read()
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(src, '[0-9][0-9]_*.js'))))
if '</script' in js.lower():
    sys.exit('JS contains a literal </script> - break it up')
out = shell.replace('/*CSS*/', css).replace('/*JS*/', js)
open(os.path.join(root, '..', 'editor.html'), 'w', encoding='utf-8').write(out)
print('built editor.html', len(out), 'chars')
# EOD Classic: the same build with the compatibility mode switched on (its own page, its own storage)
classic = out.replace('<title>Editor · EOD · Editor of Doom</title>', '<title>EOD Classic · the compatibility editor</title>', 1)
classic = classic.replace('<script', '<script>window.EOD_CLASSIC=1;</' + 'script>\n<script', 1)
open(os.path.join(root, '..', 'classic.html'), 'w', encoding='utf-8').write(classic)
print('built classic.html', len(classic), 'chars')
