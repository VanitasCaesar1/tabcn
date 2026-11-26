"""Make the home page's bar loops: each tab bar cut out of its simulator recording.
  public/bars/<id>.mp4   the bar, looping, 804 x 280 (2x the 402 x 140 tile, the width of an
                         iPhone 17 Pro in points, so the actual-size tile is sharp)
  public/bars/<id>.jpg   its poster, the frame at 0.6 s
  public/bars/<id>-thumb.jpg
                         a 138 x 48 thumbnail of the poster for the sidebar, search and list
                         rows (every design, panels included)

With --panels, panels are cut too, from a taller box (PANEL_BOX, 804 x 460 out), with the
poster taken when the panel is open: the seconds in panel-open-at.json (og-images.py reads it
too). Pick a new panel's moment from the contact sheet <dir>/_panels.png. Until a panel has its
own crop, its thumbnail comes from its second still (public/stills/<id>-2.jpg).

They are cut from the full-resolution simulator recordings (1206 x 2622, the same takes the
site's videos and og-images.py use), so re-run this whenever a design's look changes:

  python3 apps/site/scripts/bar-loops.py <dir with <id>.mp4 recordings>
  python3 apps/site/scripts/bar-loops.py <dir> --only glow-glass
  python3 apps/site/scripts/bar-loops.py <dir> --panels
  python3 apps/site/scripts/bar-loops.py --thumbs-only     (thumbnails from the posters on disk)

Panels are skipped unless --panels is given: the board shows tab bars only. A contact sheet of every poster goes to
<dir>/_sheet.png, so you can check the crops at a glance without it landing in the site.

Needs ffmpeg and Pillow.
"""
import argparse
import json
import os
import re
import subprocess
import tempfile

from PIL import Image

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ROOT = os.path.abspath(os.path.join(SITE, '..', '..'))
OUT = os.path.join(SITE, 'public', 'bars')
# The bar area of a recording: the bottom of the phone screen, full width (as og-images.py).
BAR_BOX = (0, 2152, 1206, 2572)
# A different top edge for a design whose bar sits higher or lower than the rest.
# Reply Stack's reply row sits above its tabs, so its strip starts higher to keep the row whole.
# Ask Dock's strip starts higher to keep the prompt's button row above its tabs.
CROP_Y = {'reply-stack': 2066, 'ask-dock': 2120}
SIZE = (804, 280)
POSTER_AT = '0.6'
# Panels: the bottom of the screen with the panel open above the bar, 804 x 460 out.
PANEL_BOX = (0, 1882, 1206, 2572)
PANEL_SIZE = (804, 460)
# When each panel is open in its recording (seconds); read off <dir>/_panels.png. A panel taller
# than the box gives {"at": seconds, "top": y}: the box starts at y instead (same height).
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'panel-open-at.json')) as f:
    _OPEN = json.load(f)
PANEL_POSTER_AT = {k: str(v['at'] if isinstance(v, dict) else v) for k, v in _OPEN.items()}
PANEL_TOP = {k: v['top'] for k, v in _OPEN.items() if isinstance(v, dict) and 'top' in v}
THUMB_SIZE = (138, 48)
THUMB_QUALITY = 72
STILLS = os.path.join(SITE, 'public', 'stills')
MIN_WIDTH = 1206


def catalog():
    """id -> kind ('bar' or 'panel'), read from the example app's catalog."""
    src = open(os.path.join(ROOT, 'apps/example/src/catalog.ts')).read()
    return {m.group(1): m.group(2)
            for m in re.finditer(r"id: '([a-z-]+)',[\s\S]*?kind: '(\w+)'", src)}


def width(recording):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                          '-show_entries', 'stream=width', '-of', 'json', recording],
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)['streams'][0]['width']


def crop_filter(id_, panel=False):
    x0, y0, x1, y1 = PANEL_BOX if panel else BAR_BOX
    w, h = PANEL_SIZE if panel else SIZE
    top = PANEL_TOP.get(id_, y0) if panel else CROP_Y.get(id_, y0)
    return f'crop={x1 - x0}:{y1 - y0}:{x0}:{top},scale={w}:{h}:flags=lanczos'


def loop(id_, recording, out, panel=False):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', recording, '-an',
                    '-vf', f'{crop_filter(id_, panel)},fps=30,format=yuv420p',
                    '-c:v', 'libx264', '-crf', '27', '-preset', 'slow',
                    '-movflags', '+faststart', out], check=True)


