# Icon tracing

The `icons.tsx` file of each design in `registry/designs/` is traced from its reference image in `references/` (which is git-ignored; see its README to restore the images).

Requires Python 3 with Pillow and NumPy, and `potrace` (`brew install potrace`).

```bash
python3 tools/trace/trace.py tools/trace/specs/2.json        # writes specs/2.out.json
python3 tools/trace/preview.py tools/trace/specs/2.out.json /tmp/2.png 2 954,61,2286,358   # check against the reference
python3 tools/trace/gen_icons.py top-notch "Top Notch" 2 tools/trace/specs/2.out.json TodayIcon,DiscoverIcon,SleepIcon,CreateIcon,YouIcon
```

A spec gives the bar's bounding box in the rotated reference image, the number of tabs, the vertical band the icons sit in, and options for tricky backgrounds (`neutral`, `exclude`, per-tab overrides under `tab`). `mode: "multi"` traces each colour of sticker-style icons as its own layer.

## Sticker icons

`stickers.py` traces sticker-style art (coloured shapes inside a white die-cut border), used for Gradient Stickers, Sticker Tiles and the Chip Rail avatar:

```bash
python3 tools/trace/stickers.py tools/trace/specs/13s.json   # writes specs/13s.out.json
python3 tools/trace/gen_icons.py gradient-stickers "Gradient Stickers" 13 tools/trace/specs/13s.out.json HouseIcon,MapIcon,ShopIcon,BagIcon,CatIcon
```

It finds the white border by colour and fills it to get a smooth silhouette, then clusters the art's colours on flat pixels only, so JPEG blends at colour edges don't become colours of their own. Every layer is smoothed before it is traced. For art without a white border, set `bg` to the background colour. `erase` with `mirror` fills an area hidden under a badge with the icon's mirror image. The printed `BIGPX … pt` is the size to render the icons at: the design's `ICON` constant.

`orbs.py` builds the Orbs icons. Their curved lettering and timer digits are set in Impact and Arial Bold and warped to match the reference, because the JPEG is too soft to trace them cleanly.
