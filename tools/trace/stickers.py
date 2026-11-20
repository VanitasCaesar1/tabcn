"""Trace sticker-style icons (coloured art inside a white die-cut border) on a 40-unit grid.

usage: stickers.py <spec.json>  -> writes <spec>.out.json (same format as trace.py's multi mode)

spec: {ref, bar:[x0,y0,x1,y1], tabs, band:[lo,hi], boxes:[[x0,x1],...] (optional),
       white: min channel that counts as the white border (default 226),
       k: colours per sticker (default 6), smooth: blur radius in reference px (default 1.1),
       up: upscale factor (default 4), tab: {"<i>": {per-tab overrides}}}

Why a separate tracer: a generic colour quantize-and-trace loses the white border against a
cream background and leaves ragged edges. Here the border is found by its own colour, its
holes are filled to get the sticker's silhouette, and every colour layer is smoothed before
it is traced, so edges come out clean.
"""
import glob
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
spec = json.load(open(sys.argv[1]))
f = sorted(glob.glob(os.path.join(ROOT, 'references', '%02d-*.jpg' % spec['ref'])))[0]
arr = np.array(Image.open(f).convert('RGB').rotate(-90, expand=True))
# Paint over things baked into the reference that aren't part of an icon (e.g. a badge):
# a rectangle filled with `inside` colour within a circle and `outside` colour beyond it.
# With `mirror: x`, the circle is filled with the icon's mirror image across x instead
# (for a roughly symmetric icon partly hidden under a badge).
for e in spec.get('erase', []):
    x0e, y0e, x1e, y1e = e['rect']
    cx, cy, rr = e['circle']
    yy, xx = np.mgrid[y0e:y1e, x0e:x1e]
    inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= rr * rr
    if 'mirror' in e:
        src = arr[yy, 2 * e['mirror'] - xx]
        arr[y0e:y1e, x0e:x1e][inside] = src[inside]
        continue
    arr[y0e:y1e, x0e:x1e][inside] = e['inside']
    arr[y0e:y1e, x0e:x1e][~inside] = e['outside']
bx0, by0, bx1, by1 = spec['bar']
tabs = spec['tabs']
lo, hi = spec['band']


def to_img(mask):
    return Image.fromarray(mask.astype(np.uint8) * 255)


def fill_holes(mask):
    """Everything not reachable from the crop's edge through background is inside."""
    im = to_img(~mask)
    h, w = mask.shape
    im = im.convert('L')
    seeds = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    seeds += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for s in seeds:
        if im.getpixel(s) == 255:
            ImageDraw.floodfill(im, s, 128)
    return np.array(im) != 128


def largest_blob(mask):
    """Keep only the connected region (4-neighbour flood fill) with the most pixels."""
    im = to_img(mask).convert('L')
    h, w = mask.shape
    best, best_n, tag = None, 0, 1
    ys, xs = np.where(mask)
    seen = np.zeros_like(mask)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        tag = 7 if tag != 7 else 9
        ImageDraw.floodfill(im, (int(x), int(y)), tag)
        region = np.array(im) == tag
        seen |= region
        n = int(region.sum())
        if n > best_n:
            best, best_n = region, n
        im.paste(0, mask=to_img(region))
    return best if best is not None else mask


def smooth(mask, r):
    """Blur the mask and threshold at half: rounds off JPEG and quantization jaggies."""
    b = to_img(mask).filter(ImageFilter.GaussianBlur(r))
    return np.array(b) > 127


def potrace(mask, opt=0.6, turd=40):
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, 'm.pbm')
        to_img(~mask).convert('1').save(p)
        subprocess.run(['potrace', p, '-s', '-o', os.path.join(t, 'o.svg'), '--turdsize', str(turd),
                        '--alphamax', '1.2', '--opttolerance', str(opt), '-u', '10'], check=True)
        svg = open(os.path.join(t, 'o.svg')).read()
    m = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', svg)
    return ' '.join(re.findall(r' d="([^"]+)"', svg)), [float(v) for v in m.groups()]


def outline(a, o, k):
    """Pixels that make up the sticker's outer shape: its white border, or, for art with no
    border (spec `bg`), everything that differs from the background colour."""
    if 'bg' in o:
        m = np.abs(a.astype(int) - np.array(o['bg'])).sum(-1) > o.get('bg_tol', 60)
    else:
        m = a.min(-1) > o.get('white', 226)
    return np.array(to_img(m).filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))) > 0


