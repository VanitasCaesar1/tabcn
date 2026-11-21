"""
Draws the Mini Player demo's three cover images: abstract, original artwork made of soft
gradients and blurred shapes, one per demo track (src/panel-demos.tsx, TRACKS).

Run from anywhere: python3 apps/example/assets/covers/generate.py
Needs Pillow. Writes slow-tide.jpg, paper-planes.jpg and night-bus.jpg (600 x 600, JPEG: ~15 KB each) beside it.
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

SIZE = 600
OUT = Path(__file__).resolve().parent


def gradient(top, bottom, angle_skew=0.0):
    """A vertical gradient from `top` to `bottom`, leaning by `angle_skew` (0..1) to the right."""
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = min(1.0, max(0.0, (y + angle_skew * (x - SIZE / 2)) / SIZE))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    return img


def glow(base, box, color, blur, alpha=255, shape="ellipse"):
    """Lays a blurred shape of `color` over `base` (screen-like soft light)."""
    layer = Image.new("RGBA", (SIZE, SIZE), color + (0,))
    mask = Image.new("L", (SIZE, SIZE), 0)
    draw = ImageDraw.Draw(mask)
    if shape == "ellipse":
        draw.ellipse(box, fill=alpha)
    else:
        draw.polygon(box, fill=alpha)
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)))
    return Image.alpha_composite(base.convert("RGBA"), layer)


def ring(base, center, radius, width, color, alpha, blur=1.5):
    """A thin soft ring."""
    mask = Image.new("L", (SIZE, SIZE), 0)
    cx, cy = center
    ImageDraw.Draw(mask).ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius), outline=alpha, width=width
    )
    layer = Image.new("RGBA", (SIZE, SIZE), color + (0,))
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)))
    return Image.alpha_composite(base, layer)


def grain(img, amount=2):
    """A faint, fixed noise so the gradients don't band."""
    noise = Image.effect_noise((SIZE, SIZE), amount).convert("RGB")
    grey = Image.new("RGB", (SIZE, SIZE), (128, 128, 128))
    return ImageChops.add(img.convert("RGB"), ImageChops.subtract(noise, grey), 1.0, 0)


def slow_tide():
    # Deep sea blue to teal, with a pale moon and soft wave bands.
    img = gradient((18, 52, 92), (64, 168, 170), 0.25).convert("RGBA")
    img = glow(img, (330, 70, 520, 260), (250, 236, 210), 40, 230)
    for i, y in enumerate((360, 420, 485)):
        img = glow(
            img,
            (-120 + i * 40, y, 720 - i * 30, y + 120),
            (150 - i * 20, 220 - i * 10, 215),
            30,
            110,
        )
    return img


def paper_planes():
    # Warm apricot to butter yellow, with two folded triangles drifting up.
    img = gradient((246, 160, 120), (252, 226, 150), -0.3).convert("RGBA")
    img = glow(img, (-80, 340, 320, 740), (255, 120, 110), 70, 170)
    img = glow(img, [(130, 400), (430, 170), (300, 470)], (255, 250, 240), 6, 235, "polygon")
    img = glow(img, [(300, 470), (430, 170), (330, 360)], (238, 200, 170), 6, 200, "polygon")
    img = glow(img, [(380, 300), (520, 200), (470, 320)], (255, 252, 245), 5, 200, "polygon")
    return img


def night_bus():
    # Indigo night with magenta haze and soft round lights passing by.
    img = gradient((24, 18, 58), (96, 36, 108), 0.15).convert("RGBA")
    img = glow(img, (-60, 300, 660, 700), (210, 70, 140), 90, 150)
    for x, y, r, color in (
        (150, 210, 46, (255, 196, 120)),
        (300, 250, 30, (255, 226, 170)),
        (430, 200, 56, (140, 170, 255)),
        (500, 330, 24, (255, 150, 190)),
    ):
        img = glow(img, (x - r, y - r, x + r, y + r), color, 14, 210)
    img = ring(img, (300, 300), 210, 3, (255, 255, 255), 60)
    return img


for name, draw in (
    ("slow-tide", slow_tide),
    ("paper-planes", paper_planes),
    ("night-bus", night_bus),
):
    grain(draw()).convert("RGB").save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    print(f"wrote {name}.jpg")
