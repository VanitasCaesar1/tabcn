"""Make the home page's bar loops: each tab bar cut out of its simulator recording.
  public/bars/<id>.mp4   the bar, looping, 804 x 280 (2x the 402 x 140 tile, the width of an
                         iPhone 17 Pro in points, so the actual-size tile is sharp)
  public/bars/<id>.jpg   its poster, the frame at 0.6 s

They are cut from the full-resolution simulator recordings (1206 x 2622, the same takes the
site's videos and og-images.py use), so re-run this whenever a design's look changes:

  python3 apps/site/scripts/bar-loops.py <dir with <id>.mp4 recordings>
  python3 apps/site/scripts/bar-loops.py <dir> --only glow-glass

Panels are skipped: the board shows tab bars only. A contact sheet of every poster goes to
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
CROP_Y = {}
SIZE = (804, 280)
POSTER_AT = '0.6'
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


def crop_filter(id_):
    x0, y0, x1, y1 = BAR_BOX
    top = CROP_Y.get(id_, y0)
    return f'crop={x1 - x0}:{y1 - y0}:{x0}:{top},scale={SIZE[0]}:{SIZE[1]}:flags=lanczos'


def loop(id_, recording, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', recording, '-an',
                    '-vf', f'{crop_filter(id_)},fps=30,format=yuv420p',
                    '-c:v', 'libx264', '-crf', '27', '-preset', 'slow',
                    '-movflags', '+faststart', out], check=True)


def poster(id_, recording, out):
    with tempfile.TemporaryDirectory() as t:
        png = os.path.join(t, 'f.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', POSTER_AT, '-i', recording,
                        '-vf', crop_filter(id_), '-frames:v', '1', png], check=True)
        Image.open(png).convert('RGB').save(out, quality=80, optimize=True, progressive=True)


def sheet(ids, rec_dir):
    """Every poster in one picture, three across, for checking the crops."""
    cols, gap = 3, 12
    w, h = SIZE[0] // 2, SIZE[1] // 2
    rows = (len(ids) + cols - 1) // cols
    im = Image.new('RGB', (cols * (w + gap) + gap, rows * (h + gap) + gap), (10, 10, 10))
    for i, id_ in enumerate(ids):
        tile = Image.open(os.path.join(OUT, f'{id_}.jpg')).resize((w, h), Image.LANCZOS)
        im.paste(tile, (gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)))
    im.save(os.path.join(rec_dir, '_sheet.png'))


def main():
    parser = argparse.ArgumentParser(description='Cut the home page bar loops.')
    parser.add_argument('recordings', help='directory with <id>.mp4 simulator recordings')
    parser.add_argument('--only', help='make just this design')
    args = parser.parse_args()

    kinds = catalog()
    os.makedirs(OUT, exist_ok=True)
    made = []
    for id_, kind in sorted(kinds.items()):
        if args.only and id_ != args.only:
            continue
        if kind == 'panel':
            print(f'skip {id_}: a panel')
            continue
        recording = os.path.join(args.recordings, f'{id_}.mp4')
        if not os.path.exists(recording):
            print(f'skip {id_}: no recording')
            continue
        if width(recording) < MIN_WIDTH:
            raise SystemExit(f'{id_}: the recording is narrower than {MIN_WIDTH} px; use the '
                             'full-resolution simulator take')
        video, still = os.path.join(OUT, f'{id_}.mp4'), os.path.join(OUT, f'{id_}.jpg')
        loop(id_, recording, video)
        poster(id_, recording, still)
        made.append(id_)
        print(f'{id_}: {os.path.getsize(video) // 1024} KB loop, '
              f'{os.path.getsize(still) // 1024} KB poster')

    if made:
        all_ids = sorted(i for i, k in kinds.items()
                         if k == 'bar' and os.path.exists(os.path.join(OUT, f'{i}.jpg')))
        sheet(all_ids, args.recordings)
    print(f'{len(made)} bar loops in {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
