"""Studio demo videos: a design shown on a framed iPhone, with a camera that follows the finger.

A screen recording of the simulator, played inside a drawn iPhone 17 Pro on a soft background. A
camera zooms in ahead of each touch and follows the finger along a drag, then pulls back at the
end; a soft ring shows each touch (it dips while pressed and travels with a drag). The camera
moves on a critically damped spring and is motion blurred while it moves fast. 60 fps, 1920 x 1200.

  AGENT_DEVICE=<agent-device command bound to your simulator> \\
    python3 apps/site/scripts/studio.py record <out dir> <id> [<id> ...]
  python3 apps/site/scripts/studio.py render <out dir> <id> [<id> ...]

`record` needs the same setup as record.sh (one prepared simulator with Expo Go, the example app's
Metro; METRO=exp://127.0.0.1:<port> if it isn't on 8081; SIM_UDID=<udid> to set the status bar to
9:41). Turn off Expo Go's floating tools button first (its dev menu, "Tools button"). It opens the design, plays its steps from
apps/example/src/demo-actions.ts (or taps two other tabs and comes back, as record.sh does),
(or its longer storyboard in STUDIO_ACTIONS), records without the touch overlay, and writes <id>.raw.mp4 and <id>.events.json: each touch's time,
place and kind. `render` turns those two into <id>.studio.mp4. Needs ffmpeg, numpy and Pillow.
"""
import json
import math
import os
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

# The recording phone: iPhone 17 Pro, 402 x 874 pt at 3x.
PT = 3
SCREEN_W, SCREEN_H = 1206, 2622
SCREEN_RADIUS = 62 * PT
BEZEL = 13 * PT  # black border around the screen
RIM = 2 * PT  # the titanium edge outside it

OUT_W, OUT_H = 1920, 1200
FPS = 60
BACKGROUND = (246, 246, 244)
# The phone fills this much of the frame's height when the camera is out.
FIT = 0.9
# The wide shot before the first touch, in seconds.
OPENING = 2.8
# The touch ring, in points on the phone.
RING = 21


# ---------------------------------------------------------------------------------------------
# record


def agent(*args, capture=False):
    cmd = shlex.split(os.environ['AGENT_DEVICE']) + list(args)
    if capture:
        return subprocess.run(cmd, capture_output=True, text=True).stdout
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return ''


def nodes():
    """The accessibility tree's labelled nodes with their rects, in points."""
    try:
        tree = json.loads(agent('snapshot', '-i', '--json', capture=True))
    except json.JSONDecodeError:
        return []
    found = []

    def walk(n):
        if isinstance(n, dict):
            if n.get('label') and isinstance(n.get('rect'), dict):
                found.append((n['label'], n['rect'], n.get('ref')))
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(tree)
    return found


def find(pattern):
    for label, rect, ref in nodes():
        if re.match(pattern, label):
            return rect, ref
    return None, None


def center(rect):
    return rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2


def steps_for(design):
    """The design's studio storyboard (STUDIO_ACTIONS), or its site demo steps (DEMO_ACTIONS)."""
    script = (
        "import { DEMO_ACTIONS, STUDIO_ACTIONS } from './apps/example/src/demo-actions.ts'; "
        f"console.log(JSON.stringify(STUDIO_ACTIONS['{design}'] ?? DEMO_ACTIONS['{design}'] ?? null))"
    )
    out = subprocess.run(['bun', '-e', script], cwd=ROOT, capture_output=True, text=True).stdout
    return json.loads(out.strip() or 'null')