def poster(id_, recording, out, panel=False):
    at = PANEL_POSTER_AT.get(id_, POSTER_AT) if panel else POSTER_AT
    with tempfile.TemporaryDirectory() as t:
        png = os.path.join(t, 'f.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', at, '-i', recording,
                        '-vf', crop_filter(id_, panel), '-frames:v', '1', png], check=True)
        Image.open(png).convert('RGB').save(out, quality=80, optimize=True, progressive=True)


def thumb(id_):
    """138 x 48 from the poster; a panel without its own crop uses the bottom of a still."""
    src = os.path.join(OUT, f'{id_}.jpg')
    if os.path.exists(src):
        im = Image.open(src).convert('RGB')
    else:
        still = os.path.join(STILLS, f'{id_}-2.jpg')
        if not os.path.exists(still):
            still = os.path.join(STILLS, f'{id_}-1.jpg')
        if not os.path.exists(still):
            return None
        im = Image.open(still).convert('RGB')
    # Keep the bottom of the picture (where the bar is) at the thumbnail's shape.
    w, h = im.size
    tw, th = THUMB_SIZE
    crop_h = min(h, round(w * th / tw))
    im = im.crop((0, h - crop_h, w, h)).resize(THUMB_SIZE, Image.LANCZOS)
    out = os.path.join(OUT, f'{id_}-thumb.jpg')
    im.save(out, quality=THUMB_QUALITY, optimize=True, progressive=True)
    return out


def sheet(ids, rec_dir, panel=False):
    """Every poster in one picture, three across, for checking the crops."""
    cols, gap = 3, 12
    w, h = (PANEL_SIZE if panel else SIZE)[0] // 2, (PANEL_SIZE if panel else SIZE)[1] // 2
    rows = (len(ids) + cols - 1) // cols
    im = Image.new('RGB', (cols * (w + gap) + gap, rows * (h + gap) + gap), (10, 10, 10))
    for i, id_ in enumerate(ids):
        tile = Image.open(os.path.join(OUT, f'{id_}.jpg')).resize((w, h), Image.LANCZOS)
        im.paste(tile, (gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)))
    im.save(os.path.join(rec_dir, '_panels.png' if panel else '_sheet.png'))


def main():
    parser = argparse.ArgumentParser(description='Cut the home page bar loops.')
    parser.add_argument('recordings', nargs='?',
                        help='directory with <id>.mp4 simulator recordings')
    parser.add_argument('--only', help='make just this design')
    parser.add_argument('--panels', action='store_true', help='cut the panels too')
    parser.add_argument('--thumbs-only', action='store_true',
                        help='only remake the thumbnails from the posters on disk')
    args = parser.parse_args()

    kinds = catalog()
    os.makedirs(OUT, exist_ok=True)
    if args.thumbs_only:
        made = [i for i in sorted(kinds) if (not args.only or i == args.only) and thumb(i)]
        print(f'{len(made)} thumbnails in {os.path.relpath(OUT, ROOT)}')
        return
    if not args.recordings:
        parser.error('the recordings directory is required unless --thumbs-only is given')
    made = []
    for id_, kind in sorted(kinds.items()):
        if args.only and id_ != args.only:
            continue
        panel = kind == 'panel'
        if panel and not args.panels:
            print(f'skip {id_}: a panel (pass --panels)')
            continue
        recording = os.path.join(args.recordings, f'{id_}.mp4')
        if not os.path.exists(recording):
            print(f'skip {id_}: no recording')
            continue
        if width(recording) < MIN_WIDTH:
            raise SystemExit(f'{id_}: the recording is narrower than {MIN_WIDTH} px; use the '
                             'full-resolution simulator take')
        video, still = os.path.join(OUT, f'{id_}.mp4'), os.path.join(OUT, f'{id_}.jpg')
        loop(id_, recording, video, panel)
        poster(id_, recording, still, panel)
        thumb(id_)
        made.append(id_)
        print(f'{id_}: {os.path.getsize(video) // 1024} KB loop, '
              f'{os.path.getsize(still) // 1024} KB poster')

    if made:
        for kind in ('bar', 'panel'):
            ids = sorted(i for i, k in kinds.items()
                         if k == kind and os.path.exists(os.path.join(OUT, f'{i}.jpg')))
            if ids:
                sheet(ids, args.recordings, panel=kind == 'panel')
    # Panels without their own crop still get a thumbnail, from a still.
    for id_ in sorted(kinds):
        if not args.only and not os.path.exists(os.path.join(OUT, f'{id_}-thumb.jpg')):
            thumb(id_)
    print(f'{len(made)} bar loops in {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
