"""Trace reference icons into SVG paths on a 40-unit grid, one shared scale per set.
usage: trace.py <spec.json> -> writes <spec>.out.json
spec: {ref, bar:[x0,y0,x1,y1], tabs, band:[lo,hi], mode:'mono'|'multi', k, neutral, exclude:[[r,g,b],...],
       boxes:[[x0,x1],...] (absolute x per tab, optional), skip:[i,...]}"""
import os, sys, glob, json, re, subprocess, tempfile, os
from PIL import Image, ImageDraw
import numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

spec = json.load(open(sys.argv[1]))
f = sorted(glob.glob(os.path.join(ROOT, 'references', '%02d-*.jpg' % spec['ref'])))[0]
arr = np.array(Image.open(f).convert('RGB').rotate(-90, expand=True))
# Erase rectangles (e.g. notification badges baked into the reference) with nearby colour.
for e in spec.get('erase', []):
    if isinstance(e, dict):
        # Paint a rectangle with `inside` colour within a circle and `outside` colour beyond it.
        x0e, y0e, x1e, y1e = e['rect']; cx, cy, r = e['circle']
        yy, xx = np.mgrid[y0e:y1e, x0e:x1e]
        inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
        arr[y0e:y1e, x0e:x1e][inside] = e['inside']; arr[y0e:y1e, x0e:x1e][~inside] = e['outside']
    else:
        ex0, ey0, ex1, ey1 = e
        arr[ey0:ey1, ex0:ex1] = arr[ey0 - 4:ey0 - 2, ex0:ex1].mean(axis=(0,)).astype(arr.dtype)
UP = spec.get('up', 6)
bx0, by0, bx1, by1 = spec['bar']; tabs = spec['tabs']; lo, hi = spec['band']

def dist(a, b): return np.abs(a.astype(int) - np.asarray(b)[..., :3].reshape((1,) * (a.ndim - 1) + (3,))).sum(-1)

def drop_border(mask):
    im = Image.fromarray(mask.astype(np.uint8) * 255); h, w = mask.shape
    for x in range(w):
        for y in (0, h - 1):
            if im.getpixel((x, y)) == 255: ImageDraw.floodfill(im, (x, y), 0)
    for y in range(h):
        for x in (0, w - 1):
            if im.getpixel((x, y)) == 255: ImageDraw.floodfill(im, (x, y), 0)
    return np.array(im) > 0

def inkmask(a, bg, thr=90, o=None):
    o = o or spec
    m = dist(a, bg) > thr
    if o.get('neutral'):
        m &= (a.max(-1).astype(int) - a.min(-1)) < o.get('neutral_sat', 70)
        m &= a.max(-1) > o.get('neutral_min', 110)
    for ex in o.get('exclude', []):
        m &= dist(a, ex) > o.get('exclude_tol', 45)
    return drop_border(m)

def potrace(mask, opt=0.4, turd=60):
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, 'm.pbm')
        Image.fromarray((~mask).astype(np.uint8) * 255).convert('1').save(p)
        subprocess.run(['potrace', p, '-s', '-o', os.path.join(t, 'o.svg'), '--turdsize', str(turd),
                        '--alphamax', '1.15', '--opttolerance', str(opt), '-u', '10'], check=True)
        svg = open(os.path.join(t, 'o.svg')).read()
    m = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', svg)
    return ' '.join(re.findall(r' d="([^"]+)"', svg)), [float(v) for v in m.groups()]

