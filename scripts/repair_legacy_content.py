from __future__ import annotations

import html
import hashlib
import json
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEED_PATH = ROOT / "seed-cms.json"
SOURCE_PATH = ROOT / "content-data.json"
MANIFEST_PATH = ROOT / "legacy-content-repair.json"
VERSION = "legacy-content-clean-v2"
KNOWN_REMOVE_IDS = {"content-13", "content-19", "content-20", "content-34", "content-41", "content-59", "content-66", "content-72"}

LISTING_PATHS = {
    "haberler": {"haberler", "haberler/2"},
    "etkinlikler": {"etkinlikler", "etkinlikler/2"},
    "duyurular": {"duyurular"},
}
LISTING_TITLES = {
    "Haberler - PEYZAJDER",
    "Etkinlikler - PEYZAJDER",
    "Duyurular - PEYZAJDER",
}
OUTPUT_DIRS = {
    "haberler": "news",
    "etkinlikler": "events",
    "duyurular": "notices",
}
NOISE_PATTERNS = [
    re.compile(r"^var\s+approachingEvent", re.I),
    re.compile(r"^YÖNETİM\s+Başkanın\s+Mesajları", re.I),
    re.compile(r"^DERNEK\s+ve\s+ÜYELER\s+Hakkımızda", re.I),
    re.compile(r"^Banka\s+Hesap\s+Numaralarımız", re.I),
    re.compile(r"^Adres\s*:", re.I),
    re.compile(r"^E-?Posta\s*:", re.I),
    re.compile(r"^Güncel\s+haberler,\s*duyurular", re.I),
    re.compile(r"^Bu\s+internet\s+sitesinde\s+sizlere", re.I),
]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalized(value: str) -> str:
    value = str(value or "").strip().casefold()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def slugify(value: str) -> str:
    value = normalized(value.replace("ı", "i"))
    slug = re.sub(r"\s+", "-", value).strip("-") or "icerik"
    if len(slug) > 96:
        digest = hashlib.sha1(slug.encode("utf-8")).hexdigest()[:10]
        slug = f"{slug[:80].rstrip('-')}-{digest}"
    return slug


def clean_title(value: str) -> str:
    title = re.sub(r"\s+", " ", str(value or "")).strip()
    if title.count('"') % 2:
        title = title.replace('" - PEYZAJDER', ' - PEYZAJDER')
    return title


def clean_paragraphs(page: dict) -> list[str]:
    title_key = normalized(re.sub(r"\s*-\s*PEYZAJDER\s*$", "", clean_title(page.get("title", "")), flags=re.I))
    result: list[str] = []
    seen: set[str] = set()
    for raw in page.get("paragraphs") or []:
        text = re.sub(r"\s+", " ", str(raw or "")).strip()
        if not text or any(pattern.search(text) for pattern in NOISE_PATTERNS):
            continue
        key = normalized(text)
        if not key or key == title_key or key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def summary_for(title: str, paragraphs: list[str]) -> str:
    fallback = re.sub(r"\s*-\s*PEYZAJDER\s*$", "", title, flags=re.I).strip()
    text = paragraphs[0] if paragraphs else fallback
    return text if len(text) <= 320 else text[:317].rstrip() + "..."


def body_for(title: str, paragraphs: list[str]) -> str:
    fallback = re.sub(r"\s*-\s*PEYZAJDER\s*$", "", title, flags=re.I).strip()
    values = paragraphs or [fallback]
    return "".join(f"<p>{html.escape(value)}</p>" for value in values)


def source_images(page: dict) -> list[Path]:
    result: list[Path] = []
    seen: set[Path] = set()
    for item in page.get("images") or []:
        if str(item.get("alt") or "").strip().casefold() == "peyzajder":
            continue
        src = str(item.get("src") or "").strip().replace("/", str(Path("/")).replace("/", "\\"))
        if not src:
            continue
        path = ROOT / Path(src)
        if path.exists() and path not in seen:
            result.append(path)
            seen.add(path)
    return result


def current_webp_images(record: dict) -> list[str]:
    values = [record.get("image"), *(record.get("images") or [])]
    result: list[str] = []
    for raw in values:
        value = str(raw or "").strip().replace("\\", "/")
        if value and value.lower().endswith(".webp") and (ROOT / value).exists() and value not in result:
            result.append(value)
    return result


def convert_images(category: str, title: str, paths: list[Path]) -> list[str]:
    target_dir = ROOT / "assets" / "migrated" / OUTPUT_DIRS[category] / slugify(title)
    target_dir.mkdir(parents=True, exist_ok=True)
    output: list[str] = []
    for index, source in enumerate(paths, start=1):
        destination = target_dir / f"{index:02d}.webp"
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.width > 2400 or image.height > 2400:
                image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            image.save(destination, "WEBP", quality=88, method=6)
        output.append(destination.relative_to(ROOT).as_posix())
    return output


