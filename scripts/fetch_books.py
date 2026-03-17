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


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_aladin_item(item: dict, nationality: str = None) -> dict:
    """Parse a single Aladin API item into our book schema."""
    author_raw = item.get("author", "")
    author = re.split(r"\s*\(", author_raw)[0].strip()
    author = re.split(r",", author)[0].strip()

    return {
        "isbn13": item.get("isbn13", ""),
        "title": item.get("title", ""),
        "author": author,
        "author_original": item.get("authorInfo", ""),
        "nationality": nationality,
        "publisher": item.get("publisher", ""),
        "pub_date": item.get("pubDate", ""),
        "cover_url": item.get("cover", "").replace("cover200", "cover500").replace("coversum", "cover500"),
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
        resp = requests.get(ALADIN_API_URL, params=params, timeout=30)
        resp.raise_for_status()
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
    save_books(merged)
    print(f"Total books in database: {len(merged)}")


if __name__ == "__main__":
    main()
