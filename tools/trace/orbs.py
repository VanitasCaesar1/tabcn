"""Build the Orbs icons: what sits inside each glass orb (the design draws the glass).
Measured on the app's own screenshot. The lettering is too blurred in the JPEG
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


def text_mask(text, n, box, font=None):
    """Mask (n x n) of `text` stretched to fill `box` (x0, y0, x1, y1 as fractions of the orb)."""
    f = ImageFont.truetype(font or LETTERING, 400)
    im = Image.new('L', (420 * len(text), 700), 0)
    ImageDraw.Draw(im).text((20, 50), text, font=f, fill=255)
    a = np.array(im)
    ys, xs = np.where(a > 127)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    x0, y0, x1, y1 = [int(v * n) for v in box]
    out = np.zeros((n, n), bool)
    out[y0:y1, x0:x1] = np.array(Image.fromarray(a).resize((x1 - x0, y1 - y0), Image.LANCZOS)) > 127
    return out


def rounded_hexagon(cx, cy, r, corner):
    """Pointy-top hexagon path with rounded corners, in orb units."""
    import math
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    d = []
    for i, (x, y) in enumerate(pts):
        px, py = pts[i - 1]
        nx, ny = pts[(i + 1) % 6]
        def toward(ax, ay, bx, by, t):
            L = math.hypot(bx - ax, by - ay)
            return ax + (bx - ax) * t / L, ay + (by - ay) * t / L
        sx, sy = toward(x, y, px, py, corner)
        ex, ey = toward(x, y, nx, ny, corner)
        d.append(f"{'M' if i == 0 else 'L'}{sx:.2f} {sy:.2f}Q{x:.2f} {y:.2f} {ex:.2f} {ey:.2f}")
    return ''.join(d) + 'Z'


# Measured on the app's own screenshot (orb = 64.5 pt = 40 units): a hexagon 27 x 29 pt and a
# count 30 x 16 pt, both #3c54ec, centred; the lettering arcs faintly round the bottom.
BLUE = '#3c54ec'


def glyph_orb(word, n=960, center=None):
    s = 40 / n
    layers = []
    d, tf = potrace(warped_word(word, n))
    layers.append((transform(d, tf, s), 'url(#INK)'))
    if center == 'hexagon':
        layers.append((rounded_hexagon(20, 20, 10.4, 2.6), BLUE))
    elif center:
        d, tf = potrace(text_mask(center, n, (0.24, 0.365, 0.76, 0.635)))
        layers.append((transform(d, tf, s), BLUE))
    return layers


def component(name, gid, layers, doc):
    paths = '\n'.join(f'      <Path d="{d}" fill="{fill.replace('INK', gid + '-ink')}" />' for d, fill in layers)
    return f'''/** {doc} */
export function {name}({{ size }}: TabIconProps) {{
  return (
    <Svg width={{size}} height={{size}} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="{gid}-ink" x1="0" y1="17" x2="0" y2="37" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#a9b8ff" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#b8c6ff" stopOpacity="0.7" />
        </LinearGradient>
      </Defs>
{paths}
    </Svg>
  );
}}
'''


p = os.path.join(ROOT, 'registry', 'designs', 'orbs', 'icons.tsx')
old = open(p).read()
chat = old[old.index('export function ChatIcon'):]
if '<G transform' not in chat:
    # The bubble was drawn for a smaller box; in orb units it spans 38 of the active orb's 74 pt.
    chat = chat.replace('viewBox="0 0 40 40">\n      <Defs>', 'viewBox="0 0 40 40">\n      <G transform="translate(20 20) scale(0.672) translate(-20.5 -20)">\n      <Defs>', 1)
    chat = chat.replace('    </Svg>\n  );\n}', '      </G>\n    </Svg>\n  );\n}', 1)
code = ('/**\n * Icons for the Orbs design: what sits inside each glass orb, in the orb\'s own 40-unit box\n'
        ' * (render them at the orb\'s size). Lettering is set in Bowlby One and bent round the orb;\n'
        ' * see tools/trace/orbs.py. Pass them as `tabBarIcon`.\n */\n'
        "import Svg, {\n  Defs,\n  Ellipse,\n  G,\n  LinearGradient,\n  Path,\n  RadialGradient,\n  Stop,\n} from 'react-native-svg';\n"
        "import type { TabIconProps } from 'react-native-tabcn';\n\n"
        + component('ScratchIcon', 'orbs-scratch', glyph_orb('SCRATCH', center='hexagon'), 'Curved "SCRATCH" lettering round a blue hexagon.')
        + '\n' + component('PlacesIcon', 'orbs-places', glyph_orb('PLACES', center='64'), 'Curved "PLACES" lettering round a count.')
        + '\n' + chat)
open(p, 'w').write(code)
print('orbs icons', len(code) // 1024, 'KB')
