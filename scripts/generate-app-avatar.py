"""Generate the 144 px public-platform avatar for 竹山同城 (requires Pillow)."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "release" / "zhushan-avatar-144.png"
OUT.parent.mkdir(parents=True, exist_ok=True)
SCALE = 4
SIZE = 144 * SCALE

image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
green = "#17664C"
cream = "#F8F4E8"
gold = "#E7A84A"

draw.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=33 * SCALE, fill=green)
draw.ellipse((28 * SCALE, 28 * SCALE, 116 * SCALE, 116 * SCALE), outline="#8DBBA3", width=2 * SCALE)
draw.ellipse((105 * SCALE, 20 * SCALE, 119 * SCALE, 34 * SCALE), fill=gold)

font_path = Path("C:/Windows/Fonts/msyh.ttc")
if not font_path.exists():
    font_path = Path("C:/Windows/Fonts/simhei.ttf")
font = ImageFont.truetype(str(font_path), 76 * SCALE)
text = "竹"
box = draw.textbbox((0, 0), text, font=font)
width = box[2] - box[0]
height = box[3] - box[1]
draw.text(((SIZE - width) / 2 - box[0], (SIZE - height) / 2 - box[1] - 3 * SCALE), text, font=font, fill=cream)

image = image.resize((144, 144), Image.Resampling.LANCZOS)
image.save(OUT)
print(OUT)
