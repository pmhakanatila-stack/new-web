import json
import os
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "work" / "legacy-news-images" / "download-manifest.json"
TARGET_ROOT = ROOT / "assets" / "migrated" / "news"
OUTPUT = ROOT / "scripts" / "legacy-news-images.json"

records = json.loads(SOURCE.read_text(encoding="utf-8"))
converted = []

for record in records:
    target_dir = TARGET_ROOT / record["slug"]
    target_dir.mkdir(parents=True, exist_ok=True)
    images = []
    source_files = record["files"] or [{"raw": "assets/migrated/0001-new.png", "fallback": True}]
    for index, item in enumerate(source_files, start=1):
        source = ROOT / item["raw"]
        target = target_dir / f"{index:02d}.webp"
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            image.save(target, "WEBP", quality=84, method=6)
            width, height = image.size
        images.append({
            "path": target.relative_to(ROOT).as_posix(),
            "width": width,
            "height": height,
            "bytes": os.path.getsize(target),
        })
    converted.append({
        "slug": record["slug"],
        "id": record["id"],
        "title": record["title"],
        "usedPlaceholder": not bool(record["files"]),
        "images": images,
    })
    print(f'{record["id"]}: {len(images)} WebP')

OUTPUT.write_text(json.dumps(converted, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Manifest: {OUTPUT}")