def record(out_dir: Path, design: str):
    metro = os.environ.get('METRO', 'exp://127.0.0.1:8081')
    routes = json.loads((HERE / 'record-routes.json').read_text())
    route = routes.get(design, f'designs/{design}')
    # Apple's marketing status bar: 9:41, full battery, full Wi-Fi.
    udid = os.environ.get('SIM_UDID')
    if udid:
        subprocess.run(['xcrun', 'simctl', 'status_bar', udid, 'override', '--time', '9:41',
                        '--batteryState', 'discharging', '--batteryLevel', '100', '--wifiBars', '3',
                        '--cellularMode', 'notSupported'], check=False)
    agent('open', 'host.exp.Exponent', '--relaunch')
    time.sleep(2)
    agent('open', 'host.exp.Exponent', f'{metro}/--/{route}?record=1')
    for _ in range(40):
        if find(r'.*, tab, 1 of')[0]:
            break
        time.sleep(2)
    time.sleep(2.5)

    raw = out_dir / f'{design}.raw.mp4'
    events = []
    agent('record', 'start', '--scope', 'device', '--hide-touches', str(raw))
    t0 = time.monotonic()
    now = lambda: time.monotonic() - t0  # noqa: E731
    time.sleep(1.2)

    def tap(pattern, hold=0.0):
        rect, ref = find(pattern)
        if not rect:
            print(f'  missing: {pattern}')
            return
        x, y = center(rect)
        events.append({'kind': 'tap', 't': now(), 'x': x, 'y': y, 'hold': hold})
        target = f'@{ref}' if ref else None
        if hold:
            agent('longpress', *(target.split() if target else [str(x), str(y)]), str(int(hold * 1000)))
        else:
            agent('press', *([target] if target else [str(x), str(y)]))

    steps = steps_for(design)
    if steps is None:
        found = nodes()
        tabs = [(label, rect) for label, rect, _ in found if re.search(r', tab, \d+ of', label)]
        count = len(tabs)
        selected = 1
        # The snapshot marks the selected tab in its text form; the JSON keeps the order.
        text = agent('snapshot', '-i', capture=True)
        m = re.search(r'tab, (\d+) of[^\n]*\[selected\]', text)
        if m:
            selected = int(m.group(1))
        steps = []
        for k in (1, 2):
            t = (selected - 1 + k) % max(count, 1) + 1
            if t != selected:
                steps += [{'tab': t - 1}, {'wait': 1400}]
        steps += [{'tab': selected - 1}, {'wait': 1400}]

    for step in steps:
        kind, arg = next(iter(step.items()))
        if kind == 'wait':
            time.sleep(arg / 1000)
        elif kind == 'tab':
            tap(rf'.*, tab, {arg + 1} of')
        elif kind == 'tap':
            tap(re.escape(arg) + '$')
        elif kind == 'longPress':
            tap(re.escape(arg) + '$', hold=0.6)
        elif kind == 'tapAt':
            x, y = arg
            events.append({'kind': 'tap', 't': now(), 'x': x, 'y': y, 'hold': 0})
            agent('press', str(x), str(y))
        elif kind == 'pan':
            x, y, dx, dy, ms = arg
            events.append(
                {'kind': 'pan', 't': now(), 'x': x, 'y': y, 'dx': dx, 'dy': dy, 'ms': ms}
            )
            agent('gesture', 'pan', *[str(v) for v in arg])
    time.sleep(1.4)
    end = now()
    agent('record', 'stop')
    (out_dir / f'{design}.events.json').write_text(
        json.dumps({'design': design, 'end': end, 'events': events}, indent=1)
    )
    print(f'{design}: {len(events)} touches, {end:.1f} s')


# ---------------------------------------------------------------------------------------------
# render


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True,
        text=True,
    ).stdout
    return float(out.strip())


def read_frames(path: Path, start: float = 0.0):
    """The recording from `start` at a steady 60 fps. A simulator recording keeps only changed
    frames, so it is decoded from the beginning and the frames before `start` are skipped: an
    input seek would drop the frame held across `start` and begin at the next change."""
    skip = round(start * FPS)
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-vf', f'fps={FPS}',
         '-f', 'rawvideo',
         '-pix_fmt', 'rgb24', '-'],
        stdout=subprocess.PIPE,
    )
    size = SCREEN_W * SCREEN_H * 3
    index = 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        index += 1
        if index <= skip:
            continue
        yield Image.frombuffer('RGB', (SCREEN_W, SCREEN_H), buf, 'raw', 'RGB', 0, 1)
    proc.wait()


