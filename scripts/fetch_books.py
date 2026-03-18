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


def parse_aladin_item(item: dict, nationality: str = None, author_overrides: dict = None) -> dict:
    """Parse a single Aladin API item into our book schema."""
    author_raw = item.get("author", "")
    author = re.split(r"\s*\(", author_raw)[0].strip()
    author = re.split(r",", author)[0].strip()

    cover_url = item.get("cover", "").replace("cover200", "cover500").replace("coversum", "cover500")

    # Spine URL: cover500 → Spine, _1.jpg → _d.jpg, first letter of code uppercase
    spine_url = ""
    back_cover_url = ""
    if "/cover500/" in cover_url or "/cover/" in cover_url:
        spine_url = cover_url.replace("/cover500/", "/Spine/").replace("/cover/", "/Spine/")
        spine_url = re.sub(r'_\d+\.jpg$', '_d.jpg', spine_url)
        # Uppercase the first letter of the filename
        parts = spine_url.rsplit('/', 1)
        if len(parts) == 2 and parts[1]:
            parts[1] = parts[1][0].upper() + parts[1][1:]
            spine_url = '/'.join(parts)

        # Back cover URL: cover500 → letslook, _1.jpg → _b.jpg
        back_cover_url = cover_url.replace("/cover500/", "/letslook/").replace("/cover/", "/letslook/")
        back_cover_url = re.sub(r'_\d+\.jpg$', '_b.jpg', back_cover_url)
        parts = back_cover_url.rsplit('/', 1)
        if len(parts) == 2 and parts[1]:
            parts[1] = parts[1][0].upper() + parts[1][1:]
            back_cover_url = '/'.join(parts)

    # Override nationality based on actual categoryName from API
    cat_name = item.get("categoryName", "")
    if "일본" in cat_name:
        actual_nationality = "JP"
    elif "한국" in cat_name:
        actual_nationality = "KR"
    elif "영미" in cat_name or "기타국가" in cat_name or "외국" in cat_name:
        actual_nationality = "OTHER"
    else:
        actual_nationality = nationality

    # Author overrides take highest priority
    if author_overrides and author in author_overrides:
        actual_nationality = author_overrides[author]

    return {
        "isbn13": item.get("isbn13", ""),
        "title": item.get("title", ""),
        "author": author,
        "author_original": item.get("authorInfo", ""),
        "nationality": actual_nationality,
        "publisher": item.get("publisher", ""),
        "pub_date": item.get("pubDate", ""),
        "cover_url": cover_url,
        "spine_url": spine_url,
        "back_cover_url": back_cover_url,
        "link": item.get("link", ""),
        "price": item.get("priceStandard", 0),
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


def fetch_book_detail(ttb_key: str, isbn13: str) -> dict:
    """Fetch book size + description from ItemLookUp API."""
    try:
        resp = requests.get(ALADIN_LOOKUP_URL, params={
            "ttbkey": ttb_key,
            "ItemId": isbn13,
            "ItemIdType": "ISBN13",
            "output": "js",
            "Version": "20131101",
            "OptResult": "packing,fulldescription,story",
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        item = data.get("item", [{}])[0]
        packing = item.get("subInfo", {}).get("packing", {})
        return {
            "size_height": packing.get("sizeHeight", 0),
            "size_width": packing.get("sizeWidth", 0),
            "size_depth": packing.get("sizeDepth", 0),
            "description": item.get("fulldescription", "") or item.get("description", ""),
            "story": item.get("story", ""),
        }
    except Exception:
        return {"size_height": 0, "size_width": 0, "size_depth": 0, "description": "", "story": ""}


def fetch_publisher_desc(item_id: str, session: requests.Session = None) -> str:
    """알라딘 상품 페이지에서 출판사 제공 책소개를 스크래핑한다."""
    try:
        from bs4 import BeautifulSoup
        s = session or requests.Session()
        s.headers.setdefault("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")

        referer = f"https://www.aladin.co.kr/shop/wproduct.aspx?ItemId={item_id}"
        s.get(referer, timeout=15)

        url = f"https://www.aladin.co.kr/shop/product/getContents.aspx?itemId={item_id}&name=PublisherDesc"
        resp = s.get(url, timeout=15, headers={"Referer": referer, "X-Requested-With": "XMLHttpRequest"})
        soup = BeautifulSoup(resp.content, "html.parser")
        text = soup.get_text(separator="\n", strip=True)

        # "출판사 제공 책소개" 헤더 제거, "더보기" 이후 중복 제거
        lines = text.split("\n")
        clean = []
        for line in lines:
            if line in ("출판사 제공 책소개", "출판사 제공", "책소개", "더보기"):
                continue
            clean.append(line)

        result = "\n".join(clean).strip()
        # "더보기" 이후 중복 텍스트 제거
        if "더보기" in text:
            half = len(result) // 2
            if half > 100 and result[half:half+50] in result[:half]:
                result = result[:half].strip()
        return result
    except Exception:
        return ""


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
    overrides = config.get("author_overrides", {})
    all_new = []
    for cat in config["aladin"]["categories"]:
        cat_id = cat["id"]
        nationality = cat.get("nationality")
        print(f"Fetching {cat.get('name', cat_id)}...")
        items = fetch_from_aladin(ttb_key, cat_id, config["aladin"].get("max_results", 50))
        parsed = [parse_aladin_item(item, nationality=nationality, author_overrides=overrides) for item in items]
        # Skip items with no ISBN (sets, bundles)
        parsed = [p for p in parsed if p["isbn13"]]
        all_new.extend(parsed)
        print(f"  Found {len(parsed)} books")

    merged = merge_books(existing, all_new)

    # Fetch size info for books missing it
    import time
    needs_size = [b for b in merged if not b.get("size_height")]
    if needs_size:
        print(f"Fetching size info for {len(needs_size)} books...")
        for i, book in enumerate(needs_size):
            size = fetch_book_detail(ttb_key, book["isbn13"])
            book.update(size)
            if (i + 1) % 20 == 0:
                print(f"  {i + 1}/{len(needs_size)} done")
            time.sleep(0.2)  # rate limit
        print(f"  Size info fetched for {len(needs_size)} books")

    # Fetch publisher descriptions for books missing it
    needs_desc = [b for b in merged if not b.get("publisher_desc")]
    if needs_desc:
        print(f"Fetching publisher descriptions for {len(needs_desc)} books...")
        session = requests.Session()
        for i, book in enumerate(needs_desc):
            item_id = re.search(r"ItemId=(\d+)", book.get("link", ""))
            if item_id:
                desc = fetch_publisher_desc(item_id.group(1), session)
                if desc:
                    book["publisher_desc"] = desc
            if (i + 1) % 10 == 0:
                print(f"  {i + 1}/{len(needs_desc)} done")
            time.sleep(0.5)
        has_desc = sum(1 for b in merged if b.get("publisher_desc"))
        print(f"  Publisher descriptions: {has_desc}/{len(merged)}")

    save_books(merged)
    print(f"Total books in database: {len(merged)}")


if __name__ == "__main__":
    main()
