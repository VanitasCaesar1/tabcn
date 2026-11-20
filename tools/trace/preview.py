"""Render traced icons (trace.py JSON) next to the reference bar for checking.
usage: preview.py <json> <out.png> <ref> <bar x0,y0,x1,y1>"""
import os, sys, json, re, glob
from PIL import Image, ImageDraw, ImageChops
import numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def subpaths(d):
    toks = re.findall(r'[MmCcLlZz]|-?\d+(?:\.\d+)?', d.replace(',', ' '))
    cur, start, polys, poly, cmd, i = (0, 0), (0, 0), [], [], None, 0
    while i < len(toks):
        t = toks[i]
        if t in 'MmCcLlZz':
            cmd = t; i += 1
            if t in 'Zz':
                if poly: polys.append(poly); poly = []
                cur = start
            continue
        if cmd in 'Mm':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            cur = (cur[0] + x, cur[1] + y) if cmd == 'm' else (x, y); start = cur
            if poly: polys.append(poly)
            poly = [cur]; cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'Ll':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            cur = (cur[0] + x, cur[1] + y) if cmd == 'l' else (x, y); poly.append(cur)
        elif cmd in 'Cc':
            v = [float(t) for t in toks[i:i + 6]]; i += 6
            p0 = cur
            if cmd == 'c': v = [p0[j % 2] + v[j] for j in range(6)]
            p1, p2, p3 = (v[0], v[1]), (v[2], v[3]), (v[4], v[5])
            for k in range(1, 9):
                t_ = k / 8
                x = (1-t_)**3*p0[0] + 3*(1-t_)**2*t_*p1[0] + 3*(1-t_)*t_**2*p2[0] + t_**3*p3[0]
                y = (1-t_)**3*p0[1] + 3*(1-t_)**2*t_*p1[1] + 3*(1-t_)*t_**2*p2[1] + t_**3*p3[1]
                poly.append((x, y))
            cur = p3
    if poly: polys.append(poly)
    return polys

def render(icon, size, ink=None):
    ink = ink or tuple(int(v) for v in (sys.argv[6].split(',') if len(sys.argv) > 6 else (83, 61, 223)))
    sc = size / 40
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for L in icon['layers']:
        mask = Image.new('1', (size, size), 0)
        for poly in subpaths(L['d']):
            if len(poly) < 3: continue
            m = Image.new('1', (size, size), 0)
            ImageDraw.Draw(m).polygon([(x * sc, y * sc) for x, y in poly], fill=1)
            mask = ImageChops.logical_xor(mask, m)
        fill = L['fill'] or '#%02x%02x%02x' % ink
        col = Image.new('RGBA', (size, size), fill)
        img.paste(col, (0, 0), mask)
    return img

data = json.load(open(sys.argv[1])); out = sys.argv[2]
n = int(sys.argv[3]); bx0, by0, bx1, by1 = [int(v) for v in sys.argv[4].split(',')]
f = sorted(glob.glob(os.path.join(ROOT, 'references', '%02d-*.jpg' % n)))[0]
ref = Image.open(f).convert('RGB').rotate(-90, expand=True).crop((bx0, by0, bx1, by1))
W = 1000; ref = ref.resize((W, int(ref.height * W / ref.width)))
cell = W // len(data)
row = Image.new('RGB', (W, cell), tuple(int(v) for v in (sys.argv[5].split(',') if len(sys.argv) > 5 else (246, 244, 255))))
for i, ic in enumerate(data):
    if ic: row.paste(r := render(ic, int(cell * 0.8)), (i * cell + int(cell * 0.1), int(cell * 0.1)), r)
sheet = Image.new('RGB', (W, ref.height + cell + 6), 'white'); sheet.paste(ref, (0, 0)); sheet.paste(row, (0, ref.height + 6))
sheet.save(out); print(sheet.size)