def first_motion(path: Path, after: float) -> float:
    """Seconds into the recording of the first visible change after `after`: where the first
    touch landed, which syncs the touch log's clock with the video's."""
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-vf',
         f'fps={FPS},scale=201:437,format=gray', '-f', 'rawvideo', '-'],
        capture_output=True,
    ).stdout
    n = 201 * 437
    frames = np.frombuffer(raw, np.uint8)[: len(raw) // n * n].reshape(-1, 437, 201)
    start = int(after * FPS)
    for i in range(max(1, start), len(frames)):
        if np.abs(frames[i].astype(int) - frames[i - 1].astype(int)).mean() > 0.6:
            return i / FPS
    return after


def rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def device_template():
    """The phone: titanium rim, black bezel, side buttons, a soft shadow, and the screen's mask.
    Everything at the recording's 3x scale; the screen sits at `screen_at`."""
    pad = 120  # room for the shadow and the buttons
    body_w = SCREEN_W + 2 * (BEZEL + RIM)
    body_h = SCREEN_H + 2 * (BEZEL + RIM)
    w, h = body_w + 2 * pad, body_h + 2 * pad
    body_radius = SCREEN_RADIUS + BEZEL + RIM

    shadow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (pad + 10, pad + 40, pad + body_w - 10, pad + body_h + 10), body_radius, fill=120
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(48))
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    layer.putalpha(shadow)

    draw = ImageDraw.Draw(layer)
    # Side buttons: action and volume on the left, side button on the right.
    button = (70, 72, 76, 255)
    for top, length in ((520, 110), (700, 200), (950, 200)):
        draw.rounded_rectangle((pad - 9, pad + top, pad + 4, pad + top + length), 6, fill=button)
    draw.rounded_rectangle(
        (pad + body_w - 4, pad + 760, pad + body_w + 9, pad + 760 + 300), 6, fill=button
    )
    # The rim (a light-to-dark titanium edge), then the bezel inside it.
    draw.rounded_rectangle(
        (pad, pad, pad + body_w - 1, pad + body_h - 1), body_radius, fill=(92, 94, 98, 255)
    )
    draw.rounded_rectangle(
        (pad + 2, pad + 2, pad + body_w - 3, pad + body_h - 3), body_radius - 2,
        fill=(150, 152, 156, 255),
    )
    draw.rounded_rectangle(
        (pad + RIM, pad + RIM, pad + body_w - RIM - 1, pad + body_h - RIM - 1),
        body_radius - RIM, fill=(8, 8, 9, 255),
    )
    screen_at = (pad + RIM + BEZEL, pad + RIM + BEZEL)
    return layer, screen_at, rounded_mask((SCREEN_W, SCREEN_H), SCREEN_RADIUS)


def draw_island(image, screen_at):
    """The Dynamic Island, which a screen recording leaves out: 126 x 37 pt, 11 pt from the top."""
    w, h, top = 126 * PT, 37 * PT, 11 * PT
    x = screen_at[0] + (SCREEN_W - w) / 2
    y = screen_at[1] + top
    ImageDraw.Draw(image).rounded_rectangle((x, y, x + w, y + h), h / 2, fill=(0, 0, 0, 255))


def ease_in_out(t):
    """Cubic ease in and out, 0 to 1."""
    t = max(0.0, min(1.0, t))
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def touch_point(event, t):
    """Where the finger is at time t (points), for a tap or along a drag. agent-device drags at a
    steady speed, so a drag's point moves linearly."""
    if event['kind'] == 'pan':
        p = max(0.0, min(1.0, (t - event['t']) / (event['ms'] / 1000)))
        return event['x'] + event['dx'] * p, event['y'] + event['dy'] * p
    return event['x'], event['y']