def colour_layers(a, inner, sil, o, r):
    """Cluster the art's colours on flat pixels only (edges between colours are JPEG blends
    that would otherwise become colours of their own), then give every pixel its nearest
    cluster and return one smoothed mask per colour, largest first."""
    k = o.get('k', 8)
    px = a.astype(float)
    gray = np.array(Image.fromarray(a).convert('L').filter(ImageFilter.FIND_EDGES)).astype(float)
    flat = inner & (gray < o.get('flat', 14))
    flat = np.array(to_img(flat).filter(ImageFilter.MinFilter(3))) > 0
    pts = px[flat]
    if len(pts) < k:
        pts = px[inner]
    q = Image.fromarray(a).quantize(colors=k, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    cent = np.array(q.getpalette()[:k * 3], float).reshape(k, 3)
    for _ in range(12):
        d = ((pts[:, None, :] - cent[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for i in range(len(cent)):
            if (lab == i).any():
                cent[i] = pts[lab == i].mean(0)
    # Drop clusters with almost no flat pixels: those are edge blends, not real colours.
    counts = np.bincount(lab, minlength=len(cent))
    cent = cent[counts >= len(pts) * o.get('min_flat', 0.0015)]
    # Drop clusters that lie between two others in colour: anti-aliased edges, not paint.
    def is_blend(i):
        for j in range(len(cent)):
            for k2 in range(len(cent)):
                if len({i, j, k2}) < 3:
                    continue
                a0, b0 = cent[j], cent[k2]
                t = np.clip(np.dot(cent[i] - a0, b0 - a0) / max(np.dot(b0 - a0, b0 - a0), 1), 0, 1)
                if 0.15 < t < 0.85 and np.abs(a0 + t * (b0 - a0) - cent[i]).sum() < o.get('blend_tol', 36):
                    return True
        return False
    counts = np.bincount(((pts[:, None, :] - cent[None]) ** 2).sum(-1).argmin(1), minlength=len(cent))
    keep = [i for i in np.argsort(-counts) if not is_blend(i)]
    cent = cent[sorted(keep)]
    # Merge clusters that are visually the same colour.
    merged = []
    for c in cent:
        if all(np.abs(c - m).sum() > o.get('merge', 42) for m in merged):
            merged.append(c)
    cent = np.array(merged)
    d = ((px[..., None, :] - cent[None, None]) ** 2).sum(-1)
    lab = d.argmin(-1).astype(np.uint8)
    lab = np.array(Image.fromarray(lab).filter(ImageFilter.ModeFilter(o.get('modefilter', 3))))
    total = inner.sum()
    areas = [int((inner & (lab == i)).sum()) for i in range(len(cent))]
    order = sorted((i for i in range(len(cent)) if areas[i] > total * o.get('min_area', 0.0025)), key=lambda i: -areas[i])
    out = []
    for j, i in enumerate(order):
        if j == 0:
            m = inner
        else:
            m = np.array(to_img(inner & (lab == i)).filter(ImageFilter.MaxFilter(3))) > 0
        m = smooth(m, r * 0.7) & sil
        out.append((tuple(int(v) for v in cent[i]), m))
    return out


sys.path.insert(0, os.path.dirname(__file__))
# Reuse trace.py's path transform without running its main code.
_src = open(os.path.join(os.path.dirname(__file__), 'trace.py')).read()
exec(_src[_src.index('def fmt'):_src.index('# pass 1')])

# Pass 1: find each sticker's silhouette box from its white border.
UP = spec.get('up', 4)
bw = (bx1 - bx0) / tabs
items = []
for t in range(tabs):
    o = {**spec, **spec.get('tab', {}).get(str(t), {})}
    if spec.get('boxes'):
        cx0, cx1 = spec['boxes'][t]
    else:
        cx0, cx1 = int(bx0 + t * bw + 4), int(bx0 + (t + 1) * bw - 4)
    cy0, cy1 = int(by0 + (by1 - by0) * lo), int(by0 + (by1 - by0) * hi)
    crop = arr[cy0:cy1, cx0:cx1]
    sil = largest_blob(fill_holes(outline(crop, o, 3)))
    ys, xs = np.where(sil)
    p = 3
    items.append((cx0 + xs.min() - p, cy0 + ys.min() - p, cx0 + xs.max() + p + 1, cy0 + ys.max() + p + 1, o))

big = max(max(b[2] - b[0], b[3] - b[1]) for b in items)
s = 40 / (big * UP)
print('BIGPX', spec['ref'], big, 'px', round(big * 370 / 1460, 1), 'pt')

res = []
for x0, y0, x1, y1, o in items:
    im = Image.fromarray(arr[y0:y1, x0:x1]).resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.LANCZOS)
    a = np.array(im)
    h, w = a.shape[:2]
    ox, oy = (40 - w * s) / 2, (40 - h * s) / 2
    r = o.get('smooth', 1.1) * UP
    sil = smooth(largest_blob(fill_holes(outline(a, o, 5))), r)
    if o.get('close'):
        # Fill a bite left where something overlapping the sticker was erased.
        c = o['close'] * UP | 1
        sil = np.array(to_img(sil).filter(ImageFilter.MaxFilter(c)).filter(ImageFilter.MinFilter(c))) > 0
    if 'bg' in o:
        # Pull the edge in past the blend with the background.
        sil = np.array(to_img(sil).filter(ImageFilter.MinFilter(2 * o.get('shrink', 1) * UP + 1))) > 0
    # Coloured art: inside the silhouette, away from the border's white.
    inner = sil & (a.min(-1) <= o.get('white', 226) - 6) if 'bg' not in o else sil.copy()
    inner = np.array(to_img(inner).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    layers = [] if 'bg' in o else [{'fill': o.get('border', '#ffffff'), 'mask': sil}]
    if inner.any():
        for col, m in colour_layers(a, inner, sil, o, r):
            layers.append({'fill': '#%02x%02x%02x' % col, 'mask': m})
    # White details enclosed by the art (eye highlights, a window): back on top.
    if inner.any() and o.get('highlights', True):
        enclosed = fill_holes(np.array(to_img(inner).filter(ImageFilter.MaxFilter(3))) > 0)
        hl = enclosed & ~inner & (a.min(-1) > o.get('white', 226) - 30)
        hl = np.array(to_img(hl).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
        if hl.sum() > 20:
            layers.append({'fill': '#ffffff', 'mask': smooth(hl, r * 0.5)})
    out = []
    for L in layers:
        if L['mask'].sum() < 30:
            continue
        d, tf = potrace(L['mask'], o.get('opt', 0.6), o.get('turd', 40 * UP))
        if d:
            out.append({'fill': L['fill'], 'd': transform(d, tf, s, ox, oy)})
    res.append({'w': round(w * s, 1), 'h': round(h * s, 1), 'layers': out})

json.dump(res, open(sys.argv[1].replace('.json', '.out.json'), 'w'))
print(spec['ref'], [(r['w'], r['h'], len(r['layers'])) for r in res])
