"""Build the Orbs icons from parts: gradient circle + lettering (lighter than its
surroundings) + white elements, each traced with potrace. Writes registry/designs/orbs/icons.tsx
(keeps ChatIcon from the existing file)."""
import os, re, sys, glob, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
f = sorted(glob.glob(os.path.join(ROOT, 'references', '09-*.jpg')))[0]
img = Image.open(f).convert('RGB').rotate(-90, expand=True)
UP = 5

def potrace(mask):
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, 'm.pbm')
        Image.fromarray((~mask).astype(np.uint8) * 255).convert('1').save(p)
        subprocess.run(['potrace', p, '-s', '-o', os.path.join(t, 'o.svg'), '--turdsize', '80', '--alphamax', '1.1', '--opttolerance', '0.6', '-u', '10'], check=True)
        svg = open(os.path.join(t, 'o.svg')).read()
    m = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', svg)
    return ' '.join(re.findall(r' d="([^"]+)"', svg)), [float(v) for v in m.groups()]

def fmt(v):
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def transform(d, tf, s):
    tx, ty, sx, sy = tf
    toks = re.findall(r'[MmCcLlZz]|-?\d+(?:\.\d+)?', d); out, i, cmd = [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in 'MmCcLlZz':
            cmd = t; i += 1; out.append('Z' if t in 'Zz' else t); continue
        ar = 2 if cmd in 'MmLl' else 6; nums = [float(v) for v in toks[i:i + ar]]; i += ar
        rel = cmd.islower()
        pts = [((x * sx * s, y * sy * s) if rel else ((x * sx + tx) * s, (y * sy + ty) * s)) for x, y in zip(nums[::2], nums[1::2])]
        out.append(' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in pts))
        if cmd == 'm': cmd = 'l'
        if cmd == 'M': cmd = 'L'
    return re.sub(r'\s+', ' ', ' '.join(out)).strip()

def orb(cx, cy, r, badge):
    box = (cx - r, cy - r, cx + r, cy + r)
    im = img.crop(box).resize((2 * r * UP, 2 * r * UP), Image.LANCZOS)
    a = np.array(im).astype(int); n = a.shape[0]
    yy, xx = np.mgrid[0:n, 0:n]; inside = (xx - n / 2) ** 2 + (yy - n / 2) ** 2 < (n / 2 * 0.97) ** 2
    bx, by, br = [(v - o) * UP for v, o in zip(badge, (cx - r, cy - r))] + [0]
    bx, by = (badge[0] - (cx - r)) * UP, (badge[1] - (cy - r)) * UP
    nobadge = (xx - bx) ** 2 + (yy - by) ** 2 > (badge[2] * UP) ** 2
    lum = a.sum(-1)
    white = inside & nobadge & (a.min(-1) > 225)
    local = np.array(Image.fromarray(np.clip(lum / 3, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9 * UP))).astype(int) * 3
    letters = inside & nobadge & ~white & (lum > local + 28)
    s = 40 / n
    out = []
    for mask, fill in ((letters, 'rgba(196, 208, 255, 0.85)'), (white, '#ffffff')):
        d, tf = potrace(mask)
        out.append((transform(d, tf, s), fill))
    return out

def component(name, gid, layers):
    paths = '\n'.join(f'      <Path d="{d}" fill="{fill}" />' for d, fill in layers)
    return f'''export function {name}({{ size }}: TabIconProps) {{
  return (
    <Svg width={{size}} height={{size}} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="{gid}" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#8cc8ff" />
          <Stop offset="0.5" stopColor="#6f8cf8" />
          <Stop offset="1" stopColor="#5a50ee" />
        </LinearGradient>
      </Defs>
      <Circle cx={{20}} cy={{20}} r={{19.6}} fill="url(#{gid})" />
{paths}
    </Svg>
  );
}}
'''

p = os.path.join(ROOT, 'registry', 'designs', 'orbs', 'icons.tsx')
old = open(p).read()
chat = old[old.index('export function ChatIcon'):]
code = ('/**\n * Icons for the Orbs design, built from reference image 9: a gradient orb with its\n * lettering and white details traced on top. Pass them as `tabBarIcon`.\n */\n'
        "import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';\n"
        "import type { TabIconProps } from 'tabcn';\n\n"
        + component('ScratchIcon', 'orbs-scratch', orb(1246, 216, 121, (1327, 122, 40)))
        + '\n' + component('PlacesIcon', 'orbs-places', orb(1995, 216, 120, (2078, 122, 40)))
        + '\n' + chat)
open(p, 'w').write(code)
print('orbs icons', len(code) // 1024, 'KB')
