"""Fetch mystery novel new releases from Aladin API."""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CONFIG_PATH = PROJECT_ROOT / "config.yaml"
BOOKS_PATH = DATA_DIR / "books.json"

ALADIN_API_URL = "http://www.aladin.co.kr/ttb/api/ItemList.aspx"
ALADIN_LOOKUP_URL = "http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx"


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_aladin_item(item: dict, nationality: str = None) -> dict:
    """Parse a single Aladin API item into our book schema."""
    author_raw = item.get("author", "")
    author = re.split(r"\s*\(", author_raw)[0].strip()
    author = re.split(r",", author)[0].strip()

    cover_url = item.get("cover", "").replace("cover200", "cover500").replace("coversum", "cover500")

    # Spine URL: cover500 → Spine, _1.jpg → _d.jpg, first letter of code uppercase
    spine_url = ""
    if "/cover500/" in cover_url or "/cover/" in cover_url:
        spine_url = cover_url.replace("/cover500/", "/Spine/").replace("/cover/", "/Spine/")
        spine_url = re.sub(r'_\d+\.jpg$', '_d.jpg', spine_url)
        # Uppercase the first letter of the filename
        parts = spine_url.rsplit('/', 1)
        if len(parts) == 2 and parts[1]:
            parts[1] = parts[1][0].upper() + parts[1][1:]
            spine_url = '/'.join(parts)

    return {
        "isbn13": item.get("isbn13", ""),
        "title": item.get("title", ""),
        "author": author,
        "author_original": item.get("authorInfo", ""),
        "nationality": nationality,
        "publisher": item.get("publisher", ""),
        "pub_date": item.get("pubDate", ""),
        "cover_url": cover_url,
        "spine_url": spine_url,
        "link": item.get("link", ""),
        "price": item.get("priceSales", 0),
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def fetch_from_aladin(ttb_key: str, category_id: int, max_results: int = 50) -> list[dict]:
    """Fetch new releases from Aladin API with pagination."""
    all_items = []
    start = 1
    while True:
        params = {
            "ttbkey": ttb_key,
            "QueryType": "ItemNewAll",
            "MaxResults": max_results,
            "start": start,
            "SearchTarget": "Book",
            "CategoryId": category_id,
            "output": "js",
            "Version": "20131101",
            "Cover": "Big",
        }
        for attempt in range(3):
            try:
                resp = requests.get(ALADIN_API_URL, params=params, timeout=30)
                resp.raise_for_status()
                break
            except requests.exceptions.RequestException as e:
                if attempt == 2:
                    print(f"  WARNING: Failed after 3 attempts: {e}", file=sys.stderr)
                    return all_items
                import time; time.sleep(5)
        data = resp.json()
        items = data.get("item", [])
        if not items:
            break
        all_items.extend(items)
        if len(items) < max_results:
            break
        start += 1
        if start > 5:
            break
    return all_items


def load_books(path: Path = BOOKS_PATH) -> list[dict]:
    """Load existing books from JSON file."""
    if not Path(path).exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_books(books: list[dict], path: Path = BOOKS_PATH):
    """Save books to JSON file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(books, f, ensure_ascii=False, indent=2)


def fetch_book_size(ttb_key: str, isbn13: str) -> dict:
    """Fetch book packing size (height, width, depth in mm) from ItemLookUp API."""
    try:
        resp = requests.get(ALADIN_LOOKUP_URL, params={
            "ttbkey": ttb_key,
            "ItemId": isbn13,
            "ItemIdType": "ISBN13",
            "output": "js",
            "Version": "20131101",
            "OptResult": "packing",
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        item = data.get("item", [{}])[0]
        packing = item.get("subInfo", {}).get("packing", {})
        return {
            "size_height": packing.get("sizeHeight", 0),
            "size_width": packing.get("sizeWidth", 0),
            "size_depth": packing.get("sizeDepth", 0),
        }
    except Exception:
        return {"size_height": 0, "size_width": 0, "size_depth": 0}


def merge_books(existing: list[dict], new: list[dict]) -> list[dict]:
    """Merge new books into existing list, deduplicating by isbn13. Newer wins."""
    by_isbn = {b["isbn13"]: b for b in existing}
    for book in new:
        by_isbn[book["isbn13"]] = book
    return list(by_isbn.values())


def main():
    config = load_config()
    ttb_key = os.environ.get("TTB_API_KEY", "")
    if not ttb_key:
        print("ERROR: TTB_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    existing = load_books()
    all_new = []
    for cat in config["aladin"]["categories"]:
        cat_id = cat["id"]
        nationality = cat.get("nationality")
        print(f"Fetching {cat.get('name', cat_id)}...")
        items = fetch_from_aladin(ttb_key, cat_id, config["aladin"].get("max_results", 50))
        parsed = [parse_aladin_item(item, nationality=nationality) for item in items]
        all_new.extend(parsed)
        print(f"  Found {len(parsed)} books")

    merged = merge_books(existing, all_new)

    # Fetch size info for books missing it
    import time
    needs_size = [b for b in merged if not b.get("size_height")]
    if needs_size:
        print(f"Fetching size info for {len(needs_size)} books...")
        for i, book in enumerate(needs_size):
            size = fetch_book_size(ttb_key, book["isbn13"])
            book.update(size)
            if (i + 1) % 20 == 0:
                print(f"  {i + 1}/{len(needs_size)} done")
            time.sleep(0.2)  # rate limit
        print(f"  Size info fetched for {len(needs_size)} books")

    save_books(merged)
    print(f"Total books in database: {len(merged)}")


if __name__ == "__main__":
    main()