def touch_span(event):
    if event['kind'] == 'pan':
        return event['t'], event['t'] + event['ms'] / 1000
    return event['t'], event['t'] + max(0.12, event.get('hold', 0))


# --- The cursor: one ring for the whole video, gliding from touch to touch. -------------------

# Seconds the cursor takes to travel to the next touch (at most), and how early it lands.
GLIDE = 0.55
LAND = 0.1
# Seconds it fades in before the first touch and out after the last.
CURSOR_IN = 0.9
CURSOR_OUT = 0.9


def cursor_state(events, t):
    """The cursor at time t: (x, y, opacity, scale, pressed), or None when it isn't shown."""
    if not events:
        return None
    first_t = events[0]['t']
    last_end = touch_span(events[-1])[1]
    if t < first_t - CURSOR_IN or t > last_end + CURSOR_OUT:
        return None
    opacity = min(1.0, (t - (first_t - CURSOR_IN)) / 0.3, (last_end + CURSOR_OUT - t) / 0.3)
    # During a touch: on the finger, pressed.
    for e in events:
        a, b = touch_span(e)
        if a <= t <= b:
            x, y = touch_point(e, t)
            k = min(1.0, (t - a) / 0.07)
            return x, y, opacity, 1.0 - 0.16 * k, k
    # Between touches: resting at the last one, then gliding to the next.
    prev, nxt = None, None
    for e in events:
        if touch_span(e)[1] < t:
            prev = e
        elif nxt is None and e['t'] > t:
            nxt = e
    if prev is None:
        x, y = touch_point(nxt, nxt['t'])
        return x, y, opacity, 1.0, 0.0
    pend = touch_span(prev)[1]
    px, py = touch_point(prev, pend)
    # Released: springs back from the press with a small overshoot.
    since = t - pend
    release = 1.0 + 0.06 * math.exp(-since * 9) * math.sin(since * 22) if since < 0.5 else 1.0
    pressed = max(0.0, 1.0 - since / 0.12)
    scale = 0.84 + 0.16 * min(1.0, since / 0.12) * release
    if nxt is None:
        return px, py, opacity, scale, pressed
    nx, ny = touch_point(nxt, nxt['t'])
    arrive = nxt['t'] - LAND
    leave = max(pend + 0.12, arrive - GLIDE)
    k = ease_in_out((t - leave) / max(0.01, arrive - leave))
    return px + (nx - px) * k, py + (ny - py) * k, opacity, scale, pressed


def draw_cursor(image, x, y, opacity, scale, pressed, screen_at):
    """A light translucent ring with a hairline edge and a soft shadow, on the phone (3x px)."""
    r = RING * PT * scale
    cx, cy = screen_at[0] + x * PT, screen_at[1] + y * PT
    pad = int(r + 40)
    box = (int(cx) - pad, int(cy) - pad, int(cx) + pad, int(cy) + pad)
    size = (box[2] - box[0], box[3] - box[1])
    ox, oy = cx - box[0], cy - box[1]
    shadow = Image.new('L', size, 0)
    ImageDraw.Draw(shadow).ellipse((ox - r, oy - r + 6, ox + r, oy + r + 6), fill=int(70 * opacity))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    layer.putalpha(shadow)
    d = ImageDraw.Draw(layer)
    fill = int((95 + 70 * pressed) * opacity)
    d.ellipse((ox - r, oy - r, ox + r, oy + r), fill=(236, 237, 240, fill),
              outline=(255, 255, 255, int(220 * opacity)), width=int(1.6 * PT))
    image.alpha_composite(layer, (box[0], box[1]))


# --- The camera: a few decisive moves, then still while the UI moves. -------------------------

