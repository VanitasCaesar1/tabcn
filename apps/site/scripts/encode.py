"""Encode simulator recordings (1206 x 2622) into the site's and README's media.

usage: python3 encode.py <rec dir> <id> [<id> ...]
  apps/site/public/videos/<id>.mp4   590 wide, 30 fps, x264 crf 27
  apps/site/public/videos/<id>.jpg   poster at 0.6 s
  assets/readme/<id>.gif             the bar strip, 480 wide, 15 fps
  apps/site/public/stills/<id>-<n>.jpg  420 x 522: the screen's lower part, one per settled
                                        tab state (the bar region stops changing)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SITE = ROOT / 'apps/site/public'
STILL_TOP = int(sys.argv[sys.argv.index('--still-top') + 1]) if '--still-top' in sys.argv else 1123
STILL_H = 1499  # 1206 * 522 / 420
# The README GIF's strip: the bar's bottom 420 px, or from a higher top for a design with a
# control above its bar (Ask Dock's prompt), down to the same bottom edge.
GIF_TOP = {'ask-dock': 1930}
GIF_BOTTOM = 2572


def run(*args):
    subprocess.run(args, check=True)


def frames(src: Path, fps: int = 10):
    """Grayscale bar-strip frames (bottom 470 px, quartered) and the full frames' times."""
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(src), '-vf',
         f'fps={fps},crop=1206:470:0:2152,scale=302:118,format=gray', '-f', 'rawvideo', '-'],
        check=True, capture_output=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, 118, 302).astype(np.int16)
    return arr, [i / fps for i in range(len(arr))]


def settled_times(src: Path, want: int):
    arr, times = frames(src)
    diff = [0] + [int(np.abs(arr[i] - arr[i - 1]).mean() * 100) for i in range(1, len(arr))]
    still = [d < 40 for d in diff]
    segments, start = [], None
    for i, s in enumerate(still + [False]):
        if s and start is None:
            start = i
        if not s and start is not None:
            if i - start >= 4:  # 0.4 s without change
                segments.append((start, i - 1))
            start = None
    picks, last = [], None
    for a, b in segments:
        mid = (a + b) // 2
        if last is None or np.abs(arr[mid] - arr[last]).mean() * 100 > 60:
            picks.append(mid)
            last = mid
        if len(picks) == want:
            break
    return [times[i] for i in picks]


def encode(rec: Path, id_: str):
    src = rec / f'{id_}.mp4'
    run('ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf', 'scale=590:-2:flags=lanczos,fps=30',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-an',
        '-movflags', '+faststart', str(SITE / f'videos/{id_}.mp4'))
    run('ffmpeg', '-v', 'error', '-y', '-ss', '0.6', '-i', str(src), '-frames:v', '1', '-vf',
        'scale=590:-2:flags=lanczos', '-q:v', '3', str(SITE / f'videos/{id_}.jpg'))
    run('ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf',
        f'crop=1206:{GIF_BOTTOM - GIF_TOP.get(id_, 2152)}:0:{GIF_TOP.get(id_, 2152)},'
        'fps=15,scale=480:-1:flags=lanczos,split[a][b];'
        '[a]palettegen=max_colors=96:stats_mode=diff[p];'
        '[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
        str(ROOT / f'assets/readme/{id_}.gif'))
    old = sorted(SITE.glob(f'stills/{id_}-*.jpg'))
    want = max(2, len(old)) if old else 3
    times = settled_times(src, want)
    for f in old:
        f.unlink()
    for n, t in enumerate(times, 1):
        tmp = rec / f'{id_}-still.png'
        run('ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', str(src), '-frames:v', '1', str(tmp))
        im = Image.open(tmp).convert('RGB').crop((0, STILL_TOP, 1206, STILL_TOP + STILL_H))
        im.resize((420, 522), Image.LANCZOS).save(SITE / f'stills/{id_}-{n}.jpg', quality=86, optimize=True)
        tmp.unlink()
    print(f'{id_}: video, poster, gif, {len(times)} stills at {[round(t, 1) for t in times]}')


if __name__ == '__main__':
    rec = Path(sys.argv[1])
    for id_ in [a for a in sys.argv[2:] if not a.startswith('--') and not a.isdigit()]:
        encode(rec, id_)
