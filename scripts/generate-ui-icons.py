"""Generate the small local line-icon set used by the mini program.

Run with `python scripts/generate-ui-icons.py` (requires Pillow). The PNGs are
checked in so the WeChat package does not depend on a remote icon font.
"""

from pathlib import Path
from PIL import Image, ImageDraw


OUT = Path(__file__).resolve().parents[1] / "src" / "static" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
SCALE = 4
SIZE = 96


def icon(name: str, color: str, filename: str | None = None) -> None:
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def pts(*values):
        return [(round(x * SCALE), round(y * SCALE)) for x, y in values]

    def line(*values, width=5):
        draw.line(pts(*values), fill=color, width=width * SCALE, joint="curve")
        for x, y in (values[0], values[-1]):
            r = width * SCALE / 2
            draw.ellipse((x*SCALE-r, y*SCALE-r, x*SCALE+r, y*SCALE+r), fill=color)

    def ellipse(box, width=5):
        draw.ellipse(tuple(v * SCALE for v in box), outline=color, width=width * SCALE)

    def rectangle(box, radius=0, width=5):
        box = tuple(v * SCALE for v in box)
        draw.rounded_rectangle(box, radius=radius * SCALE, outline=color, width=width * SCALE)

    if name == "house":
        line((17, 44), (48, 19), (79, 44))
        line((25, 41), (25, 77), (71, 77), (71, 41))
        rectangle((42, 56, 55, 77), radius=2, width=4)
    elif name == "box":
        line((18, 32), (48, 19), (78, 32), (48, 45), (18, 32))
        line((18, 32), (18, 67), (48, 81), (78, 67), (78, 32))
        line((48, 45), (48, 81))
        line((33, 25), (63, 39), (63, 51))
    elif name == "broom":
        line((57, 19), (39, 55), width=6)
        line((32, 54), (46, 61), (39, 78), (20, 68), (32, 54))
        line((27, 60), (24, 72), width=3)
        line((35, 63), (33, 76), width=3)
    elif name == "car":
        line((19, 58), (24, 43), (33, 37), (64, 37), (73, 43), (78, 58), (78, 69), (19, 69), (19, 58))
        line((25, 53), (70, 53))
        ellipse((27, 63, 38, 74), width=4)
        ellipse((59, 63, 70, 74), width=4)
    elif name == "gem":
        line((16, 38), (31, 23), (65, 23), (80, 38), (48, 78), (16, 38))
        line((16, 38), (80, 38))
        line((31, 23), (38, 38), (48, 78), (58, 38), (65, 23))
    elif name == "clipboard":
        rectangle((27, 23, 69, 79), radius=5)
        rectangle((38, 17, 58, 30), radius=3, width=4)
        line((37, 47), (59, 47), width=4)
        line((37, 59), (59, 59), width=4)
    elif name == "store":
        line((19, 42), (24, 23), (72, 23), (77, 42))
        line((19, 42), (25, 51), (34, 51), (43, 42), (52, 51), (61, 51), (70, 42), (77, 42))
        line((26, 52), (26, 77), (70, 77), (70, 52))
        rectangle((39, 58, 57, 77), radius=1, width=4)
    elif name == "plus":
        ellipse((20, 20, 76, 76))
        line((48, 34), (48, 62))
        line((34, 48), (62, 48))
    elif name == "ticket":
        line((20, 28), (76, 28), (76, 41))
        line((76, 55), (76, 68), (20, 68), (20, 55))
        line((20, 41), (20, 28))
        ellipse((13, 41, 27, 55), width=4)
        ellipse((69, 41, 83, 55), width=4)
        line((48, 34), (48, 62), width=3)
    elif name == "user":
        ellipse((36, 20, 60, 44))
        line((25, 73), (29, 59), (38, 52), (58, 52), (67, 59), (71, 73))
        line((25, 73), (71, 73))
    elif name == "search":
        ellipse((21, 20, 59, 58))
        line((56, 56), (76, 76), width=6)
    elif name == "pin":
        line((48, 81), (27, 53), (27, 40))
        line((27, 40), (34, 25), (48, 20), (62, 25), (69, 40), (69, 53), (48, 81))
        ellipse((40, 36, 56, 52), width=4)
    else:
        raise ValueError(name)

    image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    image.save(OUT / (filename or f"{name}.png"))


for name in ("house", "box", "broom", "car", "gem", "clipboard", "store", "plus", "ticket", "user", "search", "pin"):
    icon(name, "#1D654F")

for name in ("house", "store", "ticket", "user"):
    icon(name, "#8D9A93", f"tab-{name}.png")
    icon(name, "#17664C", f"tab-{name}-active.png")