# The zoomed shot shows the lower part of the phone, its bottom edge just inside the frame.
SHOT_ZOOM = 1.95
# Seconds a camera move takes, and how long the camera stays in after the last touch of a run.
MOVE = 0.5
STAY = 0.9
# Touches closer together than this keep the camera in; a longer pause in the storyboard is a
# break between beats, where it pulls back to the wide shot.
RUN_GAP = 2.8
# A slow push in while the camera holds, for life (fraction of zoom per second), at most PUSH_MAX.
PUSH = 0.008
PUSH_MAX = 0.03
# Motion blur: the shutter is open this many frames; samples while the camera moves.
SHUTTER = 1.4
BLUR_SAMPLES = 12


def camera_keys(events, end, body, base):
    """Keyframes (time, zoom, centre x, centre y in template px): wide, then for each run of
    touches a move in to a shot that frames them, held (panning only when a touch falls outside
    it), and a move back out."""
    wide = (1.0, (body[0] + body[2]) / 2, (body[1] + body[3]) / 2)
    # (time, zoom, x, y, how the segment that ends here moves: 'ease' or 'hold').
    keys = [(0.0, *wide, 'ease')]
    if not events:
        return keys
    runs, current = [], [events[0]]
    for e in events[1:]:
        if e['t'] - touch_span(current[-1])[1] < RUN_GAP:
            current.append(e)
        else:
            runs.append(current)
            current = [e]
    runs.append(current)

    def shot_for(points_y):
        """The shot whose frame holds these screen y's (points): bottom-anchored when it can."""
        s = base * SHOT_ZOOM
        half_h = OUT_H / 2 / s
        bottom_cy = body[3] + 30 / s - half_h
        top_visible = (bottom_cy - half_h - (body[1] + BEZEL + RIM)) / PT
        cx = (body[0] + body[2]) / 2
        if min(points_y) > top_visible + 40:
            return SHOT_ZOOM, cx, bottom_cy
        mid = (min(points_y) + max(points_y)) / 2
        cy = body[1] + BEZEL + RIM + mid * PT
        return SHOT_ZOOM, cx, min(cy, bottom_cy)

    for run in runs:
        ys = []
        for e in run:
            ys.append(e['y'])
            if e['kind'] == 'pan':
                ys.append(e['y'] + e['dy'])
        shot = shot_for(ys)
        # In just before the cursor sets off for the first touch, or as soon as the last move
        # out allows when the beats are close.
        t_in = max(keys[-1][0] + 0.05, run[0]['t'] - GLIDE - MOVE - 0.1)
        keys.append((t_in, *keys[-1][1:4], 'hold'))
        keys.append((t_in + MOVE, *shot, 'ease'))
        later = [r for r in runs if r[0]['t'] > run[-1]['t']]
        # Out after the last touch, but early enough to be wide for a moment before the next beat.
        stay_until = touch_span(run[-1])[1] + STAY
        if later:
            stay_until = min(stay_until, later[0][0]['t'] - GLIDE - 2 * MOVE - 0.25)
        t_out = max(min(stay_until, end - MOVE - 0.8), t_in + MOVE)
        # The hold pushes in slowly, so the shot never sits dead still, its bottom edge held.
        z1 = shot[0] * (1 + min(PUSH_MAX, PUSH * (t_out - t_in - MOVE)))
        bottom = shot[2] + OUT_H / 2 / (base * shot[0])
        pushed = (z1, shot[1], bottom - OUT_H / 2 / (base * z1))
        keys.append((t_out, *pushed, 'hold'))
        keys.append((t_out + MOVE, *wide, 'ease'))
    return keys


def camera_at(keys, t):
    """The camera at time t, eased between keyframes, with a slow push while it holds still."""
    if t <= keys[0][0]:
        return keys[0][1:4]
    for (t0, z0, x0, y0, _), (t1, z1, x1, y1, how) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / max(1e-6, t1 - t0)
            if how == 'ease':
                k = ease_in_out(k)
            # Zoom eases in log space, so in and out feel the same speed.
            z = math.exp(math.log(z0) + (math.log(z1) - math.log(z0)) * k)
            return z, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k
    return keys[-1][1:4]


