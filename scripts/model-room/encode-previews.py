"""Trim each rendered preview to its subject, centre it on a 4:3 transparent canvas and write WebP.

    python scripts/model-room/encode-previews.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
for png in sorted((ROOT / 'artifacts/archive-previews').glob('*.png')):
    im = Image.open(png).convert('RGBA')
    # The subject (not its soft shadow) decides the crop: alpha above a third.
    box = im.getchannel('A').point(lambda a: 255 if a > 90 else 0).getbbox()
    w, h = box[2] - box[0], box[3] - box[1]
    pad = int(max(w, h) * .09)
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    crop = im.crop(box)
    W, H = 960, 720
    k = min(W / crop.width, H / crop.height)
    crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(crop, ((W - crop.width) // 2, (H - crop.height) // 2))
    out = ROOT / 'public/models/archive' / (png.stem + '.webp')
    canvas.save(out, quality=88, method=6)
    print(png.stem, out.stat().st_size)