def find_record(records: list[dict], page: dict) -> dict | None:
    page_title = normalized(clean_title(page.get("title", "")))
    for record in records:
        if normalized(clean_title(record.get("title", ""))) == page_title:
            return record
    return None


def repair_record(record: dict, page: dict, category: str) -> dict:
    title = clean_title(page.get("title", record.get("title", "")))
    paragraphs = clean_paragraphs(page)
    images = current_webp_images(record) if category == "haberler" else []
    if not images:
        images = convert_images(category, title, source_images(page))
    if not images:
        raise RuntimeError(f"Gerçek görsel bulunamadı: {category} / {title}")
    record.update(
        {
            "title": title,
            "category": category,
            "status": record.get("status") or "Yayında",
            "summary": summary_for(title, paragraphs),
            "seoDescription": summary_for(title, paragraphs),
            "body": body_for(title, paragraphs),
            "description": body_for(title, paragraphs) if category == "etkinlikler" else record.get("description", ""),
            "image": images[0],
            "images": images,
            "legacySourcePath": page.get("path", ""),
            "legacyRepairVersion": VERSION,
        }
    )
    record.pop("sourceUrl", None)
    return record


def manifest_item(record: dict) -> dict:
    allowed = [
        "id", "title", "category", "status", "summary", "seoDescription", "body",
        "description", "image", "images", "legacySourcePath", "legacyRepairVersion",
    ]
    return {key: record.get(key) for key in allowed if key in record}


def deduplicate(records: list[dict]) -> tuple[list[dict], list[str]]:
    chosen: dict[tuple[str, str], dict] = {}
    for record in records:
        key = (str(record.get("category") or ""), normalized(clean_title(record.get("title", ""))))
        current = chosen.get(key)
        score = int(record.get("legacyRepairVersion") == VERSION) * 4 + int(bool(record.get("legacySourcePath"))) * 2 + int(not any(pattern.search(str(record.get("summary") or "")) for pattern in NOISE_PATTERNS))
        current_score = -1 if current is None else int(current.get("legacyRepairVersion") == VERSION) * 4 + int(bool(current.get("legacySourcePath"))) * 2 + int(not any(pattern.search(str(current.get("summary") or "")) for pattern in NOISE_PATTERNS))
        if current is None or score > current_score:
            chosen[key] = record
    kept = [record for record in records if chosen[(str(record.get("category") or ""), normalized(clean_title(record.get("title", ""))))] is record]
    removed = [str(record.get("id")) for record in records if record not in kept and record.get("id")]
    return kept, removed


def main():
    seed = load_json(SEED_PATH)
    source = load_json(SOURCE_PATH)
    seed.setdefault("content", [])
    seed.setdefault("events", [])

    seed["content"] = [item for item in seed["content"] if clean_title(item.get("title", "")) not in LISTING_TITLES]
    seed["events"] = [item for item in seed["events"] if clean_title(item.get("title", "")) not in LISTING_TITLES]

    patches = {"content": [], "events": []}
    repaired_counts = {"haberler": 0, "etkinlikler": 0, "duyurular": 0}
    details = [
        page for page in source.get("pages", [])
        if page.get("category") in LISTING_PATHS
        and page.get("path") not in LISTING_PATHS[page.get("category")]
    ]

    for page in details:
        category = page["category"]
        collection = "events" if category == "etkinlikler" else "content"
        record = find_record(seed[collection], page)
        if record is None and category == "etkinlikler":
            record = find_record(seed["content"], page)
            if record is not None:
                record = dict(record)
                record["id"] = record["id"] if str(record.get("id", "")).startswith("event-") else f"event-{record['id']}"
                seed["events"].append(record)
        if record is None:
            raise RuntimeError(f"İçerik kaydı bulunamadı: {category} / {page.get('title')}")
        repair_record(record, page, category)
        patches[collection].append(manifest_item(record))
        repaired_counts[category] += 1

    seed["content"] = [item for item in seed["content"] if item.get("category") != "etkinlikler"]
    seed["content"], removed_content_ids = deduplicate(seed["content"])
    seed["events"], removed_event_ids = deduplicate(seed["events"])
    manifest = {
        "version": VERSION,
        "listingTitles": sorted(LISTING_TITLES),
        "removeIds": sorted(KNOWN_REMOVE_IDS.union(removed_content_ids, removed_event_ids)),
        "content": patches["content"],
        "events": patches["events"],
    }
    save_json(SEED_PATH, seed)
    save_json(MANIFEST_PATH, manifest)
    print(
        "Onarım hazırlandı: "
        + ", ".join(f"{key}={value}" for key, value in repaired_counts.items())
    )


if __name__ == "__main__":
    main()
