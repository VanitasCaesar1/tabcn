"""Build the Orbs icons from parts: gradient circle + lettering + white elements.
The white elements are traced from the reference. The lettering is too blurred in the JPEG
to trace cleanly, so it is rebuilt: the word is set in Bowlby One and warped onto the orb the
way the reference bends it (letters fan out from a point above the orb, squeeze toward the
edges, and their feet follow the orb's curve), then traced. Writes registry/designs/orbs/icons.tsx
(keeps ChatIcon from the existing file)."""
import os, re, sys, glob, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
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


# Bowlby One (SIL Open Font License, see fonts/OFL.txt): heavy and tight like the reference's lettering.
LETTERING = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'BowlbyOne-Regular.ttf')


def flat_text(word, track=-0.02, font=None):
    f = ImageFont.truetype(font or LETTERING, 400)
    bbs = [f.getbbox(ch) for ch in word]
    widths = [b[2] - b[0] for b in bbs]
    W = int(sum(widths) + track * 400 * (len(word) - 1)) + 80
    flat = Image.new('L', (W, 700), 0)
    d = ImageDraw.Draw(flat)
    x = 40
    for ch, bb, w in zip(word, bbs, widths):
        d.text((x - bb[0], 50), ch, font=f, fill=255)
        x += w + track * 400
    a = np.array(flat)
    ys, xs = np.where(a > 127)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def warped_word(word, n, span=(0.08, 0.92), top=0.43, foot=(0.45, 0.42), lam=45, cy=-0.9, font=None, track=-0.02):
    """Mask (n x n) of `word` bent onto the orb. Measured on the reference: letter tops sit on
    y = 0.43 of the orb, their feet on an oval (radii 0.45 across, 0.42 down) well inside the
    orb's edge, and the word spans x 0.08-0.92."""
    a = flat_text(word, track, font)
    fh, fw = a.shape
    yy, xx = np.mgrid[0:n, 0:n] / n
    th = np.arctan2(xx - 0.5, yy - cy)
    xn = th / np.arctan2(span[1] - 0.5, 0.6 - cy)
    ok = np.abs(xn) <= 1
    L = np.radians(lam)
    u = np.arcsin(np.clip(xn, -1, 1) * np.sin(L)) / (2 * L) + 0.5
    dy = np.cos(th)
    rho = np.hypot(xx - 0.5, yy - cy)
    r_top = (top - cy) / dy
    # Far intersection of the ray from the fan centre with the feet's oval.
    rx, ry = foot
    oy = cy - 0.5
    qa = (np.sin(th) / rx) ** 2 + (dy / ry) ** 2
    qb = 2 * oy * dy / ry**2
    qc = (oy / ry) ** 2 - 1
    disc = qb * qb - 4 * qa * qc
    r_bot = (-qb + np.sqrt(np.clip(disc, 0, None))) / (2 * qa)
    v = (rho - r_top) / (r_bot - r_top)
    ok &= (v >= 0) & (v <= 1) & (disc > 0)
    sx = np.clip((u * (fw - 1)).astype(int), 0, fw - 1)
    sy = np.clip((v * (fh - 1)).astype(int), 0, fh - 1)
    out = np.zeros((n, n), bool)
    out[ok] = a[sy[ok], sx[ok]] > 127
    return out



ARIAL_BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'


def set_text(text, n, box):
    """Mask (n x n) of `text` in Arial Bold, stretched to fill `box` (x0, y0, x1, y1 as
    fractions of the orb): the box of the digits measured on the reference."""
    f = ImageFont.truetype(ARIAL_BOLD, 400)
    im = Image.new('L', (400 * len(text), 600), 0)
    ImageDraw.Draw(im).text((20, 50), text, font=f, fill=255)
    a = np.array(im)
    ys, xs = np.where(a > 127)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    x0, y0, x1, y1 = [int(v * n) for v in box]
    out = np.zeros((n, n), bool)
    out[y0:y1, x0:x1] = np.array(Image.fromarray(a).resize((x1 - x0, y1 - y0), Image.LANCZOS)) > 127
    return out


def orb(cx, cy, r, badge, word, digits=None):
    box = (cx - r, cy - r, cx + r, cy + r)
    im = img.crop(box).resize((2 * r * UP, 2 * r * UP), Image.LANCZOS)
    a = np.array(im).astype(int); n = a.shape[0]
    yy, xx = np.mgrid[0:n, 0:n]; inside = (xx - n / 2) ** 2 + (yy - n / 2) ** 2 < (n / 2 * 0.97) ** 2
    bx, by = (badge[0] - (cx - r)) * UP, (badge[1] - (cy - r)) * UP
    nobadge = (xx - bx) ** 2 + (yy - by) ** 2 > (badge[2] * UP) ** 2
    white = inside & nobadge & (a.min(-1) > 225)
    if digits:
        white = set_text(digits[0], n, digits[1])
    letters = warped_word(word, n)
    s = 40 / n
    out = []
    for mask, fill in ((letters, 'url(#INK)'), (white, '#ffffff')):
        d, tf = potrace(mask)
        out.append((transform(d, tf, s), fill))
    return out

def component(name, gid, layers):
    paths = '\n'.join(f'      <Path d="{d}" fill="{fill.replace('INK', gid + '-ink')}" />' for d, fill in layers)
    return f'''export function {name}({{ size }}: TabIconProps) {{
  return (
    <Svg width={{size}} height={{size}} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="{gid}" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#8cc8ff" />
          <Stop offset="0.5" stopColor="#6f8cf8" />
          <Stop offset="1" stopColor="#5a50ee" />
        </LinearGradient>
        <LinearGradient id="{gid}-ink" x1="0" y1="17" x2="0" y2="37" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#bccbff" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#c4d2ff" stopOpacity="0.7" />
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
        "import Svg, {\n  Circle,\n  Defs,\n  Ellipse,\n  LinearGradient,\n  Path,\n  RadialGradient,\n  Stop,\n} from 'react-native-svg';\n"
        "import type { TabIconProps } from 'tabcn';\n\n"
        + component('ScratchIcon', 'orbs-scratch', orb(1246, 216, 121, (1327, 122, 40), 'SCRATCH', ('23:48:59', (0.169, 0.428, 0.83, 0.531))))
        + '\n' + component('PlacesIcon', 'orbs-places', orb(1995, 216, 120, (2078, 122, 40), 'PLACES'))
        + '\n' + chat)
open(p, 'w').write(code)
print('orbs icons', len(code) // 1024, 'KB')
