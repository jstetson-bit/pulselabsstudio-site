# Builds forge/index.html from src/index.src.html, inserting the Doom palette (Freedoom PLAYPAL, BSD) used by EOD.
import re, os
here = os.path.dirname(os.path.abspath(__file__))
pal = re.search(r"CLAY_PAL_B64 = '([^']*)'", open(os.path.join(here, '../../EOD/engine/src/19_clay.js')).read()).group(1)
src = open(os.path.join(here, 'index.src.html')).read()
open(os.path.join(here, '../index.html'), 'w').write(src.replace('__PAL__', pal))
print('built forge/index.html')
