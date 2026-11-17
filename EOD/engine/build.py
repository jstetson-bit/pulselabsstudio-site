#!/usr/bin/env python3
"""Builds ../editor.html (the EOD editor + game) from src/. Run: python3 engine/build.py"""
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
