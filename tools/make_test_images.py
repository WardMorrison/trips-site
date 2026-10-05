"""Plain placeholder landscapes for the two test trips. Delete with the test trips once real ones exist."""
import math, random
from pathlib import Path
from PIL import Image, ImageDraw

SETS = {
  "test-palau":  [["#d4e4e6", "#7fb8b8", "#2e7f86", "#1d4f57"], ["#e3ecea", "#9cc9c0", "#3f8f87", "#24504d"], ["#dfe9ef", "#8db7c9", "#3f7591", "#223f52"]],
  "test-africa": [["#f0e3c2", "#d3a463", "#9a6539", "#5a3a24"], ["#ece0c8", "#c4a77a", "#86704c", "#4b3f2c"], ["#f2e2cc", "#d99b6a", "#a65d3d", "#5e3427"]],
}
def scene(pal, seed, path, w=1600, h=1100):
    r = random.Random(seed)
    im = Image.new("RGB", (w, h), pal[0]); d = ImageDraw.Draw(im)
    for i, col in enumerate(pal[1:]):
        base = h * (0.45 + i * 0.17); amp = h * (0.10 - i * 0.02); ph = r.random() * 6; f = 1.2 + r.random() * 1.6
        pts = [(x, base - amp * math.sin(x / w * f * math.pi + ph)) for x in range(0, w + 20, 20)]
        d.polygon(pts + [(w, h), (0, h)], fill=col)
    im.save(path, quality=85)

for slug, pals in SETS.items():
    for i, (name, pal) in enumerate(zip(["cover", "01", "02"], pals)):
        scene(pal, f"{slug}{i}", Path("src/content/trips") / slug / f"{name}.jpg")
print("ok")