def fmt(v):
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def transform(d, tf, s, ox, oy):
    tx, ty, sx, sy = tf
    toks = re.findall(r'[MmCcLlZz]|-?\d+(?:\.\d+)?', d); out, i, cmd = [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in 'MmCcLlZz':
            cmd = t; i += 1
            out.append('Z' if t in 'Zz' else (t if t not in 'm' else 'm')); continue
        ar = 2 if cmd in 'MmLl' else 6; nums = [float(v) for v in toks[i:i + ar]]; i += ar
        rel = cmd.islower()
        pts = [((x * sx * s, y * sy * s) if rel else ((x * sx + tx) * s + ox, (y * sy + ty) * s + oy))
               for x, y in zip(nums[::2], nums[1::2])]
        out.append(' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in pts))
        if cmd == 'm': cmd = 'l'
        if cmd == 'M': cmd = 'L'
    return re.sub(r'\s+', ' ', ' '.join(out)).replace(' Z', 'Z').replace('Z ', 'Z').strip()

# pass 1: icon boxes
boxes = []
bw = (bx1 - bx0) / tabs
for t in range(tabs):
    if t in spec.get('skip', []): boxes.append(None); continue
    if spec.get('boxes'):
        cx0, cx1 = spec['boxes'][t]
    else:
        cx0, cx1 = int(bx0 + t * bw + 4), int(bx0 + (t + 1) * bw - 4)
        edge = spec.get('edge', 0.14)
        if t == 0: cx0 = int(bx0 + bw * edge)
        if t == tabs - 1: cx1 = int(bx1 - bw * edge)
    cy0, cy1 = int(by0 + (by1 - by0) * lo), int(by0 + (by1 - by0) * hi)
    crop = arr[cy0:cy1, cx0:cx1]
    bg = np.median(np.concatenate([crop[:3].reshape(-1, 3), crop[-3:].reshape(-1, 3),
                                   crop[:, :3].reshape(-1, 3), crop[:, -3:].reshape(-1, 3)]), axis=0)
    o = {**spec, **spec.get('tab', {}).get(str(t), {})}
    ys, xs = np.where(inkmask(crop, bg, 90, o))
    if len(xs) == 0: boxes.append(None); continue
    p = 3
    boxes.append((cx0 + xs.min() - p, cy0 + ys.min() - p, cx0 + xs.max() + p + 1, cy0 + ys.max() + p + 1, bg, o))
big = max(max(b[2] - b[0], b[3] - b[1]) for b in boxes if b) * UP
s = 40 / big
print('BIGPX', spec['ref'], round(big / UP, 1), 'pt', round(big / UP * 370 / 1460, 1))
res = []
for b in boxes:
    if not b: res.append(None); continue
    x0, y0, x1, y1, bg, o = b
    im = Image.fromarray(arr[y0:y1, x0:x1]).resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.LANCZOS)
    a = np.array(im); h, w = a.shape[:2]; ox = (40 - w * s) / 2; oy = (40 - h * s) / 2
    layers = []
    if spec['mode'] == 'mono':
        core = inkmask(a, bg, 90, o)
        inkc = np.median(a[core], axis=0)
        mask = inkmask(a, bg, dist(inkc.reshape(1, 3), bg)[0] * 0.5, o)
        d, tf = potrace(mask); layers.append({'fill': None, 'd': transform(d, tf, s, ox, oy)})
    else:
        from PIL import ImageFilter
        k = o.get('k', 10)
        fg = inkmask(a, bg, o.get('fg_thr', 60), o)
        base = a.copy(); base[~fg] = np.median(a[fg], axis=0)
        q = Image.fromarray(base).quantize(colors=k, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal = q.getpalette()[:k * 3]
        lab = np.array(q.filter(ImageFilter.ModeFilter(o.get('modefilter', 9))))
        cols = [tuple(pal[i * 3:i * 3 + 3]) for i in range(k)]
        area = {i: int((fg & (lab == i)).sum()) for i in range(k)}
        used = [i for i in range(k) if area[i] > fg.sum() * 0.004]
        order = sorted(used, key=lambda i: -area[i])
        for j, i in enumerate(order):
            if j == 0:
                mask = fg
            else:
                region = Image.fromarray(((lab == i) & fg).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))
                mask = (np.array(region) > 0) & fg
            d, tf = potrace(mask, o.get('opt', 1.0), o.get('turd', 220))
            layers.append({'fill': '#%02x%02x%02x' % cols[i], 'd': transform(d, tf, s, ox, oy)})
    res.append({'w': round(w * s, 1), 'h': round(h * s, 1), 'layers': layers})
json.dump(res, open(sys.argv[1].replace('.json', '.out.json'), 'w'))
print(spec['ref'], [(r['w'], r['h'], len(r['layers'])) if r else None for r in res])
