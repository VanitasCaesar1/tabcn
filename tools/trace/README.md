# Icon tracing

The `icons.tsx` file of each design in `registry/designs/` is traced from its reference image in `references/` (which is git-ignored; see its README to restore the images).

Requires Python 3 with Pillow and NumPy, and `potrace` (`brew install potrace`).

```bash
python3 tools/trace/trace.py tools/trace/specs/2.json        # writes specs/2.out.json
python3 tools/trace/preview.py tools/trace/specs/2.out.json /tmp/2.png 2 954,61,2286,358   # check against the reference
python3 tools/trace/gen_icons.py top-notch "Top Notch" 2 tools/trace/specs/2.out.json TodayIcon,DiscoverIcon,SleepIcon,CreateIcon,YouIcon
```

A spec gives the bar's bounding box in the rotated reference image, the number of tabs, the vertical band the icons sit in, and options for tricky backgrounds (`neutral`, `exclude`, per-tab overrides under `tab`). `mode: "multi"` traces each colour of sticker-style icons as its own layer.
