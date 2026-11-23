"""Make the link-preview images (Open Graph / X cards) for the site, 1200 x 630 JPEG:
  public/og.jpg          the site: a grid of real tab bars under the name
  public/og/<id>.jpg     each design: its bar, large, under its title; a panel is shown open
                         (the moment in panel-open-at.json, from a taller strip)

They are cut from the full-resolution simulator recordings (1206 x 2622, the same takes the
site's videos come from), so re-run this whenever a design's look changes:

  python3 apps/site/scripts/og-images.py <dir with <id>.mp4 recordings>

Needs ffmpeg and Pillow. Text is set in Geist (scripts/fonts, SIL Open Font License).
"""
import json
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ROOT = os.path.abspath(os.path.join(SITE, '..', '..'))
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
W, H = 1200, 630
BG = (10, 10, 10)
FG = (237, 237, 237)
MUTED = (143, 143, 143)
# The bar area of a recording: the bottom of the phone screen, full width.
BAR_BOX = (0, 2152, 1206, 2572)
# A panel's card shows it open: a taller strip (as bar-loops.py's panel loops), at the moment
# in panel-open-at.json; {"at": seconds, "top": y} there starts a tall panel's strip at y.
PANEL_BOX = (0, 1882, 1206, 2572)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'panel-open-at.json')) as f:
    PANEL_OPEN_AT = json.load(f)
# Designs shown on the site's card: varied shapes and colours.
HOME = ['glass-expand', 'gradient-stickers', 'orbs', 'sticker-tiles', 'frosted-media',
        'top-notch', 'labeled-plus', 'glow-glass', 'mono-type']


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, f'Geist-{weight}.ttf'), size)


def catalog():
    """id -> (title, layout label), read from the example app's catalog."""
    src = open(os.path.join(ROOT, 'apps/example/src/catalog.ts')).read()
    start = src.index('LAYOUT_LABELS')
    block = src[start:src.index('};', start)]
    # Keys are quoted ('docked-bar') or bare (panel).
    labels = dict(re.findall(r"'?([a-z-]+)'?: '([^']+)'", block))
    out = {}
    for m in re.finditer(r"id: '([a-z-]+)',[\s\S]*?title: '([^']+)',[\s\S]*?layout: '([a-z-]+)'", src):
        out[m.group(1)] = (m.group(2), labels.get(m.group(3), ''))
    return out


def bar(recording, at=0.6, box=BAR_BOX):
    """The design's bar on its background, from the first settled frame of its recording (or a
    panel open above it, from a taller box at the moment it is open)."""
    with tempfile.TemporaryDirectory() as t:
        png = os.path.join(t, 'f.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(at), '-i', recording,
                        '-frames:v', '1', png], check=True)
        return Image.open(png).convert('RGB').crop(box)


def rounded(im, radius):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius, fill=255)
    return im, mask


def canvas():
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    for y in range(9, H, 18):  # the site's dotted stage
        for x in range(9, W, 18):
            d.point((x, y), fill=(28, 28, 28))
    return im


def paste_bar(im, strip, box, radius):
    x0, y0, x1, y1 = box
    strip = strip.resize((x1 - x0, y1 - y0), Image.LANCZOS)
    strip, mask = rounded(strip, radius)
    im.paste(strip, (x0, y0), mask)
    ImageDraw.Draw(im).rounded_rectangle(box, radius, outline=(38, 38, 38), width=2)


def home_card(recordings):
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((48, 34), 'tabcn', font=font('SemiBold', 64), fill=FG)
    d.text((48, 112), 'Animated tab bars for React Native and Expo', font=font('Regular', 30), fill=MUTED)
    cols, gap, margin = 3, 16, 48
    w = (W - 2 * margin - (cols - 1) * gap) // cols
    h = round(w * (BAR_BOX[3] - BAR_BOX[1]) / (BAR_BOX[2] - BAR_BOX[0]))
    top = H - margin - 3 * h - 2 * gap
    for i, id_ in enumerate(HOME):
        x = margin + (i % cols) * (w + gap)
        y = top + (i // cols) * (h + gap)
        paste_bar(im, bar(recordings[id_]), (x, y, x + w, y + h), 14)
    return im


def design_card(strip, title, layout):
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((48, 40), title, font=font('SemiBold', 60), fill=FG)
    d.text((48, 116), f'tabcn  ·  {layout}', font=font('Regular', 28), fill=MUTED)
    margin = 48
    # As wide as the card allows, unless that is taller than the space under the title (a
    # panel's strip): then as tall as that space, centred.
    w = W - 2 * margin
    h = round(w * strip.height / strip.width)
    room = H - margin - 172
    if h > room:
        h = room
        w = round(h * strip.width / strip.height)
    x = (W - w) // 2
    paste_bar(im, strip, (x, H - margin - h, x + w, H - margin), 24)
    return im


def main():
    rec_dir = sys.argv[1]
    recordings = {f[:-4]: os.path.join(rec_dir, f) for f in os.listdir(rec_dir) if f.endswith('.mp4')}
    cat = catalog()
    out = os.path.join(SITE, 'public', 'og')
    os.makedirs(out, exist_ok=True)
    home_card(recordings).save(os.path.join(SITE, 'public', 'og.jpg'), quality=86, optimize=True)
    for id_, (title, layout) in sorted(cat.items()):
        if id_ not in recordings:
            print(f'skip {id_}: no recording')
            continue
        open_at = PANEL_OPEN_AT.get(id_)
        if open_at is None:
            strip = bar(recordings[id_])
        elif isinstance(open_at, dict):
            # A panel taller than the box: from its own top down to the bar's bottom.
            box = (PANEL_BOX[0], open_at.get('top', PANEL_BOX[1]), PANEL_BOX[2], PANEL_BOX[3])
            strip = bar(recordings[id_], open_at['at'], box)
        else:
            strip = bar(recordings[id_], open_at, PANEL_BOX)
        design_card(strip, title, layout).save(
            os.path.join(out, f'{id_}.jpg'), quality=86, optimize=True)
    print(f'og.jpg + {len(os.listdir(out))} design cards')


if __name__ == '__main__':
    main()
