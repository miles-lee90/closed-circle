import json
from scripts.fetch_books import parse_aladin_item, merge_books, load_books, save_books

SAMPLE_ITEM = {
    "isbn13": "9788901234567",
    "title": "살인자의 기억법",
    "author": "김영하 (지은이)",
    "publisher": "문학동네",
    "pubDate": "2026-03-15",
    "cover": "https://image.aladin.co.kr/product/12345/cover.jpg",
    "link": "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=12345",
    "priceSales": 14400,
}


def test_parse_aladin_item():
    result = parse_aladin_item(SAMPLE_ITEM)
    assert result["isbn13"] == "9788901234567"
    assert result["title"] == "살인자의 기억법"
    assert result["author"] == "김영하"
    assert result["publisher"] == "문학동네"
    assert result["pub_date"] == "2026-03-15"
    assert result["cover_url"].startswith("https://")
    assert result["link"].startswith("https://")
    assert result["price"] == 14400
    assert result["nationality"] is None
    assert "fetched_at" in result


def test_parse_aladin_item_strips_author_role():
    item = {**SAMPLE_ITEM, "author": "히가시노 게이고 (지은이), 양억관 (옮긴이)"}
    result = parse_aladin_item(item)
    assert result["author"] == "히가시노 게이고"


def test_merge_books_deduplicates_by_isbn():
    book_a = {"isbn13": "111", "title": "A", "fetched_at": "2026-03-01T00:00:00Z"}
    book_b = {"isbn13": "222", "title": "B", "fetched_at": "2026-03-01T00:00:00Z"}
    book_a_new = {"isbn13": "111", "title": "A updated", "fetched_at": "2026-03-17T00:00:00Z"}
    merged = merge_books([book_a, book_b], [book_a_new])
    assert len(merged) == 2
    match = [b for b in merged if b["isbn13"] == "111"][0]
    assert match["title"] == "A updated"


def test_load_books_returns_empty_list_for_missing_file(tmp_path):
    result = load_books(tmp_path / "nonexistent.json")
    assert result == []


def test_save_and_load_books(tmp_path):
    books = [{"isbn13": "111", "title": "Test"}]
    path = tmp_path / "books.json"
    save_books(books, path)
    loaded = load_books(path)
    assert loaded == books
