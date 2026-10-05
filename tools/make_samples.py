"""Generate labeled placeholder landscape images for the sample trips. Delete once real trips exist."""
import random, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
PALETTES = [
  ["#d9e3e0", "#9db08a", "#5f7a4e", "#2f4a35"],
  ["#efe2c4", "#c99a5b", "#8a5a3b", "#4a3326"],
  ["#dde7ee", "#8db3c7", "#4f7f99", "#26475a"],
  ["#f0e6d6", "#b7a78a", "#6f6a54", "#3a3a2f"],
  ["#e7ecdf", "#a9b98c", "#6e8a5c", "#3c5240"],
  ["#f2e8da", "#d6a77a", "#9a6248", "#5b3b2e"],
]
def scene(pal, seed, path, w=1600, h=1000):
    r = random.Random(seed)
    im = Image.new("RGB", (w, h), pal[0]); d = ImageDraw.Draw(im)
    d.ellipse([w*0.68, h*0.12, w*0.68+140, h*0.12+140], fill="#f6f1e4")
    for i, col in enumerate(pal[1:]):
        base = h*(0.42 + i*0.17); amp = h*(0.12 - i*0.025); ph = r.random()*6; f = 1.5 + r.random()*2
        pts = [(x, base - amp*math.sin(x/w*f*math.pi + ph) - amp*0.4*math.sin(x/w*7 + ph*2)) for x in range(0, w+20, 20)]
        d.polygon(pts + [(w, h), (0, h)], fill=col)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf", 42)
    d.rectangle([0, h-90, w, h], fill="#111111")
    d.text((40, h-68), "SAMPLE PHOTO  ·  replace with your own", font=font, fill="#f2ede1")
    im.save(path, quality=85)
trips = {"sample-backpacking-1": 0, "sample-backpacking-2": 4, "sample-research-1": 1, "sample-research-2": 5, "sample-fun-1": 2, "sample-fun-2": 3}
for slug, p in trips.items():
    d = Path("src/content/trips")/slug; d.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(["cover", "01", "02", "03"]):
        scene(PALETTES[(p+i) % 6], hash(slug)+i, d/f"{name}.jpg")
print("ok")