def render(out_dir: Path, design: str):
    raw = out_dir / f'{design}.raw.mp4'
    log = json.loads((out_dir / f'{design}.events.json').read_text())
    events = sorted(log['events'], key=lambda e: e['t'])
    # Sync: the first touch shows on screen within a frame or two of being sent.
    shift = 0.0
    if events:
        seen = first_motion(raw, max(0.0, events[0]['t'] - 0.6))
        shift = seen - events[0]['t'] - 0.03
        for e in events:
            e['t'] += shift
    # A simulator recording keeps only changed frames, so a still ending is cut off: hold the
    # last frame until the touch log's end, then a moment on the wide shot.
    duration = max(probe_duration(raw), log['end'] + shift) + 0.6
    # Open on the wide shot for a moment, not the whole wait before the first touch.
    start = max(0.0, events[0]['t'] - OPENING) if events else 0.0
    for e in events:
        e['t'] -= start
    duration -= start

    template, screen_at, screen_mask = device_template()
    base = FIT * OUT_H / (SCREEN_H + 2 * (BEZEL + RIM))  # template px -> output px, camera out
    body = (screen_at[0] - BEZEL - RIM, screen_at[1] - BEZEL - RIM,
            screen_at[0] + SCREEN_W + BEZEL + RIM, screen_at[1] + SCREEN_H + BEZEL + RIM)
    keys = camera_keys(events, duration, body, base)

    def matrix(zoom, cx, cy):
        s = base * zoom
        return (1 / s, 0, cx - OUT_W / 2 / s, 0, 1 / s, cy - OUT_H / 2 / s)

    background = backdrop()
    out_path = out_dir / f'{design}.studio.mp4'
    enc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s',
         f'{OUT_W}x{OUT_H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow',
         '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out_path)],
        stdin=subprocess.PIPE,
    )
    count = 0

    def frames_until_end():
        last = None
        for last in read_frames(raw, start):
            yield last
        while last is not None:
            yield last

    for i, frame in enumerate(frames_until_end()):
        t = i / FPS
        if t > duration:
            break
        phone = template.copy()
        phone.paste(frame, screen_at, screen_mask)
        draw_island(phone, screen_at)
        cursor = cursor_state(events, t)
        if cursor:
            draw_cursor(phone, *cursor, screen_at)
        # The camera over the shutter: one sample when still, many while it moves.
        a = camera_at(keys, t)
        b = camera_at(keys, t + SHUTTER / FPS)
        moving = abs(math.log(b[0] / a[0])) > 0.004 or abs(b[1] - a[1]) + abs(b[2] - a[2]) > 3
        times = [t + SHUTTER / FPS * k / (BLUR_SAMPLES - 1) for k in range(BLUR_SAMPLES)] if moving else [t]
        acc = None
        for ts in times:
            view = phone.transform((OUT_W, OUT_H), Image.Transform.AFFINE,
                                   matrix(*camera_at(keys, ts)), resample=Image.Resampling.BICUBIC)
            shot = background.copy()
            shot.paste(view, (0, 0), view)
            arr = np.asarray(shot, dtype=np.float32)
            acc = arr if acc is None else acc + arr
        image = (acc / len(times)).astype(np.uint8)
        enc.stdin.write(image.tobytes())
        count += 1
    enc.stdin.close()
    enc.wait()
    print(f'{design}: {out_path} ({count} frames, {count / FPS:.1f} s)')


def backdrop():
    """The flat off-white background (a glow behind the phone showed its edge through the blur)."""
    return Image.new('RGB', (OUT_W, OUT_H), BACKGROUND)


def main():
    if len(sys.argv) < 4 or sys.argv[1] not in ('record', 'render'):
        print(__doc__)
        sys.exit(1)
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for design in sys.argv[3:]:
        (record if sys.argv[1] == 'record' else render)(out_dir, design)


if __name__ == '__main__':
    main()
