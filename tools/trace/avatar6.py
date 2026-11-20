"""Build the Pill + Plus avatar from reference image 6.

The avatar is a photo in a capsule, which posterises badly when traced as a whole. So it is
built from parts: the capsule and its floor bands as a gradient, then the figure (lighter than
its surroundings) and its dark visor traced on top. Replaces AvatarIcon in
registry/designs/pill-plus/icons.tsx.
"""
import glob
import os
import re
import subprocess
import tempfile
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
f = sorted(glob.glob(os.path.join(ROOT, 'references', '06-*.jpg')))[0]
arr = np.array(Image.open(f).convert('RGB').rotate(-90, expand=True))

# Capsule measured on the reference (rotated image pixels): x 1722-1795, y 161-261.
X0, Y0, PX = 1708.5, 161, 100  # the 40-unit box covers 100 px, top-aligned to the capsule
UP = 6
S = 40 / (PX * UP)

_src = open(os.path.join(os.path.dirname(__file__), 'trace.py')).read()
exec(_src[_src.index('def potrace'):_src.index('# pass 1')])

crop = arr[Y0:Y0 + PX, int(X0):int(X0) + PX]
im = Image.fromarray(crop).resize((PX * UP, PX * UP), Image.LANCZOS)
a = np.array(im).astype(int)
lum = a.mean(-1)
n = a.shape[0]
yy, xx = np.mgrid[0:n, 0:n] / UP  # reference px inside the crop
cx = 1758.5 - X0
inside = ((np.abs(xx - cx) <= 35) & (yy >= 36.5) & (yy <= 63.5)) | (
    np.hypot(xx - cx, yy - 36.5) <= 35) | (np.hypot(xx - cx, yy - 63.5) <= 35)
local = np.array(Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(8 * UP))).astype(int)
def soft(m, r=0.6):
    return np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(UP * r))) > 110


# The figure: a light-grey body with whiter highlights, standing above the table.
zone = inside & (yy > 12) & (yy < 74) & (np.abs(xx - cx) < 27)
body = soft(zone & (lum > local + 9) & (lum > 205), 0.7)
shine = soft(zone & (lum > 232), 0.45)
visor = inside & (yy > 20) & (yy < 40) & (np.abs(xx - cx) < 10) & (lum < 125)
visor = np.array(Image.fromarray((visor * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(UP * 0.7))) > 100
board = soft(inside & (yy > 72) & (yy < 81) & (np.abs(xx - cx) < 28) & (lum < 105), 0.6)

layers = []
for mask, fill in ((board, '#5a5a5a'), (body, '#e2e2e2'), (shine, '#f7f7f7'), (visor, '#2e2e2e')):
    d, tf = potrace(mask, 0.6, 30)
    if d:
        layers.append((transform(d, tf, S, 0, 0), fill))

u = lambda v: round(v * 40 / PX, 2)  # noqa: E731
cap_x, cap_w = u(1722 - X0), u(1795 - 1722)
paths = '\n'.join(f'      <Path d="{d}" fill="{fill}" />' for d, fill in layers)
comp = f'''export function AvatarIcon({{ size }}: TabIconProps) {{
  // Built from parts: a capsule with the photo's floor bands, the figure traced on top.
  return (
    <Svg width={{size}} height={{size}} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="pill-plus-avatar" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#d0d0d0" />
          <Stop offset="0.71" stopColor="#c9c9c9" />
          <Stop offset="0.725" stopColor="#b4b4b4" />
          <Stop offset="0.745" stopColor="#8e8e8e" />
          <Stop offset="0.84" stopColor="#7f7f7f" />
          <Stop offset="0.86" stopColor="#4a4a4a" />
          <Stop offset="1" stopColor="#454545" />
        </LinearGradient>
      </Defs>
      <Rect x={{{cap_x}}} y={{0}} width={{{cap_w}}} height={{40}} rx={{{round(cap_w / 2, 2)}}} fill="url(#pill-plus-avatar)" />
{paths}
    </Svg>
  );
}}
'''
p = os.path.join(ROOT, 'registry', 'designs', 'pill-plus', 'icons.tsx')
src = open(p).read()
start = src.index('export function AvatarIcon')
nxt = re.search(r'\nexport function ', src[start + 10:])
end = start + 10 + nxt.start() + 1 if nxt else len(src)
src = src[:start] + comp + ('\n' + src[end:] if nxt else '')
src = re.sub(r"import Svg, \{[^}]*\} from 'react-native-svg';",
             "import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';", src)
open(p, 'w').write(src)
print('avatar layers', [(fill, len(d)) for d, fill in layers])
